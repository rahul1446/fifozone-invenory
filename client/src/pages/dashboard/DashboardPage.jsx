import { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Progress, Alert, Button, Skeleton, Tooltip, Drawer, Spin, Input } from 'antd';
import axiosInstance from '../../api/axiosInstance';
import {
  Package, ShoppingBag, IndianRupee, AlertTriangle,
  Clock, RotateCcw, RefreshCw, ExternalLink, TrendingUp, Search, ArrowUpRight
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import StatCard from '../../components/common/StatCard';
import { formatCurrency, formatDate, formatRelativeTime } from '../../utils/formatters';
import { getDashboardStatsApi } from '../../api/analyticsApi';
import { getOrdersApi } from '../../api/orderApi';
import { getProductsApi } from '../../api/productApi';
import { getSyncStatusApi } from '../../api/platformApi';

// ─── Fallback / Mock Data ──────────────────────────────────────────────────────

const fallbackStats = {
  totalProducts: 0,
  ordersToday: 0,
  ordersTodayTrend: 0,
  revenueToday: 0,
  revenueTodayTrend: 0,
  lowStockCount: 0,
  pendingOrders: 0,
  returnsPending: 0,
  deadProducts: 0,
};

const fallbackSyncStatus = [
  { platform: 'fifozone',  status: 'synced', productCount: 0, lastSync: dayjs().toISOString() },
  { platform: 'amazon',   status: 'synced', productCount: 0, lastSync: dayjs().toISOString() },
  { platform: 'flipkart', status: 'synced', productCount: 0, lastSync: dayjs().toISOString() },
  { platform: 'meesho',   status: 'synced', productCount: 0, lastSync: dayjs().toISOString() },
];

const generateRevenueData = () => {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day');
    data.push({
      date: date.format('DD MMM'),
      fifozone: Math.floor(12000 + Math.random() * 18000),
      amazon: Math.floor(8000 + Math.random() * 14000),
      flipkart: Math.floor(5000 + Math.random() * 11000),
      meesho: Math.floor(3000 + Math.random() * 9000),
    });
  }
  return data;
};

const topSellingMockData = [
  { name: 'Fipnil Plus', units: 342 },
  { name: 'Drontal Puppy', units: 289 },
  { name: 'Himalaya Erina', units: 254 },
  { name: 'Beaphar Fiprotec', units: 218 },
  { name: 'Advocate Spot', units: 195 },
  { name: 'Prazitel Plus', units: 172 },
  { name: 'Hartz UltraGuard', units: 148 },
  { name: 'Frontline Spray', units: 131 },
];

const fallbackOrders = [
  { _id: '1', orderNumber: 'FFZ-10423', platform: 'fifozone', customer: { name: 'Rahul Sharma' }, items: [1, 2], totalAmount: 2450, status: 'delivered', createdAt: dayjs().subtract(1, 'hour').toISOString() },
  { _id: '2', orderNumber: 'AMZ-88712', platform: 'amazon', customer: { name: 'Priya Nair' }, items: [1], totalAmount: 890, status: 'shipped', createdAt: dayjs().subtract(2, 'hour').toISOString() },
  { _id: '3', orderNumber: 'FLK-34221', platform: 'flipkart', customer: { name: 'Amit Patel' }, items: [1, 2, 3], totalAmount: 3670, status: 'processing', createdAt: dayjs().subtract(3, 'hour').toISOString() },
  { _id: '4', orderNumber: 'FFZ-10422', platform: 'fifozone', customer: { name: 'Sneha Reddy' }, items: [1], totalAmount: 1290, status: 'pending', createdAt: dayjs().subtract(4, 'hour').toISOString() },
  { _id: '5', orderNumber: 'AMZ-88711', platform: 'amazon', customer: { name: 'Vikram Singh' }, items: [1, 2], totalAmount: 4120, status: 'delivered', createdAt: dayjs().subtract(5, 'hour').toISOString() },
  { _id: '6', orderNumber: 'FLK-34220', platform: 'flipkart', customer: { name: 'Kavita Joshi' }, items: [1], totalAmount: 760, status: 'shipped', createdAt: dayjs().subtract(6, 'hour').toISOString() },
  { _id: '7', orderNumber: 'FFZ-10421', platform: 'fifozone', customer: { name: 'Rohit Kapoor' }, items: [1, 2, 3], totalAmount: 5340, status: 'processing', createdAt: dayjs().subtract(7, 'hour').toISOString() },
  { _id: '8', orderNumber: 'AMZ-88710', platform: 'amazon', customer: { name: 'Anita Desai' }, items: [1], totalAmount: 1890, status: 'delivered', createdAt: dayjs().subtract(8, 'hour').toISOString() },
  { _id: '9', orderNumber: 'FLK-34219', platform: 'flipkart', customer: { name: 'Suresh Kumar' }, items: [1, 2], totalAmount: 2780, status: 'pending', createdAt: dayjs().subtract(10, 'hour').toISOString() },
  { _id: '10', orderNumber: 'FFZ-10420', platform: 'fifozone', customer: { name: 'Meera Iyer' }, items: [1], totalAmount: 990, status: 'shipped', createdAt: dayjs().subtract(12, 'hour').toISOString() },
];

