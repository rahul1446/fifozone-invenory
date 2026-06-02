'use strict';

const { daysAgo } = require('../data/helpers');

// ─── 3 Settlement periods (last 3 weeks) ─────────────────────────────────────
const flipkartPayments = {
  sellerId: 'FKSELLER-FIFOZONE-001',
  sellerName: 'Fifozone Pet Nutrition',
  currency: 'INR',
  settlements: [
    // ── Week 1 — Most recent settlement ──────────────────────────────────
    {
      settlementId: 'STL-FK-001',
      settlementDate: daysAgo(7),
      settlementPeriod: {
        from: daysAgo(14),
        to:   daysAgo(7),
      },
      status: 'SETTLED',
      amount: {
        grossSettlement: 28450.00,
        totalDeduction:  3124.50,
        netSettlement:   25325.50,
        currency: 'INR',
      },
      orderCount: 18,
      unitsSold: 26,
      breakdown: [
        { type: 'GrossOrderAmount',       amount:  28450.00, description: 'Total order value before deductions' },
        { type: 'CommissionFee',          amount:  -2560.50, description: 'Flipkart marketplace commission (9%)' },
        { type: 'FixedFee',               amount:   -180.00, description: 'Fixed fee per order (18 orders × ₹10)' },
        { type: 'ShippingFee',            amount:   -279.00, description: 'Ekart shipping charges (18 orders)' },
        { type: 'ReturnProcessingFee',    amount:    -75.00, description: 'Return handling fee (3 returns × ₹25)' },
        { type: 'GST',                    amount:    -30.00, description: 'GST on fees' },
        { type: 'Adjustment',             amount:     0.00,  description: 'No adjustments this period' },
      ],
      bankDetails: {
        accountNumber: 'XXXX XXXX 4892',
        ifscCode:      'HDFC0001234',
        bankName:      'HDFC Bank',
        transferId:    'TXN-FK-STL-001-20260522',
        transferDate:  daysAgo(7),
      },
    },

    // ── Week 2 ────────────────────────────────────────────────────────────
    {
      settlementId: 'STL-FK-002',
      settlementDate: daysAgo(14),
      settlementPeriod: {
        from: daysAgo(21),
        to:   daysAgo(14),
      },
      status: 'SETTLED',
      amount: {
        grossSettlement: 34780.00,
        totalDeduction:  3952.20,
        netSettlement:   30827.80,
        currency: 'INR',
      },
      orderCount: 22,
      unitsSold: 31,
      breakdown: [
        { type: 'GrossOrderAmount',       amount:  34780.00, description: 'Total order value before deductions' },
        { type: 'CommissionFee',          amount:  -3130.20, description: 'Flipkart marketplace commission (9%)' },
        { type: 'FixedFee',               amount:   -220.00, description: 'Fixed fee per order (22 orders × ₹10)' },
        { type: 'ShippingFee',            amount:   -462.00, description: 'Ekart shipping charges (22 orders × ₹21)' },
        { type: 'ReturnProcessingFee',    amount:   -100.00, description: 'Return handling fee (4 returns × ₹25)' },
        { type: 'GST',                    amount:    -40.00, description: 'GST on fees' },
        { type: 'Adjustment',             amount:     0.00,  description: 'No adjustments this period' },
      ],
      bankDetails: {
        accountNumber: 'XXXX XXXX 4892',
        ifscCode:      'HDFC0001234',
        bankName:      'HDFC Bank',
        transferId:    'TXN-FK-STL-002-20260515',
        transferDate:  daysAgo(14),
      },
    },

    // ── Week 3 ────────────────────────────────────────────────────────────
    {
      settlementId: 'STL-FK-003',
      settlementDate: daysAgo(21),
      settlementPeriod: {
        from: daysAgo(28),
        to:   daysAgo(21),
      },
      status: 'SETTLED',
      amount: {
        grossSettlement: 21960.00,
        totalDeduction:  2450.40,
        netSettlement:   19509.60,
        currency: 'INR',
      },
      orderCount: 14,
      unitsSold: 19,
      breakdown: [
        { type: 'GrossOrderAmount',       amount:  21960.00, description: 'Total order value before deductions' },
        { type: 'CommissionFee',          amount:  -1976.40, description: 'Flipkart marketplace commission (9%)' },
        { type: 'FixedFee',               amount:   -140.00, description: 'Fixed fee per order (14 orders × ₹10)' },
        { type: 'ShippingFee',            amount:   -294.00, description: 'Ekart shipping charges (14 orders × ₹21)' },
        { type: 'ReturnProcessingFee',    amount:    -25.00, description: 'Return handling fee (1 return × ₹25)' },
        { type: 'GST',                    amount:    -15.00, description: 'GST on fees' },
        { type: 'CancellationDeduction',  amount:     0.00,  description: 'No cancellation deductions' },
        { type: 'Adjustment',             amount:     0.00,  description: 'No adjustments this period' },
      ],
      bankDetails: {
        accountNumber: 'XXXX XXXX 4892',
        ifscCode:      'HDFC0001234',
        bankName:      'HDFC Bank',
        transferId:    'TXN-FK-STL-003-20260508',
        transferDate:  daysAgo(21),
      },
    },
  ],

  // ── Summary across all 3 settlements ──────────────────────────────────────
  summary: {
    totalGrossSettlement: 28450.00 + 34780.00 + 21960.00,
    totalNetSettlement:   25325.50 + 30827.80 + 19509.60,
    totalDeductions:       3124.50 +  3952.20 +  2450.40,
    totalOrders:           18 + 22 + 14,
    totalUnitsSold:        26 + 31 + 19,
    period: { from: daysAgo(28), to: daysAgo(0) },
  },
};

module.exports = { flipkartPayments };
