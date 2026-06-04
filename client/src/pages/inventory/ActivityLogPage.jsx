import React, { useState } from 'react';
import { Table, Tag, Input } from 'antd';
import { Search, Shield } from 'lucide-react';

const moduleConfig = {
  Products: { color: 'blue' },
  Orders: { color: 'purple' },
  Inventory: { color: 'green' },
  Settings: { color: 'orange' },
  Suppliers: { color: 'cyan' },
};

const mockActivity = [
  { key: '1', ts: '2026-06-05 09:18:02', user: 'Rahul S.', action: 'Updated product stock for Himalaya EP Shampoo', module: 'Inventory', ip: '192.168.1.12', details: 'Added 50 units' },
  { key: '2', ts: '2026-06-05 09:05:45', user: 'System', action: 'Order #FZ-20483 auto-dispatched', module: 'Orders', ip: '127.0.0.1', details: 'Status changed: Processing → Dispatched' },
  { key: '3', ts: '2026-06-05 08:52:11', user: 'Priya M.', action: 'Created new supplier: Himalaya Drug Co.', module: 'Suppliers', ip: '192.168.1.14', details: 'New supplier added to system' },
  { key: '4', ts: '2026-06-04 18:33:00', user: 'System', action: 'Low stock alert triggered for NexGard Spectra', module: 'Inventory', ip: '127.0.0.1', details: 'Stock: 0 / Threshold: 20' },
  { key: '5', ts: '2026-06-04 17:10:30', user: 'Rahul S.', action: 'Edited pricing for Royal Canin Persian Adult', module: 'Products', ip: '192.168.1.12', details: 'Fifozone price: ₹2499 → ₹2399' },
  { key: '6', ts: '2026-06-04 15:22:08', user: 'Priya M.', action: 'Created purchase order PO-2026-061', module: 'Inventory', ip: '192.168.1.14', details: 'Supplier: Virbac India, Total: ₹45,000' },
  { key: '7', ts: '2026-06-04 14:05:55', user: 'Rahul S.', action: 'Deactivated listing: Savavet Kitazole Plus on Flipkart', module: 'Products', ip: '192.168.1.12', details: 'Channel: Flipkart → Inactive' },
  { key: '8', ts: '2026-06-04 12:30:00', user: 'System', action: 'Synced inventory with Amazon', module: 'Inventory', ip: '127.0.0.1', details: '10 products synced' },
  { key: '9', ts: '2026-06-03 16:45:12', user: 'Priya M.', action: 'Updated order #AMZ-98231 to Delivered', module: 'Orders', ip: '192.168.1.14', details: 'Status: Shipped → Delivered' },
  { key: '10', ts: '2026-06-03 11:15:33', user: 'Rahul S.', action: 'Changed system timezone setting', module: 'Settings', ip: '192.168.1.12', details: 'Timezone: UTC+5:30 (IST)' },
  { key: '11', ts: '2026-06-03 09:00:04', user: 'System', action: 'Daily stock snapshot generated', module: 'Inventory', ip: '127.0.0.1', details: 'Snapshot saved for 2026-06-02' },
  { key: '12', ts: '2026-06-02 17:55:22', user: 'Priya M.', action: 'Exported inventory report to CSV', module: 'Inventory', ip: '192.168.1.14', details: 'File: inventory_20260602.csv' },
  { key: '13', ts: '2026-06-02 14:20:00', user: 'Rahul S.', action: 'Added new product: Himalaya Hexaprin Shampoo', module: 'Products', ip: '192.168.1.12', details: 'SKU: HIM-HEX-10' },
  { key: '14', ts: '2026-06-02 10:10:11', user: 'System', action: 'Failed sync with Meesho API', module: 'Products', ip: '127.0.0.1', details: 'Error: Rate limit exceeded' },
  { key: '15', ts: '2026-06-01 18:00:00', user: 'Rahul S.', action: 'Bulk updated channel listing status', module: 'Products', ip: '192.168.1.12', details: '5 products activated on Meesho' },
];

const columns = [
  {
    title: 'Timestamp',
    dataIndex: 'ts',
    key: 'ts',
    render: (v) => <span className="text-xs font-mono text-slate-500 whitespace-nowrap">{v}</span>,
  },
  {
    title: 'User',
    dataIndex: 'user',
    key: 'user',
    render: (v) => (
      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${v === 'System' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700'}`}>
        {v}
      </span>
    ),
  },
  {
    title: 'Action',
    dataIndex: 'action',
    key: 'action',
    render: (v) => <span className="text-slate-700 text-sm">{v}</span>,
  },
  {
    title: 'Module',
    dataIndex: 'module',
    key: 'module',
    align: 'center',
    filters: Object.keys(moduleConfig).map(k => ({ text: k, value: k })),
    onFilter: (value, record) => record.module === value,
    render: (v) => <Tag color={moduleConfig[v]?.color || 'default'} className="font-medium text-xs">{v}</Tag>,
  },
  {
    title: 'IP Address',
    dataIndex: 'ip',
    key: 'ip',
    render: (v) => <span className="font-mono text-xs text-slate-500">{v}</span>,
  },
  {
    title: 'Details',
    dataIndex: 'details',
    key: 'details',
    render: (v) => <span className="text-xs text-slate-500 italic">{v}</span>,
  },
];

const ActivityLogPage = () => {
  const [search, setSearch] = useState('');

  const filtered = mockActivity.filter(a =>
    a.action.toLowerCase().includes(search.toLowerCase()) ||
    a.user.toLowerCase().includes(search.toLowerCase()) ||
    a.module.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 min-h-screen bg-slate-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Activity Log</h1>
        <p className="text-slate-500 mt-1 text-sm">System and user action history</p>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Object.entries(moduleConfig).map(([mod, cfg]) => {
          const count = mockActivity.filter(a => a.module === mod).length;
          return (
            <div key={mod} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-3">
              <div className="bg-slate-50 p-2 rounded-lg">
                <Shield size={16} className="text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">{mod}</p>
                <p className="font-bold text-lg text-slate-700">{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">All Activity ({filtered.length} records)</h2>
          <Input
            placeholder="Search action, user, module..."
            prefix={<Search size={14} className="text-slate-400" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-lg text-sm"
          />
        </div>
        <Table
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 900 }}
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `${total} entries` }}
          rowClassName="hover:bg-slate-50 transition-colors"
          className="text-sm"
        />
      </div>
    </div>
  );
};

export default ActivityLogPage;
