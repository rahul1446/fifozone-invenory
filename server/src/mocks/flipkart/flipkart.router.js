const express = require('express');
const router = express.Router();

// ─── Import all Flipkart mock data ───────────────────────────────────────────
const { flipkartOrders } = require('./flipkart.orders.mock');
const { flipkartListings } = require('./flipkart.products.mock');
const { flipkartInventory } = require('./flipkart.inventory.mock');
const { flipkartReturns } = require('./flipkart.returns.mock');
const { flipkartPayments } = require('./flipkart.payments.mock');
const { flipkartMessages } = require('./flipkart.messages.mock');
const { flipkartReviews } = require('./flipkart.reviews.mock');
const { flipkartAdCampaigns } = require('./flipkart.advertising.mock');
const { flipkartSellerHealth } = require('./flipkart.health.mock');

// ─── Auth (Flipkart OAuth mock) ──────────────────────────────────────────────
router.post('/oauth/token', (req, res) => {
  res.json({
    access_token: 'mock_fk_token_' + Date.now(),
    token_type: 'bearer',
    expires_in: 3600,
  });
});

// ══════════════════════════════════════════════════════════════════
//  ORDERS — /mock/flipkart/orders
// ══════════════════════════════════════════════════════════════════
router.get('/orders', (req, res) => {
  const { state, from, to, page_size = 20, page_token } = req.query;
  let orders = [...flipkartOrders];
  if (state) orders = orders.filter(o => o.state === state);
  res.json({
    orders: orders.slice(0, parseInt(page_size)),
    next_page_token: null,
    has_more: false,
  });
});

router.get('/orders/:orderId', (req, res) => {
  const order = flipkartOrders.find(o => o.orderId === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'ORDER_NOT_FOUND', message: 'Order not found' });
  res.json(order);
});

// Dispatch (mark as packed)
router.post('/orders/:orderId/pack', (req, res) => {
  const order = flipkartOrders.find(o => o.orderId === req.params.orderId);
  if (order) {
    order.state = 'PACKED';
    order.orderItems.forEach(i => i.orderItemStatus = 'PACKED');
    order.invoiceDate = new Date().toISOString();
  }
  res.json({ status: 'success', message: 'Order packed successfully' });
});

router.post('/orders/:orderId/ship', (req, res) => {
  const order = flipkartOrders.find(o => o.orderId === req.params.orderId);
  if (order) {
    order.state = 'SHIPPED';
    order.orderItems.forEach(i => { i.orderItemStatus = 'SHIPPED'; i.trackingId = 'TRK' + Date.now(); });
  }
  res.json({ status: 'success', message: 'Order shipped successfully' });
});

router.post('/orders/:orderId/cancel', (req, res) => {
  const order = flipkartOrders.find(o => o.orderId === req.params.orderId);
  if (order) { order.state = 'CANCELLATION_APPROVED'; order.orderItems.forEach(i => i.orderItemStatus = 'CANCELLATION_APPROVED'); }
  res.json({ status: 'success', message: 'Order cancelled' });
});

// Bulk orders (used in production)
router.get('/orders/filter', (req, res) => {
  res.json({ orders: flipkartOrders.slice(0, 20), next_page_token: null });
});

// ══════════════════════════════════════════════════════════════════
//  LISTINGS — /mock/flipkart/listings
// ══════════════════════════════════════════════════════════════════
router.get('/listings', (req, res) => {
  const { state, page_size = 50 } = req.query;
  let listings = [...flipkartListings];
  if (state) listings = listings.filter(l => l.state === state);
  res.json({ listings: listings.slice(0, parseInt(page_size)), total: listings.length, next_page_token: null });
});

router.get('/listings/:listingId', (req, res) => {
  const listing = flipkartListings.find(l => l.listingId === req.params.listingId || l.fsn === req.params.listingId);
  if (!listing) return res.status(404).json({ error: 'LISTING_NOT_FOUND' });
  res.json(listing);
});

