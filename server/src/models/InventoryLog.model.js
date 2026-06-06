const mongoose = require('mongoose');

const InventoryLogSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  productName: {
    type: String,
    required: true
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
      'purchase_receipt'
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
    required: true
  },
  changeQuantity: {
    type: Number,
    required: true // positive for addition, negative for deduction
  },
  newStock: {
    type: Number,
    required: true
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
