const express = require('express');
const router = express.Router();
const { getDashboardStats, getDetailedAnalytics } = require('../controllers/analytics.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/dashboard', requireAuth, getDashboardStats);
router.get('/detailed', requireAuth, getDetailedAnalytics);

module.exports = router;
