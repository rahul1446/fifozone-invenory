const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/review.controller');

router.use(requireAuth);

router.get('/', ctrl.getReviews);
router.get('/summary', ctrl.getReviewSummary);
router.post('/:id/reply', ctrl.replyToReview);
router.patch('/:id/flag', ctrl.flagReview);
router.patch('/:id/read', ctrl.markReviewRead);

module.exports = router;
