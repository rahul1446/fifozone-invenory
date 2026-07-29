const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/promotion.controller');

router.use(requireAuth);

router.get('/meta',              ctrl.getDiscountMeta);
router.get('/',                  ctrl.getPromotions);
router.post('/discount',         ctrl.createDiscount);
router.post('/coupon',           ctrl.createCoupon);
router.post('/validate-coupon',  ctrl.validateCoupon);
router.patch('/:id',             ctrl.updatePromotion);
router.patch('/:id/pause',       ctrl.pausePromotion);
router.patch('/:id/resume',      ctrl.resumePromotion);
router.delete('/:id',            ctrl.deletePromotion);
router.get('/:id/performance',   ctrl.getPromotionPerformance);

module.exports = router;
