import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Input, DatePicker, message } from 'antd';
import { Truck, Package, Search, RefreshCw, ExternalLink } from 'lucide-react';

const { RangePicker } = DatePicker;

const mockShippedOrders = [
  { key: '1', orderId: 'FZ-2024-0780', customer: 'Ananya Iyer', platform: 'fifozone', tracking: 'BD9284710234', courier: 'BlueDart', amount: 1599, shippedDate: '2024-06-02', expectedDelivery: '2024-06-05' },
  { key: '2', orderId: 'AMZ-2024-4400', customer: 'Vikram Joshi', platform: 'amazon', tracking: 'DTDC8823491', courier: 'DTDC', amount: 2350, shippedDate: '2024-06-01', expectedDelivery: '2024-06-04' },
  { key: '3', orderId: 'FLP-2024-7700', customer: 'Kavya Menon', platform: 'flipkart', tracking: 'EKRT5567123', courier: 'Ekart', amount: 780, shippedDate: '2024-06-01', expectedDelivery: '2024-06-04' },
  { key: '4', orderId: 'MSH-2024-3200', customer: 'Nikhil Bose', platform: 'meesho', tracking: 'VALMO9918742', courier: 'Valmo', amount: 420, shippedDate: '2024-05-31', expectedDelivery: '2024-06-04' },
  { key: '5', orderId: 'FZ-2024-0781', customer: 'Pooja Choudhary', platform: 'fifozone', tracking: 'BD9284710300', courier: 'BlueDart', amount: 3100, shippedDate: '2024-05-31', expectedDelivery: '2024-06-03' },
  { key: '6', orderId: 'AMZ-2024-4401', customer: 'Suresh Kumar', platform: 'amazon', tracking: 'DTDC8823500', courier: 'DTDC', amount: 950, shippedDate: '2024-05-30', expectedDelivery: '2024-06-02' },
  { key: '7', orderId: 'FLP-2024-7701', customer: 'Ritu Agarwal', platform: 'flipkart', tracking: 'EKRT5567200', courier: 'Ekart', amount: 1200, shippedDate: '2024-05-30', expectedDelivery: '2024-06-02' },
  { key: '8', orderId: 'MSH-2024-3201', customer: 'Deepak Rao', platform: 'meesho', tracking: 'VALMO9918800', courier: 'Valmo', amount: 660, shippedDate: '2024-05-29', expectedDelivery: '2024-06-01' },
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

const ShippedOrdersPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setData(mockShippedOrders);
      setLoading(false);
    }, 600);
  }, []);

  const filtered = data.filter(o =>
    o.orderId.toLowerCase().includes(search.toLowerCase()) ||
    o.customer.toLowerCase().includes(search.toLowerCase()) ||
    o.tracking.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = filtered.reduce((sum, o) => sum + o.amount, 0);

  const formatDate = (val) => new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (text) => <span className="font-semibold text-slate-700">{text}</span>,
    },
    {
      title: 'Customer Name',
      dataIndex: 'customer',
      key: 'customer',
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
      title: 'Tracking Number',
      dataIndex: 'tracking',
      key: 'tracking',
      render: (text) => (
        <span className="font-mono text-blue-600 text-sm flex items-center gap-1">
          {text} <ExternalLink size={12} className="opacity-60" />
        </span>
      ),
    },
    {
      title: 'Courier',
      dataIndex: 'courier',
      key: 'courier',
      render: (text) => <Tag color="purple">{text}</Tag>,
    },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      render: (val) => <span className="font-bold text-slate-800">₹{val.toLocaleString('en-IN')}</span>,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Shipped Date',
      dataIndex: 'shippedDate',
      key: 'shippedDate',
      render: (val) => <span className="text-slate-500 text-sm">{formatDate(val)}</span>,
    },
    {
      title: 'Expected Delivery',
      dataIndex: 'expectedDelivery',
      key: 'expectedDelivery',
      render: (val) => {
        const isLate = new Date(val) < new Date();
        return (
          <span className={`text-sm font-medium ${isLate ? 'text-red-500' : 'text-emerald-600'}`}>
            {formatDate(val)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Shipped Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Orders currently in transit</p>
        </div>
        <Button
          icon={<RefreshCw size={15} />}
          onClick={() => { setLoading(true); setTimeout(() => { setData(mockShippedOrders); setLoading(false); }, 600); }}
          className="flex items-center gap-1"
        >
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Total Shipped"
          value={filtered.length}
          icon={Truck}
          borderColor="#3b82f6"
          bgColor="#dbeafe"
          iconColor="#2563eb"
        />
        <StatCard
          title="In Transit Value"
          value={`₹${totalValue.toLocaleString('en-IN')}`}
          icon={Package}
          borderColor="#0ea5e9"
          bgColor="#e0f2fe"
          iconColor="#0284c7"
        />
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search Order ID, Customer, Tracking..."
            prefix={<Search size={15} className="text-slate-400" />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-80"
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
          scroll={{ x: 1100 }}
          rowClassName="hover:bg-blue-50/30 transition-colors"
        />
      </div>
    </div>
  );
};

export default ShippedOrdersPage;
