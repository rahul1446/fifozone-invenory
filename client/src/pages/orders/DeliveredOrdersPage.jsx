import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Input, DatePicker, Rate } from 'antd';
import { CheckCircle, IndianRupee, Search, RefreshCw } from 'lucide-react';

const { RangePicker } = DatePicker;

const mockDeliveredOrders = [
  { key: '1', orderId: 'FZ-2024-0670', customer: 'Lakshmi Pillai', platform: 'fifozone', amount: 2199, deliveredDate: '2024-06-01', rating: 5, status: 'Delivered' },
  { key: '2', orderId: 'AMZ-2024-4280', customer: 'Gaurav Saxena', platform: 'amazon', amount: 1450, deliveredDate: '2024-06-01', rating: 4, status: 'Delivered' },
  { key: '3', orderId: 'FLP-2024-7590', customer: 'Nandini Shetty', platform: 'flipkart', amount: 890, deliveredDate: '2024-05-31', rating: 4, status: 'Delivered' },
  { key: '4', orderId: 'MSH-2024-3100', customer: 'Arun Gupta', platform: 'meesho', amount: 320, deliveredDate: '2024-05-31', rating: 3, status: 'Delivered' },
  { key: '5', orderId: 'FZ-2024-0671', customer: 'Swati Bhatt', platform: 'fifozone', amount: 4200, deliveredDate: '2024-05-30', rating: 5, status: 'Delivered' },
  { key: '6', orderId: 'AMZ-2024-4281', customer: 'Manish Tiwari', platform: 'amazon', amount: 1780, deliveredDate: '2024-05-30', rating: 4, status: 'Delivered' },
  { key: '7', orderId: 'FLP-2024-7591', customer: 'Sunita Desai', platform: 'flipkart', amount: 560, deliveredDate: '2024-05-29', rating: 5, status: 'Delivered' },
  { key: '8', orderId: 'MSH-2024-3101', customer: 'Rajesh Sharma', platform: 'meesho', amount: 275, deliveredDate: '2024-05-29', rating: 2, status: 'Delivered' },
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

const DeliveredOrdersPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setData(mockDeliveredOrders);
      setLoading(false);
    }, 600);
  }, []);

  const filtered = data.filter(o =>
    o.orderId.toLowerCase().includes(search.toLowerCase()) ||
    o.customer.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = filtered.reduce((sum, o) => sum + o.amount, 0);
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
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      render: (val) => <span className="font-bold text-slate-800">₹{val.toLocaleString('en-IN')}</span>,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Delivered Date',
      dataIndex: 'deliveredDate',
      key: 'deliveredDate',
      render: (val) => <span className="text-slate-500 text-sm">{formatDate(val)}</span>,
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (val) => (
        <div className="flex items-center gap-1">
          <Rate disabled defaultValue={val} style={{ fontSize: 14 }} />
          <span className="text-xs text-slate-500 ml-1">({val}/5)</span>
        </div>
      ),
      sorter: (a, b) => a.rating - b.rating,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (val) => <Tag color="green" className="font-medium">{val}</Tag>,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Delivered Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Successfully completed deliveries</p>
        </div>
        <Button
          icon={<RefreshCw size={15} />}
          onClick={() => { setLoading(true); setTimeout(() => { setData(mockDeliveredOrders); setLoading(false); }, 600); }}
          className="flex items-center gap-1"
        >
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Total Delivered"
          value={filtered.length}
          icon={CheckCircle}
          borderColor="#10b981"
          bgColor="#d1fae5"
          iconColor="#059669"
        />
        <StatCard
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          borderColor="#22c55e"
          bgColor="#dcfce7"
          iconColor="#16a34a"
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
          scroll={{ x: 950 }}
          rowClassName="hover:bg-emerald-50/30 transition-colors"
        />
      </div>
    </div>
  );
};

export default DeliveredOrdersPage;
