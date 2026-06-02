'use strict';

const { daysFromNow, daysAgo } = require('../data/helpers');

// ─── Flipkart Seller Health Dashboard ────────────────────────────────────────
const flipkartSellerHealth = {
  sellerId: 'FKSELLER-FIFOZONE-001',
  sellerName: 'Fifozone Pet Nutrition',
  sellerScore: 82,
  tier: 'Silver',
  tierDetails: {
    current: 'Silver',
    next: 'Gold',
    pointsToNextTier: 18,
    scoreRequiredForNextTier: 100,
    tierBenefits: {
      Silver: ['Priority Listing', 'Lower Commission (9%)', 'Dedicated Account Manager', 'Flipkart Smart ROI Ads Access'],
      Gold: ['Premium Listing Badge', 'Lowest Commission (7.5%)', 'Priority Customer Support', 'Assured Program Eligibility', 'Featured Brand Store'],
    },
  },

  // ── Key Performance Metrics ────────────────────────────────────────────────
  metrics: [
    {
      name: 'Order Completion Rate',
      description: 'Percentage of approved orders that were successfully delivered',
      value: 97.2,
      threshold: 95.0,
      unit: '%',
      status: 'GOOD',
      trend: 'STABLE',
      scoreContribution: 20,
    },
    {
      name: 'Cancellation Rate',
      description: 'Percentage of orders cancelled by the seller',
      value: 2.1,
      threshold: 4.0,
      unit: '%',
      status: 'GOOD',
      trend: 'IMPROVING',
      scoreContribution: 15,
    },
    {
      name: 'Returns Rate',
      description: 'Percentage of delivered orders that were returned',
      value: 3.8,
      threshold: 8.0,
      unit: '%',
      status: 'GOOD',
      trend: 'STABLE',
      scoreContribution: 15,
    },
    {
      name: 'Customer Rating',
      description: 'Average customer rating across all products (last 90 days)',
      value: 4.2,
      threshold: 3.5,
      unit: 'stars',
      status: 'GOOD',
      trend: 'IMPROVING',
      scoreContribution: 20,
    },
    {
      name: 'Late Dispatch Rate',
      description: 'Percentage of orders not dispatched within the SLA window',
      value: 5.2,
      threshold: 4.0,
      unit: '%',
      status: 'AT_RISK',
      trend: 'WORSENING',
      scoreContribution: 4,   // Reduced due to AT_RISK status
      recommendation: 'Dispatch orders within 24 hours of approval. Consider adding warehouse staff during peak order periods.',
    },
    {
      name: 'SLA Breach Rate',
      description: 'Percentage of orders that breached promised delivery date',
      value: 1.1,
      threshold: 2.0,
      unit: '%',
      status: 'GOOD',
      trend: 'STABLE',
      scoreContribution: 8,
    },
  ],

  // ── Seller Benefits for Current Tier ──────────────────────────────────────
  benefits: [
    'Priority Listing',
    'Lower Commission (9%)',
    'Dedicated Account Manager',
    'Flipkart Smart ROI Ads Access',
  ],

  // ── Review & Violation Info ────────────────────────────────────────────────
  nextReviewDate: daysFromNow(21),
  lastReviewDate: daysAgo(9),
  violations: [],
  warnings: [
    {
      warningId: 'WARN-FK-001',
      type: 'LATE_DISPATCH_WARNING',
      severity: 'MEDIUM',
      issuedAt: daysAgo(3),
      expiresAt: daysFromNow(27),
      message: 'Your Late Dispatch Rate (5.2%) has exceeded the acceptable threshold of 4.0% for the current review period. If this is not improved within 30 days, it may impact your seller score and tier.',
      actionRequired: 'Ensure all orders are dispatched within 24 hours of approval. Use bulk dispatch tools available in the Flipkart Seller Hub.',
    },
  ],

  // ── Historical Score Trend ─────────────────────────────────────────────────
  scoreTrend: [
    { period: 'Jan 2026', score: 75, tier: 'Silver' },
    { period: 'Feb 2026', score: 78, tier: 'Silver' },
    { period: 'Mar 2026', score: 80, tier: 'Silver' },
    { period: 'Apr 2026', score: 84, tier: 'Silver' },
    { period: 'May 2026', score: 82, tier: 'Silver' },
  ],

  // ── Commission Rate Detail ─────────────────────────────────────────────────
  commissionStructure: {
    current: 9.0,
    standard: 11.5,
    saving: 2.5,
    categories: [
      { category: 'Dog Food & Medicine',       rate: 9.0 },
      { category: 'Cat Food & Medicine',       rate: 9.0 },
      { category: 'Pet Grooming',              rate: 9.0 },
      { category: 'Vitamins & Supplements',    rate: 9.0 },
      { category: 'Bird Food',                 rate: 9.0 },
    ],
  },

  // ── Period ────────────────────────────────────────────────────────────────
  reportingPeriod: {
    from: daysAgo(90),
    to:   daysAgo(0),
    label: 'Last 90 days',
  },
  generatedAt: daysAgo(0),
};

module.exports = { flipkartSellerHealth };
