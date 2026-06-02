const mongoose = require('mongoose');

const ReplyTemplateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  platforms: [{ type: String, enum: ['fifozone', 'amazon', 'flipkart'] }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('ReplyTemplate', ReplyTemplateSchema);
