const express = require('express');
const router = express.Router();
const { login, logout, refresh, me, changePassword } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.post('/login', login);
router.post('/refresh', refresh);

// Protected routes
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.patch('/change-password', requireAuth, changePassword);

module.exports = router;
