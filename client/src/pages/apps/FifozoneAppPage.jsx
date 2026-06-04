import React, { useState } from 'react';
import { Table, Tag, Button } from 'antd';
import { ShoppingBag, IndianRupee, Clock, TrendingDown, RefreshCw, Wifi } from 'lucide-react';

const mockOrders = [
  { key: '1', orderId: 'FZ-2024-0091', productName: 'Royal Canin Adult Labrador 3kg', qty: 1, amount: 2800, customer: 'Rajesh Sharma', status: 'Completed' },
  { key: '2', orderId: 'FZ-2024-0092', productName: 'Whiskas Adult Tuna Pouches x8', qty: 2, amount: 1360, customer: 'Priya Patel', status: 'Processing' },
  { key: '3', orderId: 'FZ-2024-0093', productName: 'Drools Focus Adult Fish & Rice 1.2kg', qty: 3, amount: 1890, customer: 'Amit Kumar', status: 'Completed' },
  { key: '4', orderId: 'FZ-2024-0094', productName: 'Himalaya Tick Guard Spray 200ml', qty: 2, amount: 698, customer: 'Sneha Iyer', status: 'Pending' },
  { key: '5', orderId: 'FZ-2024-0095', productName: 'Pedigree Adult Small & Toy 3kg', qty: 1, amount: 1350, customer: 'Vikram Singh', status: 'Completed' },
  { key: '6', orderId: 'FZ-2024-0096', productName: 'Trixie Plush Cat Bed 50cm', qty: 1, amount: 1100, customer: 'Meena Reddy', status: 'Refunded' },
  { key: '7', orderId: 'FZ-2024-0097', productName: 'Pets Empire Retractable Leash 5m', qty: 2, amount: 990, customer: 'Ravi Gupta', status: 'Processing' },
  { key: '8', orderId: 'FZ-2024-0098', productName: 'Ocean Free XO Turtle Food 100g', qty: 5, amount: 1250, customer: 'Ananya Bose', status: 'Completed' },
];

const statusColors = { Completed: 'success', Processing: 'processing', Pending: 'warning', Refunded: 'error' };

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

const FifozoneAppPage = () => {
  const [syncing, setSyncing] = useState(false);

  const totalRevenue = mockOrders.reduce((s, o) => s + o.amount, 0);
  const pendingCount = mockOrders.filter(o => o.status === 'Pending').length;
  const refundCount = mockOrders.filter(o => o.status === 'Refunded').length;
  const refundRate = ((refundCount / mockOrders.length) * 100).toFixed(1);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  };

  const columns = [
    { title: 'Order ID', dataIndex: 'orderId', key: 'orderId', render: (v) => <span className="font-mono text-xs font-semibold text-emerald-600">{v}</span> },
    { title: 'Product Name', dataIndex: 'productName', key: 'productName', render: (v) => <span className="font-medium text-slate-800">{v}</span> },
    { title: 'Qty', dataIndex: 'qty', key: 'qty', align: 'center' },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (v) => <span className="font-bold text-slate-800">₹{v.toLocaleString('en-IN')}</span>,
    },
    { title: 'Customer', dataIndex: 'customer', key: 'customer', render: (v) => <span className="text-slate-600">{v}</span> },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={statusColors[s]} className="font-semibold">{s}</Tag>,
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-slate-800">FifoZone Store</h1>
        <p className="text-slate-500 mt-1">Your connected WooCommerce store</p>
      </div>

      {/* Status Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
          <span className="font-semibold text-emerald-600">Connected</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Wifi size={15} className="text-emerald-400" />
          <span className="text-sm">Store URL: <strong>fifozone.com</strong></span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Clock size={15} />
          <span>Last Synced: <strong>2 mins ago</strong></span>
        </div>
        <div className="ml-auto">
          <Button
            icon={<RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />}
            onClick={handleSync}
            className="flex items-center gap-2 border-emerald-300 text-emerald-600 hover:bg-emerald-50"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Store Revenue (₹)"
          value={`₹${totalRevenue.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          borderColor="border-emerald-500"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Store Orders"
          value={mockOrders.length}
          icon={ShoppingBag}
          borderColor="border-green-400"
          iconBg="bg-green-50"
          iconColor="text-green-500"
        />
        <StatCard
          title="Pending Orders"
          value={pendingCount}
          icon={Clock}
          borderColor="border-amber-500"
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Refund Rate (%)"
          value={`${refundRate}%`}
          icon={TrendingDown}
          borderColor="border-rose-500"
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Recent Store Orders</h2>
        <Table columns={columns} dataSource={mockOrders} pagination={{ pageSize: 10 }} scroll={{ x: 800 }} />
      </div>
    </div>
  );
};

export default FifozoneAppPage;
