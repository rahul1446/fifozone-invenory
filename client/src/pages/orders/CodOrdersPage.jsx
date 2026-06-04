import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Input, DatePicker, message } from 'antd';
import { Banknote, IndianRupee, Search, RefreshCw, CheckCircle2 } from 'lucide-react';

const { RangePicker } = DatePicker;

const mockCodOrders = [
  { key: '1', orderId: 'FZ-COD-0341', customer: 'Preeti Verma', platform: 'fifozone', amount: 1350, codStatus: 'Pending', orderDate: '2024-06-03', deliveryDate: '2024-06-06' },
  { key: '2', orderId: 'AMZ-COD-2210', customer: 'Sanjay Kapoor', platform: 'amazon', amount: 2100, codStatus: 'Collected', orderDate: '2024-06-01', deliveryDate: '2024-06-03' },
  { key: '3', orderId: 'FLP-COD-5540', customer: 'Geeta Mishra', platform: 'flipkart', amount: 720, codStatus: 'Pending', orderDate: '2024-06-02', deliveryDate: '2024-06-05' },
  { key: '4', orderId: 'MSH-COD-1190', customer: 'Hemant Singh', platform: 'meesho', amount: 350, codStatus: 'Collected', orderDate: '2024-05-31', deliveryDate: '2024-06-02' },
  { key: '5', orderId: 'FZ-COD-0342', customer: 'Usha Pillai', platform: 'fifozone', amount: 2890, codStatus: 'Pending', orderDate: '2024-06-02', deliveryDate: '2024-06-06' },
  { key: '6', orderId: 'AMZ-COD-2211', customer: 'Pramod Nair', platform: 'amazon', amount: 940, codStatus: 'Collected', orderDate: '2024-05-30', deliveryDate: '2024-06-01' },
  { key: '7', orderId: 'FLP-COD-5541', customer: 'Asha Rao', platform: 'flipkart', amount: 460, codStatus: 'Pending', orderDate: '2024-05-30', deliveryDate: '2024-06-04' },
  { key: '8', orderId: 'MSH-COD-1191', customer: 'Vijay Pandey', platform: 'meesho', amount: 280, codStatus: 'Collected', orderDate: '2024-05-29', deliveryDate: '2024-05-31' },
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

const CodOrdersPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setData(mockCodOrders);
      setLoading(false);
    }, 600);
  }, []);

  const filtered = data.filter(o =>
    o.orderId.toLowerCase().includes(search.toLowerCase()) ||
    o.customer.toLowerCase().includes(search.toLowerCase())
  );

  const pendingAmount = filtered.filter(o => o.codStatus === 'Pending').reduce((s, o) => s + o.amount, 0);
  const collectedAmount = filtered.filter(o => o.codStatus === 'Collected').reduce((s, o) => s + o.amount, 0);
  const formatDate = (val) => new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleMarkCollected = (orderId) => {
    setData(prev => prev.map(o => o.orderId === orderId ? { ...o, codStatus: 'Collected' } : o));
    message.success(`COD collected for order ${orderId}`);
  };

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (text) => <span className="font-semibold text-slate-700">{text}</span>,
    },
    {
      title: 'Customer',
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
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      render: (val) => <span className="font-bold text-slate-800">₹{val.toLocaleString('en-IN')}</span>,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'COD Status',
      dataIndex: 'codStatus',
      key: 'codStatus',
      render: (val, record) => (
        <div className="flex items-center gap-2">
          <Tag color={val === 'Collected' ? 'green' : 'orange'}>{val}</Tag>
          {val === 'Pending' && (
            <Button
              size="small"
              icon={<CheckCircle2 size={13} />}
              className="bg-emerald-500 text-white border-0 hover:bg-emerald-400 text-xs flex items-center gap-1"
              onClick={() => handleMarkCollected(record.orderId)}
            >
              Mark
            </Button>
          )}
        </div>
      ),
      filters: [
        { text: 'Pending', value: 'Pending' },
        { text: 'Collected', value: 'Collected' },
      ],
      onFilter: (value, record) => record.codStatus === value,
    },
    {
      title: 'Order Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (val) => <span className="text-slate-500 text-sm">{formatDate(val)}</span>,
    },
    {
      title: 'Delivery Date',
      dataIndex: 'deliveryDate',
      key: 'deliveryDate',
      render: (val) => <span className="text-slate-500 text-sm">{formatDate(val)}</span>,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">COD Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Cash on Delivery orders management</p>
        </div>
        <Button
          icon={<RefreshCw size={15} />}
          onClick={() => { setLoading(true); setTimeout(() => { setData(mockCodOrders); setLoading(false); }, 600); }}
          className="flex items-center gap-1"
        >
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total COD Orders"
          value={filtered.length}
          icon={Banknote}
          borderColor="#8b5cf6"
          bgColor="#ede9fe"
          iconColor="#7c3aed"
        />
        <StatCard
          title="COD Amount Pending"
          value={`₹${pendingAmount.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          borderColor="#a855f7"
          bgColor="#f3e8ff"
          iconColor="#9333ea"
        />
        <StatCard
          title="COD Amount Collected"
          value={`₹${collectedAmount.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          borderColor="#10b981"
          bgColor="#d1fae5"
          iconColor="#059669"
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
          rowClassName="hover:bg-violet-50/30 transition-colors"
        />
      </div>
    </div>
  );
};

export default CodOrdersPage;
