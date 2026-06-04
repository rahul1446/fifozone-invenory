import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Input, DatePicker, Spin, message } from 'antd';
import { Clock, IndianRupee, Search, RefreshCw } from 'lucide-react';
import { getOrdersApi } from '../../api/orderApi';

const { RangePicker } = DatePicker;

const platformColor = { amazon: 'orange', flipkart: 'blue', meesho: 'pink', fifozone: 'green' };

const PendingOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getOrdersApi({ status: 'pending', limit: 100 });
      const data = res?.data?.orders || res?.orders || (Array.isArray(res?.data) ? res.data : []);
      setOrders(data);
    } catch (err) {
      message.error('Failed to fetch pending orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = orders.filter(o =>
    !search || o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = filtered.reduce((s, o) => s + (o.totalAmount || 0), 0);

  const columns = [
    { title: 'Order ID', dataIndex: 'orderNumber', key: 'orderNumber', render: v => <span className="font-mono font-semibold text-slate-700">{v}</span> },
    { title: 'Customer', dataIndex: ['customer', 'name'], key: 'customer' },
    { title: 'Platform', dataIndex: 'platform', key: 'platform', render: v => <Tag color={platformColor[v] || 'default'}>{(v || '').toUpperCase()}</Tag> },
    { title: 'Items', dataIndex: 'items', key: 'items', render: v => `${(v || []).length} item(s)` },
    { title: 'Amount', dataIndex: 'totalAmount', key: 'totalAmount', render: v => <span className="font-bold">&#8377;{(v || 0).toLocaleString('en-IN')}</span> },
    { title: 'Date', dataIndex: 'createdAt', key: 'date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    {
      title: 'Action', key: 'action',
      render: (_, r) => (
        <Button size="small" type="primary" className="!bg-amber-500 !border-amber-500"
          onClick={() => message.info(`Processing order ${r.orderNumber}`)}>
          Process
        </Button>
      )
    },
  ];

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pending Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Orders waiting to be processed</p>
        </div>
        <Button icon={<RefreshCw size={16} />} onClick={fetchOrders}>Refresh</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 border-amber-500 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center"><Clock size={20} className="text-amber-600" /></div>
          <div><p className="text-slate-500 text-sm">Total Pending Orders</p><p className="text-2xl font-bold text-slate-800">{filtered.length}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 border-orange-500 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-orange-50 flex items-center justify-center"><IndianRupee size={20} className="text-orange-600" /></div>
          <div><p className="text-slate-500 text-sm">Total Pending Value</p><p className="text-2xl font-bold text-slate-800">&#8377;{totalValue.toLocaleString('en-IN')}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100">
          <Input prefix={<Search size={16} className="text-slate-400" />} placeholder="Search by order ID or customer..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        </div>
        <Table columns={columns} dataSource={filtered} rowKey="_id" pagination={{ pageSize: 20, showTotal: t => `${t} orders` }} scroll={{ x: 800 }} locale={{ emptyText: 'No pending orders' }} />
      </div>
    </div>
  );
};

export default PendingOrdersPage;
