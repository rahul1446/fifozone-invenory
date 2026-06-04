import React, { useState } from 'react';
import { Table, Tag, Button } from 'antd';
import { Wallet, Clock, CalendarCheck, TrendingUp } from 'lucide-react';

const mockData = [
  { key: '1', date: '2024-05-20', platform: 'amazon', settlementId: 'AMZS-001234', ordersCount: 142, grossAmount: 185000, deductions: 18500, netAmount: 166500, status: 'Settled' },
  { key: '2', date: '2024-05-18', platform: 'flipkart', settlementId: 'FKS-005678', ordersCount: 98, grossAmount: 121000, deductions: 12100, netAmount: 108900, status: 'Settled' },
  { key: '3', date: '2024-05-17', platform: 'meesho', settlementId: 'MSS-009012', ordersCount: 210, grossAmount: 78000, deductions: 5460, netAmount: 72540, status: 'Settled' },
  { key: '4', date: '2024-05-15', platform: 'fifozone', settlementId: 'FZS-003456', ordersCount: 55, grossAmount: 95000, deductions: 4750, netAmount: 90250, status: 'Settled' },
  { key: '5', date: '2024-05-14', platform: 'amazon', settlementId: 'AMZS-001235', ordersCount: 165, grossAmount: 210000, deductions: 21000, netAmount: 189000, status: 'Settled' },
  { key: '6', date: '2024-05-22', platform: 'flipkart', settlementId: 'FKS-005679', ordersCount: 110, grossAmount: 138000, deductions: 13800, netAmount: 124200, status: 'Pending' },
  { key: '7', date: '2024-05-23', platform: 'meesho', settlementId: 'MSS-009013', ordersCount: 245, grossAmount: 89000, deductions: 6230, netAmount: 82770, status: 'Pending' },
  { key: '8', date: '2024-05-12', platform: 'amazon', settlementId: 'AMZS-001236', ordersCount: 130, grossAmount: 175000, deductions: 17500, netAmount: 157500, status: 'Settled' },
  { key: '9', date: '2024-05-10', platform: 'fifozone', settlementId: 'FZS-003457', ordersCount: 68, grossAmount: 112000, deductions: 5600, netAmount: 106400, status: 'Settled' },
  { key: '10', date: '2024-05-24', platform: 'amazon', settlementId: 'AMZS-001237', ordersCount: 188, grossAmount: 240000, deductions: 24000, netAmount: 216000, status: 'Pending' },
];

const platformColors = {
  amazon: 'orange',
  flipkart: 'blue',
  meesho: 'pink',
  fifozone: 'green',
};

const StatCard = ({ title, value, icon: Icon, borderColor, iconBg, iconColor }) => (
  <div className={`bg-white rounded-xl shadow-sm border-l-4 ${borderColor} p-5 flex items-center gap-4`}>
    <div className={`${iconBg} p-3 rounded-full`}>
      <Icon size={22} className={iconColor} />
    </div>
    <div>
      <p className="text-slate-500 text-sm">{title}</p>
      <p className="font-bold text-2xl text-slate-800">{value}</p>
    </div>
  </div>
);

const SettlementsPage = () => {
  const totalSettled = mockData
    .filter(r => r.status === 'Settled')
    .reduce((sum, r) => sum + r.netAmount, 0);
  const totalPending = mockData
    .filter(r => r.status === 'Pending')
    .reduce((sum, r) => sum + r.netAmount, 0);

  const columns = [
    {
      title: 'Settlement Date',
      dataIndex: 'date',
      key: 'date',
      render: (d) => <span className="text-slate-700 font-medium">{d}</span>,
    },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      render: (p) => (
        <Tag color={platformColors[p]} className="capitalize font-semibold">
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </Tag>
      ),
    },
    { title: 'Settlement ID', dataIndex: 'settlementId', key: 'settlementId', render: (v) => <span className="font-mono text-xs text-slate-600">{v}</span> },
    { title: 'Orders', dataIndex: 'ordersCount', key: 'ordersCount', align: 'center' },
    {
      title: 'Gross Amount (₹)',
      dataIndex: 'grossAmount',
      key: 'grossAmount',
      align: 'right',
      render: (v) => <span className="font-medium">₹{v.toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Deductions (₹)',
      dataIndex: 'deductions',
      key: 'deductions',
      align: 'right',
      render: (v) => <span className="text-rose-500 font-medium">-₹{v.toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Net Amount (₹)',
      dataIndex: 'netAmount',
      key: 'netAmount',
      align: 'right',
      render: (v) => <span className="text-emerald-600 font-bold">₹{v.toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => (
        <Tag color={s === 'Settled' ? 'success' : 'warning'} className="font-semibold">
          {s}
        </Tag>
      ),
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Settlements</h1>
        <p className="text-slate-500 mt-1">Track marketplace payment reconciliations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Settled (₹)"
          value={`₹${totalSettled.toLocaleString('en-IN')}`}
          icon={Wallet}
          borderColor="border-emerald-500"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Pending Settlement (₹)"
          value={`₹${totalPending.toLocaleString('en-IN')}`}
          icon={Clock}
          borderColor="border-amber-500"
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          title="Last Settlement Date"
          value="May 24, 2024"
          icon={CalendarCheck}
          borderColor="border-blue-500"
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <Table
          columns={columns}
          dataSource={mockData}
          pagination={{ pageSize: 10 }}
          className="settlements-table"
          scroll={{ x: 900 }}
        />
      </div>
    </div>
  );
};

export default SettlementsPage;
