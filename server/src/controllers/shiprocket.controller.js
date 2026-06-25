const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const Order = require('../models/Order.model');
const ShiprocketService = require('../services/shiprocket.service');
const logger = require('../utils/logger');

exports.pushOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.shiprocketOrderId) throw new ApiError(400, 'Order already pushed to Shiprocket');

  const srResponse = await ShiprocketService.createOrder(order);

  order.shiprocketOrderId = srResponse.order_id;
  order.shiprocketShipmentId = srResponse.shipment_id;
  order.shiprocketStatus = srResponse.status;
  await order.save();

  res.json(new ApiResponse(200, order, 'Order pushed to Shiprocket successfully'));
});

exports.bulkPushOrders = asyncHandler(async (req, res) => {
  const { orderIds } = req.body;
  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    throw new ApiError(400, 'No order IDs provided');
  }

  const results = { successful: 0, failed: 0, errors: [] };

  for (const id of orderIds) {
    try {
      const order = await Order.findById(id);
      if (!order) {
        results.failed++;
        results.errors.push({ id, message: 'Order not found' });
        continue;
      }
      if (order.shiprocketOrderId) {
        results.failed++;
        results.errors.push({ id, message: 'Already pushed to Shiprocket' });
        continue;
      }

      const srResponse = await ShiprocketService.createOrder(order);
      order.shiprocketOrderId = srResponse.order_id;
      order.shiprocketShipmentId = srResponse.shipment_id;
      order.shiprocketStatus = srResponse.status;
      await order.save();
      results.successful++;
    } catch (err) {
      results.failed++;
      results.errors.push({ id, message: err.message });
    }
  }

  res.json(new ApiResponse(200, results, `Bulk push completed. ${results.successful} succeeded, ${results.failed} failed.`));
});

exports.generateAWB = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (!order.shiprocketShipmentId) throw new ApiError(400, 'Order not pushed to Shiprocket yet');
  if (order.awbCode) throw new ApiError(400, 'AWB already generated');

  const srResponse = await ShiprocketService.generateAWB(order.shiprocketShipmentId);
  
  if (srResponse.awb_assign_status === 1) {
    order.awbCode = srResponse.response.data.awb_code;
    order.courierPartner = srResponse.response.data.courier_name;
    order.trackingUrl = srResponse.response.data.track_url;
    order.status = 'shipped';
    
    order.statusHistory.push({
      status: 'shipped',
      note: `AWB Generated via Shiprocket: ${order.awbCode}`,
      updatedBy: req.user._id
    });

    await order.save();
    res.json(new ApiResponse(200, order, 'AWB generated successfully'));
  } else {
    throw new ApiError(400, 'Failed to assign AWB via Shiprocket');
  }
});

exports.requestPickup = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (!order.awbCode) throw new ApiError(400, 'AWB not generated yet');

  const srResponse = await ShiprocketService.requestPickup(order.shiprocketShipmentId);
  
  res.json(new ApiResponse(200, srResponse, 'Pickup requested successfully'));
});

exports.webhookListener = asyncHandler(async (req, res) => {
  const payload = req.body;
  logger.info(`Shiprocket Webhook received for AWB: ${payload.awb}`);

  const order = await Order.findOne({ awbCode: payload.awb });
  if (!order) {
    return res.status(200).send('Order not found'); // Send 200 so Shiprocket stops retrying
  }

  // Map Shiprocket status to Fifozone status
  const srStatus = payload.current_status;
  let newStatus = null;
  
  if (srStatus === 'OUT FOR DELIVERY') newStatus = 'out_for_delivery';
  else if (srStatus === 'DELIVERED') newStatus = 'delivered';
  else if (srStatus === 'RTO INITIATED') newStatus = 'returned';
  else if (srStatus === 'RTO DELIVERED') newStatus = 'returned';
  else if (srStatus === 'CANCELED') newStatus = 'cancelled';

  if (newStatus && order.status !== newStatus) {
    order.status = newStatus;
    if (newStatus === 'delivered') order.deliveredAt = new Date();
    
    order.statusHistory.push({
      status: newStatus,
      note: `Shiprocket Webhook Update: ${srStatus}`,
      timestamp: new Date()
    });

    await order.save();
  }

  res.status(200).send('Webhook processed');
});
