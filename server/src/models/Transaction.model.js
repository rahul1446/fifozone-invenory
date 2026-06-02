const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  platform: { type: String, enum: ['fifozone', 'amazon', 'flipkart'], required: true },
  type: { type: String, enum: ['sale', 'refund', 'fee', 'settlement', 'adjustment'], required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  orderNumber: { type: String },
  productName: { type: String },
  grossAmount: { type: Number, default: 0 },
  platformFee: { type: Number, default: 0 },
  gstOnFee: { type: Number, default: 0 },
  netAmount: { type: Number, default: 0 },
  settlementStatus: { type: String, enum: ['settled', 'pending', 'processing'], default: 'pending' },
  settlementDate: { type: Date },
  notes: { type: String },
  transactionDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
