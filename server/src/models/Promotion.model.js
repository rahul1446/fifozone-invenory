const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['discount', 'coupon'], default: 'discount' },
  platforms: [{ type: String, enum: ['fifozone', 'amazon', 'flipkart', 'meesho', 'all'] }],

  // ── Coupon-specific ──
  couponCode: { type: String, uppercase: true, trim: true, sparse: true },
  minimumOrderAmount: { type: Number, default: 0 },
  usageLimit: { type: Number, default: null },       // null = unlimited
  perCustomerLimit: { type: Number, default: 1 },
  usageCount: { type: Number, default: 0 },

  // ── Discount value ──
  discountType: { type: String, enum: ['percentage', 'flat'], required: true, default: 'percentage' },
  discountValue: { type: Number, required: true },
  maximumDiscountAmount: { type: Number },

  // ── Target scope (for product discounts) ──
  targetType: {
    type: String,
    enum: ['product', 'brand', 'category', 'subcategory', 'all'],
    default: 'all'
  },
  applicableProducts:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  applicableBrands:       [{ type: String }],
  applicableCategories:   [{ type: String }],
  applicableSubcategories:[{ type: String }],

  // ── Schedule ──
  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },

  // ── Status ──
  status: { type: String, enum: ['active', 'scheduled', 'expired', 'paused'], default: 'scheduled' },

  // ── Performance ──
  performance: {
    ordersCount:   { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    revenue:       { type: Number, default: 0 }
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Unique index on couponCode (only when it exists)
PromotionSchema.index({ couponCode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Promotion', PromotionSchema);
