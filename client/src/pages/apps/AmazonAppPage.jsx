import React, { useState } from 'react';
import { Table, Tag, Button } from 'antd';
import { ShoppingBag, IndianRupee, Clock, TrendingDown, RefreshCw, Wifi } from 'lucide-react';

const mockOrders = [
  { key: '1', orderId: '402-8821001-5030721', asin: 'B09PXQ7C2B', productName: 'Royal Canin Adult Dog Food 3kg', qty: 2, amount: 3200, status: 'Delivered' },
  { key: '2', orderId: '402-8821002-5030722', asin: 'B08XY3M1NP', productName: 'Pedigree Puppy Chicken & Milk 1.2kg', qty: 1, amount: 680, status: 'Shipped' },
  { key: '3', orderId: '402-8821003-5030723', asin: 'B07QZ9KLP3', productName: 'Whiskas Tuna Cat Food 7 Pouches', qty: 3, amount: 945, status: 'Delivered' },
  { key: '4', orderId: '402-8821004-5030724', asin: 'B0BLNX1YPK', productName: 'Drools Focus Adult Dog Food 4kg', qty: 1, amount: 1250, status: 'Pending' },
  { key: '5', orderId: '402-8821005-5030725', asin: 'B09R8MQWL5', productName: 'Himalaya Erina Dog Shampoo 400ml', qty: 4, amount: 1560, status: 'Delivered' },
  { key: '6', orderId: '402-8821006-5030726', asin: 'B08MQP2LXZ', productName: 'Trixie Cat Scratching Post 50cm', qty: 1, amount: 899, status: 'Returned' },
  { key: '7', orderId: '402-8821007-5030727', asin: 'B07VJZ1PNQ', productName: 'Pets Empire Dog Collar Large', qty: 2, amount: 498, status: 'Shipped' },
  { key: '8', orderId: '402-8821008-5030728', asin: 'B09LKZR3PW', productName: 'Ocean Free Fish Food Pellets 100g', qty: 5, amount: 875, status: 'Delivered' },
];

const statusColors = { Delivered: 'success', Shipped: 'processing', Pending: 'warning', Returned: 'error' };

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

const AmazonAppPage = () => {
  const [syncing, setSyncing] = useState(false);

  const totalRevenue = mockOrders.reduce((s, o) => s + o.amount, 0);
  const pendingCount = mockOrders.filter(o => o.status === 'Pending').length;
  const returnCount = mockOrders.filter(o => o.status === 'Returned').length;
  const returnRate = ((returnCount / mockOrders.length) * 100).toFixed(1);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  };

  const columns = [
    { title: 'Order ID', dataIndex: 'orderId', key: 'orderId', render: (v) => <span className="font-mono text-xs text-slate-600">{v}</span> },
    { title: 'ASIN', dataIndex: 'asin', key: 'asin', render: (v) => <span className="font-mono text-xs font-semibold text-orange-600">{v}</span> },
    { title: 'Product Name', dataIndex: 'productName', key: 'productName', render: (v) => <span className="font-medium text-slate-800">{v}</span> },
    { title: 'Qty', dataIndex: 'qty', key: 'qty', align: 'center' },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (v) => <span className="font-bold text-slate-800">₹{v.toLocaleString('en-IN')}</span>,
    },
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
        <h1 className="text-3xl font-bold text-slate-800">Amazon Integration</h1>
        <p className="text-slate-500 mt-1">Amazon Seller Central connected</p>
      </div>

      {/* Status Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
          <span className="font-semibold text-emerald-600">Connected</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Wifi size={15} className="text-orange-400" />
          <span className="text-sm">Seller ID: <strong>AMZINXXXXXX</strong></span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Clock size={15} />
          <span>Last Synced: <strong>2 mins ago</strong></span>
        </div>
        <div className="ml-auto">
          <Button
            icon={<RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />}
            onClick={handleSync}
            className="flex items-center gap-2 border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Amazon Revenue (₹)"
          value={`₹${totalRevenue.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          borderColor="border-orange-500"
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />
        <StatCard
          title="Amazon Orders"
          value={mockOrders.length}
          icon={ShoppingBag}
          borderColor="border-orange-400"
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
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
          title="Return Rate (%)"
          value={`${returnRate}%`}
          icon={TrendingDown}
          borderColor="border-rose-500"
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Recent Amazon Orders</h2>
        <Table columns={columns} dataSource={mockOrders} pagination={{ pageSize: 10 }} scroll={{ x: 800 }} />
      </div>
    </div>
  );
};

export default AmazonAppPage;
