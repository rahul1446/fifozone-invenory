const express = require('express');
const router = express.Router();
const { getAlertRules, createAlertRule, updateAlertRule, deleteAlertRule } = require('../controllers/alert.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.get('/', requireAuth, getAlertRules);
router.post('/', requireAuth, requireRole(['admin', 'manager']), createAlertRule);
router.patch('/:id', requireAuth, requireRole(['admin', 'manager']), updateAlertRule);
router.delete('/:id', requireAuth, requireRole(['admin', 'manager']), deleteAlertRule);

module.exports = router;
