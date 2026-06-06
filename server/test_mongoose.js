require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const PurchaseSchema = new mongoose.Schema({
      supplier: { type: String, required: true },
      invoiceNo: { type: String, required: true },
      grandTotal: { type: Number, required: true, default: 0 },
    }, { strict: false }); // Relaxed for test

    const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', PurchaseSchema);
    
    const SupplierSchema = new mongoose.Schema({
      name: { type: String, required: true },
    }, { strict: false });
    
    const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema);

    console.log('Fetching suppliers...');
    const suppliers = await Supplier.find().sort({ createdAt: -1 });
    console.log('Suppliers:', suppliers.length);

    console.log('Fetching purchases...');
    const purchases = await Purchase.find().sort({ createdAt: -1 });
    console.log('Purchases:', purchases.length);

  } catch (err) {
    console.error('Mongoose error:', err);
  } finally {
    process.exit(0);
  }
});