// Update listing price
router.put('/listings/:listingId/price', (req, res) => {
  const listing = flipkartListings.find(l => l.listingId === req.params.listingId || l.fsn === req.params.listingId);
  if (listing && req.body.price) { listing.flipkartSellingPrice.amount = req.body.price; listing.lastUpdated = new Date().toISOString(); }
  res.json({ status: 'SUCCESS', message: 'Price updated' });
});

// Update listing stock
router.put('/listings/:listingId/quantity', (req, res) => {
  const listing = flipkartListings.find(l => l.listingId === req.params.listingId || l.fsn === req.params.listingId);
  if (listing && req.body.quantity !== undefined) { listing.stockCount = req.body.quantity; listing.lastUpdated = new Date().toISOString(); }
  res.json({ status: 'SUCCESS', message: 'Stock updated' });
});

// Activate / deactivate listing
router.put('/listings/:listingId/status', (req, res) => {
  const listing = flipkartListings.find(l => l.listingId === req.params.listingId);
  if (listing && req.body.state) { listing.state = req.body.state; listing.listingStatus = req.body.state; }
  res.json({ status: 'SUCCESS' });
});

// ══════════════════════════════════════════════════════════════════
//  INVENTORY — /mock/flipkart/inventory
// ══════════════════════════════════════════════════════════════════
router.get('/inventory', (req, res) => {
  res.json(flipkartInventory);
});

router.get('/inventory/:fsn', (req, res) => {
  const inv = flipkartInventory.listings.find(l => l.fsn === req.params.fsn);
  if (!inv) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(inv);
});

router.put('/inventory/:fsn', (req, res) => {
  const inv = flipkartInventory.listings.find(l => l.fsn === req.params.fsn);
  if (inv && req.body.quantity !== undefined) { inv.quantity.available = req.body.quantity; inv.quantity.total = req.body.quantity; inv.lastUpdated = new Date().toISOString(); }
  res.json({ status: 'SUCCESS', fsn: req.params.fsn });
});

// ══════════════════════════════════════════════════════════════════
//  RETURNS — /mock/flipkart/returns
// ══════════════════════════════════════════════════════════════════
router.get('/returns', (req, res) => {
  const { status } = req.query;
  let returns = [...flipkartReturns];
  if (status) returns = returns.filter(r => r.returnStatus === status);
  res.json({ returns, total: returns.length });
});

router.get('/returns/:returnId', (req, res) => {
  const ret = flipkartReturns.find(r => r.returnId === req.params.returnId);
  if (!ret) return res.status(404).json({ error: 'RETURN_NOT_FOUND' });
  res.json(ret);
});

router.post('/returns/:returnId/approve', (req, res) => {
  const ret = flipkartReturns.find(r => r.returnId === req.params.returnId);
  if (ret) ret.returnStatus = 'RETURN_APPROVED';
  res.json({ status: 'success', message: 'Return approved' });
});

router.post('/returns/:returnId/reject', (req, res) => {
  const ret = flipkartReturns.find(r => r.returnId === req.params.returnId);
  if (ret) ret.returnStatus = 'RETURN_REJECTED';
  res.json({ status: 'success', message: 'Return rejected' });
});

// ══════════════════════════════════════════════════════════════════
//  PAYMENTS — /mock/flipkart/payments
// ══════════════════════════════════════════════════════════════════
router.get('/payments/settlements', (req, res) => {
  res.json(flipkartPayments);
});

router.get('/payments/settlements/:settlementId', (req, res) => {
  const s = flipkartPayments.settlements.find(s => s.settlementId === req.params.settlementId);
  if (!s) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(s);
});

// ══════════════════════════════════════════════════════════════════
//  MESSAGES — /mock/flipkart/messages
// ══════════════════════════════════════════════════════════════════
router.get('/messages', (req, res) => {
  const { status } = req.query;
  let msgs = [...flipkartMessages];
  if (status) msgs = msgs.filter(m => m.status === status);
  res.json({ messages: msgs, total: msgs.length });
});

