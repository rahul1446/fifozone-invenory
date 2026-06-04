import React from 'react';
import { Table, Tag } from 'antd';
import { RotateCcw, CircleDollarSign, AlertCircle } from 'lucide-react';

const mockData = [
  { key: '1', refundId: 'REF-10001', orderId: 'ORD-55210', customer: 'Rajesh Sharma', platform: 'amazon', reason: 'Damaged product', amount: 1200, status: 'Processed', requestedDate: '2024-05-01', processedDate: '2024-05-03' },
  { key: '2', refundId: 'REF-10002', orderId: 'ORD-55315', customer: 'Priya Patel', platform: 'flipkart', reason: 'Wrong item delivered', amount: 850, status: 'Processed', requestedDate: '2024-05-02', processedDate: '2024-05-04' },
  { key: '3', refundId: 'REF-10003', orderId: 'ORD-55420', customer: 'Amit Kumar', platform: 'meesho', reason: 'Item not received', amount: 550, status: 'Pending', requestedDate: '2024-05-05', processedDate: '-' },
  { key: '4', refundId: 'REF-10004', orderId: 'ORD-55525', customer: 'Sneha Iyer', platform: 'fifozone', reason: 'Quality issue', amount: 1800, status: 'Processed', requestedDate: '2024-05-06', processedDate: '2024-05-09' },
  { key: '5', refundId: 'REF-10005', orderId: 'ORD-55630', customer: 'Vikram Singh', platform: 'amazon', reason: 'Changed mind', amount: 2400, status: 'Processed', requestedDate: '2024-05-08', processedDate: '2024-05-11' },
  { key: '6', refundId: 'REF-10006', orderId: 'ORD-55735', customer: 'Meena Reddy', platform: 'flipkart', reason: 'Duplicate order', amount: 680, status: 'Pending', requestedDate: '2024-05-10', processedDate: '-' },
  { key: '7', refundId: 'REF-10007', orderId: 'ORD-55840', customer: 'Ravi Gupta', platform: 'amazon', reason: 'Product expired', amount: 990, status: 'Pending', requestedDate: '2024-05-12', processedDate: '-' },
  { key: '8', refundId: 'REF-10008', orderId: 'ORD-55945', customer: 'Ananya Bose', platform: 'meesho', reason: 'Size mismatch', amount: 1100, status: 'Processed', requestedDate: '2024-05-14', processedDate: '2024-05-16' },
  { key: '9', refundId: 'REF-10009', orderId: 'ORD-56050', customer: 'Nikhil Jain', platform: 'fifozone', reason: 'Not as described', amount: 760, status: 'Pending', requestedDate: '2024-05-17', processedDate: '-' },
  { key: '10', refundId: 'REF-10010', orderId: 'ORD-56155', customer: 'Pooja Menon', platform: 'amazon', reason: 'Defective product', amount: 3200, status: 'Processed', requestedDate: '2024-05-19', processedDate: '2024-05-21' },
];

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

const RefundManagementPage = () => {
  const totalRefunded = mockData.filter(r => r.status === 'Processed').reduce((s, r) => s + r.amount, 0);
  const pendingRefunds = mockData.filter(r => r.status === 'Pending').length;

  const columns = [
    { title: 'Refund ID', dataIndex: 'refundId', key: 'refundId', render: (v) => <span className="font-mono text-xs font-semibold text-rose-600">{v}</span> },
    { title: 'Order ID', dataIndex: 'orderId', key: 'orderId', render: (v) => <span className="font-mono text-xs text-slate-500">{v}</span> },
    { title: 'Customer', dataIndex: 'customer', key: 'customer', render: (v) => <span className="font-medium text-slate-800">{v}</span> },
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
    { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (v) => <span className="text-slate-500 text-sm">{v}</span> },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (v) => <span className="font-bold text-red-600">₹{v.toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={s === 'Processed' ? 'success' : 'warning'} className="font-semibold">{s}</Tag>,
    },
    { title: 'Requested Date', dataIndex: 'requestedDate', key: 'requestedDate', render: (v) => <span className="text-slate-500 text-sm">{v}</span> },
    { title: 'Processed Date', dataIndex: 'processedDate', key: 'processedDate', render: (v) => <span className="text-slate-500 text-sm">{v}</span> },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Refund Management</h1>
        <p className="text-slate-500 mt-1">Process and track customer refunds</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Refunds"
          value={mockData.length}
          icon={RotateCcw}
          borderColor="border-rose-500"
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />
        <StatCard
          title="Total Refunded Amount (₹)"
          value={`₹${totalRefunded.toLocaleString('en-IN')}`}
          icon={CircleDollarSign}
          borderColor="border-red-500"
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
        <StatCard
          title="Pending Refunds"
          value={pendingRefunds}
          icon={AlertCircle}
          borderColor="border-amber-500"
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <Table columns={columns} dataSource={mockData} pagination={{ pageSize: 10 }} scroll={{ x: 1100 }} />
      </div>
    </div>
  );
};

export default RefundManagementPage;
