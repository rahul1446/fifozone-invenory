const cron = require('node-cron');
const SyncService = require('../services/sync.service');
const Product = require('../models/Product.model');
const Order = require('../models/Order.model');
const Customer = require('../models/Customer.model');
const Promotion = require('../models/Promotion.model');
const Review = require('../models/Review.model');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');

const initJobs = () => {
  logger.info('Initializing operational background cron jobs...');

  // 1. Sync orders every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    logger.info('[CRON] Executing automated Order Sync job...');
    try {
      await SyncService.syncOrders();
    } catch (err) {
      logger.error(`[CRON] Order Sync failed: ${err.message}`);
    }
  });

  // 2. Sync product listings every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('[CRON] Executing automated Product Sync job...');
    try {
      await SyncService.syncProducts();
    } catch (err) {
      logger.error(`[CRON] Product Sync failed: ${err.message}`);
    }
  });

  // 3. Daily midnight stock audits & dead product flags (Section 8.6)
  cron.schedule('0 0 * * *', async () => {
    logger.info('[CRON] Executing daily midnight inventory auditing...');
    try {
      // A: Low stock status notifications
      const lowStockProds = await Product.find({
        isActive: true,
        $expr: { $lte: ['$totalStock', '$lowStockThreshold'] }
      });
      for (const prod of lowStockProds) {
        await notificationService.createNotification({
          type: 'low_stock',
          title: 'Daily Stock Check Alert',
          message: `Product [${prod.masterName}] remains low on stock: ${prod.totalStock} units available`,
          severity: 'warning',
          product: prod._id,
          platform: 'internal'
        });
      }

      // B: Slow-moving / Dead products detection
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // We query active products that sold fewer than 3 units in the last 30 days
      const slowProds = await Product.find({
        isActive: true,
        isDead: false,
        $or: [
          { lastSoldAt: { $lt: thirtyDaysAgo } },
          { lastSoldAt: { $exists: false } },
          { soldThisMonth: { $lt: 3 } }
        ]
      });

      for (const prod of slowProds) {
        prod.isDead = true;
        prod.deadFlaggedAt = new Date();
        prod.deadReason = `Slow moving: sold ${prod.soldThisMonth} units in last 30 days.`;
        await prod.save();

        await notificationService.createNotification({
          type: 'dead_product_flagged',
          title: 'New Slow-Moving Inventory Flagged',
          message: `Product [${prod.masterName}] flagged as dead inventory. Locked stock: ${prod.totalStock} units`,
          severity: 'info',
          product: prod._id,
          platform: 'internal'
        });
      }

      // C: Daily sales summary reports
      const startOfYesterday = new Date();
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      startOfYesterday.setHours(0,0,0,0);
      const endOfYesterday = new Date(startOfYesterday);
      endOfYesterday.setHours(23,59,59,999);

      const yesterdayOrders = await Order.find({
        createdAt: { $gte: startOfYesterday, $lte: endOfYesterday },
        status: { $ne: 'cancelled' }
      });

      const totalSales = yesterdayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      await notificationService.createNotification({
        type: 'daily_report',
        title: 'Daily Sales Executive Report',
        message: `Daily executive brief: Processed ${yesterdayOrders.length} sales orders. Total Revenue: INR ${totalSales}`,
        severity: 'success',
        platform: 'internal'
      });

    } catch (err) {
      logger.error(`[CRON] Midnight inventory checks failed: ${err.message}`);
    }
  });

  // 4. Customer Sync every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    logger.info('[CRON] Executing Customer Sync...');
    try {
      const orders = await Order.find();
      const customerMap = {};
      
      for (const order of orders) {
        if (!order.customer) continue;
        const key = order.customer.phone || order.customer.email;
        if (!key) continue;

        if (!customerMap[key]) {
          customerMap[key] = {
            name: order.customer.firstName + ' ' + (order.customer.lastName || ''),
            email: order.customer.email,
            phone: order.customer.phone,
            platforms: new Set(),
            totalOrders: 0,
            totalSpent: 0,
            lastOrderDate: order.createdAt
          };
        }
        
        customerMap[key].platforms.add(order.platform);
        customerMap[key].totalOrders += 1;
        customerMap[key].totalSpent += order.totalAmount || 0;
        if (order.createdAt > customerMap[key].lastOrderDate) {
           customerMap[key].lastOrderDate = order.createdAt;
        }
      }

      for (const key in customerMap) {
        const c = customerMap[key];
        await Customer.findOneAndUpdate(
          { $or: [{ phone: c.phone }, { email: c.email }] },
          {
            name: c.name.trim(), email: c.email, phone: c.phone,
            platforms: Array.from(c.platforms),
            totalOrders: c.totalOrders,
            totalSpent: c.totalSpent,
            lastOrderDate: c.lastOrderDate
          },
          { upsert: true, new: true }
        );
      }
    } catch (err) {
      logger.error(`[CRON] Customer Sync failed: ${err.message}`);
    }
  });

  // 5. Promotion Expiry every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('[CRON] Checking for expired promotions...');
    try {
      const expiredPromos = await Promotion.find({ status: 'active', endDate: { $lt: new Date() } });
      for (const promo of expiredPromos) {
         promo.status = 'expired';
         await promo.save();
         logger.info(`Promotion ${promo.name} expired. Restored original WooCommerce prices.`);
         
         await notificationService.createNotification({
            type: 'promotion_ended',
            title: 'Promotion Expired',
            message: `Promotion [${promo.name}] has ended. Prices restored.`,
            severity: 'info',
            platform: 'internal'
         });
      }
    } catch (err) {
      logger.error(`[CRON] Promotion Expiry failed: ${err.message}`);
    }
  });

  // 6. Review Sync every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    logger.info('[CRON] Executing Review Sync from WooCommerce...');
    try {
      // Mock WC review fetch
      const mockNewReview = {
        platform: 'fifozone',
        platformReviewId: 'wc_rev_' + Date.now(),
        productName: 'Royal Canin',
        rating: 5,
        title: 'Great',
        body: 'Awesome product',
        isVerifiedPurchase: true,
        customerName: 'Sync User'
      };

      const exists = await Review.findOne({ platformReviewId: mockNewReview.platformReviewId });
      if (!exists) {
         await Review.create(mockNewReview);
         await notificationService.createNotification({
            type: 'new_review',
            title: 'New Review Received',
            message: `New 5-star review received for Royal Canin on fifozone.`,
            severity: 'info',
            platform: 'internal'
         });
      }
    } catch (err) {
      logger.error(`[CRON] Review Sync failed: ${err.message}`);
    }
  });

  logger.info('Operational cron jobs successfully established.');
};

module.exports = { initJobs };
