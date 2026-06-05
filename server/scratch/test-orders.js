require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const SyncService = require('../src/services/sync.service');
const PlatformSync = require('../src/models/PlatformSync.model');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    await SyncService.syncOrders();
    console.log('Sync orders completed');
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit();
}

test();
