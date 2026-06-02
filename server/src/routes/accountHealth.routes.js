const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/accountHealth.controller');

router.use(requireAuth);

router.get('/overview', ctrl.getHealthOverview);
router.get('/amazon', ctrl.getAmazonHealth);
router.get('/flipkart', ctrl.getFlipkartHealth);
router.get('/listing-quality', ctrl.getListingQuality);

module.exports = router;