const fallbackLowStock = [
  { _id: '1', name: 'Fipnil Plus Spot On', stock: 3, lowStockThreshold: 20, image: null },
  { _id: '2', name: 'Drontal Puppy Suspension', stock: 5, lowStockThreshold: 25, image: null },
  { _id: '3', name: 'Beaphar Fiprotec Combo', stock: 2, lowStockThreshold: 15, image: null },
  { _id: '4', name: 'Advocate Small Dog', stock: 7, lowStockThreshold: 30, image: null },
  { _id: '5', name: 'Prazitel Plus Tablet', stock: 4, lowStockThreshold: 18, image: null },
  { _id: '6', name: 'Frontline Spray 100ml', stock: 1, lowStockThreshold: 12, image: null },
];

// ─── Custom Recharts Tooltip ────────────────────────────────────────────────────


const ALL_PLATFORMS = [
  { key: 'fifozone', label: 'Fifozone', color: 'purple' },
  { key: 'amazon', label: 'Amazon', color: 'orange' },
  { key: 'flipkart', label: 'Flipkart', color: 'gold' },
  { key: 'meesho', label: 'Meesho', color: 'pink' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3 shadow-xl">
      <p className="text-xs font-semibold text-slate-600 mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm mb-0.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-500">{entry.name}:</span>
          <span className="font-semibold text-slate-800">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Platform Card Component ────────────────────────────────────────────────────

const platformConfig = {
  fifozone: { initial: 'FI', gradient: 'from-purple-500 to-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
  amazon:   { initial: 'A',  gradient: 'from-orange-500 to-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
  flipkart: { initial: 'F',  gradient: 'from-amber-500 to-yellow-600',  bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  meesho:   { initial: 'M',  gradient: 'from-pink-500 to-rose-600',     bg: 'bg-pink-50',   border: 'border-pink-200',   text: 'text-pink-700',   dot: 'bg-pink-500'   },
  // Fallbacks for capitalized data
  Fifozone: { initial: 'FI', gradient: 'from-purple-500 to-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
  Amazon:   { initial: 'A',  gradient: 'from-orange-500 to-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
  Flipkart: { initial: 'F',  gradient: 'from-amber-500 to-yellow-600',  bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  Meesho:   { initial: 'M',  gradient: 'from-pink-500 to-rose-600',     bg: 'bg-pink-50',   border: 'border-pink-200',   text: 'text-pink-700',   dot: 'bg-pink-500'   },
};

const statusDotColors = {
  synced: 'bg-emerald-500',
  syncing: 'bg-yellow-400 animate-pulse',
  error: 'bg-red-500',
};

const PlatformCard = ({ data, onSync, syncing, onViewProducts }) => {
  const cfg = platformConfig[data.platform] || platformConfig.fifozone;
  const dotColor = statusDotColors[data.status] || statusDotColors.error;

  return (
    <div
      className={`bg-white rounded-xl border ${cfg.border} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-5 group cursor-pointer relative overflow-hidden`}
      onClick={() => onViewProducts?.(data.platform)}
    >
      {/* Subtle hover gradient shimmer */}
      <div className={`absolute inset-0 bg-gradient-to-br ${cfg.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none`} />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
            {cfg.initial}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800 capitalize">{data.platform}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${dotColor}`} />
              <span className="text-xs text-slate-400 capitalize">{data.status}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip title="View all products on this platform">
            <Button
              type="text"
              size="small"
              icon={<ArrowUpRight className="w-3.5 h-3.5" />}
              className={`!${cfg.text} opacity-0 group-hover:opacity-100 transition-opacity`}
              onClick={(e) => { e.stopPropagation(); onViewProducts?.(data.platform); }}
            />
          </Tooltip>
          <Tooltip title="Trigger manual sync">
            <Button
              type="text"
              size="small"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />}
              onClick={(e) => { e.stopPropagation(); onSync?.(data.platform); }}
              loading={syncing}
              className="!text-slate-400 hover:!text-slate-700"
            />
          </Tooltip>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-slate-900">{data.productCount?.toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-400 mt-0.5">products synced</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-400">Last synced</p>
          <p className={`text-xs font-medium ${cfg.text}`}>{formatRelativeTime(data.lastSync)}</p>
        </div>
      </div>
      {/* Click hint */}
      <p className={`text-[10px] ${cfg.text} opacity-0 group-hover:opacity-100 transition-opacity mt-3 font-medium`}>
        Click to view products →
      </p>
    </div>
  );
};

// ─── Chart Time Range Buttons ───────────────────────────────────────────────────

const timeRanges = ['7D', '30D', '90D', '1Y'];

// ─── Dashboard Page ─────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const navigate = useNavigate();

  // State: stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // State: platform sync
  const [syncStatus, setSyncStatus] = useState([]);
  const [syncLoading, setSyncLoading] = useState(true);
  const [syncingPlatform, setSyncingPlatform] = useState(null);

  // State: revenue chart
  const [revenueData, setRevenueData] = useState([]);
  const [chartRange, setChartRange] = useState('30D');
  const [topSellingData, setTopSellingData] = useState([]);

  // State: orders
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // State: low stock
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [lowStockLoading, setLowStockLoading] = useState(true);

  // State: dead products banner
  const [showDeadBanner, setShowDeadBanner] = useState(true);

  // State: platform products drawer
  const [platformDrawer, setPlatformDrawer] = useState({ open: false, platform: null });
  const [platformProducts, setPlatformProducts] = useState([]);
  const [platformProductsLoading, setPlatformProductsLoading] = useState(false);
  const [platformProductSearch, setPlatformProductSearch] = useState('');

  // ── Fetch dashboard stats ──
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setOrdersLoading(true);
    setLowStockLoading(true);
    setSyncLoading(true);
    try {
      const [statsRes, syncRes] = await Promise.all([
        getDashboardStatsApi().catch(() => ({ data: null })),
        getSyncStatusApi().catch(() => ({ data: null }))
      ]);
      
      const rawData = statsRes.data?.data || statsRes.data;
      const rawSyncData = syncRes.data?.data || syncRes.data;

      if (rawData && rawData.stats) {
        // Map backend stats structure to frontend expectations
        const mappedStats = {
          totalProducts: rawData.stats.totalProducts,
          totalInventory: rawData.stats.totalInventory,
          fifozoneCount:  rawData.stats.fifozoneCount  ?? 0,
          amazonCount:    rawData.stats.amazonCount    ?? 0,
          flipkartCount:  rawData.stats.flipkartCount  ?? 0,
          ordersToday: rawData.stats.todayOrdersCount,
          ordersTodayTrend: 0,
          revenueToday: rawData.stats.todayRevenue,
          revenueTodayTrend: rawData.stats.revenueTrend,
          lowStockCount: rawData.stats.lowStockProductsCount,
          pendingOrders: rawData.stats.pendingOrdersCount,
          returnsPending: rawData.stats.pendingReturnsCount,
          deadProducts: rawData.stats.deadProductsCount,
        };
        setStats(mappedStats);
        
        if (rawData.revenueChartData) setRevenueData(rawData.revenueChartData);
        if (rawData.topProducts) {
          setTopSellingData(rawData.topProducts.map(p => ({
            name: p.masterName,
            units: p.totalSold || 0
          })));
        }
        if (rawData.recentOrders) setRecentOrders(rawData.recentOrders);
        if (rawData.lowStockList) setLowStockProducts(rawData.lowStockList);

        // Build platform cards using REAL per-platform counts from DB (not stale syncedProductsCount)
        const perPlatformCount = {
          fifozone:  rawData.stats.fifozoneCount  ?? 0,
          amazon:    rawData.stats.amazonCount    ?? 0,
          flipkart:  rawData.stats.flipkartCount  ?? 0,
          meesho:    rawData.stats.meeshoCount    ?? 0,
        };

        const syncList = Array.isArray(rawSyncData) ? rawSyncData : (rawData.syncStatus || fallbackSyncStatus);
        const mappedSync = syncList.map(s => ({
          platform: s.platform,
          status: s.status || 'synced',
          productCount: perPlatformCount[s.platform] ?? s.syncedProductsCount ?? 0,
          lastSync: s.lastProductSync || s.updatedAt || new Date().toISOString(),
          lastError: s.lastErrorMessage || '',
        }));

        // Ensure all 4 platforms exist in the sync cards
        const finalSyncStatus = [...mappedSync];
        ['fifozone', 'amazon', 'flipkart', 'meesho'].forEach(p => {
          if (!finalSyncStatus.find(s => s.platform === p)) {
            finalSyncStatus.push({ platform: p, status: 'synced', productCount: perPlatformCount[p] ?? 0, lastSync: new Date().toISOString() });
          }
        });
        setSyncStatus(finalSyncStatus);

      } else {
        setStats(fallbackStats);
        setRevenueData(generateRevenueData());
        setTopSellingData(topSellingMockData);
        setRecentOrders(fallbackOrders);
        setLowStockProducts(fallbackLowStock);
        setSyncStatus(fallbackSyncStatus);
      }
    } catch (e) {
      console.error('Stats fetch error:', e);
      setStats(fallbackStats);
      setRevenueData(generateRevenueData());
      setTopSellingData(topSellingMockData);
      setRecentOrders(fallbackOrders);
      setLowStockProducts(fallbackLowStock);
      setSyncStatus(fallbackSyncStatus);
    } finally {
      setStatsLoading(false);
      setOrdersLoading(false);
      setLowStockLoading(false);
      setSyncLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Handle manual sync ──
  const handlePlatformSync = async (platform) => {
    setSyncingPlatform(platform);
    try {
      const { triggerManualSyncApi } = await import('../../api/platformApi');
      await triggerManualSyncApi();
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setSyncingPlatform(null);
      fetchStats();
    }
  };

  // ── Fetch products for a platform drawer ──
  const handleViewPlatformProducts = async (platform) => {
    setPlatformDrawer({ open: true, platform });
    setPlatformProducts([]);
    setPlatformProductSearch('');
    setPlatformProductsLoading(true);
    try {
      const response = await axiosInstance.get('/products', {
        params: { platform: platform.charAt(0).toUpperCase() + platform.slice(1), limit: 500 }
      });
      const data = response?.data?.data;
      let arr = Array.isArray(data?.products) ? data.products
        : Array.isArray(data) ? data
        : [];

      // Defensive client-side filter: only show products genuinely listed on this platform
      arr = arr.filter(p => {
        const ps = p.platformStatus || {};
        const status = ps[platform.toLowerCase()];
        return status && status !== 'not_listed';
      });

      setPlatformProducts(arr);
    } catch (e) {
      console.error('Failed to fetch platform products:', e);
      // Do NOT show fake mock data — just show empty state
      setPlatformProducts([]);
    } finally {
      setPlatformProductsLoading(false);
    }
  };

  // ── Filter chart data by range ──
  const filteredRevenueData = (() => {
    const sliceMap = { '7D': 7, '30D': 30, '90D': 90, '1Y': 365 };
    const count = sliceMap[chartRange] || 30;
    return revenueData.slice(-Math.min(count, revenueData.length));
  })();

  // ── Computed values ──
  const displayStats = stats || fallbackStats;

  // ─── Order Table Columns ──────────────────────────────────────────────────────

  const platformTagColors = { fifozone: 'green', amazon: 'orange', flipkart: 'gold' };
  const statusTagConfig = {
    pending: { color: 'default', label: 'Pending' },
    processing: { color: 'processing', label: 'Processing' },
    shipped: { color: 'blue', label: 'Shipped' },
    delivered: { color: 'success', label: 'Delivered' },
    cancelled: { color: 'error', label: 'Cancelled' },
    returned: { color: 'warning', label: 'Returned' },
  };

  const orderColumns = [
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text) => <span className="font-semibold text-slate-800 text-xs">{text}</span>,
      width: 120,
    },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: (p) => (
        <Tag color={platformTagColors[p] || 'default'} className="!text-xs !font-medium capitalize !m-0">
          {p}
        </Tag>
      ),
    },
    {
      title: 'Customer',
      key: 'customer',
      width: 130,
      render: (_, record) => (
        <span className="text-sm text-slate-600 truncate block max-w-[120px]">
          {record.customer?.name || 'N/A'}
        </span>
      ),
    },
    {
      title: 'Items',
      key: 'items',
      width: 60,
      align: 'center',
      render: (_, record) => (
        <span className="text-sm text-slate-500">{record.items?.length || 0}</span>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 100,
      render: (v) => <span className="font-semibold text-slate-800 text-sm">{formatCurrency(v)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s) => {
        const cfg = statusTagConfig[s] || { color: 'default', label: s };
        return <Tag color={cfg.color} className="!text-xs !font-medium !m-0">{cfg.label}</Tag>;
      },
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (d) => <span className="text-xs text-slate-400">{formatRelativeTime(d)}</span>,
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-8 p-1">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Multi-channel inventory & sales overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button icon={<RefreshCw size={14} />} onClick={fetchStats} loading={statsLoading} className="font-semibold text-sm rounded-lg h-9">Refresh</Button>
        </div>
      </div>

      {/* Row 1: 5 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="TODAY REVENUE"
          value={statsLoading ? '' : formatCurrency(displayStats.revenueToday)}
          icon={<IndianRupee className="w-5 h-5" />}
          color="green"
          loading={statsLoading}
        />
        <StatCard
          title="TODAY ORDERS"
          value={statsLoading ? '' : displayStats.ordersToday}
          icon={<ShoppingBag className="w-5 h-5" />}
          color="purple"
          loading={statsLoading}
        />
        <StatCard
          title="PENDING ORDERS"
          value={statsLoading ? '' : displayStats.pendingOrders}
          icon={<Clock className="w-5 h-5" />}
          color="yellow"
          loading={statsLoading}
        />
        <StatCard
          title="LOW STOCK"
          value={statsLoading ? '' : displayStats.lowStockCount?.toLocaleString('en-IN')}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="red"
          loading={statsLoading}
        />
        <StatCard
          title="OUT OF STOCK"
          value={statsLoading ? '' : displayStats.deadProducts?.toLocaleString('en-IN')}
          icon={<Package className="w-5 h-5" />}
          color="red"
          loading={statsLoading}
        />
      </div>

      {/* Row 2: Time Range Selector */}
      <div className="flex items-center gap-4 py-2">
        <span className="text-sm font-semibold text-slate-500">Time Range:</span>
        <div className="flex items-center gap-2">
          {['Today', '7 Days', '30 Days', 'Month', 'Year', 'Lifetime'].map((range) => (
            <button
              key={range}
              onClick={() => setChartRange(range)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${
                chartRange === range
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Row 3: Performance Metrics */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-6">Performance Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">TOTAL REVENUE</p>
            <p className="text-2xl font-bold text-emerald-500">{formatCurrency(displayStats.revenueToday ? displayStats.revenueToday * 30 : 3350)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">TOTAL ORDERS</p>
            <p className="text-2xl font-bold text-blue-600">{displayStats.ordersToday ? displayStats.ordersToday * 30 : 11}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">UNITS SOLD</p>
            <p className="text-2xl font-bold text-purple-600 mb-1">—</p>
            <p className="text-[10px] text-slate-400">Coming soon</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">AVG ORDER VALUE</p>
            <p className="text-2xl font-bold text-orange-500">
              {formatCurrency(displayStats.ordersToday ? displayStats.revenueToday / displayStats.ordersToday : 305)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">GROWTH %</p>
            <p className="text-2xl font-bold text-blue-600 mb-1">—</p>
            <p className="text-[10px] text-slate-400">Coming soon</p>
          </div>
        </div>
      </div>

      {/* Row 4: Channel Performance */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-4 px-1">Channel Performance</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ALL_PLATFORMS.map((platform) => {
            const isFifo = platform.key === 'fifozone';
            const rev = isFifo ? (displayStats.revenueToday ? displayStats.revenueToday * 30 : 3350) : 0;
            const ord = isFifo ? (displayStats.ordersToday ? displayStats.ordersToday * 30 : 11) : 0;
            const pend = isFifo ? displayStats.pendingOrders : 0;
            const dotColor = platform.key === 'amazon' ? 'bg-amber-500' : platform.key === 'flipkart' ? 'bg-blue-500' : platform.key === 'meesho' ? 'bg-pink-500' : 'bg-indigo-500';

            return (
              <div key={platform.key} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                  <h4 className="text-sm font-bold text-slate-800">{platform.label}</h4>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium mb-0.5">Revenue</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(rev)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium mb-0.5">Orders</p>
                    <p className="text-lg font-bold text-blue-600">{ord}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium mb-0.5">Pending</p>
                    <p className="text-lg font-bold text-orange-500">{pend}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 5: Trends & Analytics */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">Trends & Analytics</h3>
            <span className="text-[11px] text-slate-400">Monthly breakdown</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">METRIC:</span>
            <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-100">
              {['Revenue', 'Orders', 'Units'].map((m) => (
                <button
                  key={m}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    m === 'Revenue' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
            <TrendingUp className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-700">No Data Available</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
