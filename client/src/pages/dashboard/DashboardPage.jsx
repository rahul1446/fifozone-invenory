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

  const { stats, lowStockList, recentOrders, revenueChartData, topProducts } = statsData;

  const StatCard = ({ title, value, icon, trend, trendLabel, bgColor, iconColor }) => (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
          
          {trend !== undefined && (
            <div className="flex items-center mt-2">
              <span className={`flex items-center text-xs font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend >= 0 ? <ArrowUpRight size={14} className="mr-0.5" /> : <ArrowDownRight size={14} className="mr-0.5" />}
                {Math.abs(trend)}%
              </span>
              <span className="text-xs text-slate-400 ml-1">{trendLabel}</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgColor} ${iconColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor multi-channel sales and inventory health</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(stats.todayRevenue)}
          icon={<IndianRupee size={22} />}
          trend={stats.revenueTrend}
          trendLabel="vs yesterday"
          bgColor="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Today's Orders"
          value={stats.todayOrdersCount}
          icon={<ShoppingBag size={22} />}
          bgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats.lowStockProductsCount}
          icon={<AlertTriangle size={22} />}
          bgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon={<Package size={22} />}
          bgColor="bg-indigo-50"
          iconColor="text-indigo-600"
        />
      </div>

      {/* Chart Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-6">Revenue Trend (Last 30 Days)</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val/1000}k`} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value) => [formatCurrency(value), 'Revenue']}
              />
              <Area type="monotone" dataKey="Total" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-base font-semibold text-slate-800">Recent Orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map(order => (
                  <tr key={order._id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-900">{order.orderNumber}</td>
                    <td className="px-5 py-3 text-slate-600">{order.customer.name}</td>
                    <td className="px-5 py-3">
                      <Tag color={order.status === 'delivered' ? 'success' : order.status === 'pending' ? 'processing' : 'default'}>
                        {order.status.toUpperCase()}
                      </Tag>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-800">{formatCurrency(order.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-base font-semibold text-slate-800">Low Stock Warnings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockList.map(item => (
                  <tr key={item._id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-900 truncate max-w-[200px]">{item.masterName}</td>
                    <td className="px-5 py-3 text-slate-500">{item.sku}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${item.totalStock === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.totalStock} left
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
