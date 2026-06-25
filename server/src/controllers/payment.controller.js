const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const Transaction = require('../models/Transaction.model');
const Order = require('../models/Order.model');
let xlsx;
try {
  xlsx = require('xlsx');
} catch(e) {}

const seedMockTransactions = async () => {
  const count = await Transaction.countDocuments();
  if (count > 0) return;

  const platforms = ['fifozone', 'amazon', 'flipkart'];
  const transactions = [];

  for (let i = 0; i < 30; i++) {
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const isFee = Math.random() > 0.8;
    const isSettlement = Math.random() > 0.9;
    
    let type = 'sale';
    if (isFee) type = 'fee';
    else if (isSettlement) type = 'settlement';

    const amount = Math.floor(Math.random() * 5000) + 500;
    
    transactions.push({
      platform,
      type,
      orderNumber: type === 'sale' ? `ORD-${Math.floor(Math.random() * 10000)}` : null,
      productName: type === 'sale' ? 'Pet Food 3kg' : null,
      grossAmount: type === 'sale' ? amount : 0,
      platformFee: type === 'sale' ? amount * 0.15 : (type === 'fee' ? amount * 0.02 : 0),
      netAmount: type === 'sale' ? amount * 0.85 : (type === 'fee' ? -amount * 0.02 : amount),
      settlementStatus: type === 'settlement' ? 'settled' : (Math.random() > 0.5 ? 'settled' : 'pending'),
      transactionDate: new Date(Date.now() - Math.floor(Math.random() * 2592000000))
    });
  }

  await Transaction.insertMany(transactions);
};

exports.getPaymentOverview = asyncHandler(async (req, res) => {
  let totalRevenue = 0, settled = 0, pending = 0, platformFees = 0;
  try {
     const orders = await Order.find({ status: 'delivered' });
     totalRevenue = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
  } catch(e) {
     totalRevenue = 150000;
  }
  
  settled = totalRevenue * 0.7;
  pending = totalRevenue * 0.3;
  platformFees = totalRevenue * 0.12;

  const netEarnings = totalRevenue - platformFees;

  const revenueChartData = [
    { month: 'Jan', fifozone: 10000, amazon: 15000, flipkart: 12000 },
    { month: 'Feb', fifozone: 12000, amazon: 16000, flipkart: 11000 },
    { month: 'Mar', fifozone: 15000, amazon: 18000, flipkart: 13000 }
  ];

  const platforms = {
    fifozone: { revenue: totalRevenue * 0.4, lastSettlement: new Date(), pending: pending * 0.4 },
    amazon: { revenue: totalRevenue * 0.35, lastSettlement: new Date(Date.now() - 86400000), pending: pending * 0.35 },
    flipkart: { revenue: totalRevenue * 0.25, lastSettlement: new Date(Date.now() - 172800000), pending: pending * 0.25 }
  };

  res.status(200).json(new ApiResponse(200, {
    stats: { totalRevenue, settled, pending, platformFees, netEarnings },
    revenueChartData,
    platforms
  }, 'Payment overview fetched'));
});

exports.getTransactions = asyncHandler(async (req, res) => {
  await seedMockTransactions();
  const { platform, type, status, page = 1, limit = 10 } = req.query;
  
  const query = {};
  if (platform) query.platform = platform;
  if (type) query.type = type;
  if (status) query.settlementStatus = status;

  const skip = (page - 1) * limit;
  const transactions = await Transaction.find(query).sort({ transactionDate: -1 }).skip(skip).limit(parseInt(limit));
  const total = await Transaction.countDocuments(query);

  res.status(200).json(new ApiResponse(200, { transactions, total, page, limit }, 'Transactions fetched'));
});

exports.getFeeBreakdown = asyncHandler(async (req, res) => {
  const breakdown = {
    fifozone: { paymentGateway: 2, totalPercent: 2 },
    amazon: { referral: 15, closing: 20, totalPercent: 18 },
    flipkart: { commission: 12, collection: 2, totalPercent: 14 }
  };
  
  res.status(200).json(new ApiResponse(200, breakdown, 'Fee breakdown fetched'));
});

