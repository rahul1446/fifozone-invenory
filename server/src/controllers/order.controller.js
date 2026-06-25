const Order = require('../models/Order.model');
const Product = require('../models/Product.model');
const InventoryLog = require('../models/InventoryLog.model');
const ReturnRequest = require('../models/ReturnRequest.model');
const SyncService = require('../services/sync.service');
const notificationService = require('../services/notification.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

// Retrieve all orders with filters
const getOrders = asyncHandler(async (req, res) => {
  const {
    search,
    platform,
    status,
    paymentStatus,
    startDate,
    endDate,
    page = 1,
    limit = 20
  } = req.query;

  const query = {};

  // Search logic
  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { platformOrderId: { $regex: search, $options: 'i' } },
      { 'customer.name': { $regex: search, $options: 'i' } },
      { 'customer.phone': { $regex: search, $options: 'i' } },
      { 'items.productSnapshot.masterName': { $regex: search, $options: 'i' } }
    ];
  }

  // Filters
  if (platform && platform !== 'All') {
    query.platform = platform.toLowerCase();
  }
  if (status && status !== 'All') {
    query.status = status.toLowerCase();
  } else {
    // If 'All' is selected, exclude drafts just like WooCommerce does
    query.status = { $nin: ['draft', 'trash'] };
  }
  if (paymentStatus && paymentStatus !== 'All') {
    query.paymentStatus = paymentStatus.toLowerCase();
  }
  if (req.query.paymentMethod && req.query.paymentMethod !== 'All') {
    query.paymentMethod = { $regex: new RegExp(`^${req.query.paymentMethod}$`, 'i') };
  }

  // Date range
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .sort({ orderDate: -1, createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  res.status(200).json(
    new ApiResponse(200, {
      orders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    }, 'Orders fetched successfully')
  );
});

// Single Order detail
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('returnRequest');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  res.status(200).json(new ApiResponse(200, order, 'Order details retrieved'));
});

// Update Order Status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note, courierPartner, trackingNumber } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const oldStatus = order.status;

  if (courierPartner) order.courierPartner = courierPartner;
  if (trackingNumber) {
    order.trackingNumber = trackingNumber;
    order.trackingUrl = `https://track.delhivery.com/shipping-tracking?awb=${trackingNumber}`;
  }

  order.status = status;
  order.statusHistory.push({
    status,
    updatedBy: req.user._id,
    note: note || `Order status updated to ${status}`
  });

  // Handle Order Cancellation (Restock logic)
  if (status === 'cancelled' && oldStatus !== 'cancelled') {
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        const prevStock = product.totalStock;
        product.totalStock += item.quantity;
        
        // Restore to e-commerce platform stock pool
        if (order.platform === 'fifozone') {
          product.stockByPlatform.fifozone += item.quantity;
        } else if (order.platform === 'amazon') {
          product.stockByPlatform.amazon += item.quantity;
        } else if (order.platform === 'flipkart') {
          product.stockByPlatform.flipkart += item.quantity;
        }

        await product.save();

        // Write audit log
        await InventoryLog.create({
          product: product._id,
          productName: product.masterName,
          sku: product.sku,
          changeType: 'return',
          platform: order.platform,
          orderId: order._id,
          previousStock: prevStock,
          changeQuantity: item.quantity,
          newStock: product.totalStock,
          performedBy: req.user._id,
          note: `Restocked on order cancellation: #${order.orderNumber}`
        });

        // Trigger platform sync
        SyncService.pushStockToPlatforms(product);
      }
    }
  }

  // Set Delivered timestamp
  if (status === 'delivered') {
    order.deliveredAt = new Date();
    order.paymentStatus = 'paid'; // delivery completes payments usually

    // Audit Log for delivery event only (no physical quantity change since it was deducted on sale import)
    for (const item of order.items) {
      await InventoryLog.create({
        product: item.product,
        productName: item.productSnapshot.masterName,
        sku: item.productSnapshot.sku,
        changeType: 'delivered',
        platform: order.platform,
        orderId: order._id,
        previousStock: 0,
        changeQuantity: 0,
        newStock: 0,
        performedBy: req.user._id,
        note: `Order #${order.orderNumber} successfully marked delivered`
      });
    }
  }

  await order.save();

  // Create real-time notification
  await notificationService.createNotification({
    type: 'manual',
    title: `Order Status Updated`,
    message: `Order #${order.orderNumber} is now [${status.toUpperCase()}]`,
    severity: 'info',
    order: order._id,
    platform: order.platform
  });

  res.status(200).json(new ApiResponse(200, order, `Order status updated to ${status}`));
});

