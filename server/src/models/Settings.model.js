const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    default: 'Fifozone',
  },
  email: {
    type: String,
    default: '',
  },
  phone: {
    type: String,
    default: '',
  },
  address: {
    type: String,
    default: '',
  },
  gstin: {
    type: String,
    default: '',
  },
  currency: {
    type: String,
    default: 'INR',
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata',
  },
  logoUrl: {
    type: String,
    default: '',
  },
  primaryColor: {
    type: String,
    default: '#059669', // Emerald 600
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Settings', SettingsSchema);
