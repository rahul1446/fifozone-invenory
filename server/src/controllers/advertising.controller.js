const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const AdCampaign = require('../models/AdCampaign.model');

const seedMockAdCampaigns = async (platform, num) => {
  const count = await AdCampaign.countDocuments({ platform });
  if (count > 0) return;

  const names = ['Royal Canin - Sponsored Products', 'Drools - Generic Keywords', 'Farmina - Competitor Targeting', 'Himalaya Pet - Brand Campaign'];
  
  const campaigns = [];
  for (let i = 0; i < num; i++) {
    const spendToday = Math.random() * 500;
    const spendThisMonth = spendToday * (Math.floor(Math.random() * 20) + 5);
    const revenue = spendThisMonth * (Math.random() * 3 + 1);
    
    campaigns.push({
      platform,
      name: names[i % names.length] + ' ' + (i+1),
      type: 'sponsored_products',
      status: Math.random() > 0.2 ? 'active' : 'paused',
      dailyBudget: 1000,
      spendToday,
      spendThisMonth,
      impressions: Math.floor(Math.random() * 50000),
      clicks: Math.floor(Math.random() * 1000),
      ctr: (Math.random() * 5).toFixed(2),
      orders: Math.floor(Math.random() * 50),
      revenue,
      roas: (revenue / (spendThisMonth || 1)).toFixed(2),
      acos: ((spendThisMonth / (revenue || 1)) * 100).toFixed(2),
      adGroups: [{
        name: 'Main AdGroup',
        keywords: [
          { keyword: 'dog food', matchType: 'broad', impressions: 5000, clicks: 100, orders: 5, acos: 15 },
          { keyword: 'royal canin', matchType: 'exact', impressions: 2000, clicks: 50, orders: 10, acos: 10 }
        ]
      }]
    });
  }

  await AdCampaign.insertMany(campaigns);
};

exports.getAdOverview = asyncHandler(async (req, res) => {
  const totalSpend = 45000;
  const totalRevenue = 180000;
  const overallRoas = (totalRevenue / totalSpend).toFixed(2);
  const activeCampaigns = 12;
  const pausedCampaigns = 3;

  const last30DaysChart = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split('T')[0],
    spend: Math.floor(Math.random() * 2000) + 500,
    revenue: Math.floor(Math.random() * 8000) + 2000
  }));

  res.status(200).json(new ApiResponse(200, {
    totalSpend, totalRevenue, overallRoas, activeCampaigns, pausedCampaigns, last30DaysChart
  }, 'Ad overview fetched'));
});

exports.getAmazonCampaigns = asyncHandler(async (req, res) => {
  await seedMockAdCampaigns('amazon', 5);
  const campaigns = await AdCampaign.find({ platform: 'amazon' }).sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, campaigns, 'Amazon campaigns fetched'));
});

exports.getAmazonCampaignDetail = asyncHandler(async (req, res) => {
  const campaign = await AdCampaign.findOne({ _id: req.params.id, platform: 'amazon' });
  if (!campaign) throw new ApiError(404, 'Campaign not found');
  res.status(200).json(new ApiResponse(200, campaign, 'Campaign details fetched'));
});

exports.pauseAmazonCampaign = asyncHandler(async (req, res) => {
  const campaign = await AdCampaign.findOneAndUpdate(
    { _id: req.params.id, platform: 'amazon' },
    { status: 'paused' },
    { new: true }
  );
  if (!campaign) throw new ApiError(404, 'Campaign not found');
  res.status(200).json(new ApiResponse(200, campaign, 'Campaign paused'));
});

exports.activateAmazonCampaign = asyncHandler(async (req, res) => {
  const campaign = await AdCampaign.findOneAndUpdate(
    { _id: req.params.id, platform: 'amazon' },
    { status: 'active' },
    { new: true }
  );
  if (!campaign) throw new ApiError(404, 'Campaign not found');
  res.status(200).json(new ApiResponse(200, campaign, 'Campaign activated'));
});

exports.getFlipkartCampaigns = asyncHandler(async (req, res) => {
  await seedMockAdCampaigns('flipkart', 4);
  const campaigns = await AdCampaign.find({ platform: 'flipkart' }).sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, campaigns, 'Flipkart campaigns fetched'));
});

exports.getFlipkartCampaignDetail = asyncHandler(async (req, res) => {
  const campaign = await AdCampaign.findOne({ _id: req.params.id, platform: 'flipkart' });
  if (!campaign) throw new ApiError(404, 'Campaign not found');
  res.status(200).json(new ApiResponse(200, campaign, 'Campaign details fetched'));
});

exports.pauseFlipkartCampaign = asyncHandler(async (req, res) => {
  const campaign = await AdCampaign.findOneAndUpdate(
    { _id: req.params.id, platform: 'flipkart' },
    { status: 'paused' },
    { new: true }
  );
  if (!campaign) throw new ApiError(404, 'Campaign not found');
  res.status(200).json(new ApiResponse(200, campaign, 'Campaign paused'));
});

exports.activateFlipkartCampaign = asyncHandler(async (req, res) => {
  const campaign = await AdCampaign.findOneAndUpdate(
    { _id: req.params.id, platform: 'flipkart' },
    { status: 'active' },
    { new: true }
  );
  if (!campaign) throw new ApiError(404, 'Campaign not found');
  res.status(200).json(new ApiResponse(200, campaign, 'Campaign activated'));
});
