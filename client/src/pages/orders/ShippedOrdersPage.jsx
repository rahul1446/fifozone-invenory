import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Input, Spin, message } from 'antd';
import { Truck, Package, Search, RefreshCw } from 'lucide-react';
import { getOrdersApi } from '../../api/orderApi';

const platformColor = { amazon: 'orange', flipkart: 'blue', meesho: 'pink', fifozone: 'green' };

const ShippedOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getOrdersApi({ status: 'shipped', limit: 100 });
      const data = res?.data?.orders || res?.orders || (Array.isArray(res?.data) ? res.data : []);
      setOrders(data);
    } catch {
      message.error('Failed to fetch shipped orders');
      setOrders([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = orders.filter(o =>
    !search || o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );
  const totalValue = filtered.reduce((s, o) => s + (o.totalAmount || 0), 0);

  const isLate = (order) => {
    if (!order.estimatedDelivery) return false;
    return new Date(order.estimatedDelivery) < new Date();
  };

  const columns = [
    { title: 'Order ID', dataIndex: 'orderNumber', key: 'orderNumber', render: v => <span className="font-mono font-semibold text-slate-700">{v}</span> },
    { title: 'Customer', dataIndex: ['customer', 'name'], key: 'customer' },
    { title: 'Platform', dataIndex: 'platform', key: 'platform', render: v => <Tag color={platformColor[v] || 'default'}>{(v || '').toUpperCase()}</Tag> },
    { title: 'Tracking No', dataIndex: 'trackingNumber', key: 'tracking', render: v => <span className="font-mono text-sm text-blue-600">{v || '—'}</span> },
    { title: 'Courier', dataIndex: 'courierPartner', key: 'courier', render: v => v || '—' },
    { title: 'Amount', dataIndex: 'totalAmount', key: 'amount', render: v => <span className="font-bold">&#8377;{(v || 0).toLocaleString('en-IN')}</span> },
    { title: 'Shipped Date', dataIndex: 'updatedAt', key: 'shipped', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    {
      title: 'Expected Delivery', dataIndex: 'estimatedDelivery', key: 'delivery',
      render: (v, r) => <span className={isLate(r) ? 'text-rose-600 font-semibold' : 'text-slate-600'}>{v ? new Date(v).toLocaleDateString('en-IN') : '—'}</span>
    },
  ];

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Shipped Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Orders currently in transit</p>
        </div>
        <Button icon={<RefreshCw size={16} />} onClick={fetchOrders}>Refresh</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 border-blue-500 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center"><Truck size={20} className="text-blue-600" /></div>
          <div><p className="text-slate-500 text-sm">Total Shipped</p><p className="text-2xl font-bold text-slate-800">{filtered.length}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 border-sky-500 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-sky-50 flex items-center justify-center"><Package size={20} className="text-sky-600" /></div>
          <div><p className="text-slate-500 text-sm">In Transit Value</p><p className="text-2xl font-bold text-slate-800">&#8377;{totalValue.toLocaleString('en-IN')}</p></div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100">
          <Input prefix={<Search size={16} className="text-slate-400" />} placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        </div>
        <Table columns={columns} dataSource={filtered} rowKey="_id" pagination={{ pageSize: 20, showTotal: t => `${t} orders` }} scroll={{ x: 900 }} locale={{ emptyText: 'No shipped orders' }} />
      </div>
    </div>
  );
};
export default ShippedOrdersPage;
