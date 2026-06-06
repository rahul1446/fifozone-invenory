import React, { useState, useEffect } from 'react';
import { Table, Tag, Input, Spin, message } from 'antd';
import { Search, Shield } from 'lucide-react';
import { getInventoryLogsApi } from '../../api/inventoryApi';
import dayjs from 'dayjs';

const moduleConfig = {
  Inventory: { color: 'green' },
  Warehouse: { color: 'blue' },
  Amazon: { color: 'orange' },
  Flipkart: { color: 'blue' },
  Fifozone: { color: 'cyan' },
};

const ActivityLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await getInventoryLogsApi();
        setLogs(res.data || []);
      } catch (error) {
        message.error('Failed to load activity logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'ts',
      render: (v) => <span className="text-xs font-mono text-slate-500 whitespace-nowrap">{dayjs(v).format('YYYY-MM-DD HH:mm:ss')}</span>,
    },
    {
      title: 'User',
      dataIndex: 'performedBy',
      key: 'user',
      render: (v) => {
        const name = v ? `${v.firstName || ''} ${v.lastName || ''}`.trim() || v.email : 'System';
        return (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${name === 'System' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700'}`}>
            {name}
          </span>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, r) => (
        <div className="flex flex-col">
          <span className="text-slate-700 text-sm font-medium">
            {r.changeType.replace('_', ' ').toUpperCase()}
          </span>
          <span className="text-slate-500 text-xs">
            {r.productName} (Qty: {r.changeQuantity > 0 ? `+${r.changeQuantity}` : r.changeQuantity})
          </span>
        </div>
      ),
    },
    {
      title: 'Platform / Module',
      dataIndex: 'platform',
      key: 'module',
      align: 'center',
      render: (v) => {
        const platformName = v ? v.charAt(0).toUpperCase() + v.slice(1) : 'Inventory';
        return <Tag color={moduleConfig[platformName]?.color || 'default'} className="font-medium text-xs">{platformName}</Tag>;
      },
    },
    {
      title: 'Details',
      dataIndex: 'note',
      key: 'details',
      render: (v) => <span className="text-xs text-slate-500 italic">{v || '-'}</span>,
    },
  ];

  const filtered = logs.filter(a => {
    const term = search.toLowerCase();
    const actionStr = a.changeType?.toLowerCase() || '';
    const productStr = a.productName?.toLowerCase() || '';
    const noteStr = a.note?.toLowerCase() || '';
    const userStr = a.performedBy ? `${a.performedBy.firstName} ${a.performedBy.lastName}`.toLowerCase() : 'system';
    return actionStr.includes(term) || productStr.includes(term) || noteStr.includes(term) || userStr.includes(term);
  });

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div className="p-6 min-h-screen bg-slate-50 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Activity Log</h1>
        <p className="text-slate-500 mt-1 text-sm">Real-time inventory and system action history</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">All Activity ({filtered.length} records)</h2>
          <Input
            placeholder="Search action, user, details..."
            prefix={<Search size={14} className="text-slate-400" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-lg text-sm"
          />
        </div>
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="_id"
          scroll={{ x: 900 }}
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (total) => `${total} entries` }}
          rowClassName="hover:bg-slate-50 transition-colors"
          className="text-sm"
        />
      </div>
    </div>
  );
};

export default ActivityLogPage;
