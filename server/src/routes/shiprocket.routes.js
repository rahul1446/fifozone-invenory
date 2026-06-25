const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { pushOrder, bulkPushOrders, generateAWB, requestPickup, webhookListener } = require('../controllers/shiprocket.controller');

// Actions on Orders
router.post('/orders/bulk-push', requireAuth, requireRole(['admin', 'manager']), bulkPushOrders);
router.post('/orders/:id/push', requireAuth, requireRole(['admin', 'manager']), pushOrder);
router.post('/orders/:id/awb', requireAuth, requireRole(['admin', 'manager']), generateAWB);
router.post('/orders/:id/pickup', requireAuth, requireRole(['admin', 'manager']), requestPickup);

// Webhook for tracking updates (Public route)
router.post('/webhook', webhookListener);

module.exports = router;
