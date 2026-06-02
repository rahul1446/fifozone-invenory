const express = require('express');
const router = express.Router();

// ─── Import all mock data ────────────────────────────────────────────────────
const { amazonOrders } = require('./amazon.orders.mock');
const { amazonCatalogItems, amazonListings } = require('./amazon.products.mock');
const { amazonInventory } = require('./amazon.inventory.mock');
const { amazonReturns } = require('./amazon.returns.mock');
const { amazonFinancialEvents } = require('./amazon.finance.mock');
const { amazonMessages } = require('./amazon.messages.mock');
const { amazonReviews } = require('./amazon.reviews.mock');
const { amazonAdCampaigns } = require('./amazon.advertising.mock');
const { amazonAccountHealth } = require('./amazon.health.mock');

// ─── Auth token (mock LWA token endpoint) ───────────────────────────────────
router.post('/auth/o2/token', (req, res) => {
  res.json({
    access_token: 'mock_access_token_' + Date.now(),
    refresh_token: req.body.refresh_token || 'mock_refresh_token',
    token_type: 'bearer',
    expires_in: 3600,
  });
});

// ══════════════════════════════════════════════════════════════════
//  ORDERS API — /mock/amazon/orders/v0/orders
// ══════════════════════════════════════════════════════════════════
router.get('/orders/v0/orders', (req, res) => {
  const { OrderStatuses, CreatedAfter, CreatedBefore, limit = 20 } = req.query;
  let orders = [...amazonOrders];

  if (OrderStatuses) {
    const statuses = OrderStatuses.split(',');
    orders = orders.filter(o => statuses.includes(o.OrderStatus));
  }
  if (CreatedAfter) {
    orders = orders.filter(o => new Date(o.PurchaseDate) >= new Date(CreatedAfter));
  }

  res.json({
    payload: {
      Orders: orders.slice(0, parseInt(limit)),
      NextToken: null,
      CreatedBefore: new Date().toISOString(),
      LastUpdatedBefore: new Date().toISOString(),
    }
  });
});

router.get('/orders/v0/orders/:orderId', (req, res) => {
  const order = amazonOrders.find(o => o.AmazonOrderId === req.params.orderId);
  if (!order) return res.status(404).json({ errors: [{ code: 'NotFound', message: 'Order not found' }] });
  res.json({ payload: order });
});

router.get('/orders/v0/orders/:orderId/orderItems', (req, res) => {
  const order = amazonOrders.find(o => o.AmazonOrderId === req.params.orderId);
  if (!order) return res.status(404).json({ errors: [{ code: 'NotFound', message: 'Order not found' }] });
  res.json({ payload: { AmazonOrderId: req.params.orderId, OrderItems: order._items || [] } });
});

// Confirm shipment
router.post('/orders/v0/orders/:orderId/shipment', (req, res) => {
  const order = amazonOrders.find(o => o.AmazonOrderId === req.params.orderId);
  if (order) { order.OrderStatus = 'Shipped'; order.NumberOfItemsShipped = order.NumberOfItemsUnshipped; order.NumberOfItemsUnshipped = 0; }
  res.json({ payload: {} });
});

// ══════════════════════════════════════════════════════════════════
//  CATALOG ITEMS API — /mock/amazon/catalog/2022-04-01/items
// ══════════════════════════════════════════════════════════════════
router.get('/catalog/2022-04-01/items', (req, res) => {
  const { keywords, marketplaceIds, includedData } = req.query;
  let items = [...amazonCatalogItems];
  if (keywords) {
    const kw = keywords.toLowerCase();
    items = items.filter(i => i.summaries?.[0]?.itemName?.toLowerCase().includes(kw));
  }
  res.json({
    numberOfResults: items.length,
    pagination: { nextToken: null },
    items: items.slice(0, 20),
  });
});

router.get('/catalog/2022-04-01/items/:asin', (req, res) => {
  const item = amazonCatalogItems.find(i => i.asin === req.params.asin);
  if (!item) return res.status(404).json({ errors: [{ code: 'NotFound', message: 'Item not found' }] });
  res.json(item);
});

// ══════════════════════════════════════════════════════════════════
//  LISTINGS ITEMS API — /mock/amazon/listings/2021-08-01/items
// ══════════════════════════════════════════════════════════════════
router.get('/listings/2021-08-01/items/:sellerId', (req, res) => {
  res.json({
    numberOfResults: amazonListings.length,
    pagination: { nextToken: null },
    items: amazonListings,
  });
});

