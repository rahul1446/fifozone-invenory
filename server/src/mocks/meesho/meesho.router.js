'use strict';
const express = require('express');
const router = express.Router();
const { meeshoListings } = require('./meesho.products.mock');
const { meeshoOrders }   = require('./meesho.orders.mock');

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post('/auth/token', (req, res) => {
  res.json({ access_token: 'mock_meesho_token_' + Date.now(), token_type: 'Bearer', expires_in: 3600 });
});

// ── Products / Listings ───────────────────────────────────────────────────────
router.get('/listings', (req, res) => {
  const { page = 1, page_size = 50 } = req.query;
  const start = (page - 1) * page_size;
  const slice = meeshoListings.slice(start, start + parseInt(page_size));
  res.json({ listings: slice, total: meeshoListings.length, page: parseInt(page) });
});

router.get('/products', (req, res) => {
  res.json({ products: meeshoListings, total: meeshoListings.length });
});

router.patch('/inventory', (req, res) => {
  const { sku, quantity } = req.body;
  const product = meeshoListings.find(p => p.supplier_sku === sku);
  if (product) product.inventory = quantity;
  res.json({ success: true, message: 'Inventory updated', sku, quantity });
});

router.patch('/listings', (req, res) => {
  const { sku, selling_price } = req.body;
  const product = meeshoListings.find(p => p.supplier_sku === sku);
  if (product) product.selling_price = selling_price;
  res.json({ success: true, message: 'Price updated', sku, selling_price });
});

// ── Orders ────────────────────────────────────────────────────────────────────
router.get('/orders', (req, res) => {
  const { status, from_date } = req.query;
  let orders = [...meeshoOrders];
  if (status) orders = orders.filter(o => o.status === status.toUpperCase());
  if (from_date) orders = orders.filter(o => new Date(o.created_at) >= new Date(from_date));
  res.json({ orders, total: orders.length });
});

router.get('/orders/:orderId', (req, res) => {
  const order = meeshoOrders.find(o => o.order_id === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

router.post('/orders/:orderId/confirm', (req, res) => {
  const order = meeshoOrders.find(o => o.order_id === req.params.orderId);
  if (order) order.status = 'CONFIRMED';
  res.json({ success: true, order_id: req.params.orderId });
});

router.post('/orders/:orderId/ship', (req, res) => {
  const order = meeshoOrders.find(o => o.order_id === req.params.orderId);
  if (order) { order.status = 'SHIPPED'; order.tracking_id = req.body.tracking_id || 'MSH-TRK-' + Date.now(); }
  res.json({ success: true, order_id: req.params.orderId });
});

// ── Returns ───────────────────────────────────────────────────────────────────
router.get('/returns', (req, res) => {
  res.json({ returns: [], total: 0 });
});

// ── Account Health ────────────────────────────────────────────────────────────
router.get('/account/health', (req, res) => {
  res.json({
    overall_rating: 4.2,
    orders_defect_rate: '1.2%',
    cancellation_rate: '0.8%',
    late_shipment_rate: '0.5%',
    status: 'GOOD',
    badge: 'Star Supplier',
  });
});

// ── Promotions ────────────────────────────────────────────────────────────────
router.get('/promotions', (req, res) => {
  res.json({
    promotions: [
      { promotion_id: 'PROMO-MSH-001', name: 'Summer Pet Sale', type: 'percentage', value: 10, status: 'ACTIVE', start_date: new Date(Date.now() - 86400000 * 2).toISOString(), end_date: new Date(Date.now() + 86400000 * 5).toISOString() },
    ]
  });
});

router.post('/promotions', (req, res) => {
  res.status(201).json({ promotion_id: 'PROMO-MSH-' + Date.now(), status: 'CREATED' });
});

module.exports = router;
