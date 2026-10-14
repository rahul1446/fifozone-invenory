const asyncHandler = require('../utils/asyncHandler');
const ApiResponse  = require('../utils/ApiResponse');
const ApiError     = require('../utils/ApiError');
const logger       = require('../utils/logger');
const Review       = require('../models/Review.model');

// ── GET /reviews ─────────────────────────────────────────────────────────────
exports.getReviews = asyncHandler(async (req, res) => {

  const { platform, rating, status, search, page = 1, limit = 15 } = req.query;
  const query = {};

  // Only apply filters if values are non-empty and not 'All'
  if (platform && platform !== 'All' && platform !== 'all') query.platform = platform;
  if (rating   && rating   !== 'All' && rating   !== 'all') query.rating   = Number(rating);
  if (status   && status   !== 'All' && status   !== 'all') query.status   = status;

  if (search) {
    query.$or = [
      { productName:  { $regex: search, $options: 'i' } },
      { customerName: { $regex: search, $options: 'i' } },
      { body:         { $regex: search, $options: 'i' } },
      { title:        { $regex: search, $options: 'i' } },
    ];
  }

  const skip    = (Number(page) - 1) * Number(limit);
  const reviews = await Review.find(query).sort({ postedAt: -1 }).skip(skip).limit(Number(limit));
  const total   = await Review.countDocuments(query);

  res.status(200).json(new ApiResponse(200, { reviews, total, page: Number(page), limit: Number(limit) }, 'Reviews fetched'));
});

// ── GET /reviews/summary ──────────────────────────────────────────────────────
exports.getReviewSummary = asyncHandler(async (req, res) => {
  const summary = await Review.aggregate([
    {
      $group: {
        _id:           '$productName',
        avgRating:     { $avg: '$rating' },
        totalReviews:  { $sum: 1 },
        amazonCount:   { $sum: { $cond: [{ $eq: ['$platform', 'amazon']   }, 1, 0] } },
        flipkartCount: { $sum: { $cond: [{ $eq: ['$platform', 'flipkart'] }, 1, 0] } },
        fifozoneCount: { $sum: { $cond: [{ $eq: ['$platform', 'fifozone'] }, 1, 0] } },
      },
    },
    { $sort: { totalReviews: -1 } },
  ]);

  res.status(200).json(new ApiResponse(200, summary, 'Review summary fetched'));
});

// ── POST /reviews/:id/reply ───────────────────────────────────────────────────
exports.replyToReview = asyncHandler(async (req, res) => {
  const { reply } = req.body;
  if (!reply?.trim()) throw new ApiError(400, 'Reply text is required');

  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');

  review.reply     = reply.trim();
  review.status    = 'replied';
  review.repliedAt = new Date();
  await review.save();

  if (review.platform === 'fifozone') {
    logger.info(`[Review] Syncing reply to WooCommerce for review ${review._id}`);
    // WooCommerce reply sync would go here when live
  } else {
    logger.info(`[Review] Reply saved locally for ${review.platform} review — manual action needed on platform`);
  }

  res.status(200).json(new ApiResponse(200, review, 'Reply saved successfully'));
});

// ── PATCH /reviews/:id/flag ───────────────────────────────────────────────────
exports.flagReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');

  review.isFlagged = !review.isFlagged;
  review.status    = review.isFlagged ? 'flagged' : (review.reply ? 'replied' : 'new');
  await review.save();

  res.status(200).json(new ApiResponse(200, review, `Review ${review.isFlagged ? 'flagged' : 'unflagged'}`));
});

// ── PATCH /reviews/:id/read ───────────────────────────────────────────────────
exports.markReviewRead = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { isRead: true, status: 'read' }, { new: true });
  if (!review) throw new ApiError(404, 'Review not found');
  res.status(200).json(new ApiResponse(200, review, 'Review marked as read'));
});
