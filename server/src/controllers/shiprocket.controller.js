const asyncHandler      = require('../utils/asyncHandler');
const ApiResponse       = require('../utils/ApiResponse');
const ApiError          = require('../utils/ApiError');
const Order             = require('../models/Order.model');
const ShiprocketService = require('../services/shiprocket.service');
const logger            = require('../utils/logger');

// ─── Push single order ───────────────────────────────────────
exports.pushOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('items.product');
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.shiprocketOrderId) throw new ApiError(400, 'Order already pushed to Shiprocket');

  // Allow caller to override pickup location per push
  const pickupLocationOverride = req.body?.pickupLocation || null;

  let srRes;
  try {
    srRes = await ShiprocketService.createOrder(order, pickupLocationOverride);
  } catch (err) {
    if (err.message?.startsWith('WRONG_PICKUP_LOCATION') && err.pickupLocations) {
      // Return the valid pickup locations so the frontend can show a picker
      return res.status(422).json({
        success: false,
        message: 'Please select a valid pickup location',
        code: 'WRONG_PICKUP_LOCATION',
        pickupLocations: err.pickupLocations,
      });
    }
    throw new ApiError(422, err.message);
  }

  logger.info('Shiprocket pushOrder srRes:', JSON.stringify(srRes));

  // Save IDs — convert to string since Shiprocket returns numbers
  order.shiprocketOrderId    = String(srRes.order_id    || srRes.shipment_id || '');
  order.shiprocketShipmentId = String(srRes.shipment_id || srRes.order_id    || '');
  order.shiprocketStatus     = srRes.status || 'NEW';

  // Also update the order status to processing/confirmed
  if (order.status === 'pending' || order.status === 'processing') {
    order.status = 'confirmed';
    order.statusHistory.push({
      status: 'confirmed',
      note: `Pushed to Shiprocket — Order ID: ${order.shiprocketOrderId}`,
      updatedBy: req.user?._id
    });
  }

  await order.save();

  res.json(new ApiResponse(200, order, 'Order pushed to Shiprocket successfully'));
});

// ─── Bulk push ───────────────────────────────────────────────
exports.bulkPushOrders = asyncHandler(async (req, res) => {
  const { orderIds } = req.body;
  if (!orderIds?.length) throw new ApiError(400, 'No order IDs provided');

  const results = { successful: 0, failed: 0, errors: [] };
  for (const id of orderIds) {
    try {
      const order = await Order.findById(id);
      if (!order) { results.failed++; results.errors.push({ id, message: 'Not found' }); continue; }
      if (order.shiprocketOrderId) { results.failed++; results.errors.push({ id, message: 'Already pushed' }); continue; }
      const srRes = await ShiprocketService.createOrder(order);
      order.shiprocketOrderId  = srRes.order_id;
      order.shiprocketShipmentId = srRes.shipment_id;
      order.shiprocketStatus   = srRes.status;
      await order.save();
      results.successful++;
    } catch (err) {
      results.failed++;
      results.errors.push({ id, message: err.message });
    }
  }
  res.json(new ApiResponse(200, results, `Bulk push: ${results.successful} succeeded, ${results.failed} failed`));
});

// ─── Cancel order ────────────────────────────────────────────
exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (!order.shiprocketOrderId) throw new ApiError(400, 'Order not pushed to Shiprocket yet');

  await ShiprocketService.cancelOrder([Number(order.shiprocketOrderId)]);

  order.status = 'cancelled';
  order.shiprocketStatus = 'CANCELED';
  order.statusHistory.push({ status: 'cancelled', note: 'Cancelled via Shiprocket', updatedBy: req.user?._id });
  await order.save();

  res.json(new ApiResponse(200, order, 'Order cancelled on Shiprocket'));
});

