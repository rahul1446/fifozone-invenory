const express = require('express');
const { getSettings, updateSettings, testShiprocketConnection, debugShiprocketRaw } = require('../controllers/settings.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

const router = express.Router();

router.route('/')
  .get(requireAuth, getSettings)
  .put(requireAuth, requireRole(['admin', 'manager']), updateSettings);

router.post('/test-shiprocket',       requireAuth, requireRole(['admin', 'manager']), testShiprocketConnection);
router.get('/debug-shiprocket',       requireAuth, requireRole(['admin', 'manager']), debugShiprocketRaw);

module.exports = router;
