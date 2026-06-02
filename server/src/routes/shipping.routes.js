const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/shipping.controller');

router.use(requireAuth);

router.get('/queue', ctrl.getShippingQueue);
router.patch('/:id/pack', ctrl.markAsPacked);
router.patch('/:id/ship', ctrl.markAsShipped);
router.post('/label/:orderId', ctrl.generateLabel);
router.patch('/bulk-ship', ctrl.bulkShip);

module.exports = router;
