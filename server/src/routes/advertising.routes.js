const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/advertising.controller');

router.use(requireAuth);

router.get('/overview', ctrl.getAdOverview);

router.get('/amazon/campaigns', ctrl.getAmazonCampaigns);
router.get('/amazon/campaigns/:id', ctrl.getAmazonCampaignDetail);
router.patch('/amazon/campaigns/:id/pause', ctrl.pauseAmazonCampaign);
router.patch('/amazon/campaigns/:id/activate', ctrl.activateAmazonCampaign);

router.get('/flipkart/campaigns', ctrl.getFlipkartCampaigns);
router.get('/flipkart/campaigns/:id', ctrl.getFlipkartCampaignDetail);
router.patch('/flipkart/campaigns/:id/pause', ctrl.pauseFlipkartCampaign);
router.patch('/flipkart/campaigns/:id/activate', ctrl.activateFlipkartCampaign);

module.exports = router;
