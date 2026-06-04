const mongoose = require('mongoose');

const PlatformCredentialSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['fifozone', 'amazon', 'flipkart', 'meesho'],
    required: true,
    unique: true
  },
  credentials: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PlatformCredential', PlatformCredentialSchema);
