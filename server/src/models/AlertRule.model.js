const mongoose = require('mongoose');

const AlertRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['low_stock', 'price_drop', 'no_sale', 'sync_failure'],
    required: true
  },
  conditions: {
    stockThreshold: { type: Number, default: 10 },
    priceDropPercent: { type: Number, default: 10 },
    noSaleDays: { type: Number, default: 30 },
    platform: { type: String, default: 'all' }
  },
  actions: {
    sendEmail: { type: Boolean, default: true },
    sendWhatsApp: { type: Boolean, default: false },
    notifyRoles: [{ type: String, enum: ['admin', 'manager'], default: ['admin'] }],
    notifyUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AlertRule', AlertRuleSchema);
