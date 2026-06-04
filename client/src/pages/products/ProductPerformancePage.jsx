import React, { useState } from 'react';
import { Table, Tag, Button, Input } from 'antd';
import { DollarSign, Zap, TrendingDown, Search, BarChart2 } from 'lucide-react';

const mockPerformance = [
  { key: '1', name: 'Himalaya Erina EP Shampoo', sku: 'HIM-SHP-03', unitsSold: 312, revenue: 99840, stockRemaining: 88, stockValue: 28160, performance: 'Fast' },
  { key: '2', name: 'Pedigree Dentastix Daily', sku: 'PED-DEN-06', unitsSold: 285, revenue: 49875, stockRemaining: 115, stockValue: 9775, performance: 'Fast' },
  { key: '3', name: 'Royal Canin Persian Adult', sku: 'RC-PER-05', unitsSold: 178, revenue: 444822, stockRemaining: 42, stockValue: 75600, performance: 'Fast' },
  { key: '4', name: 'Fipnil Plus Spot On (Small)', sku: 'FIP-SML-01', unitsSold: 134, revenue: 53466, stockRemaining: 210, stockValue: 37800, performance: 'Fast' },
  { key: '5', name: 'Virbac Endogard Large', sku: 'VIR-END-09', unitsSold: 92, revenue: 45908, stockRemaining: 65, stockValue: 14300, performance: 'Slow' },
  { key: '6', name: 'NexGard Spectra (Dog)', sku: 'NEX-DOG-07', unitsSold: 67, revenue: 133933, stockRemaining: 38, stockValue: 37240, performance: 'Slow' },
  { key: '7', name: 'Himalaya Hexaprin Shampoo', sku: 'HIM-HEX-10', unitsSold: 48, revenue: 16752, stockRemaining: 190, stockValue: 30400, performance: 'Slow' },
  { key: '8', name: 'Beaphar Fiprotec Spray', sku: 'BEA-SPR-04', unitsSold: 29, revenue: 31871, stockRemaining: 78, stockValue: 40560, performance: 'Slow' },
  { key: '9', name: 'Droncit Tablet (Cats)', sku: 'DRN-CAT-02', unitsSold: 11, revenue: 2189, stockRemaining: 245, stockValue: 23275, performance: 'Dead' },
  { key: '10', name: 'Savavet Kitazole Plus', sku: 'SAV-KIT-08', unitsSold: 4, revenue: 520, stockRemaining: 310, stockValue: 18600, performance: 'Dead' },
];

const totalStockValue = mockPerformance.reduce((a, p) => a + p.stockValue, 0);
const topSelling = mockPerformance.reduce((a, b) => a.unitsSold > b.unitsSold ? a : b);
const slowMoving = mockPerformance.filter(p => p.performance === 'Dead').length;

const perfColor = { Fast: 'success', Slow: 'warning', Dead: 'error' };
const perfBg = { Fast: 'bg-emerald-50', Slow: 'bg-amber-50', Dead: 'bg-rose-50' };
const perfText = { Fast: 'text-emerald-700', Slow: 'text-amber-700', Dead: 'text-rose-700' };

const StatCard = ({ title, value, icon: Icon, borderColor, bgColor, textColor, sub }) => (
  <div className={`bg-white rounded-xl shadow-sm border-l-4 ${borderColor} p-5 flex items-center gap-4`}>
    <div className={`${bgColor} p-3 rounded-full`}>
      <Icon size={22} className={textColor} />
    </div>
    <div className="min-w-0">
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <p className="font-bold text-2xl text-slate-800 mt-0.5 truncate">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
  </div>
);

const ProductPerformancePage = () => {
  const [search, setSearch] = useState('');

  const filtered = mockPerformance.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: 'Product Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span className="font-medium text-slate-800 text-sm">{text}</span>,
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (text) => <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{text}</span>,
    },
    {
      title: 'Units Sold',
      dataIndex: 'unitsSold',
      key: 'unitsSold',
      align: 'center',
      sorter: (a, b) => a.unitsSold - b.unitsSold,
      render: (v) => <span className="font-semibold text-slate-700">{v.toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Revenue (₹)',
      dataIndex: 'revenue',
      key: 'revenue',
      align: 'right',
      sorter: (a, b) => a.revenue - b.revenue,
      render: (v) => <span className="font-medium text-emerald-600">₹{v.toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Stock Remaining',
      dataIndex: 'stockRemaining',
      key: 'stockRemaining',
      align: 'center',
      render: (v) => <span className="font-medium text-slate-700">{v}</span>,
    },
    {
      title: 'Stock Value (₹)',
      dataIndex: 'stockValue',
      key: 'stockValue',
      align: 'right',
      render: (v) => <span className="font-medium text-slate-700">₹{v.toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Performance',
      dataIndex: 'performance',
      key: 'performance',
      align: 'center',
      filters: [
        { text: 'Fast', value: 'Fast' },
        { text: 'Slow', value: 'Slow' },
        { text: 'Dead', value: 'Dead' },
      ],
      onFilter: (value, record) => record.performance === value,
      render: (v) => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${perfBg[v]} ${perfText[v]}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${v === 'Fast' ? 'bg-emerald-500' : v === 'Slow' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
          {v} Mover
        </span>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center',
      render: () => (
        <Button size="small" className="rounded-lg border-slate-200 text-slate-600 text-xs" icon={<BarChart2 size={12} />}>
          Details
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-slate-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Product Performance</h1>
        <p className="text-slate-500 mt-1 text-sm">Analyze individual product sales and movement</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Stock Value"
          value={`₹${totalStockValue.toLocaleString('en-IN')}`}
          icon={DollarSign}
          borderColor="border-emerald-500"
          bgColor="bg-emerald-50"
          textColor="text-emerald-600"
        />
        <StatCard
          title="Top Selling Product"
          value={topSelling.unitsSold + ' units'}
          sub={topSelling.name}
          icon={Zap}
          borderColor="border-blue-500"
          bgColor="bg-blue-50"
          textColor="text-blue-600"
        />
        <StatCard
          title="Dead Stock Products"
          value={slowMoving}
          icon={TrendingDown}
          borderColor="border-amber-500"
          bgColor="bg-amber-50"
          textColor="text-amber-600"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">Performance Overview — This Month</h2>
          <Input
            placeholder="Search product or SKU..."
            prefix={<Search size={14} className="text-slate-400" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 rounded-lg text-sm"
          />
        </div>
        <Table
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 800 }}
          pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (total) => `${total} products` }}
          rowClassName="hover:bg-slate-50 transition-colors"
          className="text-sm"
        />
      </div>
    </div>
  );
};

export default ProductPerformancePage;
