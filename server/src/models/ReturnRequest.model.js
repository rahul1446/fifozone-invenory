const mongoose = require('mongoose');

const ReturnRequestSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  platform: {
    type: String,
    required: true
  },
  platformReturnId: {
    type: String,
    default: ''
  },
  customer: {
    name: String,
    email: String,
    phone: String
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    reason: {
      type: String,
      default: ''
    },
    condition: {
      type: String,
      enum: ['good', 'damaged', 'opened', 'expired'],
      default: 'good'
    }
  }],
  status: {
    type: String,
    enum: ['requested', 'approved', 'rejected', 'received', 'restocked', 'refunded'],
    default: 'requested'
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  stockRestored: {
    type: Boolean,
    default: false
  },
  stockRestoredAt: {
    type: Date
  },
  restoredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  note: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ReturnRequest', ReturnRequestSchema);
