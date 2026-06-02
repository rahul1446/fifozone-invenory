'use strict';

const { daysAgo, daysFromNow } = require('../data/helpers');
const { products } = require('../data/products.data');

// ─── 5 Flipkart Smart ROI Ad Campaigns ──────────────────────────────────────
const flipkartAdCampaigns = [
  // ── Campaign 1: Royal Canin Urinary (Best Performer) ─────────────────────
  {
    campaignId: 'CMP-FK-001',
    campaignName: 'Royal Canin Urinary S/O — Smart ROI Boost',
    campaignType: 'SMART_ROI',
    status: 'ACTIVE',
    budget: {
      daily: 500.00,
      total: 15000.00,
      spent: 8240.50,
      remaining: 6759.50,
      currency: 'INR',
    },
    schedule: {
      startDate: daysAgo(30),
      endDate: daysFromNow(30),
    },
    targetedListings: [
      { fsn: products[0].flipkartFsin, sku: products[0].internalSku, title: products[0].name },
    ],
    targeting: {
      autoTargeting: true,
      keywords: ['urinary dog food', 'royal canin urinary', 'veterinary diet dog food', 'dog urinary care food'],
      matchType: 'BROAD',
    },
    metrics: {
      impressions: 48320,
      clicks: 1923,
      orders: 187,
      revenue: 954870.00,
      adSpend: 8240.50,
      ctr: 3.98,            // Click-through rate %
      conversionRate: 9.72, // Orders / Clicks %
      acos: 0.86,           // Ad Cost of Sale %
      roas: 115.88,         // Return on Ad Spend
      cpc: 4.28,            // Cost per Click ₹
      cpo: 44.07,           // Cost per Order ₹
    },
    dailyTrend: [
      { date: daysAgo(6), impressions: 6200, clicks: 248, orders: 24, spend: 1061.44 },
      { date: daysAgo(5), impressions: 7100, clicks: 284, orders: 28, spend: 1215.52 },
      { date: daysAgo(4), impressions: 6800, clicks: 271, orders: 26, spend: 1159.88 },
      { date: daysAgo(3), impressions: 7400, clicks: 296, orders: 29, spend: 1267.08 },
      { date: daysAgo(2), impressions: 6900, clicks: 275, orders: 27, spend: 1177.00 },
      { date: daysAgo(1), impressions: 7300, clicks: 291, orders: 28, spend: 1245.48 },
      { date: daysAgo(0), impressions: 6620, clicks: 258, orders: 25, spend: 1114.10 },
    ],
    lastUpdated: daysAgo(0),
  },

  // ── Campaign 2: Himalaya Grooming Products ────────────────────────────────
  {
    campaignId: 'CMP-FK-002',
    campaignName: 'Himalaya Grooming & Tick Control — Awareness Drive',
    campaignType: 'SMART_ROI',
    status: 'ACTIVE',
    budget: {
      daily: 300.00,
      total: 9000.00,
      spent: 4187.80,
      remaining: 4812.20,
      currency: 'INR',
    },
    schedule: {
      startDate: daysAgo(20),
      endDate: daysFromNow(10),
    },
    targetedListings: [
      { fsn: products[13].flipkartFsin, sku: products[13].internalSku, title: products[13].name },
      { fsn: products[29].flipkartFsin, sku: products[29].internalSku, title: products[29].name },
    ],
    targeting: {
      autoTargeting: false,
      keywords: ['dog shampoo', 'tick flea shampoo for dogs', 'himalaya erina dog shampoo', 'flea control dog', 'nootie dog shampoo'],
      matchType: 'EXACT',
    },
    metrics: {
      impressions: 31540,
      clicks: 892,
      orders: 64,
      revenue: 27008.00,
      adSpend: 4187.80,
      ctr: 2.83,
      conversionRate: 7.17,
      acos: 15.51,
      roas: 6.45,
      cpc: 4.69,
      cpo: 65.43,
    },
    dailyTrend: [
      { date: daysAgo(6), impressions: 4200, clicks: 119, orders: 9, spend: 558.11 },
      { date: daysAgo(5), impressions: 4800, clicks: 136, orders: 10, spread: 637.84 },
      { date: daysAgo(4), impressions: 4500, clicks: 127, orders: 9, spend: 595.63 },
      { date: daysAgo(3), impressions: 5100, clicks: 144, orders: 11, spend: 675.36 },
      { date: daysAgo(2), impressions: 4700, clicks: 133, orders: 10, spend: 623.77 },
      { date: daysAgo(1), impressions: 4600, clicks: 130, orders: 9, spend: 609.70 },
      { date: daysAgo(0), impressions: 3640, clicks: 103, orders: 6, spend: 487.39 },
    ],
    lastUpdated: daysAgo(0),
  },

  // ── Campaign 3: Supplements Visibility Campaign ───────────────────────────
  {
    campaignId: 'CMP-FK-003',
    campaignName: 'Pet Vitamins & Supplements — Broad Visibility',
    campaignType: 'SMART_ROI',
    status: 'ACTIVE',
    budget: {
      daily: 400.00,
      total: 12000.00,
      spent: 6320.00,
      remaining: 5680.00,
      currency: 'INR',
    },
    schedule: {
      startDate: daysAgo(18),
      endDate: daysFromNow(12),
    },
    targetedListings: [
      { fsn: products[14].flipkartFsin, sku: products[14].internalSku, title: products[14].name },
      { fsn: products[15].flipkartFsin, sku: products[15].internalSku, title: products[15].name },
      { fsn: products[25].flipkartFsin, sku: products[25].internalSku, title: products[25].name },
      { fsn: products[28].flipkartFsin, sku: products[28].internalSku, title: products[28].name },
    ],
    targeting: {
      autoTargeting: true,
      keywords: ['omega 3 dogs', 'probiotic supplement dogs', 'joint supplement dogs', 'calcium tablet dogs', 'dog vitamins'],
      matchType: 'BROAD',
    },
    metrics: {
      impressions: 39870,
      clicks: 1196,
      orders: 98,
      revenue: 94716.00,
      adSpend: 6320.00,
      ctr: 3.00,
      conversionRate: 8.19,
      acos: 6.67,
      roas: 14.99,
      cpc: 5.28,
      cpo: 64.49,
    },
    dailyTrend: [
      { date: daysAgo(6), impressions: 5300, clicks: 159, orders: 13, spend: 839.52 },
      { date: daysAgo(5), impressions: 6100, clicks: 183, orders: 15, spend: 966.24 },
      { date: daysAgo(4), impressions: 5800, clicks: 174, orders: 14, spend: 918.72 },
      { date: daysAgo(3), impressions: 6400, clicks: 192, orders: 16, spend: 1013.76 },
      { date: daysAgo(2), impressions: 5900, clicks: 177, orders: 14, spend: 934.56 },
      { date: daysAgo(1), impressions: 6200, clicks: 186, orders: 15, spend: 982.08 },
      { date: daysAgo(0), impressions: 4170, clicks: 125, orders: 11, spend: 665.00 },
    ],
    lastUpdated: daysAgo(0),
  },

  // ── Campaign 4: Puppy & Adult Dog Food ───────────────────────────────────
  {
    campaignId: 'CMP-FK-004',
    campaignName: 'Puppy & Adult Dog Food — Festival Sale Boost',
    campaignType: 'SMART_ROI',
    status: 'PAUSED',
    budget: {
      daily: 600.00,
      total: 18000.00,
      spent: 16890.00,
      remaining: 1110.00,
      currency: 'INR',
    },
    schedule: {
      startDate: daysAgo(45),
      endDate: daysAgo(10),
    },
    targetedListings: [
      { fsn: products[2].flipkartFsin,  sku: products[2].internalSku,  title: products[2].name },
      { fsn: products[16].flipkartFsin, sku: products[16].internalSku, title: products[16].name },
      { fsn: products[17].flipkartFsin, sku: products[17].internalSku, title: products[17].name },
    ],
    targeting: {
      autoTargeting: false,
      keywords: ['puppy food', 'adult dog food', 'drools dog food', 'pedigree adult 3kg', 'dog kibble india'],
      matchType: 'PHRASE',
    },
    metrics: {
      impressions: 82640,
      clicks: 3306,
      orders: 412,
      revenue: 380282.00,
      adSpend: 16890.00,
      ctr: 4.00,
      conversionRate: 12.46,
      acos: 4.44,
      roas: 22.52,
      cpc: 5.11,
      cpo: 41.00,
    },
    dailyTrend: [
      { date: daysAgo(16), impressions: 11800, clicks: 472, orders: 59, spend: 2411.92 },
      { date: daysAgo(15), impressions: 13200, clicks: 528, orders: 66, spend: 2697.96 },
      { date: daysAgo(14), impressions: 12600, clicks: 504, orders: 63, spend: 2573.40 },
      { date: daysAgo(13), impressions: 14000, clicks: 560, orders: 70, spend: 2860.96 },
      { date: daysAgo(12), impressions: 13100, clicks: 524, orders: 65, spend: 2676.64 },
      { date: daysAgo(11), impressions: 12500, clicks: 500, orders: 62, spend: 2554.50 },
      { date: daysAgo(10), impressions: 5440, clicks: 218, orders: 27, spend: 1114.62 },
    ],
    lastUpdated: daysAgo(10),
  },

  // ── Campaign 5: Cat Food & Medicines ─────────────────────────────────────
  {
    campaignId: 'CMP-FK-005',
    campaignName: 'Cat Food & Vet Diets — New Audience Targeting',
    campaignType: 'SMART_ROI',
    status: 'ACTIVE',
    budget: {
      daily: 250.00,
      total: 7500.00,
      spent: 1875.00,
      remaining: 5625.00,
      currency: 'INR',
    },
    schedule: {
      startDate: daysAgo(8),
      endDate: daysFromNow(22),
    },
    targetedListings: [
      { fsn: products[10].flipkartFsin, sku: products[10].internalSku, title: products[10].name },
      { fsn: products[11].flipkartFsin, sku: products[11].internalSku, title: products[11].name },
      { fsn: products[12].flipkartFsin, sku: products[12].internalSku, title: products[12].name },
      { fsn: products[18].flipkartFsin, sku: products[18].internalSku, title: products[18].name },
      { fsn: products[19].flipkartFsin, sku: products[19].internalSku, title: products[19].name },
    ],
    targeting: {
      autoTargeting: true,
      keywords: ['cat food online', 'royal canin cat', 'farmina cat food', 'whiskas wet food', 'cat vet diet food india'],
      matchType: 'BROAD',
    },
    metrics: {
      impressions: 14820,
      clicks: 444,
      orders: 31,
      revenue: 41148.00,
      adSpend: 1875.00,
      ctr: 3.00,
      conversionRate: 6.98,
      acos: 4.56,
      roas: 21.95,
      cpc: 4.22,
      cpo: 60.48,
    },
    dailyTrend: [
      { date: daysAgo(7), impressions: 1680, clicks: 50, orders: 3, spend: 211.00 },
      { date: daysAgo(6), impressions: 2100, clicks: 63, orders: 4, spend: 265.86 },
      { date: daysAgo(5), impressions: 1950, clicks: 58, orders: 4, spend: 244.76 },
      { date: daysAgo(4), impressions: 2300, clicks: 69, orders: 5, spend: 291.18 },
      { date: daysAgo(3), impressions: 2050, clicks: 61, orders: 5, spend: 257.42 },
      { date: daysAgo(2), impressions: 2400, clicks: 72, orders: 5, spend: 303.84 },
      { date: daysAgo(1), impressions: 2340, clicks: 71, orders: 5, spend: 299.74 },
    ],
    lastUpdated: daysAgo(0),
  },
];