// ─── Generate AWB ────────────────────────────────────────────
exports.generateAWB = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (!order.shiprocketShipmentId) throw new ApiError(400, 'Order not pushed to Shiprocket yet');
  if (order.awbCode) throw new ApiError(400, 'AWB already generated');

  const { courierId } = req.body;
  const srRes = await ShiprocketService.generateAWB(order.shiprocketShipmentId, courierId);

  if (srRes.awb_assign_status === 1) {
    order.awbCode       = srRes.response?.data?.awb_code;
    order.courierPartner = srRes.response?.data?.courier_name;
    order.trackingUrl   = srRes.response?.data?.track_url;
    order.status        = 'shipped';
    order.statusHistory.push({ status: 'shipped', note: `AWB Generated: ${order.awbCode}`, updatedBy: req.user?._id });
    await order.save();
    res.json(new ApiResponse(200, order, 'AWB generated successfully'));
  } else {
    throw new ApiError(400, 'Failed to assign AWB via Shiprocket');
  }
});

// ─── Request Pickup ──────────────────────────────────────────
exports.requestPickup = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (!order.awbCode) throw new ApiError(400, 'AWB not generated yet');

  const srRes = await ShiprocketService.requestPickup(order.shiprocketShipmentId);
  res.json(new ApiResponse(200, srRes, 'Pickup requested successfully'));
});

// ─── Print Label ─────────────────────────────────────────────
exports.printLabel = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (!order.shiprocketShipmentId) throw new ApiError(400, 'Order not pushed to Shiprocket yet');

  const srRes = await ShiprocketService.printLabel([order.shiprocketShipmentId]);
  res.json(new ApiResponse(200, srRes, 'Label generated'));
});

// ─── Print Invoice ───────────────────────────────────────────
exports.printInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (!order.shiprocketOrderId) throw new ApiError(400, 'Order not pushed to Shiprocket yet');

  const srRes = await ShiprocketService.printInvoice([Number(order.shiprocketOrderId)]);
  res.json(new ApiResponse(200, srRes, 'Invoice generated'));
});

// ─── Generate Manifest ───────────────────────────────────────
exports.generateManifest = asyncHandler(async (req, res) => {
  const { shipmentIds } = req.body;
  if (!shipmentIds?.length) throw new ApiError(400, 'No shipment IDs provided');
  const srRes = await ShiprocketService.generateManifest(shipmentIds);
  res.json(new ApiResponse(200, srRes, 'Manifest generated'));
});

// ─── Track Shipment ──────────────────────────────────────────
exports.trackShipment = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (!order.awbCode) throw new ApiError(400, 'AWB not generated yet. Cannot track.');

  const srRes = await ShiprocketService.trackShipment(order.awbCode);
  res.json(new ApiResponse(200, srRes, 'Tracking info fetched'));
});

// ─── Check Serviceability ────────────────────────────────────
exports.checkServiceability = asyncHandler(async (req, res) => {
  const { pickupPostcode, deliveryPostcode, weight, cod } = req.query;
  if (!pickupPostcode || !deliveryPostcode) throw new ApiError(400, 'pickupPostcode and deliveryPostcode are required');

  const srRes = await ShiprocketService.checkServiceability({ pickupPostcode, deliveryPostcode, weight, cod: cod === 'true' });
  res.json(new ApiResponse(200, srRes, 'Serviceability checked'));
});

// ─── Get Available Couriers ──────────────────────────────────
exports.getAvailableCouriers = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (!order.shiprocketShipmentId) throw new ApiError(400, 'Order not pushed to Shiprocket yet');

  const srRes = await ShiprocketService.getAvailableCouriers(order.shiprocketShipmentId);
  res.json(new ApiResponse(200, srRes, 'Couriers fetched'));
});

// ─── Get Pickup Locations ────────────────────────────────────
exports.getPickupLocations = asyncHandler(async (req, res) => {
  const srRes = await ShiprocketService.getPickupLocations();
  res.json(new ApiResponse(200, srRes, 'Pickup locations fetched'));
});

