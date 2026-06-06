const mongoose = require('mongoose');

const InventoryLogSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    index: true
  },
  productName: {
    type: String,
    default: 'System Action'
  },
  sku: {
    type: String,
    default: ''
  },
  changeType: {
    type: String,
    enum: [
      'sale',
      'return',
      'manual_add',
      'manual_remove',
      'adjustment',
      'sync_update',
      'delivered',
      'restock',
      'damaged',
      'expired',
      'purchase_receipt',
      'purchase_draft',
      'supplier_created',
      'supplier_updated',
      'system_event'
    ],
    required: true,
    index: true
  },
  platform: {
    type: String,
    enum: ['fifozone', 'amazon', 'flipkart', 'warehouse', 'internal'],
    required: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  previousStock: {
    type: Number,
    default: 0
  },
  changeQuantity: {
    type: Number,
    required: true,
    default: 0
  },
  newStock: {
    type: Number,
    default: 0
  },
  note: {
    type: String,
    default: ''
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('InventoryLog', InventoryLogSchema);
