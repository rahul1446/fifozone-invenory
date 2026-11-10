import React, { useEffect, useState } from 'react';
import { getDashboardStatsApi } from '../../api/analyticsApi';
import { Card, Table, Tag, Spin, Row, Col } from 'antd';
import { 
  Package, 
  ShoppingBag, 
  IndianRupee, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await getDashboardStatsApi();
        setStatsData(response.data);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading || !statsData) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <Spin size="large" tip="Loading Dashboard Analytics..." />
      </div>
    );
  }

  const { stats, lowStockList, recentOrders, revenueChartData } = statsData;

  const StatCard = ({ title, value, icon, trend, trendLabel }) => (
    <div className="bg-white rounded-xl p-5 border border-slate-200 transition-colors duration-150 hover:border-slate-300">
      <div className="flex justify-between items-start">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <span className="text-slate-400">{icon}</span>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-semibold text-slate-900 tabular-nums tracking-tight">{value}</div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-1.5 text-xs">
            <span className={`inline-flex items-center font-medium ${trend >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {trend >= 0 ? <ArrowUpRight size={13} className="mr-0.5" /> : <ArrowDownRight size={13} className="mr-0.5" />}
              {Math.abs(trend)}%
            </span>
            <span className="text-slate-400">{trendLabel}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">Multi-channel sales performance and inventory status</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's revenue"
          value={formatCurrency(stats.todayRevenue)}
          icon={<IndianRupee size={18} />}
          trend={stats.revenueTrend}
          trendLabel="vs yesterday"
        />
        <StatCard
          title="Today's orders"
          value={Number(stats.todayOrdersCount || 0).toLocaleString()}
          icon={<ShoppingBag size={18} />}
        />
        <StatCard
          title="Low stock alerts"
          value={Number(stats.lowStockProductsCount || 0).toLocaleString()}
          icon={<AlertTriangle size={18} />}
        />
        <StatCard
          title="Total products"
          value={Number(stats.totalProducts || 0).toLocaleString()}
          icon={<Package size={18} />}
        />
      </div>

      {/* Chart Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-sm font-semibold text-slate-900">Revenue (last 30 days)</h2>
          <span className="text-xs text-slate-400">Values in ₹</span>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#166534" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="#166534" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `₹${val/1000}k`} />
              <Tooltip 
                contentStyle={{ borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: 'none', fontSize: '12px' }}
                formatter={(value) => [formatCurrency(value), 'Revenue']}
              />
              <Area type="monotone" dataKey="Total" stroke="#166534" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-900">Recent orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-slate-500 font-medium bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2.5">Order ID</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map(order => (
                  <tr key={order._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-slate-800">{order.orderNumber}</td>
                    <td className="px-4 py-2.5 text-slate-600 truncate max-w-[140px]">{order.customer?.name || 'Walk-in'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium capitalize ${
                        order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' :
                        order.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900 tabular-nums">
                      {formatCurrency(order.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-900">Low stock alerts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-slate-500 font-medium bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5">SKU</th>
                  <th className="px-4 py-2.5 text-right">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockList.map(item => (
                  <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-800 truncate max-w-[200px]">{item.masterName}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-500">{item.sku}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium tabular-nums ${
                        item.totalStock === 0 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {item.totalStock} units
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