router.get('/messages/:messageId', (req, res) => {
  const msg = flipkartMessages.find(m => m.messageId === req.params.messageId);
  if (!msg) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(msg);
});

router.post('/messages/:messageId/reply', (req, res) => {
  const msg = flipkartMessages.find(m => m.messageId === req.params.messageId);
  if (msg) {
    msg.status = 'REPLIED';
    msg.replies = msg.replies || [];
    msg.replies.push({ text: req.body.text, sender: 'SELLER', timestamp: new Date().toISOString() });
  }
  res.json({ status: 'success' });
});

router.put('/messages/:messageId/read', (req, res) => {
  const msg = flipkartMessages.find(m => m.messageId === req.params.messageId);
  if (msg) msg.isRead = true;
  res.json({ status: 'success' });
});

// ══════════════════════════════════════════════════════════════════
//  REVIEWS — /mock/flipkart/reviews
// ══════════════════════════════════════════════════════════════════
router.get('/reviews', (req, res) => {
  const { fsn, rating } = req.query;
  let reviews = [...flipkartReviews];
  if (fsn) reviews = reviews.filter(r => r.fsn === fsn);
  if (rating) reviews = reviews.filter(r => r.rating === parseInt(rating));
  res.json({ reviews, total: reviews.length });
});

router.post('/reviews/:reviewId/respond', (req, res) => {
  const review = flipkartReviews.find(r => r.reviewId === req.params.reviewId);
  if (review) review.sellerResponse = { text: req.body.text, timestamp: new Date().toISOString() };
  res.json({ status: 'SUCCESS' });
});

// ══════════════════════════════════════════════════════════════════
//  ADVERTISING — /mock/flipkart/advertising
// ══════════════════════════════════════════════════════════════════
router.get('/advertising/campaigns', (req, res) => {
  res.json({ campaigns: flipkartAdCampaigns, total: flipkartAdCampaigns.length });
});

router.post('/advertising/campaigns', (req, res) => {
  const newCamp = { ...req.body, campaignId: 'FK-CAMP-' + Date.now(), metrics: { impressions: 0, clicks: 0, spend: 0, orders: 0, revenue: 0 } };
  flipkartAdCampaigns.push(newCamp);
  res.status(201).json({ status: 'SUCCESS', campaignId: newCamp.campaignId });
});

router.put('/advertising/campaigns/:id', (req, res) => {
  const camp = flipkartAdCampaigns.find(c => c.campaignId === req.params.id);
  if (camp) Object.assign(camp, req.body);
  res.json({ status: 'SUCCESS' });
});

// ══════════════════════════════════════════════════════════════════
//  SELLER HEALTH — /mock/flipkart/seller/health
// ══════════════════════════════════════════════════════════════════
router.get('/seller/health', (req, res) => {
  res.json(flipkartSellerHealth);
});

// ══════════════════════════════════════════════════════════════════
//  COUPONS & PROMOTIONS — /mock/flipkart/promotions
// ══════════════════════════════════════════════════════════════════
router.get('/promotions', (req, res) => {
  res.json({
    promotions: [
      { promotionId: 'PROMO-FK-001', name: 'Monsoon Pet Sale', type: 'percentage', value: 15, status: 'ACTIVE', startDate: new Date(Date.now() - 86400000 * 2).toISOString(), endDate: new Date(Date.now() + 86400000 * 5).toISOString() },
      { promotionId: 'PROMO-FK-002', name: 'Flat 200 Off on ₹1999+', type: 'flat', value: 200, status: 'SCHEDULED', startDate: new Date(Date.now() + 86400000 * 3).toISOString(), endDate: new Date(Date.now() + 86400000 * 10).toISOString() },
    ]
  });
});

router.post('/promotions', (req, res) => {
  res.status(201).json({ promotionId: 'PROMO-FK-' + Date.now(), status: 'CREATED' });
});

module.exports = router;
