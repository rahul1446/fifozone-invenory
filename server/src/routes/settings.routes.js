const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settings.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

const router = express.Router();

router.route('/')
  .get(requireAuth, getSettings)
  .put(requireAuth, requireRole(['admin', 'manager']), updateSettings);

module.exports = router;
