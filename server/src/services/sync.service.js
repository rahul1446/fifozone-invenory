const WooCommerceService = require('./woocommerce.service');
const AmazonService      = require('./amazon.service');
const FlipkartService    = require('./flipkart.service');
const MeeshoService      = require('./meesho.service');
const Product = require('../models/Product.model');
const Order = require('../models/Order.model');
const InventoryLog = require('../models/InventoryLog.model');
const PlatformSync = require('../models/PlatformSync.model');
const Notification = require('../models/Notification.model');
const notificationService = require('./notification.service');
const logger = require('../utils/logger');

const USE_MOCK = () => process.env.USE_MOCK_API === 'true';

class SyncService {
  async generateOrderNumber() {
    const lastOrder = await Order.findOne().sort({ createdAt: -1 });
    if (!lastOrder) return 'FI-ORD-10001';
    const match = lastOrder.orderNumber.match(/FI-ORD-(\d+)/);
    if (!match) return 'FI-ORD-10001';
    const nextNumber = parseInt(match[1]) + 1;
    return `FI-ORD-${nextNumber}`;
  }

  async syncAllPlatforms() {
    logger.info('Starting manual sync of all platforms...');
    await this.syncProducts();
    await this.syncOrders();
    logger.info('Manual platform sync completed.');
    return { success: true };
  }

