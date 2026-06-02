const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({ 
  text: String, 
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  addedAt: { type: Date, default: Date.now } 
});

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, index: true },
  phone: { type: String, index: true },
  alternatePhone: String,
  city: String, 
  state: String, 
  pincode: String, 
  country: { type: String, default: 'India' },
  platforms: [{ type: String, enum: ['fifozone', 'amazon', 'flipkart'] }],
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  averageOrderValue: { type: Number, default: 0 },
  returnRate: { type: Number, default: 0 },
  firstOrderDate: Date,
  lastOrderDate: Date,
  notes: [NoteSchema],
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);
