const express = require('express');
const router = express.Router();
const { getOrders, getOrderById, updateOrderStatus, bulkUpdateStatus, initiateReturn, getReturns, resolveReturn, createManualOrder } = require('../controllers/order.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const shippingCtrl = require('../controllers/shipping.controller');

router.get('/', requireAuth, getOrders);
router.get('/returns', requireAuth, getReturns);
router.post('/manual', requireAuth, requireRole(['admin', 'manager']), createManualOrder);
router.post('/bulk-status', requireAuth, requireRole(['admin', 'manager']), bulkUpdateStatus);
router.get('/:id', requireAuth, getOrderById);
router.patch('/:id/status', requireAuth, requireRole(['admin', 'manager']), updateOrderStatus);
router.patch('/:id/pack', requireAuth, requireRole(['admin', 'manager']), shippingCtrl.markAsPacked);
router.patch('/:id/ship', requireAuth, requireRole(['admin', 'manager']), shippingCtrl.markAsShipped);
router.patch('/bulk-ship', requireAuth, requireRole(['admin', 'manager']), shippingCtrl.bulkShip);
router.post('/returns', requireAuth, requireRole(['admin', 'manager']), initiateReturn);
router.patch('/returns/:id', requireAuth, requireRole(['admin', 'manager']), resolveReturn);

module.exports = router;
