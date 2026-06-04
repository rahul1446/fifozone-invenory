import React, { useState, useEffect } from 'react';
import { Table, Tag, Spin, message, Button } from 'antd';
import { Banknote, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import { getSettlementsApi } from '../../api/paymentApi';

const platformColor = { amazon: 'orange', flipkart: 'blue', meesho: 'pink', fifozone: 'green' };

const SettlementsPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const res = await getSettlementsApi();
      const settlements = res?.data || (Array.isArray(res) ? res : []);
      setData(settlements);
    } catch { message.error('Failed to load settlements'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSettlements(); }, []);

  const settled = data.filter(s => s.status === 'Settled');
  const pending = data.filter(s => s.status === 'Pending');
  const settledAmt = settled.reduce((s, r) => s + (r.netAmount || 0), 0);
  const pendingAmt = pending.reduce((s, r) => s + (r.netAmount || 0), 0);

  const columns = [
    { title: 'Platform', dataIndex: 'platform', key: 'platform', render: v => <Tag color={platformColor[v] || 'default'}>{(v || '').toUpperCase()}</Tag> },
    { title: 'Settlement ID', dataIndex: 'settlementId', key: 'id', render: v => <span className="font-mono text-sm font-semibold text-slate-700">{v}</span> },
    { title: 'Orders', dataIndex: 'ordersCount', key: 'orders', align: 'center' },
    { title: 'Gross Amount', dataIndex: 'grossAmount', key: 'gross', align: 'right', render: v => <span>&#8377;{(v || 0).toLocaleString('en-IN')}</span> },
    { title: 'Deductions', dataIndex: 'deductions', key: 'deductions', align: 'right', render: v => <span className="text-rose-500">-&#8377;{(v || 0).toLocaleString('en-IN')}</span> },
    { title: 'Net Amount', dataIndex: 'netAmount', key: 'net', align: 'right', render: v => <span className="font-bold text-emerald-600">&#8377;{(v || 0).toLocaleString('en-IN')}</span> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: v => <Tag color={v === 'Settled' ? 'green' : 'gold'}>{v}</Tag> },
    { title: 'Settlement Date', dataIndex: 'settlementDate', key: 'date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : 'Pending' },
  ];

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Settlements</h1><p className="text-slate-500 text-sm mt-1">Platform-wise settlement history</p></div>
        <Button icon={<RefreshCw size={16} />} onClick={fetchSettlements}>Refresh</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Settled Amount', value: `\u20b9${settledAmt.toLocaleString('en-IN')}`, icon: <TrendingUp size={20} className="text-emerald-600" />, border: 'border-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Pending Amount', value: `\u20b9${pendingAmt.toLocaleString('en-IN')}`, icon: <Clock size={20} className="text-amber-600" />, border: 'border-amber-500', bg: 'bg-amber-50' },
          { label: 'Total Settlements', value: data.length, icon: <Banknote size={20} className="text-blue-600" />, border: 'border-blue-500', bg: 'bg-blue-50' },
        ].map(card => (
          <div key={card.label} className={`bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 ${card.border} p-5 flex items-center gap-4`}>
            <div className={`w-11 h-11 rounded-full ${card.bg} flex items-center justify-center`}>{card.icon}</div>
            <div><p className="text-slate-500 text-sm">{card.label}</p><p className="text-2xl font-bold text-slate-800 mt-0.5">{card.value}</p></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table columns={columns} dataSource={data} rowKey="_id" pagination={{ pageSize: 20, showTotal: t => `${t} settlements` }} scroll={{ x: 900 }} locale={{ emptyText: 'No settlements found' }} />
      </div>
    </div>
  );
};
export default SettlementsPage;
