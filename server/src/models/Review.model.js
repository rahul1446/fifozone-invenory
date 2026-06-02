const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  platform: { type: String, enum: ['fifozone', 'amazon', 'flipkart'], required: true },
  platformReviewId: { type: String },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String },
  customerName: { type: String, default: 'Anonymous' },
  rating: { type: Number, min: 1, max: 5, required: true },
  title: { type: String },
  body: { type: String },
  isVerifiedPurchase: { type: Boolean, default: false },
  isRead: { type: Boolean, default: false },
  isFlagged: { type: Boolean, default: false },
  reply: { type: String },
  repliedAt: { type: Date },
  postedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['new', 'read', 'replied', 'flagged'], default: 'new' }
}, { timestamps: true });

module.exports = mongoose.model('Review', ReviewSchema);
