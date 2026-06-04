import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Spin, message } from 'antd';
import { ShoppingBag, IndianRupee, Package, RefreshCw } from 'lucide-react';
import { getOrdersApi } from '../../api/orderApi';

const MeeshoAppPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getOrdersApi({ platform: 'meesho', limit: 20 });
      const data = res?.data?.orders || res?.orders || (Array.isArray(res?.data) ? res.data : []);
      setOrders(data);
    } catch { message.error('Failed to fetch Meesho orders'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const delivered = orders.filter(o => o.status === 'delivered').length;
  const statusColor = { pending: 'gold', processing: 'blue', shipped: 'cyan', delivered: 'green', cancelled: 'red' };

  const columns = [
    { title: 'Order ID', dataIndex: 'orderNumber', key: 'orderNumber', render: v => <span className="font-mono font-semibold text-slate-700">{v}</span> },
    { title: 'Customer', dataIndex: ['customer', 'name'], key: 'customer' },
    { title: 'Amount', dataIndex: 'totalAmount', key: 'amount', render: v => <span className="font-bold">&#8377;{(v || 0).toLocaleString('en-IN')}</span> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: v => <Tag color={statusColor[v] || 'default'}>{(v || '').toUpperCase()}</Tag> },
    { title: 'Date', dataIndex: 'createdAt', key: 'date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
  ];

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-2xl font-bold text-pink-600">M</div>
          <div><h1 className="text-2xl font-bold text-slate-800">Meesho Integration</h1><p className="text-slate-500 text-sm mt-1">Orders and performance from Meesho marketplace</p></div>
        </div>
        <Button icon={<RefreshCw size={16} />} onClick={fetchOrders}>Refresh</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Orders', value: orders.length, icon: <ShoppingBag size={20} className="text-pink-600" />, border: 'border-pink-500', bg: 'bg-pink-50' },
          { label: 'Total Revenue', value: `\u20b9${totalRevenue.toLocaleString('en-IN')}`, icon: <IndianRupee size={20} className="text-rose-600" />, border: 'border-rose-500', bg: 'bg-rose-50' },
          { label: 'Delivered', value: delivered, icon: <Package size={20} className="text-emerald-600" />, border: 'border-emerald-500', bg: 'bg-emerald-50' },
        ].map(c => (
          <div key={c.label} className={`bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 ${c.border} p-5 flex items-center gap-4`}>
            <div className={`w-11 h-11 rounded-full ${c.bg} flex items-center justify-center`}>{c.icon}</div>
            <div><p className="text-slate-500 text-sm">{c.label}</p><p className="text-2xl font-bold text-slate-800 mt-0.5">{c.value}</p></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 font-semibold text-slate-700">Recent Meesho Orders</div>
        <Table columns={columns} dataSource={orders} rowKey="_id" pagination={{ pageSize: 10 }} locale={{ emptyText: 'No Meesho orders found' }} />
      </div>
    </div>
  );
};
export default MeeshoAppPage;
