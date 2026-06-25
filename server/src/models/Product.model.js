const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  // ── Core Identity ──
  masterName: {
    type: String,
    required: [true, 'Master product name is required'],
    trim: true
  },
  alternateNames: [{
    type: String
  }],
  sku: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  barcode: {
    type: String,
    sparse: true,
    trim: true
  },
  qrCode: {
    type: String
  },

  // ── Categorization ──
  brand: {
    type: String,
    trim: true
  },
  manufacturer: {
    type: String,
    trim: true
  },
  category: [{
    type: String,
    trim: true,
    index: true
  }],
  animalType: [{
    type: String,
    enum: ['dog', 'cat', 'bird', 'fish', 'rabbit', 'other']
  }],
  tags: [{
    type: String
  }],

  // ── Physical ──
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['g', 'kg', 'ml', 'l', 'units'],
      default: 'g'
    }
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['cm', 'inch'],
      default: 'cm'
    }
  },
  packSize: {
    type: String
  },

  // ── Pricing ──
  mrp: {
    type: Number,
    required: [true, 'MRP is required']
  },
  costPrice: {
    type: Number,
    required: [true, 'Cost price is required']
  },
  sellingPrice: {
    fifozone: { type: Number, default: 0 },
    amazon: { type: Number, default: 0 },
    flipkart: { type: Number, default: 0 },
    meesho: { type: Number, default: 0 }
  },
  gstPercent: {
    type: Number,
    enum: [0, 5, 12, 18, 28],
    default: 18
  },
  hsnCode: {
    type: String,
    trim: true,
    default: ''
  },

  // ── Stock / Inventory ──
  totalStock: {
    type: Number,
    default: 0
  },
  stockByPlatform: {
    fifozone: { type: Number, default: 0 },
    amazon: { type: Number, default: 0 },
    flipkart: { type: Number, default: 0 },
    meesho: { type: Number, default: 0 },
    warehouse: { type: Number, default: 0 }
  },
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  reorderQuantity: {
    type: Number,
    default: 50
  },

  // ── Platform Listing IDs ──
  platformIds: {
    fifozone: {
      productId: { type: String, default: '' },
      variationId: { type: String, default: '' },
      slug: { type: String, default: '' },
      url: { type: String, default: '' }
    },
    amazon: {
      asin: { type: String, default: '' },
      fnsku: { type: String, default: '' },
      url: { type: String, default: '' }
    },
    flipkart: {
      fsin: { type: String, default: '' },
      listingId: { type: String, default: '' },
      url: { type: String, default: '' }
    },
    meesho: {
      productId: { type: String, default: '' },
      sku: { type: String, default: '' },
      url: { type: String, default: '' }
    }
  },

  // ── Platform Status ──
  platformStatus: {
    fifozone: {
      type: String,
      enum: ['active', 'inactive', 'draft', 'not_listed'],
      default: 'not_listed'
    },
    amazon: {
      type: String,
      enum: ['active', 'inactive', 'suppressed', 'not_listed'],
      default: 'not_listed'
    },
    flipkart: {
      type: String,
      enum: ['active', 'inactive', 'blocked', 'not_listed'],
      default: 'not_listed'
    },
    meesho: {
      type: String,
      enum: ['active', 'inactive', 'blocked', 'not_listed'],
      default: 'not_listed'
    }
  },

  // ── Images ──
  images: [{
    url: String,
    publicId: String,
    isPrimary: Boolean,
    platform: String
  }],

  // ── Description ──
  description: {
    type: String
  },
  shortDescription: {
    type: String
  },
  features: [{
    type: String
  }],
  usageInstructions: {
    type: String
  },
  composition: {
    type: String
  },

  // ── Status Flags ──
  isActive: {
    type: Boolean,
    default: true
  },
  isDead: {
    type: Boolean,
    default: false
  },
  deadFlaggedAt: {
    type: Date
  },
  deadReason: {
    type: String
  },
  // Set to true when a seller manually edits the product — prevents sync from overwriting their changes
  manualOverride: {
    type: Boolean,
    default: false
  },
  // Set to true when seller explicitly deletes product — prevents sync from re-creating/re-activating it
  deletedBySeller: {
    type: Boolean,
    default: false
  },

  // ── Sales Analytics (denormalized) ──
  totalSold: {
    type: Number,
    default: 0
  },
  soldThisMonth: {
    type: Number,
    default: 0
  },
  soldThisYear: {
    type: Number,
    default: 0
  },
  lastSoldAt: {
    type: Date
  },
  returnCount: {
    type: Number,
    default: 0
  },
  returnRate: {
    type: Number,
    default: 0
  },

  // ── Sync Metadata ──
  lastSyncedAt: {
    fifozone: Date,
    amazon: Date,
    flipkart: Date,
    meesho: Date
  },
  syncErrors: [{
    platform: String,
    error: String,
    occurredAt: { type: Date, default: Date.now }
  }],

  // ── Audit ──
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // ── Import Tracking ──
  importBatchId: {
    type: String,
    default: null
  },
  importNote: {
    type: String,
    default: null
  },

  // ── Variants ──
  variants: [{
    name: String,
    value: String,
    sku: String,
    price: {
      fifozone: { type: Number, default: 0 },
      amazon: { type: Number, default: 0 },
      flipkart: { type: Number, default: 0 },
      meesho: { type: Number, default: 0 },
    },
    stock: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  }],

}, {
  timestamps: true
});

// Single and Compound Indexes
ProductSchema.index({ sku: 1 });
ProductSchema.index({ barcode: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ isDead: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ 'platformIds.amazon.asin': 1 });
ProductSchema.index({ 'platformIds.flipkart.fsin': 1 });
ProductSchema.index({ 'platformIds.fifozone.productId': 1 });
ProductSchema.index({ 'platformIds.meesho.productId': 1 });
ProductSchema.index({ category: 1, isActive: 1 });

// Full-text search index
ProductSchema.index({
  masterName: 'text',
  alternateNames: 'text',
  brand: 'text',
  tags: 'text'
});

module.exports = mongoose.model('Product', ProductSchema);
