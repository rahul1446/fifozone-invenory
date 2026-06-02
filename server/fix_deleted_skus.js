/**
 * Fix script: Restores products that were deleted with mangled SKUs (-DELETED- suffix).
 * Removes the suffix and sets deletedBySeller=true so the sync guard works correctly.
 */
const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/fifozone').then(async () => {
  const Product = require('./src/models/Product.model');

  // Find all products with the -DELETED- suffix in SKU or barcode
  const broken = await Product.find({
    $or: [
      { sku: { $regex: '-DELETED-', $options: 'i' } },
      { barcode: { $regex: '-DELETED-', $options: 'i' } }
    ]
  });

  console.log(`Found ${broken.length} product(s) with broken -DELETED- suffix.`);

  for (const p of broken) {
    const originalSku = p.sku ? p.sku.replace(/-DELETED-\d+$/, '') : p.sku;
    const originalBarcode = p.barcode ? p.barcode.replace(/-DELETED-\d+$/, '') : p.barcode;

    // Check if a product with the original SKU already exists (re-created by sync)
    const duplicate = originalSku ? await Product.findOne({ sku: originalSku, _id: { $ne: p._id } }) : null;

    if (duplicate) {
      // A duplicate was re-created by sync — delete it (it's stale platform data)
      console.log(`  Removing sync-re-created duplicate: "${duplicate.masterName}" (${originalSku})`);
      await Product.findByIdAndDelete(duplicate._id);
    }

    // Restore original SKU/barcode and mark properly
    p.sku = originalSku;
    p.barcode = originalBarcode;
    p.isActive = false;
    p.deletedBySeller = true;
    await p.save();
    console.log(`  Fixed: "${p.masterName}" → SKU restored to "${originalSku}"`);
  }

  console.log('Done. All broken deletions fixed.');
  mongoose.disconnect();
}).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