// Bulk Status Updates
const bulkUpdateStatus = asyncHandler(async (req, res) => {
  const { orderIds, status, note } = req.body;

  if (!orderIds || !orderIds.length) {
    throw new ApiError(400, 'Order IDs list required');
  }

  let successCount = 0;
  for (const id of orderIds) {
    try {
      const order = await Order.findById(id);
      if (!order) continue;

      const oldStatus = order.status;
      order.status = status;
      order.statusHistory.push({
        status,
        updatedBy: req.user._id,
        note: note || `Bulk updated to ${status}`
      });

      if (status === 'cancelled' && oldStatus !== 'cancelled') {
        for (const item of order.items) {
          const product = await Product.findById(item.product);
          if (product) {
            const prevStock = product.totalStock;
            product.totalStock += item.quantity;
            
            if (order.platform === 'fifozone') product.stockByPlatform.fifozone += item.quantity;
            else if (order.platform === 'amazon') product.stockByPlatform.amazon += item.quantity;
            else if (order.platform === 'flipkart') product.stockByPlatform.flipkart += item.quantity;

            await product.save();

            await InventoryLog.create({
              product: product._id,
              productName: product.masterName,
              sku: product.sku,
              changeType: 'return',
              platform: order.platform,
              orderId: order._id,
              previousStock: prevStock,
              changeQuantity: item.quantity,
              newStock: product.totalStock,
              performedBy: req.user._id,
              note: `Restocked on bulk cancellation: #${order.orderNumber}`
            });

            SyncService.pushStockToPlatforms(product);
          }
        }
      }

      if (status === 'delivered') {
        order.deliveredAt = new Date();
        order.paymentStatus = 'paid';
      }

      await order.save();
      successCount++;
    } catch (err) {
      logger.error(`Bulk update error for order ${id}: ${err.message}`);
    }
  }

  res.status(200).json(new ApiResponse(200, null, `Successfully updated ${successCount} orders`));
});

// Initiate Product Returns
const initiateReturn = asyncHandler(async (req, res) => {
  const { orderId, items, refundAmount, note } = req.body;
  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Create ReturnRequest
  const returnRequest = new ReturnRequest({
    order: order._id,
    platform: order.platform,
    customer: order.customer,
    items,
    status: 'requested',
    refundAmount,
    note
  });

  await returnRequest.save();

  order.status = 'return_requested';
  order.hasReturn = true;
  order.returnRequest = returnRequest._id;
  order.statusHistory.push({
    status: 'return_requested',
    updatedBy: req.user._id,
    note: `Return initiated: Request #${returnRequest._id}`
  });

  await order.save();

  // Create notifications
  await notificationService.createNotification({
    type: 'return_request',
    title: `Return Request Initiated (${order.platform.toUpperCase()})`,
    message: `Return request logged for Order #${order.orderNumber} (Refund value: INR ${refundAmount})`,
    severity: 'warning',
    order: order._id,
    platform: order.platform
  });

  res.status(201).json(new ApiResponse(201, returnRequest, 'Return request successfully initiated'));
});

// Get Return list
const getReturns = asyncHandler(async (req, res) => {
  const returns = await ReturnRequest.find()
    .populate('order')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, returns, 'Return requests fetched'));
});

