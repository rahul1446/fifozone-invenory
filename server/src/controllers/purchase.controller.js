const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const mongoose = require('mongoose');
const Product = require('../models/Product.model');
const InventoryLog = require('../models/InventoryLog.model');
const SyncService = require('../services/sync.service');

const PurchaseItemSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  hsnSac: String,
  batchNo: String,
  mfgDate: String,
  expiryDate: String,
  manufacturerName: String,
  storeLocation: String,
  qty: { type: Number, required: true, default: 0 },
  unit: String,
  mrp: { type: Number, default: 0 },
  rate: { type: Number, required: true, default: 0 },
  discount: { type: Number, default: 0 },
  gstRate: { type: Number, default: 0 },
});

const PurchaseSchema = new mongoose.Schema({
  supplier: { type: String, required: true },
  invoiceNo: { type: String, required: true },
  invoiceDate: String,
  gstInvoiceNo: String,
  placeOfSupply: String,
  transportMode: String,
  vehicleNo: String,
  ewayBillNo: String,
  transitInsurance: String,
  reverseCharge: { type: String, enum: ['Yes', 'No'], default: 'No' },

  items: [PurchaseItemSchema],

  netTaxableValue: { type: Number, default: 0 },
  totalIgst: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  roundingOff: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true, default: 0 },
  amountInWords: String,

  status: { type: String, enum: ['Draft', 'Posted', 'Cancelled'], default: 'Draft' },
  purchaseDate: { type: Date, default: Date.now },
}, { timestamps: true });

const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', PurchaseSchema);

exports.getPurchases = asyncHandler(async (req, res) => {
  const purchases = await Purchase.find().sort({ createdAt: -1 });
  res.json(new ApiResponse(200, purchases, 'Purchases fetched'));
});

exports.createPurchase = asyncHandler(async (req, res) => {
  const data = req.body;
  const purchase = await Purchase.create(data);

  // If status is Posted, we need to add stock
  if (purchase.status === 'Posted' && purchase.items && purchase.items.length > 0) {
    for (const item of purchase.items) {
      if (item.productId && item.qty > 0) {
        const product = await Product.findById(item.productId);
        if (product) {
          const prevStock = product.totalStock;
          product.totalStock += item.qty;
          product.stockByPlatform.warehouse = (product.stockByPlatform.warehouse || 0) + item.qty;
          
          if (item.mrp && item.mrp > 0) product.mrp = item.mrp;
          
          await product.save();

          await InventoryLog.create({
            product: product._id,
            productName: product.masterName,
            sku: product.sku,
            changeType: 'purchase_receipt',
            platform: 'warehouse',
            previousStock: prevStock,
            changeQuantity: item.qty,
            newStock: product.totalStock,
            performedBy: req.user ? req.user._id : null,
            note: `Received from supplier ${purchase.supplier} via Inv# ${purchase.invoiceNo}`
          });
          
          SyncService.pushStockToPlatforms(product);
        }
      }
    }
  }

  res.status(201).json(new ApiResponse(201, purchase, 'Purchase invoice recorded successfully'));
});

// Helper function to reverse stock additions
const reversePurchaseStock = async (purchase, user) => {
  if (purchase.status === 'Posted' && purchase.items && purchase.items.length > 0) {
    for (const item of purchase.items) {
      if (item.productId && item.qty > 0) {
        const product = await Product.findById(item.productId);
        if (product) {
          const prevStock = product.totalStock;
          product.totalStock -= item.qty;
          product.stockByPlatform.warehouse = (product.stockByPlatform.warehouse || 0) - item.qty;
          
          await product.save();

          await InventoryLog.create({
            product: product._id,
            productName: product.masterName,
            sku: product.sku,
            changeType: 'adjustment',
            platform: 'warehouse',
            previousStock: prevStock,
            changeQuantity: -item.qty,
            newStock: product.totalStock,
            performedBy: user ? user._id : null,
            note: `Reversed stock from deleted/edited supplier invoice ${purchase.invoiceNo}`
          });
          
          SyncService.pushStockToPlatforms(product);
        }
      }
    }
  }
};

exports.updatePurchase = asyncHandler(async (req, res) => {
  const data = req.body;
  const purchaseId = req.params.id;
  
  const oldPurchase = await Purchase.findById(purchaseId);
  if (!oldPurchase) {
    return res.status(404).json(new ApiResponse(404, null, 'Purchase not found'));
  }

  // If the old purchase was posted, reverse its stock first
  if (oldPurchase.status === 'Posted') {
    await reversePurchaseStock(oldPurchase, req.user);
  }

  // Update the purchase record
  const updatedPurchase = await Purchase.findByIdAndUpdate(purchaseId, data, { new: true });

  // If the new status is Posted, add the new stock
  if (updatedPurchase.status === 'Posted' && updatedPurchase.items && updatedPurchase.items.length > 0) {
    for (const item of updatedPurchase.items) {
      if (item.productId && item.qty > 0) {
        const product = await Product.findById(item.productId);
        if (product) {
          const prevStock = product.totalStock;
          product.totalStock += item.qty;
          product.stockByPlatform.warehouse = (product.stockByPlatform.warehouse || 0) + item.qty;
          
          if (item.mrp && item.mrp > 0) product.mrp = item.mrp;
          
          await product.save();

          await InventoryLog.create({
            product: product._id,
            productName: product.masterName,
            sku: product.sku,
            changeType: 'purchase_receipt',
            platform: 'warehouse',
            previousStock: prevStock,
            changeQuantity: item.qty,
            newStock: product.totalStock,
            performedBy: req.user ? req.user._id : null,
            note: `Updated receipt from supplier ${updatedPurchase.supplier} via Inv# ${updatedPurchase.invoiceNo}`
          });
          
          SyncService.pushStockToPlatforms(product);
        }
      }
    }
  }

  res.json(new ApiResponse(200, updatedPurchase, 'Purchase updated successfully'));
});

exports.deletePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) {
    return res.status(404).json(new ApiResponse(404, null, 'Purchase not found'));
  }

  // If posted, reverse the stock before deleting
  if (purchase.status === 'Posted') {
    await reversePurchaseStock(purchase, req.user);
  }

  await Purchase.findByIdAndDelete(req.params.id);
  res.json(new ApiResponse(200, {}, 'Purchase deleted successfully'));
});