  async syncProducts() {
    const PlatformCredential = require('../models/PlatformCredential.model');

    // Clear the WooCommerce category cache at the start of every sync run
    // so we always resolve category IDs fresh from WooCommerce.
    WooCommerceService.clearCategoryCache();

    const platforms = [
      { service: WooCommerceService, key: 'fifozone' },
      { service: AmazonService,      key: 'amazon'   },
      { service: FlipkartService,    key: 'flipkart' },
      { service: MeeshoService,      key: 'meesho'   },
    ];

    for (const item of platforms) {
      try {
        const cred = await PlatformCredential.findOne({ platform: item.key, isActive: true });
        const isMockPlatform = USE_MOCK() && (item.key === 'amazon' || item.key === 'flipkart' || item.key === 'meesho');
        if (!cred && !isMockPlatform) continue;

        await PlatformSync.findOneAndUpdate(
          { platform: item.key },
          { status: 'syncing' },
          { upsert: true }
        );

        const items = await item.service.pullProducts();
        let syncedCount = 0;

        // Track which product IDs were found in this sync run
        // Used for reconciliation (de-listing products no longer on the platform)
        const foundProductIds = new Set();

        for (const rawProd of items) {
          // Look up product by SKU or Barcode
          const queryOr = [];
          if (rawProd.sku) queryOr.push({ sku: rawProd.sku });
          if (rawProd.barcode) queryOr.push({ barcode: rawProd.barcode });
          
          let product = null;
          if (queryOr.length > 0) {
            product = await Product.findOne({ $or: queryOr });
          }

          // If this product was explicitly deleted by the seller, skip it entirely
          if (product?.deletedBySeller) {
            logger.info(`[Sync] Skipping "${product.masterName}" — permanently deleted by seller`);
            continue;
          }

          if (!product) {
            // Create a new Master Product
            product = new Product({
              masterName: rawProd.masterName,
              sku: rawProd.sku,
              barcode: rawProd.barcode || '',
              brand: rawProd.brand || 'Generic',
              category: rawProd.category || 'Uncategorized',
              mrp: rawProd.mrp || rawProd.price || 0,
              costPrice: Math.round((rawProd.price || 0) * 0.6),
              totalStock: rawProd.stock || 0,
              stockByPlatform: {
                fifozone:  item.key === 'fifozone'  ? (rawProd.stock || 0) : 0,
                amazon:    item.key === 'amazon'    ? (rawProd.stock || 0) : 0,
                flipkart:  item.key === 'flipkart'  ? (rawProd.stock || 0) : 0,
                warehouse: 0
              },
              images: (rawProd.images || []).map((img, idx) => ({
                url: typeof img === 'string' ? img : img.url,
                isPrimary: idx === 0
              })),
              description: rawProd.description || '',
              isActive: true,
            });
          } else {
            if (product.deletedBySeller) {
              logger.info(`[Sync] Skipping "${product.masterName}" — deleted by seller`);
              continue;
            }

            product.isActive = true;

            if (!product.manualOverride) {
              if (rawProd.mrp && rawProd.mrp > 0) product.mrp = rawProd.mrp;
              if (rawProd.masterName) product.masterName = rawProd.masterName;
            } else {
              logger.info(`[Sync] Skipping name/price overwrite for "${product.masterName}" — manualOverride is set`);
            }

            if (rawProd.images?.length > 0 && product.images?.length === 0) {
              product.images = rawProd.images.map((img, idx) => ({
                url: typeof img === 'string' ? img : img.url,
                isPrimary: idx === 0
              }));
            }
          }

          // Update platform-specific details
          if (item.key === 'fifozone') {
            product.sellingPrice.fifozone = rawProd.price;
            product.platformIds.fifozone = {
              productId: rawProd.platformProductId,
              slug: rawProd.slug || '',
              url: rawProd.url || ''
            };
            product.platformStatus.fifozone = 'active';
            product.lastSyncedAt.fifozone = new Date();
          } else if (item.key === 'amazon') {
            product.sellingPrice.amazon = rawProd.price;
            product.platformIds.amazon = {
              asin: rawProd.asin,
              fnsku: rawProd.fnsku || '',
              url: rawProd.url || ''
            };
            product.platformStatus.amazon = 'active';
            product.lastSyncedAt.amazon = new Date();
          } else if (item.key === 'flipkart') {
            product.sellingPrice.flipkart = rawProd.price;
            product.platformIds.flipkart = {
              fsin: rawProd.fsin,
              listingId: rawProd.listingId || '',
              url: rawProd.url || ''
            };
            product.platformStatus.flipkart = 'active';
            product.lastSyncedAt.flipkart = new Date();
          } else if (item.key === 'meesho') {
            product.sellingPrice.meesho = rawProd.price;
            product.platformIds.meesho = {
              productId: rawProd.productId || '',
              sku:       rawProd.sku       || '',
              url:       rawProd.url       || ''
            };
            product.platformStatus.meesho = 'active';
            product.lastSyncedAt.meesho = new Date();
          }

          if (rawProd.masterName !== product.masterName && !product.alternateNames.includes(rawProd.masterName)) {
            product.alternateNames.push(rawProd.masterName);
          }

          await product.save();
          foundProductIds.add(product._id.toString());
          syncedCount++;
        }

        // ── RECONCILIATION: de-list products no longer returned by this platform ──
        // Find all DB products currently marked as active on this platform
        // that were NOT found in this sync run — they've been removed from the platform.
        const staleQuery = {
          isActive: true,
          deletedBySeller: { $ne: true },    // don't touch seller-deleted products
          manualOverride: { $ne: true },      // don't touch manually managed products
          [`platformStatus.${item.key}`]: { $nin: ['not_listed'] },
        };
        const staleProducts = await Product.find(staleQuery).select('_id masterName');
        let delistedCount = 0;

        for (const stale of staleProducts) {
          if (!foundProductIds.has(stale._id.toString())) {
            // This product was listed on the platform before but wasn't returned this sync
            const updateFields = {
              [`platformStatus.${item.key}`]: 'not_listed',
            };
            // Clear the platform ID so it's clean
            if (item.key === 'fifozone')  updateFields['platformIds.fifozone.productId'] = '';
            if (item.key === 'amazon')    updateFields['platformIds.amazon.asin'] = '';
            if (item.key === 'flipkart')  updateFields['platformIds.flipkart.fsin'] = '';

            await Product.findByIdAndUpdate(stale._id, { $set: updateFields });
            logger.info(`[Sync][${item.key}] De-listed stale product: "${stale.masterName}"`);
            delistedCount++;
          }
        }

        if (delistedCount > 0) {
          logger.info(`[Sync][${item.key}] Reconciliation: de-listed ${delistedCount} stale products.`);
        }

        await PlatformSync.findOneAndUpdate(
          { platform: item.key },
          {
            status: 'synced',
            syncedProductsCount: syncedCount,
            lastProductSync: new Date()
          }
        );
      } catch (error) {
        logger.error(`Error syncing products for ${item.key}: ${error.message}`);
        await PlatformSync.findOneAndUpdate(
          { platform: item.key },
          {
            status: 'error',
            lastErrorMessage: error.message,
            errorsCount: 1
          }
        );
      }
    }
  }


