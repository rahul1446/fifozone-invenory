const mongoose = require('mongoose');

const AccountHealthSchema = new mongoose.Schema({
  platform: { type: String, enum: ['fifozone', 'amazon', 'flipkart'], required: true },
  snapshotDate: { type: Date, default: Date.now },
  overallStatus: { type: String, enum: ['good', 'at_risk', 'critical'], default: 'good' },
  metrics: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('AccountHealth', AccountHealthSchema);