router.get('/listings/2021-08-01/items/:sellerId/:sku', (req, res) => {
  const listing = amazonListings.find(l => l.sku === req.params.sku);
  if (!listing) return res.status(404).json({ errors: [{ code: 'NotFound', message: 'Listing not found' }] });
  res.json(listing);
});

// Patch listing (price / stock update)
router.patch('/listings/2021-08-01/items/:sellerId/:sku', (req, res) => {
  res.json({
    sku: req.params.sku,
    status: 'ACCEPTED',
    submissionId: 'SUB-' + Date.now(),
    issues: [],
  });
});

// ══════════════════════════════════════════════════════════════════
//  INVENTORY API — /mock/amazon/fba/inventory/v1/summaries
// ══════════════════════════════════════════════════════════════════
router.get('/fba/inventory/v1/summaries', (req, res) => {
  const { sellerSkus, granularityId } = req.query;
  let summaries = amazonInventory.inventorySummaries;
  if (sellerSkus) {
    const skus = sellerSkus.split(',');
    summaries = summaries.filter(s => skus.includes(s.sellerSku));
  }
  res.json({ payload: { granularity: amazonInventory.granularity, inventorySummaries: summaries } });
});

// Update inventory quantity
router.put('/fba/inventory/v1/items/:sku', (req, res) => {
  const { quantity } = req.body;
  const item = amazonInventory.inventorySummaries.find(s => s.sellerSku === req.params.sku);
  if (item && quantity !== undefined) {
    item.totalQuantity = quantity;
    item.inventoryDetails.fulfillableQuantity = quantity;
  }
  res.json({ payload: { sku: req.params.sku, status: 'UPDATED' } });
});

// ══════════════════════════════════════════════════════════════════
//  RETURNS API — /mock/amazon/returns
// ══════════════════════════════════════════════════════════════════
router.get('/returns', (req, res) => {
  res.json({ payload: { returnRequests: amazonReturns } });
});

router.get('/returns/:returnId', (req, res) => {
  const ret = amazonReturns.find(r => r.returnRequestId === req.params.returnId);
  if (!ret) return res.status(404).json({ errors: [{ code: 'NotFound', message: 'Return not found' }] });
  res.json({ payload: ret });
});

router.post('/returns/:returnId/approve', (req, res) => {
  const ret = amazonReturns.find(r => r.returnRequestId === req.params.returnId);
  if (ret) ret.returnStatus = 'ReturnReceived';
  res.json({ payload: { status: 'APPROVED' } });
});

router.post('/returns/:returnId/reject', (req, res) => {
  const ret = amazonReturns.find(r => r.returnRequestId === req.params.returnId);
  if (ret) ret.returnStatus = 'Rejected';
  res.json({ payload: { status: 'REJECTED' } });
});

// ══════════════════════════════════════════════════════════════════
//  FINANCE API — /mock/amazon/finances/v0/financialEvents
// ══════════════════════════════════════════════════════════════════
router.get('/finances/v0/financialEvents', (req, res) => {
  res.json({ payload: amazonFinancialEvents });
});

router.get('/finances/v0/financialEventGroups', (req, res) => {
  res.json({
    payload: {
      FinancialEventGroupList: [
        {
          FinancialEventGroupId: 'FEG-' + Date.now(),
          ProcessingStatus: 'Closed',
          FundTransferStatus: 'Succeeded',
          OriginalTotal: { CurrencyCode: 'INR', Amount: '45230.50' },
          ConvertedTotal: { CurrencyCode: 'INR', Amount: '45230.50' },
          FundTransferDate: new Date(Date.now() - 7 * 86400000).toISOString(),
          TraceId: 'TRK' + Date.now(),
          AccountTail: '1234',
          BeginningBalance: { CurrencyCode: 'INR', Amount: '0.00' },
          FinancialEventGroupStart: new Date(Date.now() - 14 * 86400000).toISOString(),
          FinancialEventGroupEnd: new Date(Date.now() - 7 * 86400000).toISOString(),
        },
      ],
    }
  });
});

// ══════════════════════════════════════════════════════════════════
//  MESSAGING API — /mock/amazon/messaging/v1
// ══════════════════════════════════════════════════════════════════
router.get('/messaging/v1/orders/:orderId/messages', (req, res) => {
  const msgs = amazonMessages.filter(m => m.orderId === req.params.orderId);
  res.json({ _embedded: { 'messageMetadata': msgs } });
});

router.get('/messaging/v1/messages', (req, res) => {
  res.json({ messages: amazonMessages, total: amazonMessages.length });
});

