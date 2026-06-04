import React, { useState } from 'react';
import { Table, Tag, Button } from 'antd';
import { ShoppingBag, IndianRupee, Clock, TrendingDown, RefreshCw, Wifi } from 'lucide-react';

const mockOrders = [
  { key: '1', orderId: 'FK-110023451', fsin: 'PETFD8892ZX', productName: 'Royal Canin Maxi Adult 4kg', qty: 1, amount: 2150, status: 'Delivered' },
  { key: '2', orderId: 'FK-110023452', fsin: 'PETCT3310AB', productName: 'Whiskas Ocean Fish 7 Pouches', qty: 2, amount: 1260, status: 'Shipped' },
  { key: '3', orderId: 'FK-110023453', fsin: 'PETDG5521CD', productName: 'Drools Absolute Calcium 40 Sticks', qty: 3, amount: 897, status: 'Delivered' },
  { key: '4', orderId: 'FK-110023454', fsin: 'PETBD1192EF', productName: 'Farmina N&D Cat Quinoa 1.5kg', qty: 1, amount: 3400, status: 'Pending' },
  { key: '5', orderId: 'FK-110023455', fsin: 'PETSH7754GH', productName: 'Himalaya Erina Dog Shampoo 200ml', qty: 5, amount: 1495, status: 'Delivered' },
  { key: '6', orderId: 'FK-110023456', fsin: 'PETLH0034IJ', productName: 'Pet Spa Grooming Scissors Set', qty: 1, amount: 750, status: 'Returned' },
  { key: '7', orderId: 'FK-110023457', fsin: 'PETCL8823KL', productName: 'Trixie Cat Tunnel Play Tube', qty: 2, amount: 1380, status: 'Shipped' },
  { key: '8', orderId: 'FK-110023458', fsin: 'PETFF3345MN', productName: 'Tetrafin Goldfish Flakes 100g', qty: 4, amount: 840, status: 'Delivered' },
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

const FlipkartAppPage = () => {
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
    { title: 'FSIN', dataIndex: 'fsin', key: 'fsin', render: (v) => <span className="font-mono text-xs font-semibold text-blue-600">{v}</span> },
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
        <h1 className="text-3xl font-bold text-slate-800">Flipkart Integration</h1>
        <p className="text-slate-500 mt-1">Flipkart Seller Hub connected</p>
      </div>

      {/* Status Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
          <span className="font-semibold text-emerald-600">Connected</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Wifi size={15} className="text-blue-400" />
          <span className="text-sm">Seller ID: <strong>FKXXXXX</strong></span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Clock size={15} />
          <span>Last Synced: <strong>2 mins ago</strong></span>
        </div>
        <div className="ml-auto">
          <Button
            icon={<RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />}
            onClick={handleSync}
            className="flex items-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Flipkart Revenue (₹)"
          value={`₹${totalRevenue.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          borderColor="border-blue-500"
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Flipkart Orders"
          value={mockOrders.length}
          icon={ShoppingBag}
          borderColor="border-indigo-400"
          iconBg="bg-indigo-50"
          iconColor="text-indigo-500"
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
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Recent Flipkart Orders</h2>
        <Table columns={columns} dataSource={mockOrders} pagination={{ pageSize: 10 }} scroll={{ x: 800 }} />
      </div>
    </div>
  );
};

export default FlipkartAppPage;
