import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Input, Rate, Spin, message } from 'antd';
import { CheckCircle, IndianRupee, Search, RefreshCw } from 'lucide-react';
import { getOrdersApi } from '../../api/orderApi';

const platformColor = { amazon: 'orange', flipkart: 'blue', meesho: 'pink', fifozone: 'green' };

const DeliveredOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getOrdersApi({ status: 'delivered', limit: 100 });
      const data = res?.data?.orders || res?.orders || (Array.isArray(res?.data) ? res.data : []);
      setOrders(data);
    } catch { message.error('Failed to fetch delivered orders'); setOrders([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = orders.filter(o =>
    !search || o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );
  const totalRevenue = filtered.reduce((s, o) => s + (o.totalAmount || 0), 0);

  const columns = [
    { title: 'Order ID', dataIndex: 'orderNumber', key: 'orderNumber', render: v => <span className="font-mono font-semibold text-slate-700">{v}</span> },
    { title: 'Customer', dataIndex: ['customer', 'name'], key: 'customer' },
    { title: 'Platform', dataIndex: 'platform', key: 'platform', render: v => <Tag color={platformColor[v] || 'default'}>{(v || '').toUpperCase()}</Tag> },
    { title: 'Amount', dataIndex: 'totalAmount', key: 'amount', render: v => <span className="font-bold">&#8377;{(v || 0).toLocaleString('en-IN')}</span> },
    { title: 'Delivered Date', dataIndex: 'deliveredAt', key: 'deliveredAt', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { title: 'Status', key: 'status', render: () => <Tag color="green">Delivered</Tag> },
  ];

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Delivered Orders</h1><p className="text-slate-500 text-sm mt-1">Successfully completed deliveries</p></div>
        <Button icon={<RefreshCw size={16} />} onClick={fetchOrders}>Refresh</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-l-4 border-emerald-500 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center"><CheckCircle size={20} className="text-emerald-600" /></div>
          <div><p className="text-slate-500 text-sm">Total Delivered</p><p className="text-2xl font-bold text-slate-800">{filtered.length}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-l-4 border-green-500 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-green-50 flex items-center justify-center"><IndianRupee size={20} className="text-green-600" /></div>
          <div><p className="text-slate-500 text-sm">Total Revenue</p><p className="text-2xl font-bold text-slate-800">&#8377;{totalRevenue.toLocaleString('en-IN')}</p></div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100"><Input prefix={<Search size={16} className="text-slate-400" />} placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" /></div>
        <Table columns={columns} dataSource={filtered} rowKey="_id" pagination={{ pageSize: 20, showTotal: t => `${t} orders` }} scroll={{ x: 800 }} locale={{ emptyText: 'No delivered orders' }} />
      </div>
    </div>
  );
};
export default DeliveredOrdersPage;
