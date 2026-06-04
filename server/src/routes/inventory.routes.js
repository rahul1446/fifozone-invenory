const express = require('express');
const router = express.Router();
const { getInventoryLogs, manualRestock, stockUpdate } = require('../controllers/inventory.controller');
const supplierCtrl = require('../controllers/supplier.controller');
const purchaseCtrl = require('../controllers/purchase.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.get('/logs', requireAuth, getInventoryLogs);
router.post('/restock', requireAuth, requireRole(['admin', 'manager']), manualRestock);
router.post('/stock-update', requireAuth, requireRole(['admin', 'manager']), stockUpdate);

// Suppliers
router.get('/suppliers', requireAuth, supplierCtrl.getSuppliers);
router.post('/suppliers', requireAuth, requireRole(['admin', 'manager']), supplierCtrl.createSupplier);
router.patch('/suppliers/:id', requireAuth, requireRole(['admin', 'manager']), supplierCtrl.updateSupplier);
router.delete('/suppliers/:id', requireAuth, requireRole(['admin', 'manager']), supplierCtrl.deleteSupplier);

// Purchases
router.get('/purchases', requireAuth, purchaseCtrl.getPurchases);
router.post('/purchases', requireAuth, requireRole(['admin', 'manager']), purchaseCtrl.createPurchase);

module.exports = router;