// ─── NDR List ────────────────────────────────────────────────
exports.getNDRList = asyncHandler(async (req, res) => {
  const srRes = await ShiprocketService.getNDRList();
  res.json(new ApiResponse(200, srRes, 'NDR list fetched'));
});

// ─── Submit NDR Action ───────────────────────────────────────
exports.submitNDRAction = asyncHandler(async (req, res) => {
  const { awbCode, action, remarks } = req.body;
  if (!awbCode || !action) throw new ApiError(400, 'awbCode and action are required');
  const srRes = await ShiprocketService.submitNDRAction(awbCode, action, remarks);
  res.json(new ApiResponse(200, srRes, 'NDR action submitted'));
});

// ─── All Shiprocket Shipments (aggregated from DB) ──────────
exports.getAllShipments = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  const query = { shiprocketOrderId: { $exists: true, $ne: null } };
  if (status) query.shiprocketStatus = status;

  const shipments = await Order.find(query)
    .select('orderNumber customer platform status shiprocketOrderId shiprocketShipmentId shiprocketStatus awbCode courierPartner trackingUrl createdAt')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Order.countDocuments(query);
  res.json(new ApiResponse(200, { shipments, total, page: Number(page) }, 'Shipments fetched'));
});

// ─── Webhook ─────────────────────────────────────────────────
exports.webhookListener = asyncHandler(async (req, res) => {
  const payload = req.body;
  logger.info(`Shiprocket Webhook: AWB=${payload.awb}, status=${payload.current_status}`);

  const order = await Order.findOne({ awbCode: payload.awb });
  if (!order) return res.status(200).send('OK');

  const statusMap = {
    'PICKED UP':        'processing',
    'IN TRANSIT':       'shipped',
    'OUT FOR DELIVERY': 'out_for_delivery',
    'DELIVERED':        'delivered',
    'RTO INITIATED':    'returned',
    'RTO DELIVERED':    'returned',
    'CANCELED':         'cancelled',
    'NDR':              'shipped', // stays shipped but flagged
  };

  const srStatus  = payload.current_status;
  const newStatus = statusMap[srStatus];

  if (newStatus && order.status !== newStatus) {
    order.status = newStatus;
    if (newStatus === 'delivered') order.deliveredAt = new Date();
    order.shiprocketStatus = srStatus;
    order.statusHistory.push({ status: newStatus, note: `Shiprocket: ${srStatus}`, timestamp: new Date() });
    await order.save();
  }

  res.status(200).send('OK');
});

// ─── Get Pickup Locations ────────────────────────────────────
exports.getPickupLocations = asyncHandler(async (req, res) => {
  try {
    const headers = await ShiprocketService.getHeaders();
    const axios   = require('axios');

    // Shiprocket returns pickup locations from this endpoint
    const r = await axios.get(
      'https://apiv2.shiprocket.in/v1/external/settings/company/pickup',
      { headers, timeout: 15000 }
    );

    logger.info('Shiprocket pickup raw:', JSON.stringify(r.data).substring(0, 500));

    // Shiprocket wraps it in multiple shapes — handle all
    const d    = r.data;
    const arr  = Array.isArray(d)         ? d
               : Array.isArray(d?.data)   ? d.data
               : Array.isArray(d?.data?.data) ? d.data.data
               : [];

    const locations = arr.map(l => ({
      id:      l.id,
      name:    l.pickup_location,
      address: [l.address, l.address_2, l.city, l.state, l.pin_code].filter(Boolean).join(', '),
      city:    l.city,
      pincode: l.pin_code,
      primary: l.status === 2,
    })).sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));

    res.json(new ApiResponse(200, locations, 'Pickup locations fetched'));
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    logger.error('getPickupLocations failed:', msg);
    // Return empty array with error info — frontend will show manual input fallback
    res.json(new ApiResponse(200, [], `Could not load pickup locations: ${msg}`));
  }
});
