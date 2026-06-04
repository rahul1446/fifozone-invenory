const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactPerson: String,
  phone: String,
  email: String,
  city: String,
  state: String,
  productsSupplied: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema);

const MOCK_SUPPLIERS = [
  { name: 'Royal Canin India', contactPerson: 'Rajesh Sharma', phone: '9876543210', email: 'rajesh@royalcanin.in', city: 'Mumbai', state: 'Maharashtra', productsSupplied: 12, status: 'Active' },
  { name: 'Drools Pet Food', contactPerson: 'Priya Patel', phone: '9765432109', email: 'priya@drools.in', city: 'Ahmedabad', state: 'Gujarat', productsSupplied: 8, status: 'Active' },
  { name: 'Himalaya Herbal', contactPerson: 'Amit Kumar', phone: '9654321098', email: 'amit@himalaya.in', city: 'Bengaluru', state: 'Karnataka', productsSupplied: 5, status: 'Active' },
  { name: 'Venkys India Ltd', contactPerson: 'Suresh Reddy', phone: '9543210987', email: 'suresh@venkys.in', city: 'Hyderabad', state: 'Telangana', productsSupplied: 10, status: 'Active' },
  { name: 'Mars Petcare', contactPerson: 'Deepa Iyer', phone: '9432109876', email: 'deepa@mars.com', city: 'Chennai', state: 'Tamil Nadu', productsSupplied: 7, status: 'Active' },
  { name: 'Farmina Pet Foods', contactPerson: 'Ravi Nair', phone: '9321098765', email: 'ravi@farmina.in', city: 'Kochi', state: 'Kerala', productsSupplied: 4, status: 'Active' },
  { name: 'Beaphar India', contactPerson: 'Neha Gupta', phone: '9210987654', email: 'neha@beaphar.in', city: 'Delhi', state: 'Delhi', productsSupplied: 6, status: 'Inactive' },
  { name: 'Virbac Animal Health', contactPerson: 'Mohan Singh', phone: '9109876543', email: 'mohan@virbac.in', city: 'Pune', state: 'Maharashtra', productsSupplied: 9, status: 'Active' },
];

exports.getSuppliers = asyncHandler(async (req, res) => {
  let suppliers = await Supplier.find().sort({ createdAt: -1 });
  if (suppliers.length === 0) {
    await Supplier.insertMany(MOCK_SUPPLIERS);
    suppliers = await Supplier.find().sort({ createdAt: -1 });
  }
  res.json(new ApiResponse(200, suppliers, 'Suppliers fetched'));
});

exports.createSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.create(req.body);
  res.status(201).json(new ApiResponse(201, supplier, 'Supplier created'));
});

exports.updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(new ApiResponse(200, supplier, 'Supplier updated'));
});

exports.deleteSupplier = asyncHandler(async (req, res) => {
  await Supplier.findByIdAndDelete(req.params.id);
  res.json(new ApiResponse(200, {}, 'Supplier deleted'));
});
