import React, { useState } from 'react';
import { Table, Tag, Button, Input } from 'antd';
import { Package, CheckCircle, XCircle, Search, RefreshCw } from 'lucide-react';

const mockProducts = [
  { key: '1', name: 'Fipnil Plus Spot On (Small)', sku: 'FIP-SML-01', fifozone: 'Active', amazon: 'Active', flipkart: 'Active', meesho: 'Inactive' },
  { key: '2', name: 'Droncit Tablet (Cats)', sku: 'DRN-CAT-02', fifozone: 'Active', amazon: 'Active', flipkart: 'Inactive', meesho: 'Inactive' },
  { key: '3', name: 'Himalaya Erina EP Shampoo', sku: 'HIM-SHP-03', fifozone: 'Active', amazon: 'Active', flipkart: 'Active', meesho: 'Active' },
  { key: '4', name: 'Beaphar Fiprotec Spray', sku: 'BEA-SPR-04', fifozone: 'Active', amazon: 'Inactive', flipkart: 'Active', meesho: 'Inactive' },
  { key: '5', name: 'Royal Canin Persian Adult', sku: 'RC-PER-05', fifozone: 'Active', amazon: 'Active', flipkart: 'Active', meesho: 'Active' },
  { key: '6', name: 'Pedigree Dentastix Daily', sku: 'PED-DEN-06', fifozone: 'Active', amazon: 'Active', flipkart: 'Active', meesho: 'Active' },
  { key: '7', name: 'NexGard Spectra (Dog)', sku: 'NEX-DOG-07', fifozone: 'Active', amazon: 'Inactive', flipkart: 'Inactive', meesho: 'Inactive' },
  { key: '8', name: 'Savavet Kitazole Plus', sku: 'SAV-KIT-08', fifozone: 'Inactive', amazon: 'Inactive', flipkart: 'Inactive', meesho: 'Inactive' },
  { key: '9', name: 'Virbac Endogard Large', sku: 'VIR-END-09', fifozone: 'Active', amazon: 'Active', flipkart: 'Active', meesho: 'Inactive' },
  { key: '10', name: 'Himalaya Hexaprin Shampoo', sku: 'HIM-HEX-10', fifozone: 'Active', amazon: 'Active', flipkart: 'Inactive', meesho: 'Active' },
];

const StatusTag = ({ status }) => (
  <Tag
    color={status === 'Active' ? 'success' : 'error'}
    className="font-medium text-xs px-2 py-0.5 rounded-full"
  >
    {status}
  </Tag>
);

const totalListed = mockProducts.length;
const activeListings = mockProducts.filter(p =>
  [p.fifozone, p.amazon, p.flipkart, p.meesho].some(s => s === 'Active')
).length;
const inactiveListings = mockProducts.filter(p =>
  [p.fifozone, p.amazon, p.flipkart, p.meesho].every(s => s === 'Inactive')
).length;

const StatCard = ({ title, value, icon: Icon, color, borderColor, bgColor, textColor }) => (
  <div className={`bg-white rounded-xl shadow-sm border-l-4 ${borderColor} p-5 flex items-center gap-4`}>
    <div className={`${bgColor} p-3 rounded-full`}>
      <Icon size={22} className={textColor} />
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <p className="font-bold text-2xl text-slate-800 mt-0.5">{value}</p>
    </div>
  </div>
);

const ChannelListingPage = () => {
  const [search, setSearch] = useState('');

  const filtered = mockProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: 'Product Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span className="font-medium text-slate-800">{text}</span>,
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (text) => <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{text}</span>,
    },
    { title: 'Fifozone', dataIndex: 'fifozone', key: 'fifozone', align: 'center', render: (v) => <StatusTag status={v} /> },
    { title: 'Amazon', dataIndex: 'amazon', key: 'amazon', align: 'center', render: (v) => <StatusTag status={v} /> },
    { title: 'Flipkart', dataIndex: 'flipkart', key: 'flipkart', align: 'center', render: (v) => <StatusTag status={v} /> },
    { title: 'Meesho', dataIndex: 'meesho', key: 'meesho', align: 'center', render: (v) => <StatusTag status={v} /> },
    {
      title: 'Action',
      key: 'action',
      align: 'center',
      render: () => (
        <Button type="primary" size="small" className="bg-blue-600 hover:bg-blue-700 border-none rounded-lg text-xs font-medium">
          Manage
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-slate-50">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Channel Listing</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage product listings across all marketplaces</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Listed Products" value={totalListed} icon={Package} borderColor="border-emerald-500" bgColor="bg-emerald-50" textColor="text-emerald-600" />
        <StatCard title="Active Listings" value={activeListings} icon={CheckCircle} borderColor="border-blue-500" bgColor="bg-blue-50" textColor="text-blue-600" />
        <StatCard title="Inactive Listings" value={inactiveListings} icon={XCircle} borderColor="border-rose-500" bgColor="bg-rose-50" textColor="text-rose-600" />
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">All Channel Listings</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Search product or SKU..."
              prefix={<Search size={14} className="text-slate-400" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 rounded-lg text-sm"
            />
            <Button icon={<RefreshCw size={14} />} className="rounded-lg border-slate-200 text-slate-600">
              Refresh
            </Button>
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (total) => `${total} products` }}
          rowClassName="hover:bg-slate-50 transition-colors"
          className="text-sm"
          bordered={false}
        />
      </div>
    </div>
  );
};

export default ChannelListingPage;
