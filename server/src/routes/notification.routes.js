const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notification.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/', requireAuth, getNotifications);
router.patch('/mark-all', requireAuth, markAllAsRead);
router.patch('/:id/read', requireAuth, markAsRead);

module.exports = router;