  // 2. Pull, Ingest and Process Orders
  async syncOrders() {
    const PlatformCredential = require('../models/PlatformCredential.model');
    const platforms = [
      { service: WooCommerceService, key: 'fifozone' },
      { service: AmazonService,      key: 'amazon'   },
      { service: FlipkartService,    key: 'flipkart' },
    ];

    for (const item of platforms) {
      try {
        const cred = await PlatformCredential.findOne({ platform: item.key, isActive: true });
        const isMockPlatform = USE_MOCK() && (item.key === 'amazon' || item.key === 'flipkart');
        if (!cred && !isMockPlatform) continue;

        const rawOrders = await item.service.pullOrders();

        for (const rawOrd of rawOrders) {
          let internalStatus = 'pending';
          if (item.key === 'fifozone' && rawOrd.platformStatus) {
             const stat = rawOrd.platformStatus.toLowerCase();
             if (stat === 'processing') internalStatus = 'processing';
             else if (stat === 'completed') internalStatus = 'delivered';
             else if (stat === 'cancelled' || stat === 'failed') internalStatus = 'cancelled';
             else if (stat === 'refunded') internalStatus = 'refunded';
          } else if (rawOrd.platformStatus) {
             // Fallback mapping for other platforms if they send platformStatus
             const stat = rawOrd.platformStatus.toLowerCase();
             if (['processing', 'unshipped'].includes(stat)) internalStatus = 'processing';
             else if (['shipped', 'dispatched'].includes(stat)) internalStatus = 'shipped';
             else if (['delivered', 'completed'].includes(stat)) internalStatus = 'delivered';
             else if (['cancelled', 'failed', 'canceled'].includes(stat)) internalStatus = 'cancelled';
          }

          // Check if order already exists in DB
          let existingOrder = await Order.findOne({ platformOrderId: rawOrd.platformOrderId });
          if (existingOrder) {
             if (existingOrder.status !== internalStatus) {
                existingOrder.status = internalStatus;
                existingOrder.statusHistory.push({ status: internalStatus, note: `Status updated to ${rawOrd.platformStatus} via sync` });
                await existingOrder.save();
             }
             continue;
          }

          // Resolve products
          const resolvedItems = [];
          for (const itemRow of rawOrd.items) {
            const product = await Product.findOne({ sku: itemRow.sku });

            if (product) {
              resolvedItems.push({
                product: product._id,
                productSnapshot: {
                  masterName: product.masterName,
                  sku: product.sku,
                  brand: product.brand,
                  sellingPrice: itemRow.unitPrice,
                  mrp: product.mrp,
                  images: product.images.map(img => img.url)
                },
                platformProductId: itemRow.asin || itemRow.listingId || '',
                quantity: itemRow.quantity,
                unitPrice: itemRow.unitPrice,
                totalPrice: itemRow.unitPrice * itemRow.quantity,
                gstAmount: Math.round(itemRow.unitPrice * itemRow.quantity * 0.18) // standard
              });

              // Process inventory deduction
              const previousStock = product.totalStock;
              const deductQty = itemRow.quantity;
              product.totalStock = Math.max(0, product.totalStock - deductQty);

              if (item.key === 'fifozone') {
                product.stockByPlatform.fifozone = Math.max(0, product.stockByPlatform.fifozone - deductQty);
              } else if (item.key === 'amazon') {
                product.stockByPlatform.amazon = Math.max(0, product.stockByPlatform.amazon - deductQty);
              } else if (item.key === 'flipkart') {
                product.stockByPlatform.flipkart = Math.max(0, product.stockByPlatform.flipkart - deductQty);
              }

              product.totalSold += deductQty;
              product.soldThisMonth += deductQty;
              product.lastSoldAt = new Date();

              await product.save();

              // Write Audit Log
              await InventoryLog.create({
                product: product._id,
                productName: product.masterName,
                sku: product.sku,
                changeType: 'sale',
                platform: item.key,
                previousStock,
                changeQuantity: -deductQty,
                newStock: product.totalStock,
                note: `Order sale deduction for ${rawOrd.platformOrderId}`
              });

              // Check Low Stock Thresholds
              if (product.totalStock <= product.lowStockThreshold) {
                await notificationService.createNotification({
                  type: product.totalStock === 0 ? 'out_of_stock' : 'low_stock',
                  title: product.totalStock === 0 ? 'Product Out of Stock!' : 'Low Stock Alert!',
                  message: `Product [${product.masterName}] stock level is at ${product.totalStock} units (Threshold: ${product.lowStockThreshold})`,
                  severity: product.totalStock === 0 ? 'error' : 'warning',
                  product: product._id,
                  platform: 'internal'
                });
              }
            }
          }

          try {
            // Create the unified Order record
            const orderNumber = await this.generateOrderNumber();
            const order = new Order({
              orderNumber,
              platformOrderId: rawOrd.platformOrderId,
              platform: item.key,
              customer: rawOrd.customer,
              shippingAddress: rawOrd.shippingAddress,
              items: resolvedItems,
              subtotal: rawOrd.subtotal,
              shippingCharge: rawOrd.shippingCharge || 0,
              totalAmount: rawOrd.totalAmount,
              paymentMethod: rawOrd.paymentMethod,
              paymentStatus: rawOrd.paymentStatus,
              status: internalStatus,
              statusHistory: [{ status: internalStatus, note: `Order imported via platform sync (${rawOrd.platformStatus || 'pending'})` }],
              rawPlatformData: rawOrd
            });

            await order.save();

            // Create New Order Notification
            await notificationService.createNotification({
              type: 'new_order',
              title: `New Order Imported (${item.key.toUpperCase()})`,
              message: `Order #${order.orderNumber} placed by ${order.customer.name} (Amount: INR ${order.totalAmount})`,
              severity: 'info',
              order: order._id,
              platform: item.key
            });
          } catch (err) {
            logger.error(`[Sync] Failed to save order ${rawOrd.platformOrderId}: ${err.message}`);
          }
        }

        await PlatformSync.findOneAndUpdate(
          { platform: item.key },
          { lastOrderSync: new Date() }
        );
      } catch (error) {
        logger.error(`Error syncing orders for ${item.key}: ${error.message}`);
      }
    }
  }

