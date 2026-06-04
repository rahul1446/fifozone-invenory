const express = require('express');
const router = express.Router();
const { 
  getSyncStatus, 
  triggerManualSync, 
  updateCredentials, 
  getCredentialsStatus, 
  testConnection, 
  getWooCommerceCategories 
} = require('../controllers/platform.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.get('/woocommerce/categories', requireAuth, getWooCommerceCategories);
router.get('/sync-status', requireAuth, getSyncStatus);
router.post('/sync-now', requireAuth, triggerManualSync);
router.get('/credentials/status', requireAuth, requireRole(['admin']), getCredentialsStatus);
router.post('/credentials', requireAuth, requireRole(['admin']), updateCredentials);
router.post('/test-connection', requireAuth, requireRole(['admin']), testConnection);

module.exports = router;
