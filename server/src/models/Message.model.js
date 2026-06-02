const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  platform: { type: String, enum: ['fifozone', 'amazon', 'flipkart'], required: true },
  platformMessageId: { type: String },
  threadId: { type: String },
  customerName: { type: String },
  customerEmail: { type: String },
  customerId: { type: String },
  orderNumber: { type: String },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String },
  subject: { type: String },
  type: { type: String, enum: ['order_query', 'product_question', 'return_query', 'general'], default: 'general' },
  threadMessages: [{
    sender: { type: String }, // 'customer' or 'seller'
    senderName: { type: String },
    body: { type: String },
    timestamp: { type: Date },
    attachments: [{ type: String }]
  }],
  status: { type: String, enum: ['unread', 'read', 'replied', 'pending', 'closed'], default: 'unread' },
  receivedAt: { type: Date, default: Date.now },
  repliedAt: { type: Date },
  responseTimeHours: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
