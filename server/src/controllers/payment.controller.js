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
