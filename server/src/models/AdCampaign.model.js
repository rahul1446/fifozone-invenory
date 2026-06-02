const mongoose = require('mongoose');

const AdCampaignSchema = new mongoose.Schema({
  platform: { type: String, enum: ['amazon', 'flipkart'], required: true },
  platformCampaignId: { type: String },
  name: { type: String, required: true },
  type: { type: String }, // 'sponsored_products', 'sponsored_brands', etc.
  status: { type: String, enum: ['active', 'paused', 'ended'], default: 'active' },
  dailyBudget: { type: Number, default: 0 },
  spendToday: { type: Number, default: 0 },
  spendThisMonth: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  orders: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  roas: { type: Number, default: 0 },
  acos: { type: Number, default: 0 },
  snapshotDate: { type: Date, default: Date.now },
  adGroups: [{
    name: { type: String },
    keywords: [{
      keyword: { type: String },
      matchType: { type: String },
      impressions: { type: Number },
      clicks: { type: Number },
      orders: { type: Number },
      acos: { type: Number }
    }]
  }]
}, { timestamps: true });

module.exports = mongoose.model('AdCampaign', AdCampaignSchema);
