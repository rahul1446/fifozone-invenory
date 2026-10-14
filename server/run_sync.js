// Run WooCommerce sync locally against Atlas DB
require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');

// Load models before using them
require('./src/models/Product.model');
require('./src/models/PlatformCredential.model');
require('./src/models/PlatformSync.model');
require('./src/models/InventoryLog.model');

const SyncService = require('./src/services/sync.service');

async function runSync() {
  const uri = process.env.MONGO_URI || 'mongodb+srv://fifozone:fifozone%401446@cluster0.r8mpz1j.mongodb.net/fifozone?appName=Cluster0';
  console.log('Connecting to Atlas...');
  await mongoose.connect(uri);
  console.log('Connected! Starting WooCommerce sync...');
  console.log('This will pull ALL 14,000+ products — it may take several minutes.\n');

  const startTime = Date.now();
  
  try {
    await SyncService.syncAllPlatforms();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Sync completed in ${elapsed} seconds!`);
  } catch (err) {
    console.error('Sync failed:', err.message);
  }

  // Count products after sync
  const Product = require('./src/models/Product.model');
  const total = await Product.countDocuments({ isActive: true });
  const active = await Product.countDocuments({ isActive: true, 'platformStatus.fifozone': 'active' });
  console.log(`\nTotal active products: ${total}`);
  console.log(`Fifozone active: ${active}`);
  
  await mongoose.disconnect();
  process.exit(0);
}

runSync().catch(e => { console.error(e); process.exit(1); });
