const Order = require('../models/Order.model');
const Product = require('../models/Product.model');
const ReturnRequest = require('../models/ReturnRequest.model');
const PlatformSync = require('../models/PlatformSync.model');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getDashboardStats = asyncHandler(async (req, res) => {
  // 1. Core counters
  // totalInventory = ALL items in the catalog (listed or not)
  const totalInventory = await Product.countDocuments({ isActive: true });

  // totalProducts = items actually listed / active on at least one platform
  const totalProducts = await Product.countDocuments({
    isActive: true,
    $or: [
      { 'platformStatus.fifozone':  { $nin: ['not_listed'] } },
      { 'platformStatus.amazon':    { $nin: ['not_listed'] } },
      { 'platformStatus.flipkart':  { $nin: ['not_listed'] } },
      { 'platformStatus.meesho':    { $nin: ['not_listed'] } },
    ]
  });

  // Per-platform counts (for the sync cards)
  const fifozoneCount  = await Product.countDocuments({ isActive: true, 'platformStatus.fifozone':  { $nin: ['not_listed'] } });
  const amazonCount    = await Product.countDocuments({ isActive: true, 'platformStatus.amazon':    { $nin: ['not_listed'] } });
  const flipkartCount  = await Product.countDocuments({ isActive: true, 'platformStatus.flipkart':  { $nin: ['not_listed'] } });
  const meeshoCount    = await Product.countDocuments({ isActive: true, 'platformStatus.meesho':    { $nin: ['not_listed'] } });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const endOfYesterday = new Date(endOfToday);
  endOfYesterday.setDate(endOfYesterday.getDate() - 1);
  endOfYesterday.setHours(23, 59, 59, 999);

  // Today Orders and revenue
  const todayOrders = await Order.find({
    createdAt: { $gte: startOfToday, $lte: endOfToday }
  });
  const todayOrdersCount = todayOrders.length;
  const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.status !== 'cancelled' ? order.totalAmount : 0), 0);

  // Yesterday comparison
  const yesterdayOrders = await Order.find({
    createdAt: { $gte: startOfYesterday, $lte: endOfYesterday }
  });
  const yesterdayRevenue = yesterdayOrders.reduce((sum, order) => sum + (order.status !== 'cancelled' ? order.totalAmount : 0), 0);

  const lowStockProductsCount = await Product.countDocuments({
    isActive: true,
    $expr: { $lte: ['$totalStock', '$lowStockThreshold'] },
    totalStock: { $gt: 0 }
  });

  const pendingOrdersCount = await Order.countDocuments({ status: 'pending' });
  const pendingReturnsCount = await ReturnRequest.countDocuments({ status: 'requested' });

  // 2. Platform Sync Panel Status
  const syncStatus = await PlatformSync.find();

  // 3. Recent 10 Orders
  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(10);

  // 4. Low stock products widget list
  const lowStockList = await Product.find({
    isActive: true,
    $expr: { $lte: ['$totalStock', '$lowStockThreshold'] }
  })
  .sort({ totalStock: 1 })
  .limit(8);

  // 5. Top 10 Selling Products
  const topProducts = await Product.find({ isActive: true })
    .sort({ totalSold: -1 })
    .limit(10)
    .select('masterName brand category totalSold mrp');

  // 6. Last 30 days revenue chart data
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const last30DaysOrders = await Order.find({
    createdAt: { $gte: thirtyDaysAgo },
    status: { $ne: 'cancelled' }
  });

  const revenueChartData = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const endD = new Date(d);
    endD.setHours(23, 59, 59, 999);

    const dayOrders = last30DaysOrders.filter(o => 
      new Date(o.createdAt) >= d && new Date(o.createdAt) <= endD
    );

    const fifozoneRev = dayOrders.filter(o => o.platform === 'fifozone').reduce((s, o) => s + o.totalAmount, 0);
    const amazonRev = dayOrders.filter(o => o.platform === 'amazon').reduce((s, o) => s + o.totalAmount, 0);
    const flipkartRev = dayOrders.filter(o => o.platform === 'flipkart').reduce((s, o) => s + o.totalAmount, 0);

    revenueChartData.push({
      date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      Fifozone: fifozoneRev,
      Amazon: amazonRev,
      Flipkart: flipkartRev,
      Total: fifozoneRev + amazonRev + flipkartRev
    });
  }

  // Dead products count
  const deadProductsCount = await Product.countDocuments({ isActive: true, isDead: true });

  res.status(200).json(
    new ApiResponse(200, {
      stats: {
        totalProducts,       // listed on at least one platform
        totalInventory,      // all products in catalog
        fifozoneCount,       // listed on Fifozone
        amazonCount,         // listed on Amazon
        flipkartCount,       // listed on Flipkart
        meeshoCount,         // listed on Meesho
        todayOrdersCount,
        todayRevenue,
        revenueTrend: yesterdayRevenue > 0 ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100) : 0,
        lowStockProductsCount,
        pendingOrdersCount,
        pendingReturnsCount,
        deadProductsCount
      },
      syncStatus,
      recentOrders,
      lowStockList,
      topProducts,
      revenueChartData
    }, 'Dashboard analytics loaded')
  );
});

