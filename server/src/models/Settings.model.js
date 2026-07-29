const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  // ── Company Info ──
  companyName: { type: String, default: 'Fifozone' },
  email:       { type: String, default: '' },
  phone:       { type: String, default: '' },
  address:     { type: String, default: '' },
  gstin:       { type: String, default: '' },
  currency:    { type: String, default: 'INR' },
  timezone:    { type: String, default: 'Asia/Kolkata' },
  logoUrl:     { type: String, default: '' },
  primaryColor:{ type: String, default: '#059669' },

  // ── Shiprocket ──
  shiprocket: {
    email:          { type: String, default: '' },
    password:       { type: String, default: '' }, // stored as-is; use HTTPS + auth guard
    pickupLocation: { type: String, default: 'Primary' },
    isConfigured:   { type: Boolean, default: false },
  },

  // ── WooCommerce ──
  woocommerce: {
    siteUrl:        { type: String, default: '' },
    consumerKey:    { type: String, default: '' },
    consumerSecret: { type: String, default: '' },
    isConfigured:   { type: Boolean, default: false },
  },

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);
