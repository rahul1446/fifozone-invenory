const mongoose = require('mongoose');

const PlatformSyncSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['fifozone', 'amazon', 'flipkart'],
    required: true,
    unique: true
  },
  lastProductSync: {
    type: Date,
    default: Date.now
  },
  lastOrderSync: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['synced', 'error', 'syncing'],
    default: 'synced'
  },
  lastErrorMessage: {
    type: String,
    default: ''
  },
  syncedProductsCount: {
    type: Number,
    default: 0
  },
  pendingSyncCount: {
    type: Number,
    default: 0
  },
  errorsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PlatformSync', PlatformSyncSchema);
