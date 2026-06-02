const express = require('express');
const router = express.Router();
const { getInventoryLogs, manualRestock, stockUpdate } = require('../controllers/inventory.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.get('/logs', requireAuth, getInventoryLogs);
router.post('/restock', requireAuth, requireRole(['admin', 'manager']), manualRestock);
router.post('/stock-update', requireAuth, requireRole(['admin', 'manager']), stockUpdate);

module.exports = router;
