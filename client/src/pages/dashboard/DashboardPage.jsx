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
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Welcome back — here's what's happening today</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{dayjs().format('dddd, DD MMMM YYYY')}</span>
        </div>
      </div>

      {/* ─── Section 1: Stats Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Listed Products"
          value={statsLoading ? '' : displayStats.totalProducts?.toLocaleString('en-IN')}
          subtitle={statsLoading ? 'loading…' : `of ${displayStats.totalInventory?.toLocaleString('en-IN') ?? '—'} in inventory`}
          icon={<Package className="w-5 h-5" />}
          color="border-emerald-500"
          loading={statsLoading}
        />
        <StatCard
          title="Orders Today"
          value={statsLoading ? '' : displayStats.ordersToday}
          subtitle="vs yesterday"
          icon={<ShoppingBag className="w-5 h-5" />}
          trend={displayStats.ordersTodayTrend}
          color="border-blue-500"
          loading={statsLoading}
        />
        <StatCard
          title="Revenue Today"
          value={statsLoading ? '' : formatCurrency(displayStats.revenueToday)}
          subtitle="total earnings"
          icon={<IndianRupee className="w-5 h-5" />}
          trend={displayStats.revenueTodayTrend}
          color="border-violet-500"
          loading={statsLoading}
        />
        <StatCard
          title="Low Stock Alerts"
          value={statsLoading ? '' : displayStats.lowStockCount}
          subtitle="items need attention"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="border-amber-500"
          loading={statsLoading}
        />
        <StatCard
          title="Pending Orders"
          value={statsLoading ? '' : displayStats.pendingOrders}
          subtitle="awaiting action"
          icon={<Clock className="w-5 h-5" />}
          color="border-orange-500"
          loading={statsLoading}
        />
        <StatCard
          title="Returns Pending"
          value={statsLoading ? '' : displayStats.returnsPending}
          subtitle="to be processed"
          icon={<RotateCcw className="w-5 h-5" />}
          color="border-rose-500"
          loading={statsLoading}
        />
      </div>

      {/* ─── Section 2: Platform Sync Status ──────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-slate-400" />
            Platform Sync Status
          </h2>
        </div>
        {syncLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <Skeleton active paragraph={{ rows: 2 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {syncStatus.map((item) => (
              <PlatformCard
                key={item.platform}
                data={item}
                onSync={handlePlatformSync}
                syncing={syncingPlatform === item.platform}
                onViewProducts={handleViewPlatformProducts}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Section 3: Revenue Chart + Top Selling ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Revenue Chart */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Revenue Overview
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Across all platforms</p>
            </div>
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              {timeRanges.map((range) => (
                <button
                  key={range}
                  onClick={() => setChartRange(range)}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
                    ${chartRange === range
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                    }
                  `}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                iconType="circle"
                iconSize={8}
              />
              <Line
                type="monotone"
                dataKey="fifozone"
                name="Fifozone"
                stroke="#059669"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="amazon"
                name="Amazon"
                stroke="#ea580c"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#ea580c', stroke: '#fff', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="flipkart"
                name="Flipkart"
                stroke="#d97706"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#d97706', stroke: '#fff', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="meesho"
                name="Meesho"
                stroke="#ec4899"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#ec4899', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Selling Products */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-base font-semibold text-slate-800 mb-1">Top Selling Products</h3>
          <p className="text-xs text-slate-400 mb-4">Units sold this month</p>
          {topSellingData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[260px] text-slate-400">
              <Package className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No sales data available yet</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
              {topSellingData.map((product, idx) => {
                const maxUnits = topSellingData[0]?.units || 1;
                const pct = Math.round((product.units / maxUnits) * 100);
                const colors = ['bg-emerald-500','bg-blue-500','bg-purple-500','bg-orange-500','bg-rose-500','bg-teal-500','bg-indigo-500','bg-amber-500','bg-cyan-500','bg-pink-500'];
                const barColor = colors[idx % colors.length];
                return (
                  <div key={idx} className="flex items-center gap-3 group">
                    <span className="w-5 text-xs font-bold text-slate-400 text-right shrink-0">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-slate-700 truncate pr-2" title={product.name}>
                          {product.name}
                        </p>
                        <span className="text-xs font-bold text-slate-600 shrink-0">{product.units} sold</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${barColor} transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Section 4: Recent Orders + Low Stock ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Recent Orders */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Recent Orders</h3>
              <p className="text-xs text-slate-400 mt-0.5">Latest 10 orders across all platforms</p>
            </div>
            <Button
              type="link"
              size="small"
              className="!text-emerald-600 !text-xs !font-medium"
              onClick={() => navigate('/orders')}
            >
              View All <ExternalLink className="w-3 h-3 ml-1 inline" />
            </Button>
          </div>
          <Table
            columns={orderColumns}
            dataSource={recentOrders}
            rowKey={(record) => record._id || record.orderNumber}
            loading={ordersLoading}
            pagination={false}
            size="small"
            scroll={{ x: 700 }}
            onRow={(record) => ({
              onClick: () => navigate(`/orders/${record._id}`),
              className: 'cursor-pointer hover:bg-emerald-50/30 transition-colors',
            })}
            className="[&_.ant-table-thead>tr>th]:!text-xs [&_.ant-table-thead>tr>th]:!text-slate-500 [&_.ant-table-thead>tr>th]:!font-semibold [&_.ant-table-thead>tr>th]:!bg-slate-50/80"
          />
        </div>

        {/* Low Stock Alert Widget */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Low Stock Alerts
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Products below reorder threshold</p>
            </div>
            <Button
              type="link"
              size="small"
              className="!text-emerald-600 !text-xs !font-medium"
              onClick={() => navigate('/inventory')}
            >
              View All
            </Button>
          </div>

          {lowStockLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} active avatar paragraph={{ rows: 1, width: '80%' }} />
              ))}
            </div>
          ) : lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-slate-400">
              <Package className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm font-medium">No low stock items</p>
              <p className="text-xs mt-1">All products are well stocked</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {lowStockProducts.map((product) => {
                const name = product.masterName || product.name || 'Unknown Product';
                const stock = product.totalStock ?? product.stock ?? 0;
                const threshold = product.lowStockThreshold ?? 20;
                const percent = threshold > 0 ? Math.round((stock / threshold) * 100) : 0;
                const strokeColor = percent <= 25 ? '#ef4444' : percent <= 50 ? '#f59e0b' : '#22c55e';
                const image = product.images?.[0]?.url || product.image;

                return (
                  <div
                    key={product._id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50/70 hover:bg-slate-100/80 transition-colors duration-200 group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                      {image ? (
                        <img src={image} alt={name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <Package className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">
                          {stock} / {threshold} units
                        </span>
                        <Progress
                          percent={Math.min(percent, 100)}
                          size="small"
                          strokeColor={strokeColor}
                          trailColor="#f1f5f9"
                          showInfo={false}
                          className="flex-1 !mb-0 [&_.ant-progress-inner]:!h-1.5"
                        />
                      </div>
                    </div>
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      className="!text-xs !font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      onClick={() => navigate(`/inventory/products/${product._id}/edit`)}
                    >
                      Restock
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Section 5: Dead Products Banner ──────────────────────────────────── */}
      {showDeadBanner && (displayStats.deadProducts || displayStats.deadProductsCount) && (
        <Alert
          type="warning"
          showIcon
          closable
          onClose={() => setShowDeadBanner(false)}
          className="!rounded-xl !border-amber-200 !bg-amber-50/80"
          message={
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm text-amber-800">
                <strong>{displayStats.deadProducts || displayStats.deadProductsCount}</strong> products have low/no sales this month.
              </span>
              <Button
                type="link"
                size="small"
                className="!text-amber-700 !font-semibold !text-sm !p-0 hover:!text-amber-900"
                onClick={() => navigate('/inventory/dead-products')}
              >
                View Dead Products →
              </Button>
            </div>
          }
        />
      )}

      {/* ─── Platform Products Drawer ─────────────────────────────────────────── */}
      {(() => {
        const drawerPlatform = platformDrawer.platform;
        const cfg = platformConfig[drawerPlatform] || platformConfig.fifozone;
        const otherPlatforms = ALL_PLATFORMS.filter(p => p.key !== drawerPlatform);

        // Filter products by search
        const filtered = platformProducts.filter(p =>
          !platformProductSearch ||
          p.name?.toLowerCase().includes(platformProductSearch.toLowerCase()) ||
          p.sku?.toLowerCase().includes(platformProductSearch.toLowerCase())
        );

        const columns = [
          {
            title: 'Product',
            key: 'product',
            width: 240,
            render: (_, p) => (
              <div className="flex items-center gap-3">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-slate-100" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Package size={16} className="text-slate-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate max-w-[160px]">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.sku || '—'}</p>
                </div>
              </div>
            )
          },
          {
            title: 'Stock',
            dataIndex: 'totalStock',
            key: 'stock',
            width: 80,
            render: (stock) => {
              const low = stock <= 10;
              return (
                <span className={`font-semibold text-sm ${
                  low ? 'text-rose-600' : 'text-slate-800'
                }`}>
                  {stock ?? '—'}
                </span>
              );
            }
          },
          {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
            width: 100,
            render: (price) => (
              <span className="text-sm text-slate-700 font-medium">
                {price != null ? formatCurrency(price) : '—'}
              </span>
            )
          },
          {
            title: 'Also Listed On',
            key: 'platforms',
            render: (_, p) => {
              const status = p.platformStatus || {};
              const listedElsewhere = otherPlatforms.filter(
                op => status[op.key] && status[op.key] !== 'not_listed'
              );
              if (listedElsewhere.length === 0) {
                return <span className="text-xs text-slate-400 italic">Only here</span>;
              }
              return (
                <div className="flex flex-wrap gap-1">
                  {listedElsewhere.map(op => (
                    <Tag
                      key={op.key}
                      color={op.color}
                      className="!text-xs !rounded-full !border-0 !m-0 !font-medium"
                    >
                      {op.label}
                    </Tag>
                  ))}
                </div>
              );
            }
          },
          {
            title: '',
            key: 'action',
            width: 70,
            render: (_, p) => (
              <Button
                type="link"
                size="small"
                icon={<ExternalLink size={13} />}
                onClick={() => navigate(`/inventory/products/${p._id}/edit`)}
                className="!text-slate-400 hover:!text-emerald-600 !p-0"
              />
            )
          }
        ];

        return (
          <Drawer
            open={platformDrawer.open}
            onClose={() => setPlatformDrawer({ open: false, platform: null })}
            width={680}
            destroyOnClose
            title={
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white font-bold text-sm shadow`}>
                  {cfg.initial}
                </div>
                <div>
                  <p className="text-base font-bold text-slate-800 capitalize leading-tight">
                    {drawerPlatform} Products
                  </p>
                  <p className="text-xs text-slate-400 font-normal leading-tight">
                    {platformProductsLoading ? 'Loading...' : `${filtered.length} product${filtered.length !== 1 ? 's' : ''} listed`}
                  </p>
                </div>
              </div>
            }
            extra={
              <Button
                type="primary"
                size="small"
                icon={<ExternalLink size={13} />}
                onClick={() => navigate(`/inventory/products?platform=${drawerPlatform}`)}
                className="!bg-emerald-600 !border-emerald-600 hover:!bg-emerald-500 !text-xs !font-medium"
              >
                View in Inventory
              </Button>
            }
          >
            {/* Search bar */}
            <div className="mb-4">
              <Input
                prefix={<Search size={14} className="text-slate-400" />}
                placeholder="Search by product name or SKU..."
                value={platformProductSearch}
                onChange={e => setPlatformProductSearch(e.target.value)}
                allowClear
                className="rounded-lg"
              />
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
              <span className="text-xs text-slate-500 font-medium">Cross-listing legend:</span>
              {ALL_PLATFORMS.map(p => (
                <div key={p.key} className="flex items-center gap-1.5">
                  <Tag color={p.color} className="!text-xs !rounded-full !border-0 !m-0 !py-0">{p.label}</Tag>
                  <span className="text-xs text-slate-400">{p.key === drawerPlatform ? '(current)' : ''}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 ml-auto">
                <Tag className="!text-xs !rounded-full !border-slate-200 !bg-slate-100 !text-slate-400 !m-0 !py-0">Not Listed</Tag>
              </div>
            </div>

            {/* Products table */}
            {platformProductsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Spin size="large" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Package size={40} className="mx-auto mb-3 opacity-40" />
                <p className="font-medium">No products found</p>
                <p className="text-sm mt-1">
                  {platformProductSearch ? 'Try a different search term' : `No products are listed on ${drawerPlatform} yet`}
                </p>
              </div>
            ) : (
              <Table
                dataSource={filtered}
                columns={columns}
                rowKey="_id"
                size="small"
                pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `${t} products` }}
                scroll={{ x: 580 }}
                rowClassName="hover:!bg-slate-50 cursor-pointer"
                onRow={(record) => ({
                  onClick: () => navigate(`/inventory/products/${record._id}/edit`)
                })}
              />
            )}
          </Drawer>
        );
      })()}
    </div>
  );
};

export default DashboardPage;
