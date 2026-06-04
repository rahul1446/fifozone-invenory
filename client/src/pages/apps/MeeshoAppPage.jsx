import React, { useState } from 'react';
import { Table, Tag, Button } from 'antd';
import { ShoppingBag, IndianRupee, Clock, TrendingDown, RefreshCw, Wifi } from 'lucide-react';

const mockOrders = [
  { key: '1', orderId: 'MS-7890123', sku: 'PETMS-RC-001', productName: 'Royal Canin Mini Adult 2kg', qty: 1, amount: 1850, status: 'Delivered' },
  { key: '2', orderId: 'MS-7890124', sku: 'PETMS-WH-002', productName: 'Whiskas Chicken Cat Pouches x7', qty: 2, amount: 980, status: 'Shipped' },
  { key: '3', orderId: 'MS-7890125', sku: 'PETMS-DR-003', productName: 'Drools Puppy Chicken & Egg 3kg', qty: 1, amount: 1100, status: 'Delivered' },
  { key: '4', orderId: 'MS-7890126', sku: 'PETMS-PG-004', productName: 'Pet Grooming Glove Deshedding', qty: 3, amount: 1197, status: 'Pending' },
  { key: '5', orderId: 'MS-7890127', sku: 'PETMS-HL-005', productName: 'Himalaya Sparklet Dog Toothpaste', qty: 4, amount: 1196, status: 'Delivered' },
  { key: '6', orderId: 'MS-7890128', sku: 'PETMS-TK-006', productName: 'Trixie Activity Flip Board Cat', qty: 1, amount: 1250, status: 'Returned' },
  { key: '7', orderId: 'MS-7890129', sku: 'PETMS-PD-007', productName: 'Pedigree Dentastix Daily Oral Care', qty: 5, amount: 1495, status: 'Shipped' },
  { key: '8', orderId: 'MS-7890130', sku: 'PETMS-FF-008', productName: 'Ocean Free Arowana Premium Pellets', qty: 2, amount: 880, status: 'Delivered' },
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

const MeeshoAppPage = () => {
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
    { title: 'SKU', dataIndex: 'sku', key: 'sku', render: (v) => <span className="font-mono text-xs font-semibold text-pink-600">{v}</span> },
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
        <h1 className="text-3xl font-bold text-slate-800">Meesho Integration</h1>
        <p className="text-slate-500 mt-1">Meesho Supplier Panel connected</p>
      </div>

      {/* Status Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-pink-100 p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
          <span className="font-semibold text-emerald-600">Connected</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Wifi size={15} className="text-pink-400" />
          <span className="text-sm">Supplier ID: <strong>MSXXXXXX</strong></span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Clock size={15} />
          <span>Last Synced: <strong>2 mins ago</strong></span>
        </div>
        <div className="ml-auto">
          <Button
            icon={<RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />}
            onClick={handleSync}
            className="flex items-center gap-2 border-pink-300 text-pink-600 hover:bg-pink-50"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Meesho Revenue (₹)"
          value={`₹${totalRevenue.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          borderColor="border-pink-500"
          iconBg="bg-pink-50"
          iconColor="text-pink-600"
        />
        <StatCard
          title="Meesho Orders"
          value={mockOrders.length}
          icon={ShoppingBag}
          borderColor="border-rose-400"
          iconBg="bg-rose-50"
          iconColor="text-rose-500"
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
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Recent Meesho Orders</h2>
        <Table columns={columns} dataSource={mockOrders} pagination={{ pageSize: 10 }} scroll={{ x: 800 }} />
      </div>
    </div>
  );
};

export default MeeshoAppPage;
