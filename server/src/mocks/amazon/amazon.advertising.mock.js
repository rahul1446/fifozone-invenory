const amazonAdCampaigns = [
  {
    campaignId: 'CAMP-AMZ-001', name: 'Royal Canin Urinary — Sponsored Products', campaignType: 'sponsoredProducts',
    targetingType: 'manual', state: 'enabled', dailyBudget: 500, startDate: '20240101', endDate: '20241231',
    bidding: { strategy: 'legacyForSales', adjustments: [] },
    metrics: { impressions: 12450, clicks: 342, cost: 2130.50, orders: 28, revenue: 145600, acos: 1.46, roas: 68.35, ctr: 2.75, cpc: 6.23 },
    adGroups: [{ name: 'Urinary Dog Food', keywords: [
      { keyword: 'royal canin urinary dog food', matchType: 'exact', impressions: 5200, clicks: 180, orders: 15, acos: 1.20 },
      { keyword: 'dog urinary diet', matchType: 'broad', impressions: 4100, clicks: 120, orders: 10, acos: 1.65 },
      { keyword: 'prescription dog food india', matchType: 'phrase', impressions: 3150, clicks: 42, orders: 3, acos: 2.10 },
    ]}]
  },
  {
    campaignId: 'CAMP-AMZ-002', name: 'Farmina Vet Life — All Products', campaignType: 'sponsoredProducts',
    targetingType: 'auto', state: 'enabled', dailyBudget: 300, startDate: '20240115', endDate: '20241231',
    bidding: { strategy: 'legacyForSales' },
    metrics: { impressions: 8200, clicks: 198, cost: 1150.20, orders: 15, revenue: 36300, acos: 3.17, roas: 31.56, ctr: 2.41, cpc: 5.81 },
    adGroups: []
  },
  {
    campaignId: 'CAMP-AMZ-003', name: 'Drools Pet Food — Budget Campaign', campaignType: 'sponsoredProducts',
    targetingType: 'auto', state: 'paused', dailyBudget: 150, startDate: '20240101', endDate: '20241231',
    bidding: { strategy: 'legacyForSales' },
    metrics: { impressions: 3400, clicks: 67, cost: 320.10, orders: 5, revenue: 3995, acos: 8.01, roas: 12.48, ctr: 1.97, cpc: 4.78 },
    adGroups: []
  },
  {
    campaignId: 'CAMP-AMZ-004', name: 'Vivaldis Supplements — Sponsored Brand', campaignType: 'sponsoredBrands',
    targetingType: 'manual', state: 'enabled', dailyBudget: 200, startDate: '20240201', endDate: '20241231',
    bidding: { strategy: 'legacyForSales' },
    metrics: { impressions: 6800, clicks: 145, cost: 892.50, orders: 18, revenue: 11682, acos: 7.64, roas: 13.09, ctr: 2.13, cpc: 6.15 },
    adGroups: []
  },
  {
    campaignId: 'CAMP-AMZ-005', name: 'Tick & Flea Control Products', campaignType: 'sponsoredProducts',
    targetingType: 'manual', state: 'enabled', dailyBudget: 250, startDate: '20240301', endDate: '20241231',
    bidding: { strategy: 'legacyForSales' },
    metrics: { impressions: 9100, clicks: 220, cost: 1320.00, orders: 32, revenue: 17568, acos: 7.51, roas: 13.31, ctr: 2.42, cpc: 6.00 },
    adGroups: [{ name: 'Tick Flea Dog', keywords: [
      { keyword: 'tick flea treatment dogs india', matchType: 'exact', impressions: 4500, clicks: 110, orders: 16, acos: 7.20 },
      { keyword: 'dog tick collar', matchType: 'broad', impressions: 2800, clicks: 68, orders: 10, acos: 7.90 },
      { keyword: 'fiprofort plus', matchType: 'exact', impressions: 1800, clicks: 42, orders: 6, acos: 7.45 },
    ]}]
  },
  {
    campaignId: 'CAMP-AMZ-006', name: 'Cat Food & Supplements — New Launch', campaignType: 'sponsoredProducts',
    targetingType: 'auto', state: 'enabled', dailyBudget: 180, startDate: '20240401', endDate: '20241231',
    bidding: { strategy: 'legacyForSales' },
    metrics: { impressions: 4200, clicks: 89, cost: 534.00, orders: 9, revenue: 4230, acos: 12.63, roas: 7.92, ctr: 2.12, cpc: 6.00 },
    adGroups: []
  },
];

module.exports = { amazonAdCampaigns };
