const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  updateOrderStatus,
  bulkUpdateStatus,
  initiateReturn,
  getReturns,
  resolveReturn
} = require('../controllers/order.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const shippingCtrl = require('../controllers/shipping.controller');

// Standard order lookups
router.get('/', requireAuth, getOrders);
router.get('/returns', requireAuth, getReturns);
router.get('/:id', requireAuth, getOrderById);

// Order actions (Require Admin or Manager roles)
router.patch('/:id/status', requireAuth, requireRole(['admin', 'manager']), updateOrderStatus);
router.post('/bulk-status', requireAuth, requireRole(['admin', 'manager']), bulkUpdateStatus);

// Shipping integration endpoints
router.patch('/:id/pack', requireAuth, requireRole(['admin', 'manager']), shippingCtrl.markAsPacked);
router.patch('/:id/ship', requireAuth, requireRole(['admin', 'manager']), shippingCtrl.markAsShipped);
router.patch('/bulk-ship', requireAuth, requireRole(['admin', 'manager']), shippingCtrl.bulkShip);

// Returns operations
router.post('/returns', requireAuth, requireRole(['admin', 'manager']), initiateReturn);
router.patch('/returns/:id', requireAuth, requireRole(['admin', 'manager']), resolveReturn);

module.exports = router;
