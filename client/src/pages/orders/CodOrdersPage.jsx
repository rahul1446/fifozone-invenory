import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Input, Spin, message } from 'antd';
import { Banknote, IndianRupee, CheckCircle, Search, RefreshCw } from 'lucide-react';
import { getOrdersApi } from '../../api/orderApi';

const platformColor = { amazon: 'orange', flipkart: 'blue', meesho: 'pink', fifozone: 'green' };

const CodOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getOrdersApi({ paymentMethod: 'cod', limit: 100 });
      let data = res?.data?.orders || res?.orders || (Array.isArray(res?.data) ? res.data : []);
      if (data.length === 0) {
        // Fallback: get all orders and filter client-side
        const res2 = await getOrdersApi({ limit: 200 });
        const all = res2?.data?.orders || res2?.orders || (Array.isArray(res2?.data) ? res2.data : []);
        data = all.filter(o => o.paymentMethod === 'cod' || o.paymentStatus === 'pending');
      }
      setOrders(data);
    } catch { message.error('Failed to fetch COD orders'); setOrders([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = orders.filter(o =>
    !search || o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );
  const pending = filtered.filter(o => o.paymentStatus === 'pending');
  const collected = filtered.filter(o => o.paymentStatus === 'paid');
  const pendingValue = pending.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const collectedValue = collected.reduce((s, o) => s + (o.totalAmount || 0), 0);

  const columns = [
    { 
      title: 'Order ID', 
      key: 'orderNumber', 
      render: (_, record) => {
        const orderDisplayNumber = record.rawPlatformData?.number || (record.platformOrderId && `#${record.platformOrderId}`) || record.orderNumber;
        return <span className="font-mono font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">{orderDisplayNumber}</span>;
      }
    },
    { title: 'Customer', dataIndex: ['customer', 'name'], key: 'customer' },
    { title: 'Platform', dataIndex: 'platform', key: 'platform', render: v => <Tag color={platformColor[v] || 'default'}>{(v || '').toUpperCase()}</Tag> },
    { title: 'Amount', dataIndex: 'totalAmount', key: 'amount', render: v => <span className="font-bold">&#8377;{(v || 0).toLocaleString('en-IN')}</span> },
    { title: 'COD Status', dataIndex: 'paymentStatus', key: 'codStatus', render: v => <Tag color={v === 'paid' ? 'green' : 'gold'}>{v === 'paid' ? 'Collected' : 'Pending'}</Tag> },
    { title: 'Order Date', key: 'date', render: (_, record) => {
        const dateStr = new Date(record.orderDate || record.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
        return <span>{dateStr}</span>;
      }
    },
  ];

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">COD Orders</h1><p className="text-slate-500 text-sm mt-1">Cash on Delivery orders</p></div>
        <Button icon={<RefreshCw size={16} />} onClick={fetchOrders}>Refresh</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total COD Orders', value: filtered.length, icon: <Banknote size={20} className="text-violet-600" />, border: 'border-violet-500', bg: 'bg-violet-50' },
          { label: 'Amount Pending', value: `\u20b9${pendingValue.toLocaleString('en-IN')}`, icon: <IndianRupee size={20} className="text-amber-600" />, border: 'border-amber-500', bg: 'bg-amber-50' },
          { label: 'Amount Collected', value: `\u20b9${collectedValue.toLocaleString('en-IN')}`, icon: <CheckCircle size={20} className="text-emerald-600" />, border: 'border-emerald-500', bg: 'bg-emerald-50' },
        ].map(c => (
          <div key={c.label} className={`bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 ${c.border} p-5 flex items-center gap-4`}>
            <div className={`w-11 h-11 rounded-full ${c.bg} flex items-center justify-center`}>{c.icon}</div>
            <div><p className="text-slate-500 text-sm">{c.label}</p><p className="text-2xl font-bold text-slate-800">{c.value}</p></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100"><Input prefix={<Search size={16} className="text-slate-400" />} placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" /></div>
        <Table columns={columns} dataSource={filtered} rowKey="_id" pagination={{ pageSize: 20, showTotal: t => `${t} orders` }} scroll={{ x: 800 }} locale={{ emptyText: 'No COD orders found' }} />
      </div>
    </div>
  );
};
export default CodOrdersPage;
