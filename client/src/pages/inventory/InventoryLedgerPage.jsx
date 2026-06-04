import React, { useState, useEffect } from 'react';
import { Table, Tag, Spin, message, Input } from 'antd';
import { BookOpen, TrendingUp, TrendingDown, Search } from 'lucide-react';
import { getInventoryLogsApi } from '../../api/inventoryApi';

const changeColor = { sale: 'red', return: 'green', restock: 'green', adjustment: 'blue', damaged: 'volcano', expired: 'gray', manual_add: 'green', manual_remove: 'red' };

const InventoryLedgerPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await getInventoryLogsApi({ limit: 200 });
        const data = res?.data?.logs || res?.data || (Array.isArray(res) ? res : []);
        setLogs(data);
      } catch { message.error('Failed to load inventory ledger'); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = logs.filter(l =>
    !search || l.productName?.toLowerCase().includes(search.toLowerCase()) ||
    l.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { title: 'Date', dataIndex: 'createdAt', key: 'date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—', width: 110 },
    { title: 'Product', dataIndex: 'productName', key: 'product', render: v => <span className="font-semibold text-slate-700">{v || '—'}</span> },
    { title: 'SKU', dataIndex: 'sku', key: 'sku', render: v => <span className="font-mono text-sm text-slate-500">{v || '—'}</span> },
    { title: 'Type', dataIndex: 'changeType', key: 'type', render: v => <Tag color={changeColor[v] || 'default'}>{(v || '').replace('_', ' ').toUpperCase()}</Tag> },
    { title: 'Platform', dataIndex: 'platform', key: 'platform', render: v => v ? <Tag>{v.toUpperCase()}</Tag> : '—' },
    { title: 'Before', dataIndex: 'previousStock', key: 'prev', align: 'right', render: v => <span className="text-slate-600">{v ?? '—'}</span> },
    {
      title: 'Change', dataIndex: 'changeQuantity', key: 'change', align: 'right',
      render: v => {
        if (v === undefined || v === null) return '—';
        const isPos = v > 0;
        return <span className={`font-bold flex items-center justify-end gap-1 ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isPos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{isPos ? '+' : ''}{v}
        </span>;
      }
    },
    { title: 'After', dataIndex: 'newStock', key: 'new', align: 'right', render: v => <span className="font-bold text-slate-800">{v ?? '—'}</span> },
    { title: 'Note', dataIndex: 'note', key: 'note', render: v => <span className="text-slate-400 text-xs">{v || '—'}</span>, ellipsis: true },
  ];

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <BookOpen size={24} className="text-slate-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory Ledger</h1>
          <p className="text-slate-500 text-sm">{logs.length} stock movement records</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100"><Input prefix={<Search size={16} className="text-slate-400" />} placeholder="Search by product or SKU..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" /></div>
        <Table columns={columns} dataSource={filtered} rowKey="_id" pagination={{ pageSize: 25, showTotal: t => `${t} records` }} scroll={{ x: 1000 }} locale={{ emptyText: 'No inventory movements recorded yet' }} />
      </div>
    </div>
  );
};
export default InventoryLedgerPage;
