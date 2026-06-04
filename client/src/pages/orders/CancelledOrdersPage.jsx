import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Input, DatePicker } from 'antd';
import { XCircle, TrendingDown, Search, RefreshCw } from 'lucide-react';

const { RangePicker } = DatePicker;

const mockCancelledOrders = [
  { key: '1', orderId: 'FZ-2024-0550', customer: 'Vandana Kulkarni', platform: 'fifozone', amount: 1899, reason: 'Out of stock', cancelledDate: '2024-06-03', cancelledBy: 'Seller' },
  { key: '2', orderId: 'AMZ-2024-4100', customer: 'Naresh Jain', platform: 'amazon', amount: 760, reason: 'Customer request', cancelledDate: '2024-06-02', cancelledBy: 'Customer' },
  { key: '3', orderId: 'FLP-2024-7400', customer: 'Rohini Patil', platform: 'flipkart', amount: 430, reason: 'Duplicate order', cancelledDate: '2024-06-02', cancelledBy: 'Customer' },
  { key: '4', orderId: 'MSH-2024-2900', customer: 'Chetan More', platform: 'meesho', amount: 220, reason: 'Wrong item ordered', cancelledDate: '2024-06-01', cancelledBy: 'Customer' },
  { key: '5', orderId: 'FZ-2024-0551', customer: 'Bharti Chauhan', platform: 'fifozone', amount: 3400, reason: 'Payment failed', cancelledDate: '2024-05-31', cancelledBy: 'Seller' },
  { key: '6', orderId: 'AMZ-2024-4101', customer: 'Dhruv Shah', platform: 'amazon', amount: 1120, reason: 'Product discontinued', cancelledDate: '2024-05-31', cancelledBy: 'Seller' },
  { key: '7', orderId: 'FLP-2024-7401', customer: 'Sheetal Joshi', platform: 'flipkart', amount: 590, reason: 'Address not serviceable', cancelledDate: '2024-05-30', cancelledBy: 'Seller' },
  { key: '8', orderId: 'MSH-2024-2901', customer: 'Vinod Tiwari', platform: 'meesho', amount: 310, reason: 'Changed mind', cancelledDate: '2024-05-29', cancelledBy: 'Customer' },
];

const platformConfig = {
  fifozone: { color: 'green', label: 'Fifozone' },
  amazon: { color: 'orange', label: 'Amazon' },
  flipkart: { color: 'blue', label: 'Flipkart' },
  meesho: { color: 'pink', label: 'Meesho' },
};

const StatCard = ({ title, value, icon: Icon, borderColor, bgColor, iconColor }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-center gap-4"
    style={{ borderLeft: `4px solid ${borderColor}` }}>
    <div className="p-3 rounded-xl" style={{ backgroundColor: bgColor }}>
      <Icon size={22} style={{ color: iconColor }} />
    </div>
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
    </div>
  </div>
);

const CancelledOrdersPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setData(mockCancelledOrders);
      setLoading(false);
    }, 600);
  }, []);

  const filtered = data.filter(o =>
    o.orderId.toLowerCase().includes(search.toLowerCase()) ||
    o.customer.toLowerCase().includes(search.toLowerCase())
  );

  const revenueLost = filtered.reduce((sum, o) => sum + o.amount, 0);
  const formatDate = (val) => new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (text) => <span className="font-semibold text-slate-500 line-through decoration-red-300">{text}</span>,
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
      render: (text) => <span className="text-slate-700">{text}</span>,
    },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      render: (val) => {
        const cfg = platformConfig[val] || { color: 'default', label: val };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      render: (val) => <span className="font-bold text-red-500">₹{val.toLocaleString('en-IN')}</span>,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Cancellation Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (text) => (
        <span className="text-sm text-slate-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">{text}</span>
      ),
    },
    {
      title: 'Cancelled Date',
      dataIndex: 'cancelledDate',
      key: 'cancelledDate',
      render: (val) => <span className="text-slate-500 text-sm">{formatDate(val)}</span>,
    },
    {
      title: 'Cancelled By',
      dataIndex: 'cancelledBy',
      key: 'cancelledBy',
      render: (val) => (
        <Tag color={val === 'Customer' ? 'volcano' : 'red'}>{val}</Tag>
      ),
      filters: [
        { text: 'Customer', value: 'Customer' },
        { text: 'Seller', value: 'Seller' },
      ],
      onFilter: (value, record) => record.cancelledBy === value,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cancelled Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Cancelled orders and lost revenue analysis</p>
        </div>
        <Button
          icon={<RefreshCw size={15} />}
          onClick={() => { setLoading(true); setTimeout(() => { setData(mockCancelledOrders); setLoading(false); }, 600); }}
          className="flex items-center gap-1"
        >
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Total Cancelled"
          value={filtered.length}
          icon={XCircle}
          borderColor="#f43f5e"
          bgColor="#ffe4e6"
          iconColor="#e11d48"
        />
        <StatCard
          title="Revenue Lost"
          value={`₹${revenueLost.toLocaleString('en-IN')}`}
          icon={TrendingDown}
          borderColor="#ef4444"
          bgColor="#fee2e2"
          iconColor="#dc2626"
        />
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search Order ID or Customer..."
            prefix={<Search size={15} className="text-slate-400" />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-72"
          />
          <RangePicker />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="key"
          loading={loading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          scroll={{ x: 1000 }}
          rowClassName="hover:bg-red-50/20 transition-colors"
        />
      </div>
    </div>
  );
};

export default CancelledOrdersPage;