// Resolve Return and Restock Items
const resolveReturn = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, note, itemConditions } = req.body; // status: approved, rejected, received, restocked

  const returnReq = await ReturnRequest.findById(id);
  if (!returnReq) {
    throw new ApiError(404, 'Return request not found');
  }

  returnReq.status = status;
  returnReq.note = note || returnReq.note;

  // Apply frontend item conditions if provided (Mapping of itemId -> condition)
  if (itemConditions && typeof itemConditions === 'object') {
    for (let item of returnReq.items) {
      if (itemConditions[item._id.toString()]) {
        item.condition = itemConditions[item._id.toString()];
      }
    }
  }

  // Stock Restoring Event
  if (status === 'restocked' && !returnReq.stockRestored) {
    let restockedCount = 0;
    let damagedCount = 0;

    for (const item of returnReq.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;

      const prevStock = product.totalStock;

      if (item.condition === 'good') {
        // Safe to return to physical stock
        product.totalStock += item.quantity;
        product.stockByPlatform.warehouse += item.quantity; // return to warehouse buffer pool
        await product.save();

        restockedCount += item.quantity;

        // Log audit addition
        await InventoryLog.create({
          product: product._id,
          productName: product.masterName,
          sku: product.sku,
          changeType: 'return',
          platform: 'warehouse',
          previousStock: prevStock,
          changeQuantity: item.quantity,
          newStock: product.totalStock,
          performedBy: req.user._id,
          note: `Restocked good returned item: Request ID #${returnReq._id}`
        });

        // Trigger e-commerce listings updates
        SyncService.pushStockToPlatforms(product);
      } else {
        // Damaged, expired, or opened -> log write-off
        damagedCount += item.quantity;

        await InventoryLog.create({
          product: product._id,
          productName: product.masterName,
          sku: product.sku,
          changeType: item.condition === 'expired' ? 'expired' : 'damaged',
          platform: 'warehouse',
          previousStock: prevStock,
          changeQuantity: -item.quantity, // Write off deduction
          newStock: prevStock, // count remains unchanged physically
          performedBy: req.user._id,
          note: `Returned item logged as [${item.condition.toUpperCase()}]: Request ID #${returnReq._id}`
        });
      }
    }

    returnReq.stockRestored = true;
    returnReq.stockRestoredAt = new Date();
    returnReq.restoredBy = req.user._id;

    // Update parent order status
    await Order.findByIdAndUpdate(returnReq.order, {
      $set: { status: 'returned', paymentStatus: 'refunded' }
    });

    returnReq.note = `${returnReq.note || ''} | Processed: ${restockedCount} restocked, ${damagedCount} written-off.`.trim();
  }

  await returnReq.save();

  res.status(200).json(new ApiResponse(200, returnReq, `Return status updated to ${status}`));
});


// Create Manual Order (for offline/phone/WhatsApp customers)
const createManualOrder = asyncHandler(async (req, res) => {
  const { customerName, customerPhone, customerAddress, items, platform, note, discount, discountReason, paymentMethod } = req.body;
  const orderNumber = `MAN-${Date.now()}`;
  const subtotal = (items || []).reduce((s, i) => s + (i.qty * i.price), 0);
  const discountAmount = parseFloat(discount) || 0;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  const order = await Order.create({
    orderNumber,
    platform: platform || 'fifozone',
    platformOrderId: orderNumber,
    customer: {
      name: customerName || 'Walk-in Customer',
      phone: customerPhone || '',
      address: { line1: customerAddress || '', city: '', state: '', pincode: '', country: 'India' }
    },
    shippingAddress: { line1: customerAddress || '', city: '-', state: '-', pincode: '000000', country: 'India' },
    items: (items || []).map(i => ({
      productName: i.productName,
      quantity: i.qty,
      unitPrice: i.price,
      totalPrice: i.qty * i.price,
      lineTotal: i.qty * i.price,
      productSnapshot: { masterName: i.productName, sku: i.sku || 'MANUAL', sellingPrice: i.price }
    })),
    subtotal,
    discount: discountAmount,
    discountReason: discountReason || '',
    totalAmount,
    paymentMethod: paymentMethod || 'cod',
    paymentStatus: 'pending',
    status: 'pending',
    internalNote: note || '',
    statusHistory: [{ status: 'pending', note: note || 'Manual order created' }],
  });
  res.status(201).json(new ApiResponse(201, order, 'Manual order created successfully'));
});

module.exports = {
  getOrders,
  getOrderById,
  updateOrderStatus,
  bulkUpdateStatus,
  initiateReturn,
  getReturns,
  resolveReturn,
  createManualOrder,
};
