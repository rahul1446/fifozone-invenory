const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  // ── Identity ──
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  platformOrderId: {
    type: String,
    required: true,
    index: true
  },
  orderDate: {
    type: Date,
    default: Date.now,
    index: true
  },

  platform: {
    type: String,
    enum: ['fifozone', 'amazon', 'flipkart'],
    required: true
  },

  // ── Customer ──
  customer: {
    name: { type: String, required: true },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    alternatePhone: { type: String, default: '' }
  },
  shippingAddress: {
    line1: { type: String, required: true },
    line2: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' }
  },
  billingAddress: {
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    country: { type: String, default: 'India' }
  },

  // ── Items ──
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false
    },
    productSnapshot: {
      masterName: { type: String, required: true },
      sku: { type: String, default: '' },
      brand: { type: String, default: '' },
      sellingPrice: { type: Number, required: true },
      mrp: { type: Number, default: 0 },
      images: [String]
    },
    platformProductId: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    gstAmount: { type: Number, default: 0 },
    returnedQuantity: { type: Number, default: 0 }
  }],

  // ── Financials ──
  subtotal: { type: Number, required: true },
  shippingCharge: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  platformFee: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'Prepaid' },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'partial_refund'],
    default: 'pending'
  },
  currency: { type: String, default: 'INR' },

  // ── Status ──
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'return_requested', 'returned', 'refunded', 'failed', 'draft', 'packed'],
    default: 'pending',
    index: true
  },
  statusHistory: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, default: '' }
  }],

  // ── Shipping ──
  trackingNumber: { type: String, default: '' },
  courierPartner: { type: String, default: '' },
  trackingUrl: { type: String, default: '' },
  estimatedDelivery: { type: Date },
  deliveredAt: { type: Date },
  
  // ── Shiprocket ──
  shiprocketOrderId: { type: String, default: '' },
  shiprocketShipmentId: { type: String, default: '' },
  awbCode: { type: String, default: '' },
  shiprocketStatus: { type: String, default: '' },

  // ── Return ──
  hasReturn: { type: Boolean, default: false },
  returnRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReturnRequest'
  },

  // ── Notes ──
  internalNote: { type: String, default: '' },
  platformNote: { type: String, default: '' },

  // ── Raw Platform Data ──
  rawPlatformData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // ── Audit ──
  importedAt: { type: Date, default: Date.now },
  lastSyncedAt: { type: Date, default: Date.now },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', OrderSchema);