const getDetailedAnalytics = asyncHandler(async (req, res) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // 1. Overview Stats
  const allOrders = await Order.find({ status: { $ne: 'cancelled' }, createdAt: { $gte: startOfMonth } });
  const totalRevenue = allOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalOrders = allOrders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const totalReturns = await ReturnRequest.countDocuments();
  const returnRate = totalOrders > 0 ? parseFloat(((totalReturns / totalOrders) * 100).toFixed(1)) : 0;

  // 2. Revenue Trend (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const last30Orders = await Order.find({
    createdAt: { $gte: thirtyDaysAgo },
    status: { $ne: 'cancelled' }
  });

  const revenueTrend = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const endD = new Date(d);
    endD.setHours(23, 59, 59, 999);
    const dayRev = last30Orders
      .filter(o => new Date(o.createdAt) >= d && new Date(o.createdAt) <= endD)
      .reduce((s, o) => s + o.totalAmount, 0);
    revenueTrend.push({
      date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      revenue: dayRev
    });
  }

  // 3. Platform Distribution (order count)
  const platformData = await Order.aggregate([
    { $group: { _id: '$platform', value: { $sum: 1 } } }
  ]);
  const platformMap = { fifozone: 'Fifozone', amazon: 'Amazon', flipkart: 'Flipkart' };
  const platformDistribution = platformData.map(p => ({
    name: platformMap[p._id] || p._id,
    value: p.value
  }));

  // 4. Top Categories by units sold
  const categoryData = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', value: { $sum: '$soldThisMonth' } } },
    { $sort: { value: -1 } },
    { $limit: 8 }
  ]);
  const topCategories = categoryData
    .filter(c => c._id)
    .map(c => ({ name: c._id, value: c.value }));

  // 5. Order Status Distribution
  const statusData = await Order.aggregate([
    { $group: { _id: '$status', value: { $sum: 1 } } }
  ]);
  const statusColors = {
    delivered: '#10b981', shipped: '#8b5cf6', processing: '#3b82f6',
    pending: '#94a3b8', returned: '#f97316', cancelled: '#ef4444',
    confirmed: '#06b6d4', out_for_delivery: '#f59e0b'
  };
  const statusDistribution = statusData.map(s => ({
    name: s._id?.replace('_', ' ').replace(/^\w/, c => c.toUpperCase()) || 'Unknown',
    value: s.value,
    color: statusColors[s._id] || '#94a3b8'
  }));

  // 6. Top Products
  const topProductsDocs = await Product.find({ isActive: true })
    .sort({ totalSold: -1 })
    .limit(10)
    .select('masterName category totalSold mrp returnCount returnRate');
  const topProducts = topProductsDocs.map((p, idx) => ({
    id: p._id,
    rank: idx + 1,
    name: p.masterName,
    category: p.category || 'Uncategorized',
    units: p.totalSold || 0,
    revenue: (p.totalSold || 0) * (p.mrp || 0),
    returns: p.returnCount || 0,
    returnRate: p.returnRate || 0
  }));

  res.status(200).json(
    new ApiResponse(200, {
      overview: { totalRevenue, totalOrders, avgOrderValue, returnRate },
      revenueTrend,
      platformDistribution,
      topCategories,
      statusDistribution,
      topProducts
    }, 'Detailed analytics compiled')
  );
});

module.exports = {
  getDashboardStats,
  getDetailedAnalytics
};
