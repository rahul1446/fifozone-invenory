import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Spin, message } from 'antd';
import { RotateCcw, IndianRupee, AlertCircle, RefreshCw } from 'lucide-react';
import { getRefundsApi } from '../../api/paymentApi';

const platformColor = { amazon: 'orange', flipkart: 'blue', meesho: 'pink', fifozone: 'green' };
const statusColor = { requested: 'gold', approved: 'blue', received: 'cyan', restocked: 'green', rejected: 'red', refunded: 'green' };

const RefundManagementPage = () => {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const res = await getRefundsApi();
      const data = res?.data || (Array.isArray(res) ? res : []);
      setRefunds(data);
    } catch { message.error('Failed to load refunds'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRefunds(); }, []);

  const totalRefundAmt = refunds.reduce((s, r) => s + (r.refundAmount || 0), 0);
  const pending = refunds.filter(r => ['requested', 'approved'].includes(r.status));

  const columns = [
    {
      title: 'Order', key: 'order',
      render: (_, r) => <span className="font-mono text-sm font-semibold text-slate-700">{r.order?.orderNumber || r.order || '—'}</span>
    },
    { title: 'Platform', dataIndex: 'platform', key: 'platform', render: v => <Tag color={platformColor[v] || 'default'}>{(v || '').toUpperCase()}</Tag> },
    {
      title: 'Customer', key: 'customer',
      render: (_, r) => r.customer?.name || '—'
    },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true, render: v => v || '—' },
    { title: 'Refund Amount', dataIndex: 'refundAmount', key: 'amount', align: 'right', render: v => <span className="font-bold text-rose-600">&#8377;{(v || 0).toLocaleString('en-IN')}</span> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: v => <Tag color={statusColor[v] || 'default'}>{(v || '').toUpperCase()}</Tag> },
    { title: 'Date', dataIndex: 'createdAt', key: 'date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
  ];

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RotateCcw size={24} className="text-slate-600" />
          <div><h1 className="text-2xl font-bold text-slate-800">Refund Management</h1><p className="text-slate-500 text-sm">{refunds.length} refund requests total</p></div>
        </div>
        <Button icon={<RefreshCw size={16} />} onClick={fetchRefunds}>Refresh</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Refunds', value: refunds.length, icon: <RotateCcw size={20} className="text-blue-600" />, border: 'border-blue-500', bg: 'bg-blue-50' },
          { label: 'Refund Amount', value: `\u20b9${totalRefundAmt.toLocaleString('en-IN')}`, icon: <IndianRupee size={20} className="text-rose-600" />, border: 'border-rose-500', bg: 'bg-rose-50' },
          { label: 'Pending Review', value: pending.length, icon: <AlertCircle size={20} className="text-amber-600" />, border: 'border-amber-500', bg: 'bg-amber-50' },
        ].map(c => (
          <div key={c.label} className={`bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 ${c.border} p-5 flex items-center gap-4`}>
            <div className={`w-11 h-11 rounded-full ${c.bg} flex items-center justify-center`}>{c.icon}</div>
            <div><p className="text-slate-500 text-sm">{c.label}</p><p className="text-2xl font-bold text-slate-800 mt-0.5">{c.value}</p></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table columns={columns} dataSource={refunds} rowKey="_id" pagination={{ pageSize: 20, showTotal: t => `${t} refunds` }} scroll={{ x: 900 }} locale={{ emptyText: 'No refund requests found' }} />
      </div>
    </div>
  );
};
export default RefundManagementPage;
