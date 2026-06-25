const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  supplierCode: String,
  gstin: { type: String, required: true },
  panNo: { type: String },
  fssaiLic: String,
  drugLic20B: String,
  drugLic21B: String,
  mobileNumber: String,
  alternateNumber: String,
  email: String,
  registeredAddress: { type: String, required: true },
  city: String,
  state: { type: String, required: true },
  brokerName: String,
  bankName: String,
  accountNumber: String,
  ifscCode: String,
  upiNumber: String,
  paymentTerms: String,
  latePaymentInterest: String,
  jurisdictionCity: String,
  transitInsurancePolicy: String,
  termsConditions: String,
  productsSupplied: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema);

exports.getSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await Supplier.find().sort({ createdAt: -1 });
  res.json(new ApiResponse(200, suppliers, 'Suppliers fetched'));
});

const InventoryLog = require('../models/InventoryLog.model');

exports.createSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.create(req.body);
  
  await InventoryLog.create({
    productName: `Supplier: ${supplier.name}`,
    changeType: 'supplier_created',
    platform: 'internal',
    changeQuantity: 0,
    performedBy: req.user ? req.user._id : null,
    note: `Created new supplier: ${supplier.name} (${supplier.gstin || 'No GST'})`
  });

  res.status(201).json(new ApiResponse(201, supplier, 'Supplier created'));
});

exports.updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
  
  await InventoryLog.create({
    productName: `Supplier: ${supplier.name}`,
    changeType: 'supplier_updated',
    platform: 'internal',
    changeQuantity: 0,
    performedBy: req.user ? req.user._id : null,
    note: `Updated supplier details for ${supplier.name}`
  });

  res.json(new ApiResponse(200, supplier, 'Supplier updated'));
});

exports.deleteSupplier = asyncHandler(async (req, res) => {
  await Supplier.findByIdAndDelete(req.params.id);
  res.json(new ApiResponse(200, {}, 'Supplier deleted'));
});
