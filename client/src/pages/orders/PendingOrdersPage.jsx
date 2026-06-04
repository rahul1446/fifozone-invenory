import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Input, DatePicker, message } from 'antd';
import { Clock, IndianRupee, Search, RefreshCw } from 'lucide-react';

const { RangePicker } = DatePicker;

const mockPendingOrders = [
  { key: '1', orderId: 'FZ-2024-0891', customer: 'Priya Sharma', platform: 'fifozone', items: 3, amount: 1249, date: '2024-06-04', products: 'Royal Canin Adult, Drools Puppy' },
  { key: '2', orderId: 'AMZ-2024-4512', customer: 'Rahul Mehta', platform: 'amazon', items: 1, amount: 899, date: '2024-06-04', products: 'Pedigree Adult Dog Food 3kg' },
  { key: '3', orderId: 'FLP-2024-7823', customer: 'Sneha Patel', platform: 'flipkart', items: 2, amount: 2150, date: '2024-06-03', products: 'Whiskas Tuna, Felix Cat Treats' },
  { key: '4', orderId: 'MSH-2024-3310', customer: 'Amit Verma', platform: 'meesho', items: 4, amount: 540, date: '2024-06-03', products: 'Drools Dog Biscuits, Cat Litter' },
  { key: '5', orderId: 'FZ-2024-0892', customer: 'Divya Nair', platform: 'fifozone', items: 1, amount: 3200, date: '2024-06-03', products: 'Royal Canin Kitten 2kg' },
  { key: '6', orderId: 'AMZ-2024-4513', customer: 'Karan Singh', platform: 'amazon', items: 2, amount: 1780, date: '2024-06-02', products: 'Farmina N&D Grain Free, Arden Grange' },
  { key: '7', orderId: 'FLP-2024-7824', customer: 'Meera Krishnan', platform: 'flipkart', items: 5, amount: 690, date: '2024-06-02', products: 'Purina Cat Chow, Pet Comb Set' },
  { key: '8', orderId: 'MSH-2024-3311', customer: 'Arjun Reddy', platform: 'meesho', items: 1, amount: 450, date: '2024-06-01', products: 'Drools Wet Food 12-Pack' },
];

const platformConfig = {
  fifozone: { color: 'green', label: 'Fifozone' },
  amazon: { color: 'orange', label: 'Amazon' },
  flipkart: { color: 'blue', label: 'Flipkart' },
  meesho: { color: 'pink', label: 'Meesho' },
};

const StatCard = ({ title, value, icon: Icon, borderColor, bgColor, iconColor }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-center gap-4`}
    style={{ borderLeft: `4px solid ${borderColor}` }}>
    <div className={`p-3 rounded-xl`} style={{ backgroundColor: bgColor }}>
      <Icon size={22} style={{ color: iconColor }} />
    </div>
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
    </div>
  </div>
);

const PendingOrdersPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setData(mockPendingOrders);
      setLoading(false);
    }, 600);
  }, []);

  const handleProcess = (orderId) => {
    message.success(`Order ${orderId} moved to processing!`);
    setData(prev => prev.filter(o => o.orderId !== orderId));
  };

  const filtered = data.filter(o =>
    o.orderId.toLowerCase().includes(search.toLowerCase()) ||
    o.customer.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = filtered.reduce((sum, o) => sum + o.amount, 0);

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
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      render: (val) => <span className="text-slate-600">{val} item{val > 1 ? 's' : ''}</span>,
    },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      render: (val) => <span className="font-bold text-slate-800">₹{val.toLocaleString('en-IN')}</span>,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Order Date',
      dataIndex: 'date',
      key: 'date',
      render: (val) => <span className="text-slate-500 text-sm">{new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          size="small"
          className="bg-amber-500 text-white border-0 hover:bg-amber-400 font-medium"
          onClick={() => handleProcess(record.orderId)}
        >
          Process
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pending Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Orders waiting to be processed</p>
        </div>
        <Button
          icon={<RefreshCw size={15} />}
          onClick={() => { setLoading(true); setTimeout(() => { setData(mockPendingOrders); setLoading(false); }, 600); }}
          className="flex items-center gap-1"
        >
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Total Pending Orders"
          value={filtered.length}
          icon={Clock}
          borderColor="#f59e0b"
          bgColor="#fef3c7"
          iconColor="#d97706"
        />
        <StatCard
          title="Total Pending Value"
          value={`₹${totalValue.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          borderColor="#f97316"
          bgColor="#ffedd5"
          iconColor="#ea580c"
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
          scroll={{ x: 900 }}
          rowClassName="hover:bg-amber-50/30 transition-colors cursor-default"
        />
      </div>
    </div>
  );
};

export default PendingOrdersPage;
