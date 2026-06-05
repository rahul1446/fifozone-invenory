import React from 'react';
import { Table, Tag } from 'antd';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, ShoppingCart, IndianRupee, Trophy } from 'lucide-react';

const monthlyRevenue = [];

const platformPieData = [];

const tableData = [];

const platformColors = { amazon: 'orange', flipkart: 'blue', meesho: 'pink', fifozone: 'green' };

const StatCard = ({ title, value, icon: Icon, borderColor, iconBg, iconColor }) => (
  <div className={`bg-white rounded-xl shadow-sm border-l-4 ${borderColor} p-5 flex items-center gap-4`}>
    <div className={`${iconBg} p-3 rounded-full`}>
      <Icon size={22} className={iconColor} />
    </div>
    <div>
      <p className="text-slate-500 text-sm">{title}</p>
      <p className="font-bold text-2xl text-slate-800">{value}</p>
    </div>
  </div>
);

const ReportsPage = () => {
  const totalRevenue = tableData.reduce((s, r) => s + r.revenue, 0);
  const totalOrders = tableData.reduce((s, r) => s + r.orders, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const columns = [
    { title: 'Month', dataIndex: 'month', key: 'month', render: (v) => <span className="font-medium text-slate-700">{v}</span> },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      render: (p) => (
        <Tag color={platformColors[p]} className="capitalize font-semibold">
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </Tag>
      ),
    },
    { title: 'Orders', dataIndex: 'orders', key: 'orders', align: 'center' },
    {
      title: 'Revenue (₹)',
      dataIndex: 'revenue',
      key: 'revenue',
      align: 'right',
      render: (v) => <span className="font-bold text-slate-800">₹{v.toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Avg Order Value (₹)',
      dataIndex: 'avgOrderValue',
      key: 'avgOrderValue',
      align: 'right',
      render: (v) => <span className="text-slate-600">₹{v.toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Growth %',
      dataIndex: 'growth',
      key: 'growth',
      render: (v) => (
        <span className={`font-semibold ${v.startsWith('+') ? 'text-emerald-600' : 'text-rose-500'}`}>{v}</span>
      ),
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Reports & Analytics</h1>
        <p className="text-slate-500 mt-1">Data-driven insights for your business</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Revenue (₹)"
          value={`₹${totalRevenue.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          borderColor="border-emerald-500"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Total Orders"
          value={totalOrders.toLocaleString('en-IN')}
          icon={ShoppingCart}
          borderColor="border-blue-500"
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Avg Order Value (₹)"
          value={`₹${avgOrderValue.toLocaleString('en-IN')}`}
          icon={TrendingUp}
          borderColor="border-violet-500"
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />
        <StatCard
          title="Top Platform"
          value="Amazon"
          icon={Trophy}
          borderColor="border-amber-500"
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Monthly Revenue (Last 6 Months)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyRevenue} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip
                formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Order Distribution by Platform</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={platformPieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
                labelLine={false}
              >
                {platformPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend />
              <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Monthly Performance Breakdown</h2>
        <Table columns={columns} dataSource={tableData} pagination={{ pageSize: 10 }} scroll={{ x: 700 }} />
      </div>
    </div>
  );
};

export default ReportsPage;
