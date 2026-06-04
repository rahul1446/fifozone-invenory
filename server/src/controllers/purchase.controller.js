const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true },
  supplier: { type: String, required: true },
  product: { type: String, required: true },
  qty: { type: Number, required: true },
  unitCost: { type: Number, required: true },
  total: { type: Number, default: 0 },
  status: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },
  purchaseDate: { type: Date, default: Date.now },
}, { timestamps: true });

const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', PurchaseSchema);

const MOCK_PURCHASES = [
  { invoiceNo: 'INV-1001', supplier: 'Royal Canin India', product: 'Royal Canin Adult Dog 3kg', qty: 50, unitCost: 1200, total: 60000, status: 'Paid' },
  { invoiceNo: 'INV-1002', supplier: 'Drools Pet Food', product: 'Drools Chicken & Egg 1kg', qty: 100, unitCost: 320, total: 32000, status: 'Pending' },
  { invoiceNo: 'INV-0998', supplier: 'Himalaya Herbal', product: 'Himalaya Erina EP 200ml', qty: 80, unitCost: 185, total: 14800, status: 'Paid' },
  { invoiceNo: 'INV-0995', supplier: 'Venkys India Ltd', product: 'Fipnil Plus L 1ml', qty: 200, unitCost: 95, total: 19000, status: 'Pending' },
  { invoiceNo: 'INV-0990', supplier: 'Mars Petcare', product: 'Whiskas Tuna 85g x12', qty: 60, unitCost: 540, total: 32400, status: 'Paid' },
  { invoiceNo: 'INV-0985', supplier: 'Royal Canin India', product: 'Royal Canin Kitten 2kg', qty: 40, unitCost: 1450, total: 58000, status: 'Paid' },
  { invoiceNo: 'INV-0980', supplier: 'Drools Pet Food', product: 'Drools Focus Adult 3kg', qty: 70, unitCost: 480, total: 33600, status: 'Pending' },
  { invoiceNo: 'INV-0975', supplier: 'Himalaya Herbal', product: 'Himalaya Skin Cream 50g', qty: 120, unitCost: 145, total: 17400, status: 'Paid' },
];

exports.getPurchases = asyncHandler(async (req, res) => {
  let purchases = await Purchase.find().sort({ createdAt: -1 });
  if (purchases.length === 0) {
    await Purchase.insertMany(MOCK_PURCHASES);
    purchases = await Purchase.find().sort({ createdAt: -1 });
  }
  res.json(new ApiResponse(200, purchases, 'Purchases fetched'));
});

exports.createPurchase = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  data.total = data.qty * data.unitCost;
  const purchase = await Purchase.create(data);
  res.status(201).json(new ApiResponse(201, purchase, 'Purchase recorded'));
});