// ─── Aggregate Account-level Ad Summary ─────────────────────────────────────
const flipkartAdSummary = {
  totalCampaigns:    flipkartAdCampaigns.length,
  activeCampaigns:   flipkartAdCampaigns.filter(c => c.status === 'ACTIVE').length,
  pausedCampaigns:   flipkartAdCampaigns.filter(c => c.status === 'PAUSED').length,
  totalBudgetSpent:  flipkartAdCampaigns.reduce((sum, c) => sum + c.budget.spent, 0),
  totalImpressions:  flipkartAdCampaigns.reduce((sum, c) => sum + c.metrics.impressions, 0),
  totalClicks:       flipkartAdCampaigns.reduce((sum, c) => sum + c.metrics.clicks, 0),
  totalOrders:       flipkartAdCampaigns.reduce((sum, c) => sum + c.metrics.orders, 0),
  totalRevenue:      flipkartAdCampaigns.reduce((sum, c) => sum + c.metrics.revenue, 0),
  averageAcos:       parseFloat((flipkartAdCampaigns.reduce((sum, c) => sum + c.metrics.acos, 0) / flipkartAdCampaigns.length).toFixed(2)),
  averageRoas:       parseFloat((flipkartAdCampaigns.reduce((sum, c) => sum + c.metrics.roas, 0) / flipkartAdCampaigns.length).toFixed(2)),
  currency: 'INR',
  generatedAt: daysAgo(0),
};

module.exports = { flipkartAdCampaigns, flipkartAdSummary };
