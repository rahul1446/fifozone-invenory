const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  platforms: [{ type: String, enum: ['fifozone', 'amazon', 'flipkart'] }],
  type: { type: String, enum: ['coupon', 'percentage', 'flat', 'bundle'], default: 'percentage' },
  couponCode: { type: String },
  discountType: { type: String, enum: ['percentage', 'flat', 'free_shipping'] },
  discountValue: { type: Number, required: true },
  minimumOrderAmount: { type: Number, default: 0 },
  maximumDiscountAmount: { type: Number },
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  applicableCategories: [{ type: String }],
  usageLimit: { type: Number },
  perCustomerLimit: { type: Number, default: 1 },
  usageCount: { type: Number, default: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'scheduled', 'expired', 'paused'], default: 'scheduled' },
  platformIds: { 
    fifozone: { type: String }, 
    amazon: { type: String }, 
    flipkart: { type: String } 
  },
  originalPrices: [{ 
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, 
    fifozone: { type: Number }, 
    amazon: { type: Number }, 
    flipkart: { type: Number } 
  }],
  performance: { 
    ordersCount: { type: Number, default: 0 }, 
    totalDiscount: { type: Number, default: 0 }, 
    revenue: { type: Number, default: 0 } 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Promotion', PromotionSchema);
