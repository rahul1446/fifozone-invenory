const mongoose = require('mongoose');

const ShippingLabelSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderNumber: { type: String },
  fromAddress: {
    name: String, address1: String, address2: String, city: String, state: String, pincode: String, phone: String
  },
  toAddress: {
    name: String, address1: String, address2: String, city: String, state: String, pincode: String, phone: String
  },
  items: [{
    name: String, quantity: Number
  }],
  labelSize: { type: String, enum: ['A5', '4x6'], default: 'A5' },
  courierPartner: { type: String },
  trackingNumber: { type: String },
  trackingUrl: { type: String },
  expectedDelivery: { type: Date },
  generatedAt: { type: Date, default: Date.now },
  isPrinted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('ShippingLabel', ShippingLabelSchema);
