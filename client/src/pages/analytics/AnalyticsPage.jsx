import React, { useState, useEffect } from 'react';
import { Card, Table, message } from 'antd';
import { IndianRupee, ShoppingBag, TrendingUp, RotateCcw } from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { getDetailedAnalyticsApi } from '../../api/analyticsApi';
import { formatCurrency } from '../../utils/formatters';

const COLORS = {
  emerald: '#10b981',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  rose: '#f43f5e',
  orange: '#f97316',
  amber: '#f59e0b',
  gray: '#94a3b8',
  red: '#ef4444'
};

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fallback data if API fails or doesn't have enough data
  const fallbackData = {
    overview: {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      returnRate: 0
    },
    revenueTrend: [],
    platformDistribution: [],
    topCategories: [],
    statusDistribution: [],
    topProducts: []
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await getDetailedAnalyticsApi();
        const real = response?.data?.data || response?.data;
        if (real && real.overview) {
          // Use real data. If topCategories or platform has 0 entries, supplement with fallback
          const merged = {
            overview: real.overview,
            revenueTrend: real.revenueTrend?.length > 0 ? real.revenueTrend : fallbackData.revenueTrend,
            platformDistribution: real.platformDistribution?.length > 0 ? real.platformDistribution : fallbackData.platformDistribution,
            topCategories: real.topCategories?.length > 0 ? real.topCategories : fallbackData.topCategories,
            statusDistribution: real.statusDistribution?.length > 0 ? real.statusDistribution : fallbackData.statusDistribution,
            topProducts: real.topProducts?.length > 0 ? real.topProducts : fallbackData.topProducts,
          };
          setData(merged);
        } else {
          setData(fallbackData);
        }
      } catch (error) {
        setData(fallbackData);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return <div className="p-10 text-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>;
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-xl border border-slate-100 text-sm">
          <p className="text-slate-500 mb-1">{label}</p>
          <p className="font-bold text-slate-800">
            {payload[0].name === 'revenue' 
              ? formatCurrency(payload[0].value) 
              : payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Deep dive into sales performance and trends</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-emerald-500 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm">Total Revenue (Month)</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(data.overview.totalRevenue)}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <IndianRupee size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-blue-500 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm">Total Orders (Month)</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{data.overview.totalOrders}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <ShoppingBag size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-purple-500 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm">Average Order Value</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(data.overview.avgOrderValue)}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-rose-500 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm">Return Rate</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{data.overview.returnRate}%</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
              <RotateCcw size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Revenue Trend (Last 30 Days)" className="shadow-sm rounded-2xl" bordered={false}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(value) => `₹${value/1000}k`} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke={COLORS.emerald} strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Orders by Platform" className="shadow-sm rounded-2xl" bordered={false}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.platformDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.platformDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={[COLORS.emerald, COLORS.orange, COLORS.amber][index % 3]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top Categories by Units Sold" className="shadow-sm rounded-2xl" bordered={false}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data.topCategories} margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <RechartsTooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
                <Bar dataKey="value" fill={COLORS.emerald} radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Order Status Distribution" className="shadow-sm rounded-2xl" bordered={false}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.statusDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  labelLine={false}
                >
                  {data.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Top Selling Products" className="shadow-sm rounded-2xl overflow-hidden" bordered={false} bodyStyle={{ padding: 0 }}>
        <Table 
          dataSource={data.topProducts} 
          rowKey="id"
          pagination={false}
          columns={[
            { title: 'Rank', dataIndex: 'rank', render: (val) => <span className="font-bold text-slate-400">#{val}</span> },
            { title: 'Product Name', dataIndex: 'name', className: 'font-semibold text-slate-800' },
            { title: 'Category', dataIndex: 'category' },
            { title: 'Units Sold', dataIndex: 'units' },
            { title: 'Revenue', dataIndex: 'revenue', render: (val) => <span className="font-bold text-emerald-600">{formatCurrency(val)}</span> },
            { title: 'Returns', dataIndex: 'returns' },
            { title: 'Return Rate', dataIndex: 'returnRate', render: (val) => <span className={val > 2 ? 'text-red-500' : 'text-slate-500'}>{val}%</span> }
          ]}
        />
      </Card>
    </div>
  );
};

export default AnalyticsPage;