  // 3. Push Stock count to specific platform
  async pushStockToPlatforms(product) {
    const sku = product.sku;

    if (product.platformStatus?.fifozone === 'active') {
      try { await WooCommerceService.pushStock(sku, product.stockByPlatform?.fifozone ?? product.totalStock); }
      catch (err) { logger.error(`Failed to push stock to WooCommerce for ${sku}: ${err.message}`); }
    }
    if (product.platformStatus?.amazon === 'active') {
      try { await AmazonService.pushStock(sku, product.totalStock); }
      catch (err) { logger.error(`Failed to push stock to Amazon for ${sku}: ${err.message}`); }
    }
    if (product.platformStatus?.flipkart === 'active') {
      try { await FlipkartService.pushStock(sku, product.totalStock); }
      catch (err) { logger.error(`Failed to push stock to Flipkart for ${sku}: ${err.message}`); }
    }
  }

  // 4. Push Updated Prices to platforms
  async pushPriceToPlatforms(product) {
    const sku = product.sku;

    if (product.platformStatus?.fifozone === 'active' && product.sellingPrice?.fifozone > 0) {
      try { await WooCommerceService.pushPrice(sku, product.sellingPrice.fifozone); }
      catch (err) { logger.error(`Failed to push price to WooCommerce for ${sku}: ${err.message}`); }
    }
    if (product.platformStatus?.amazon === 'active' && product.sellingPrice?.amazon > 0) {
      try { await AmazonService.pushPrice(sku, product.sellingPrice.amazon); }
      catch (err) { logger.error(`Failed to push price to Amazon for ${sku}: ${err.message}`); }
    }
    if (product.platformStatus?.flipkart === 'active' && product.sellingPrice?.flipkart > 0) {
      try { await FlipkartService.pushPrice(sku, product.sellingPrice.flipkart); }
      catch (err) { logger.error(`Failed to push price to Flipkart for ${sku}: ${err.message}`); }
    }
  }

  // 5. Push a NEW product to WooCommerce
  async pushProductCreate(product) {
    try {
      const result = await WooCommerceService.createProduct(product);
      if (result?.wooProductId) {
        // Save WooCommerce product ID back to our DB record
        await Product.findByIdAndUpdate(product._id, {
          $set: {
            'platformIds.fifozone.productId': String(result.wooProductId),
            'platformStatus.fifozone': 'active',
            'lastSyncedAt.fifozone': new Date(),
          }
        });
        logger.info(`[SyncService] "${product.masterName}" created on WooCommerce (ID: ${result.wooProductId})`);
      }
      return result;
    } catch (err) {
      logger.error(`[SyncService] pushProductCreate failed for "${product.masterName}": ${err.message}`);
      throw err;
    }
  }

  // 6. Push an UPDATED product to WooCommerce
  async pushProductUpdate(product) {
    try {
      const result = await WooCommerceService.updateProduct(product);
      await Product.findByIdAndUpdate(product._id, {
        $set: { 'lastSyncedAt.fifozone': new Date() }
      });
      logger.info(`[SyncService] "${product.masterName}" updated on WooCommerce`);
      return result;
    } catch (err) {
      logger.error(`[SyncService] pushProductUpdate failed for "${product.masterName}": ${err.message}`);
      throw err;
    }
  }

  // 7. Push a DELETE to WooCommerce (trash the product)
  async pushProductDelete(product) {
    try {
      const result = await WooCommerceService.deleteProduct(product);
      logger.info(`[SyncService] "${product.masterName}" trashed on WooCommerce`);
      return result;
    } catch (err) {
      logger.error(`[SyncService] pushProductDelete failed for "${product.masterName}": ${err.message}`);
      throw err;
    }
  }
}

module.exports = new SyncService();