router.get('/messaging/v1/messages/:messageId', (req, res) => {
  const msg = amazonMessages.find(m => m.messageId === req.params.messageId);
  if (!msg) return res.status(404).json({ errors: [{ code: 'NotFound' }] });
  res.json(msg);
});

router.post('/messaging/v1/orders/:orderId/messages/confirmCustomizationDetails', (req, res) => {
  res.json({ _links: { self: { href: `/messaging/v1/orders/${req.params.orderId}/messages` } } });
});

router.post('/messaging/v1/orders/:orderId/messages/createConfirmOrderDetails', (req, res) => {
  const msg = amazonMessages.find(m => m.orderId === req.params.orderId);
  if (msg) { msg.status = 'replied'; msg.messages.push({ sender: 'seller', senderName: 'Fifozone', body: req.body.text, timestamp: new Date().toISOString() }); }
  res.status(201).json({});
});

// Mark message read
router.post('/messaging/v1/messages/:messageId/read', (req, res) => {
  const msg = amazonMessages.find(m => m.messageId === req.params.messageId);
  if (msg) msg.messages.forEach(m => m.isRead = true);
  res.json({ status: 'ok' });
});

// ══════════════════════════════════════════════════════════════════
//  REVIEWS — /mock/amazon/reviews
// ══════════════════════════════════════════════════════════════════
router.get('/reviews', (req, res) => {
  const { asin, rating } = req.query;
  let reviews = [...amazonReviews];
  if (asin) reviews = reviews.filter(r => r.asin === asin);
  if (rating) reviews = reviews.filter(r => r.rating === parseInt(rating));
  res.json({ reviews, total: reviews.length });
});

router.post('/reviews/:reviewId/respond', (req, res) => {
  const review = amazonReviews.find(r => r.reviewId === req.params.reviewId);
  if (review) review.sellerResponse = { body: req.body.text, timestamp: new Date().toISOString() };
  res.json({ status: 'ACCEPTED' });
});

// ══════════════════════════════════════════════════════════════════
//  ADVERTISING — /mock/amazon/advertising
// ══════════════════════════════════════════════════════════════════
router.get('/advertising/v2/sp/campaigns', (req, res) => {
  res.json({ campaigns: amazonAdCampaigns });
});

router.get('/advertising/v2/sp/campaigns/:id', (req, res) => {
  const camp = amazonAdCampaigns.find(c => c.campaignId === req.params.id);
  if (!camp) return res.status(404).json({ code: 'NOT_FOUND' });
  res.json(camp);
});

router.put('/advertising/v2/sp/campaigns', (req, res) => {
  res.json([{ code: 'SUCCESS', campaignId: req.body.campaignId || 'NEW-' + Date.now(), description: 'Campaign updated' }]);
});

router.post('/advertising/v2/sp/campaigns', (req, res) => {
  const newCampaign = { ...req.body, campaignId: 'CAMP-NEW-' + Date.now(), metrics: { impressions: 0, clicks: 0, cost: 0, orders: 0, revenue: 0 } };
  amazonAdCampaigns.push(newCampaign);
  res.status(201).json([{ code: 'SUCCESS', campaignId: newCampaign.campaignId }]);
});

// ══════════════════════════════════════════════════════════════════
//  ACCOUNT HEALTH — /mock/amazon/seller/accountHealth
// ══════════════════════════════════════════════════════════════════
router.get('/seller/accountHealth', (req, res) => {
  res.json({ accountHealth: amazonAccountHealth });
});

// ══════════════════════════════════════════════════════════════════
//  NOTIFICATIONS / FEEDS
// ══════════════════════════════════════════════════════════════════
router.get('/notifications/v1/subscriptions/:notificationType', (req, res) => {
  res.json({ payload: { subscriptionId: 'SUB-MOCK-001', payloadVersion: '1.0', destinationId: 'DEST-MOCK-001' } });
});

router.post('/feeds/2021-06-30/feeds', (req, res) => {
  res.json({ feedId: 'FEED-' + Date.now(), feedType: req.body.feedType, processingStatus: 'IN_QUEUE', createdTime: new Date().toISOString() });
});

router.get('/feeds/2021-06-30/feeds/:feedId', (req, res) => {
  res.json({ feedId: req.params.feedId, feedType: 'POST_PRODUCT_DATA', processingStatus: 'DONE', createdTime: new Date().toISOString(), processingStartTime: new Date().toISOString(), processingEndTime: new Date().toISOString() });
});

module.exports = router;
