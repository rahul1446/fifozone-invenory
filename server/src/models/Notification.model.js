const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'low_stock',
      'out_of_stock',
      'new_order',
      'order_cancelled',
      'return_request',
      'price_drop',
      'sync_failed',
      'sync_success',
      'dead_product_flagged',
      'daily_report',
      'manual'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'success'],
    default: 'info'
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  platform: {
    type: String
  },
  sentVia: [{
    type: String,
    enum: ['email', 'whatsapp', 'in_app'],
    default: ['in_app']
  }],
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);
