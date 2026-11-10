const FifozoneOmsService  = require('./fifozoneOms.service');
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

    // Clear the Fifozone OMS category cache at the start of every sync run
    // so we always resolve category IDs fresh from the OMS API.
    FifozoneOmsService.clearCategoryCache();

    const platforms = [
      { service: FifozoneOmsService, key: 'fifozone' },
      { service: AmazonService,      key: 'amazon'   },
      { service: FlipkartService,    key: 'flipkart' },
      { service: MeeshoService,      key: 'meesho'   },
    ];

    for (const item of platforms) {
      try {
        const cred = await PlatformCredential.findOne({ platform: item.key, isActive: true });
        const isOmsPlatform = item.key === 'fifozone' && !!(process.env.FIFOZONE_OMS_API_KEY || FifozoneOmsService.apiKey);
        if (!cred && !isOmsPlatform) continue;

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
          // Look up product by SKU, Barcode, or platformProductId
          const queryOr = [];
          if (rawProd.sku) queryOr.push({ sku: rawProd.sku });
          if (rawProd.barcode) queryOr.push({ barcode: rawProd.barcode });
          if (rawProd.platformProductId) {
            queryOr.push({ 'platformIds.fifozone.productId': String(rawProd.platformProductId) });
          }
          
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
              animalType: rawProd.animalType || ['other'],
              mrp: rawProd.mrp || rawProd.price || 0,
              costPrice: Math.round((rawProd.price || 0) * 0.6),
              totalStock: rawProd.stock || 0,
              stockByPlatform: {
                fifozone:  item.key === 'fifozone'  ? (rawProd.stock || 0) : 0,
                amazon:    item.key === 'amazon'    ? (rawProd.stock || 0) : 0,
                flipkart:  item.key === 'flipkart'  ? (rawProd.stock || 0) : 0,
                meesho:    item.key === 'meesho'    ? (rawProd.stock || 0) : 0,
                warehouse: 0
              },
              images: (rawProd.images || []).map((img, idx) => ({
                url: typeof img === 'string' ? img : img.url,
                isPrimary: idx === 0
              })),
              shortDescription: rawProd.shortDescription || '',
              description: rawProd.description || '',
              variants: rawProd.variants || [],
              stockStatus: rawProd.stockStatus || 'instock',
              manageStock: rawProd.manageStock !== undefined ? rawProd.manageStock : false,
              isActive: true,
            });
          } else {
            if (product.deletedBySeller) {
              logger.info(`[Sync] Skipping "${product.masterName}" — deleted by seller`);
              continue;
            }

            product.isActive = true;
            if (rawProd.stock !== undefined && rawProd.stock >= 0) {
              if (item.key === 'fifozone') product.stockByPlatform.fifozone = rawProd.stock;
              if (item.key === 'amazon')   product.stockByPlatform.amazon = rawProd.stock;
              if (item.key === 'flipkart') product.stockByPlatform.flipkart = rawProd.stock;
              if (item.key === 'meesho')   product.stockByPlatform.meesho = rawProd.stock;

              product.totalStock = (product.stockByPlatform.fifozone || 0) +
                                   (product.stockByPlatform.amazon || 0) +
                                   (product.stockByPlatform.flipkart || 0) +
                                   (product.stockByPlatform.meesho || 0);
              product.stockStatus = product.totalStock > 0 ? 'instock' : 'outofstock';
            }
            if (rawProd.stockStatus) product.stockStatus = rawProd.stockStatus;
            if (rawProd.manageStock !== undefined) product.manageStock = rawProd.manageStock;

            if (!product.manualOverride) {
              if (rawProd.mrp && rawProd.mrp > 0) {
                if (!product.mrp || product.mrp === 0 || item.key === 'fifozone') product.mrp = rawProd.mrp;
              }
              const isFallbackName = !product.masterName || product.masterName.startsWith('Flipkart Product (') || product.masterName === rawProd.sku;
              if (rawProd.masterName && (isFallbackName || item.key === 'fifozone')) {
                product.masterName = rawProd.masterName;
              }
              if (rawProd.price && (!product.costPrice || product.costPrice === 0)) {
                product.costPrice = Math.round(rawProd.price * 0.6);
              }
              if (rawProd.description) product.description = rawProd.description;
              if (rawProd.shortDescription) product.shortDescription = rawProd.shortDescription;
              if (rawProd.animalType?.length > 0 && (!product.animalType || product.animalType.length === 0)) {
                product.animalType = rawProd.animalType;
              }
              if (rawProd.variants?.length > 0) {
                product.variants = rawProd.variants;
              }
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
            if (rawProd.stock !== undefined) {
              product.stockByPlatform.amazon = rawProd.stock;
            }
            product.platformIds.amazon = {
              asin: rawProd.asin,
              fnsku: rawProd.fnsku || '',
              url: rawProd.url || ''
            };
            product.platformStatus.amazon = 'active';
            product.lastSyncedAt.amazon = new Date();
          } else if (item.key === 'flipkart') {
            product.sellingPrice.flipkart = rawProd.price;
            if (rawProd.stock !== undefined) {
              product.stockByPlatform.flipkart = rawProd.stock;
            }
            const liveUrl = rawProd.url || (rawProd.fsin ? `https://www.flipkart.com/item/p/itm?pid=${rawProd.fsin}` : '');
            product.platformIds.flipkart = {
              fsin: rawProd.fsin || '',
              listingId: rawProd.listingId || '',
              url: liveUrl
            };
            product.platformStatus.flipkart = 'active';
            product.lastSyncedAt.flipkart = new Date();
          } else if (item.key === 'meesho') {
            product.sellingPrice.meesho = rawProd.price;
            if (rawProd.stock !== undefined) {
              product.stockByPlatform.meesho = rawProd.stock;
            }
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

          product.markModified('stockByPlatform');
          product.markModified('sellingPrice');
          product.markModified('platformIds');
          product.markModified('platformStatus');
          product.markModified('lastSyncedAt');

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
      { service: FifozoneOmsService, key: 'fifozone' },
      { service: AmazonService,      key: 'amazon'   },
      { service: FlipkartService,    key: 'flipkart' },
    ];

    for (const item of platforms) {
      try {
        const cred = await PlatformCredential.findOne({ platform: item.key, isActive: true });
        const isOmsPlatform = item.key === 'fifozone' && !!(process.env.FIFOZONE_OMS_API_KEY || FifozoneOmsService.apiKey);
        if (!cred && !isOmsPlatform) continue;

        const rawOrders = await item.service.pullOrders();
        const ordersList = Array.isArray(rawOrders) ? rawOrders : [];

        for (const rawOrd of ordersList) {
          try {
            if (!rawOrd || typeof rawOrd !== 'object') {
              logger.warn(`[Sync] Skipping malformed order in ${item.key}: payload is not an object`);
              continue;
            }

            if (!rawOrd.platformOrderId) {
              logger.warn(`[Sync] Skipping order in ${item.key}: missing platformOrderId`);
              continue;
            }

            let internalStatus = 'pending';
            if (item.key === 'fifozone' && rawOrd.platformStatus) {
              const stat = String(rawOrd.platformStatus).toLowerCase();
              if (stat === 'processing') internalStatus = 'processing';
              else if (stat === 'completed' || stat === 'delivered') internalStatus = 'delivered';
              else if (stat === 'shipped') internalStatus = 'shipped';
              else if (stat === 'cancelled') internalStatus = 'cancelled';
              else if (stat === 'failed') internalStatus = 'failed';
              else if (stat === 'refunded') internalStatus = 'refunded';
              else if (stat === 'checkout-draft') internalStatus = 'draft';
              else if (stat === 'packed') internalStatus = 'packed';
            } else if (rawOrd.platformStatus) {
              // Fallback mapping for other platforms if they send platformStatus
              const stat = String(rawOrd.platformStatus).toLowerCase();
              if (['processing', 'unshipped'].includes(stat)) internalStatus = 'processing';
              else if (['shipped', 'dispatched'].includes(stat)) internalStatus = 'shipped';
              else if (['delivered', 'completed'].includes(stat)) internalStatus = 'delivered';
              else if (['cancelled', 'failed', 'canceled'].includes(stat)) internalStatus = 'cancelled';
            }

            // Extract tracking & shipping details
            const trackingNum = rawOrd.shippingTracking?.trackingNumber || rawOrd.trackingNumber || '';
            const courier = rawOrd.shippingTracking?.courierPartner || rawOrd.courierPartner || '';
            const trackUrl = rawOrd.shippingTracking?.trackingUrl || rawOrd.trackingUrl || '';

            // Check if order already exists in DB
            let existingOrder = await Order.findOne({ platformOrderId: rawOrd.platformOrderId });

            // ── EXISTING ORDER BRANCH (Never deduct inventory) ───────────────
            if (existingOrder) {
              let needsSave = false;

              // 1. Status Update & Audit Trail
              if (existingOrder.status !== internalStatus) {
                const prevStatus = existingOrder.status;
                existingOrder.status = internalStatus;
                if (!Array.isArray(existingOrder.statusHistory)) {
                  existingOrder.statusHistory = [];
                }
                existingOrder.statusHistory.push({
                  status: internalStatus,
                  timestamp: new Date(),
                  note: `Status updated to ${rawOrd.platformStatus || internalStatus} via sync (was: ${prevStatus})`
                });
                if (internalStatus === 'delivered' && !existingOrder.deliveredAt) {
                  existingOrder.deliveredAt = new Date();
                }
                needsSave = true;
              }

              // 2. Order Date Backfill
              if (!existingOrder.orderDate && rawOrd.orderDate) {
                existingOrder.orderDate = new Date(rawOrd.orderDate);
                needsSave = true;
              }

              // 3. Tracking & Carrier Updates from OMS
              if (trackingNum && existingOrder.trackingNumber !== trackingNum) {
                existingOrder.trackingNumber = trackingNum;
                needsSave = true;
              }
              if (courier && existingOrder.courierPartner !== courier) {
                existingOrder.courierPartner = courier;
                needsSave = true;
              }
              if (trackUrl && existingOrder.trackingUrl !== trackUrl) {
                existingOrder.trackingUrl = trackUrl;
                needsSave = true;
              }

              // 4. Payment Status Update
              if (rawOrd.paymentStatus && existingOrder.paymentStatus !== rawOrd.paymentStatus) {
                existingOrder.paymentStatus = rawOrd.paymentStatus;
                needsSave = true;
              }

              // 5. Backfill items if previously empty (WITHOUT stock deduction)
              const rawItems = Array.isArray(rawOrd.items)
                ? rawOrd.items.filter(itemRow => itemRow && typeof itemRow === 'object')
                : [];
              if (Array.isArray(existingOrder.items) && existingOrder.items.length === 0 && rawItems.length > 0) {
                const backfilledItems = [];
                for (const itemRow of rawItems) {
                  let product = null;
                  if (itemRow.sku) {
                    product = await Product.findOne({ sku: itemRow.sku });
                  }
                  const parsedQty = parseInt(itemRow.quantity, 10);
                  const qty = isNaN(parsedQty) || parsedQty <= 0 ? 1 : parsedQty;
                  const unitPrice = parseFloat(itemRow.unitPrice) || 0;
                  const totalPrice = parseFloat(itemRow.totalPrice) || parseFloat(itemRow.total) || (unitPrice * qty);

                  backfilledItems.push({
                    product: product ? product._id : undefined,
                    productSnapshot: {
                      masterName: product ? product.masterName : (itemRow.name || 'Unknown Product'),
                      sku: itemRow.sku || '',
                      brand: product ? product.brand : 'Generic',
                      sellingPrice: unitPrice,
                      mrp: product ? product.mrp : unitPrice,
                      images: product?.images?.length ? product.images.map(img => (typeof img === 'string' ? img : img?.url || '')) : []
                    },
                    platformProductId: itemRow.platformProductId || itemRow.asin || itemRow.listingId || '',
                    quantity: qty,
                    unitPrice,
                    totalPrice,
                    gstAmount: Math.round(unitPrice * qty * 0.18)
                  });
                }
                existingOrder.items = backfilledItems;
                needsSave = true;
              }

              if (needsSave && typeof existingOrder.save === 'function') {
                await existingOrder.save();
              }

              // Existing order handled safely — skip inventory deduction & creation
              continue;
            }

            // ── NEW ORDER BRANCH (Deduct inventory exactly once) ──────────────
            const rawItems = Array.isArray(rawOrd.items)
              ? rawOrd.items.filter(itemRow => itemRow && typeof itemRow === 'object')
              : [];

            const resolvedItems = [];
            for (const itemRow of rawItems) {
              let product = null;
              if (itemRow.sku) {
                product = await Product.findOne({ sku: itemRow.sku });
              }

              const parsedQty = parseInt(itemRow.quantity, 10);
              const quantity = (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : 0;
              const unitPrice = parseFloat(itemRow.unitPrice) || 0;
              const parsedTotal = parseFloat(itemRow.totalPrice);
              const totalPrice = (!isNaN(parsedTotal) && parsedTotal >= 0) ? parsedTotal : (parseFloat(itemRow.total) || (unitPrice * quantity));
              const gstAmount = Math.round(unitPrice * quantity * 0.18);

              resolvedItems.push({
                product: product ? product._id : undefined,
                productSnapshot: {
                  masterName: product ? product.masterName : (itemRow.name || 'Unknown Product'),
                  sku: itemRow.sku || '',
                  brand: product ? product.brand : 'Generic',
                  sellingPrice: unitPrice,
                  mrp: product ? product.mrp : unitPrice,
                  images: product?.images?.length ? product.images.map(img => (typeof img === 'string' ? img : img?.url || '')) : []
                },
                platformProductId: itemRow.platformProductId || itemRow.asin || itemRow.listingId || '',
                quantity,
                unitPrice,
                totalPrice,
                gstAmount
              });

              if (product && !existingOrder && quantity > 0) {
                const previousStock = Number(product.totalStock) || 0;
                const deductQty = quantity;
                product.totalStock = Math.max(0, previousStock - deductQty);

                if (!product.stockByPlatform) {
                  product.stockByPlatform = {};
                }
                if (item.key === 'fifozone' && typeof product.stockByPlatform.fifozone === 'number') {
                  product.stockByPlatform.fifozone = Math.max(0, product.stockByPlatform.fifozone - deductQty);
                } else if (item.key === 'amazon' && typeof product.stockByPlatform.amazon === 'number') {
                  product.stockByPlatform.amazon = Math.max(0, product.stockByPlatform.amazon - deductQty);
                } else if (item.key === 'flipkart' && typeof product.stockByPlatform.flipkart === 'number') {
                  product.stockByPlatform.flipkart = Math.max(0, product.stockByPlatform.flipkart - deductQty);
                }

                product.totalSold = (Number(product.totalSold) || 0) + deductQty;
                product.soldThisMonth = (Number(product.soldThisMonth) || 0) + deductQty;
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
                if (typeof product.lowStockThreshold === 'number' && product.totalStock <= product.lowStockThreshold) {
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

            // Create unified Order record
            const orderNumber = await this.generateOrderNumber();
            const order = new Order({
              orderNumber,
              platformOrderId: rawOrd.platformOrderId,
              orderDate: rawOrd.orderDate ? new Date(rawOrd.orderDate) : new Date(),
              platform: item.key,
              customer: rawOrd.customer || { name: 'Unknown Customer' },
              shippingAddress: rawOrd.shippingAddress || { line1: 'N/A', city: 'Unknown', state: 'XX', pincode: '000000', country: 'India' },
              billingAddress: rawOrd.billingAddress || {},
              items: resolvedItems,
              subtotal: parseFloat(rawOrd.subtotal) || 0,
              shippingCharge: parseFloat(rawOrd.shippingCharge) || 0,
              totalAmount: parseFloat(rawOrd.totalAmount) || 0,
              paymentMethod: rawOrd.paymentMethod || 'Prepaid',
              paymentStatus: rawOrd.paymentStatus || 'pending',
              status: internalStatus,
              statusHistory: [{ status: internalStatus, timestamp: new Date(), note: `Order imported via platform sync (${rawOrd.platformStatus || 'pending'})` }],
              trackingNumber: trackingNum,
              courierPartner: courier,
              trackingUrl: trackUrl,
              rawPlatformData: rawOrd
            });

            await order.save();

            // Create New Order Notification
            await notificationService.createNotification({
              type: 'new_order',
              title: `New Order Imported (${item.key.toUpperCase()})`,
              message: `Order #${order.orderNumber} placed by ${order.customer?.name || 'Customer'} (Amount: INR ${order.totalAmount})`,
              severity: 'info',
              order: order._id,
              platform: item.key
            });
          } catch (orderError) {
            logger.warn(`[Sync] Failed processing order ${rawOrd?.platformOrderId || 'unknown'} for ${item.key}: ${orderError.message}`);
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
      try { await FifozoneOmsService.pushStock(sku, product.stockByPlatform?.fifozone ?? product.totalStock); }
      catch (err) { logger.error(`Failed to push stock to Fifozone OMS for ${sku}: ${err.message}`); }
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
      try { await FifozoneOmsService.pushPrice(sku, product.sellingPrice.fifozone); }
      catch (err) { logger.error(`Failed to push price to Fifozone OMS for ${sku}: ${err.message}`); }
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

  // 5. Push a NEW product to Fifozone
  async pushProductCreate(product) {
    try {
      const result = await FifozoneOmsService.createProduct(product);
      if (result?.wooProductId) {
        // Save product ID back to our DB record
        await Product.findByIdAndUpdate(product._id, {
          $set: {
            'platformIds.fifozone.productId': String(result.wooProductId),
            'platformStatus.fifozone': 'active',
            'lastSyncedAt.fifozone': new Date(),
          }
        });
        logger.info(`[SyncService] "${product.masterName}" created on Fifozone OMS (ID: ${result.wooProductId})`);
      }
      return result;
    } catch (err) {
      logger.error(`[SyncService] pushProductCreate failed for "${product.masterName}": ${err.message}`);
      throw err;
    }
  }

  // 6. Push an UPDATED product to Fifozone
  async pushProductUpdate(product) {
    try {
      const result = await FifozoneOmsService.updateProduct(product);
      await Product.findByIdAndUpdate(product._id, {
        $set: { 'lastSyncedAt.fifozone': new Date() }
      });
      logger.info(`[SyncService] "${product.masterName}" updated on Fifozone OMS`);
      return result;
    } catch (err) {
      logger.error(`[SyncService] pushProductUpdate failed for "${product.masterName}": ${err.message}`);
      throw err;
    }
  }

  // 7. Push a DELETE to Fifozone
  async pushProductDelete(product) {
    try {
      const result = await FifozoneOmsService.deleteProduct(product);
      logger.info(`[SyncService] "${product.masterName}" deleted on Fifozone OMS`);
      return result;
    } catch (err) {
      logger.error(`[SyncService] pushProductDelete failed for "${product.masterName}": ${err.message}`);
      throw err;
    }
  }

  // 8. Push Order status & tracking updates to Fifozone OMS
  async pushOrderUpdate(orderId, updateData) {
    try {
      const result = await FifozoneOmsService.updateOrder(orderId, updateData);
      logger.info(`[SyncService] Order #${orderId} updated on Fifozone OMS`);
      return result;
    } catch (err) {
      logger.error(`[SyncService] pushOrderUpdate failed for #${orderId}: ${err.message}`);
      throw err;
    }
  }
}

module.exports = new SyncService();
