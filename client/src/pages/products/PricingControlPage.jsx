import React, { useState } from 'react';
import { Table, Tag, Button, Input } from 'antd';
import { TrendingUp, ArrowUpRight, AlertTriangle, Search, Download } from 'lucide-react';

const mockPricing = [
  { key: '1', name: 'Fipnil Plus Spot On (Small)', sku: 'FIP-SML-01', cost: 180, mrp: 450, fifozone: 399, amazon: 420, flipkart: 410, meesho: 385, margin: 38.7 },
  { key: '2', name: 'Droncit Tablet (Cats)', sku: 'DRN-CAT-02', cost: 95, mrp: 220, fifozone: 199, amazon: 210, flipkart: 205, meesho: 190, margin: 33.2 },
  { key: '3', name: 'Himalaya Erina EP Shampoo', sku: 'HIM-SHP-03', cost: 140, mrp: 350, fifozone: 320, amazon: 340, flipkart: 330, meesho: 310, margin: 31.3 },
  { key: '4', name: 'Beaphar Fiprotec Spray', sku: 'BEA-SPR-04', cost: 520, mrp: 1200, fifozone: 1099, amazon: 1150, flipkart: 1120, meesho: 1050, margin: 41.6 },
  { key: '5', name: 'Royal Canin Persian Adult', sku: 'RC-PER-05', cost: 1800, mrp: 2800, fifozone: 2499, amazon: 2599, flipkart: 2550, meesho: 2399, margin: 17.5 },
  { key: '6', name: 'Pedigree Dentastix Daily', sku: 'PED-DEN-06', cost: 85, mrp: 200, fifozone: 175, amazon: 185, flipkart: 180, meesho: 165, margin: 17.6 },
  { key: '7', name: 'NexGard Spectra (Dog)', sku: 'NEX-DOG-07', cost: 980, mrp: 2200, fifozone: 1999, amazon: 2100, flipkart: 2050, meesho: 1900, margin: 35.9 },
  { key: '8', name: 'Savavet Kitazole Plus', sku: 'SAV-KIT-08', cost: 60, mrp: 150, fifozone: 130, amazon: 140, flipkart: 135, meesho: 125, margin: 12.3 },
  { key: '9', name: 'Virbac Endogard Large', sku: 'VIR-END-09', cost: 220, mrp: 550, fifozone: 499, amazon: 525, flipkart: 510, meesho: 480, margin: 34.1 },
  { key: '10', name: 'Himalaya Hexaprin Shampoo', sku: 'HIM-HEX-10', cost: 160, mrp: 380, fifozone: 349, amazon: 365, flipkart: 355, meesho: 330, margin: 30.6 },
];

const avgMargin = (mockPricing.reduce((a, p) => a + p.margin, 0) / mockPricing.length).toFixed(1);
const highestPrice = mockPricing.reduce((a, b) => a.mrp > b.mrp ? a : b);
const lowestMargin = mockPricing.reduce((a, b) => a.margin < b.margin ? a : b);

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

const PriceCell = ({ value }) => (
  <span className="font-medium text-slate-700">₹{value.toLocaleString('en-IN')}</span>
);

const MarginBadge = ({ margin }) => {
  const color = margin >= 35 ? 'text-emerald-600 bg-emerald-50' : margin >= 20 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50';
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{margin}%</span>;
};

const PricingControlPage = () => {
  const [search, setSearch] = useState('');

  const filtered = mockPricing.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: 'Product Name',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (text) => <span className="font-medium text-slate-800 text-xs">{text}</span>,
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (text) => <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{text}</span>,
    },
    { title: 'Cost (₹)', dataIndex: 'cost', key: 'cost', align: 'right', render: (v) => <PriceCell value={v} /> },
    { title: 'MRP (₹)', dataIndex: 'mrp', key: 'mrp', align: 'right', render: (v) => <PriceCell value={v} /> },
    { title: 'Fifozone (₹)', dataIndex: 'fifozone', key: 'fifozone', align: 'right', render: (v) => <PriceCell value={v} /> },
    { title: 'Amazon (₹)', dataIndex: 'amazon', key: 'amazon', align: 'right', render: (v) => <PriceCell value={v} /> },
    { title: 'Flipkart (₹)', dataIndex: 'flipkart', key: 'flipkart', align: 'right', render: (v) => <PriceCell value={v} /> },
    { title: 'Meesho (₹)', dataIndex: 'meesho', key: 'meesho', align: 'right', render: (v) => <PriceCell value={v} /> },
    {
      title: 'Margin %',
      dataIndex: 'margin',
      key: 'margin',
      align: 'center',
      sorter: (a, b) => a.margin - b.margin,
      render: (v) => <MarginBadge margin={v} />,
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-slate-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Pricing Management</h1>
        <p className="text-slate-500 mt-1 text-sm">Control pricing and margins across all channels</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Average Margin %" value={`${avgMargin}%`} icon={TrendingUp} borderColor="border-violet-500" bgColor="bg-violet-50" textColor="text-violet-600" />
        <StatCard title="Highest Price Product" value={`₹${highestPrice.mrp.toLocaleString('en-IN')}`} sub={highestPrice.name} icon={ArrowUpRight} borderColor="border-blue-500" bgColor="bg-blue-50" textColor="text-blue-600" />
        <StatCard title="Lowest Margin Product" value={`${lowestMargin.margin}%`} sub={lowestMargin.name} icon={AlertTriangle} borderColor="border-amber-500" bgColor="bg-amber-50" textColor="text-amber-600" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">Pricing Overview</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Search product or SKU..."
              prefix={<Search size={14} className="text-slate-400" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 rounded-lg text-sm"
            />
            <Button icon={<Download size={14} />} className="rounded-lg border-slate-200 text-slate-600">
              Export
            </Button>
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 900 }}
          pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (total) => `${total} products` }}
          rowClassName="hover:bg-slate-50 transition-colors"
          className="text-sm"
        />
      </div>
    </div>
  );
};

export default PricingControlPage;
