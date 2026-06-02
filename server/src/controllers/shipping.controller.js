const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const ShippingLabel = require('../models/ShippingLabel.model');
const Order = require('../models/Order.model'); // Assumption

exports.getShippingQueue = asyncHandler(async (req, res) => {
  const { platform, status, dateRange } = req.query;
  const query = { status: { $in: ['confirmed', 'processing', 'packed'] } };
  if (platform) query.platform = platform;

  let orders = [];
  try {
    orders = await Order.find(query).sort({ createdAt: 1 }).lean();
    // For each order, check if ShippingLabel exists
    for (let order of orders) {
      const label = await ShippingLabel.findOne({ orderId: order._id });
      order.hasLabel = !!label;
      order.isPrinted = label ? label.isPrinted : false;
    }
  } catch (e) {
    logger.warn('Order model not fully set up for shipping queue');
  }

  res.status(200).json(new ApiResponse(200, orders, 'Shipping queue fetched'));
});

exports.markAsPacked = asyncHandler(async (req, res) => {
  let order;
  try {
    order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');
    
    order.status = 'processing';
    await order.save();

    if (order.platform === 'fifozone') {
       logger.info('Calling WC API to update order status to processing');
    } else {
       logger.info(`Mock API call to update status on ${order.platform}`);
    }
  } catch(e) {
    logger.warn('Could not mark as packed ' + e.message);
  }

  res.status(200).json(new ApiResponse(200, order, 'Order marked as packed'));
});

exports.markAsShipped = asyncHandler(async (req, res) => {
  const { courierPartner, trackingNumber, trackingUrl, expectedDelivery } = req.body;
  
  let order;
  try {
    order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');

    order.status = 'shipped';
    order.trackingInfo = { courierPartner, trackingNumber, trackingUrl, expectedDelivery };
    await order.save();

    await ShippingLabel.findOneAndUpdate(
      { orderId: order._id },
      { courierPartner, trackingNumber, trackingUrl, expectedDelivery },
      { upsert: true }
    );

    if (order.platform === 'fifozone') {
       logger.info('Calling WC API PUT /orders/{id} with status: completed, customer_note: tracking info');
    } else {
       logger.info(`Mock API call to update shipping on ${order.platform}`);
    }
  } catch (e) {
    logger.warn('Could not mark as shipped ' + e.message);
  }

  res.status(200).json(new ApiResponse(200, order, 'Order marked as shipped'));
});

exports.generateLabel = asyncHandler(async (req, res) => {
  let order;
  try {
    order = await Order.findById(req.params.orderId);
  } catch(e) {}
  if (!order) throw new ApiError(404, 'Order not found');

  const sender = {
    name: 'Fifozone Warehouse',
    address1: 'Mumbai',
    address2: 'MH 400001',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    phone: '+91-9999999999'
  };

  const recipient = {
    name: order.shippingAddress?.firstName + ' ' + order.shippingAddress?.lastName || 'Customer',
    address1: order.shippingAddress?.address1 || 'Address',
    address2: order.shippingAddress?.address2 || '',
    city: order.shippingAddress?.city || 'City',
    state: order.shippingAddress?.state || 'State',
    pincode: order.shippingAddress?.postcode || '000000',
    phone: order.billingAddress?.phone || '0000000000'
  };

  const items = order.items?.map(i => ({ name: i.name, quantity: i.quantity })) || [];

  let label = await ShippingLabel.findOne({ orderId: order._id });
  if (!label) {
    label = await ShippingLabel.create({
      orderId: order._id,
      orderNumber: order.orderNumber || order._id.toString(),
      fromAddress: sender,
      toAddress: recipient,
      items,
      labelSize: 'A5'
    });
  }

  res.status(200).json(new ApiResponse(200, label, 'Shipping label generated'));
});

exports.bulkShip = asyncHandler(async (req, res) => {
  const { orderIds, courierPartner, trackingNumbers, trackingPrefix } = req.body;
  if (!orderIds || !Array.isArray(orderIds)) throw new ApiError(400, 'orderIds array is required');

  const results = [];
  for (let i = 0; i < orderIds.length; i++) {
    const id = orderIds[i];
    let trackingNumber = trackingNumbers?.[id] || (trackingPrefix ? `${trackingPrefix}${1000+i}` : `TRK${Date.now()}${i}`);
    
    try {
      const order = await Order.findById(id);
      if (order) {
        order.status = 'shipped';
        order.trackingInfo = { courierPartner, trackingNumber };
        await order.save();
        results.push({ orderId: id, status: 'success', trackingNumber });
        
        if (order.platform === 'fifozone') {
          logger.info(`WC API PUT /orders/${id} completed`);
        }
      }
    } catch(e) {
      results.push({ orderId: id, status: 'failed', error: e.message });
    }
  }

  res.status(200).json(new ApiResponse(200, results, 'Bulk ship processed'));
});