exports.exportPayments = asyncHandler(async (req, res) => {
  if (!xlsx) throw new ApiError(500, 'xlsx library is required for export');
  
  const transactions = await Transaction.find().sort({ transactionDate: -1 }).lean();
  const data = transactions.map(t => ({
    Date: t.transactionDate ? t.transactionDate.toISOString().split('T')[0] : '',
    Platform: t.platform,
    Type: t.type,
    Order: t.orderNumber || '',
    Product: t.productName || '',
    'Gross Amount': t.grossAmount,
    Fee: t.platformFee,
    'Net Amount': t.netAmount,
    Status: t.settlementStatus
  }));

  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Transactions');
  
  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// ─── Settlements ────────────────────────────────────────────
const mongoose = require('mongoose');

const SettlementSchema = new mongoose.Schema({
  platform: { type: String, enum: ['amazon', 'flipkart', 'meesho', 'fifozone'] },
  settlementId: String,
  ordersCount: Number,
  grossAmount: Number,
  deductions: Number,
  netAmount: Number,
  status: { type: String, enum: ['Settled', 'Pending'], default: 'Pending' },
  settlementDate: { type: Date, default: Date.now },
}, { timestamps: true });
const Settlement = mongoose.models.Settlement || mongoose.model('Settlement', SettlementSchema);

const MOCK_SETTLEMENTS = [
  { platform: 'amazon', settlementId: 'AMZS-10001', ordersCount: 45, grossAmount: 89500, deductions: 8950, netAmount: 80550, status: 'Settled', settlementDate: new Date('2026-06-01') },
  { platform: 'flipkart', settlementId: 'FKST-20001', ordersCount: 32, grossAmount: 64000, deductions: 6400, netAmount: 57600, status: 'Settled', settlementDate: new Date('2026-06-01') },
  { platform: 'meesho', settlementId: 'MSST-30001', ordersCount: 28, grossAmount: 42000, deductions: 4200, netAmount: 37800, status: 'Pending', settlementDate: null },
  { platform: 'fifozone', settlementId: 'FZ-40001', ordersCount: 18, grossAmount: 36000, deductions: 0, netAmount: 36000, status: 'Settled', settlementDate: new Date('2026-05-31') },
  { platform: 'amazon', settlementId: 'AMZS-10002', ordersCount: 38, grossAmount: 76000, deductions: 7600, netAmount: 68400, status: 'Pending', settlementDate: null },
  { platform: 'flipkart', settlementId: 'FKST-20002', ordersCount: 22, grossAmount: 44000, deductions: 4400, netAmount: 39600, status: 'Settled', settlementDate: new Date('2026-05-28') },
];

exports.getSettlements = asyncHandler(async (req, res) => {
  const data = await Settlement.find().sort({ settlementDate: -1 });
  res.json(new ApiResponse(200, data, 'Settlements fetched'));
});

// ─── Invoices ────────────────────────────────────────────────
const InvoiceSchema = new mongoose.Schema({
  invoiceNo: String,
  customer: String,
  items: [{ product: String, qty: Number, price: Number }],
  amount: Number,
  status: { type: String, enum: ['Paid', 'Unpaid'], default: 'Unpaid' },
  invoiceDate: { type: Date, default: Date.now },
}, { timestamps: true });
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);

exports.getInvoices = asyncHandler(async (req, res) => {
  const data = await Invoice.find().sort({ createdAt: -1 });
  res.json(new ApiResponse(200, data, 'Invoices fetched'));
});

exports.createInvoice = asyncHandler(async (req, res) => {
  const { customer, items } = req.body;
  const amount = (items || []).reduce((s, i) => s + (i.qty * i.price), 0);
  const count = await Invoice.countDocuments();
  const invoice = await Invoice.create({
    invoiceNo: `INV-${(count + 1).toString().padStart(4, '0')}`,
    customer, items, amount
  });
  res.status(201).json(new ApiResponse(201, invoice, 'Invoice created'));
});

// ─── Refunds ─────────────────────────────────────────────────
exports.getRefunds = asyncHandler(async (req, res) => {
  try {
    const ReturnRequest = require('../models/ReturnRequest.model');
    const refunds = await ReturnRequest.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(new ApiResponse(200, refunds, 'Refunds fetched'));
  } catch (e) {
    res.json(new ApiResponse(200, [], 'No refunds found'));
  }
});
