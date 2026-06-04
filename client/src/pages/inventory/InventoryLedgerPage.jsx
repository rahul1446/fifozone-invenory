import React, { useState } from 'react';
import { Table, Tag, Button, Input } from 'antd';
import { Activity, ArrowUpCircle, ArrowDownCircle, Search, Download } from 'lucide-react';

const mockLedger = [
  { key: '1', datetime: '2026-06-05 09:14', product: 'Himalaya Erina EP Shampoo', sku: 'HIM-SHP-03', type: 'Added', qty: '+50', balance: 138, reason: 'Purchase from Himalaya', by: 'Rahul S.' },
  { key: '2', datetime: '2026-06-05 08:52', product: 'Fipnil Plus Spot On (Small)', sku: 'FIP-SML-01', type: 'Deducted', qty: '-3', balance: 207, reason: 'Order #FZ-20483 dispatched', by: 'System' },
  { key: '3', datetime: '2026-06-04 18:30', product: 'Royal Canin Persian Adult', sku: 'RC-PER-05', type: 'Reserved', qty: '-2', balance: 44, reason: 'Order #AMZ-98231 reserved', by: 'System' },
  { key: '4', datetime: '2026-06-04 15:20', product: 'Droncit Tablet (Cats)', sku: 'DRN-CAT-02', type: 'Added', qty: '+100', balance: 256, reason: 'Purchase from Savavet Dist.', by: 'Priya M.' },
  { key: '5', datetime: '2026-06-04 12:10', product: 'Pedigree Dentastix Daily', sku: 'PED-DEN-06', type: 'Deducted', qty: '-12', balance: 127, reason: 'Order #FLP-44521 dispatched', by: 'System' },
  { key: '6', datetime: '2026-06-03 17:05', product: 'NexGard Spectra (Dog)', sku: 'NEX-DOG-07', type: 'Deducted', qty: '-5', balance: 38, reason: 'Order #FZ-20481 dispatched', by: 'System' },
  { key: '7', datetime: '2026-06-03 14:45', product: 'Beaphar Fiprotec Spray', sku: 'BEA-SPR-04', type: 'Added', qty: '+30', balance: 108, reason: 'Purchase from Beaphar India', by: 'Rahul S.' },
  { key: '8', datetime: '2026-06-03 11:00', product: 'Virbac Endogard Large', sku: 'VIR-END-09', type: 'Deducted', qty: '-8', balance: 65, reason: 'Order #AMZ-98228 dispatched', by: 'System' },
  { key: '9', datetime: '2026-06-02 16:30', product: 'Himalaya Hexaprin Shampoo', sku: 'HIM-HEX-10', type: 'Added', qty: '+60', balance: 238, reason: 'Purchase from Himalaya', by: 'Priya M.' },
  { key: '10', datetime: '2026-06-02 10:20', product: 'Savavet Kitazole Plus', sku: 'SAV-KIT-08', type: 'Added', qty: '+200', balance: 445, reason: 'Initial stock entry', by: 'Rahul S.' },
  { key: '11', datetime: '2026-06-01 15:00', product: 'Fipnil Plus Spot On (Small)', sku: 'FIP-SML-01', type: 'Reserved', qty: '-5', balance: 210, reason: 'Order #MSH-11234 reserved', by: 'System' },
  { key: '12', datetime: '2026-06-01 09:00', product: 'Royal Canin Persian Adult', sku: 'RC-PER-05', type: 'Deducted', qty: '-4', balance: 46, reason: 'Order #FZ-20478 dispatched', by: 'System' },
];

const typeConfig = {
  Added: { color: 'success', textClass: 'text-emerald-600' },
  Deducted: { color: 'error', textClass: 'text-rose-600' },
  Reserved: { color: 'warning', textClass: 'text-amber-600' },
};

const totalMovements = mockLedger.length;
const stockAdded = mockLedger.filter(l => l.type === 'Added').reduce((a, l) => a + parseInt(l.qty), 0);
const stockDeducted = Math.abs(mockLedger.filter(l => l.type === 'Deducted').reduce((a, l) => a + parseInt(l.qty), 0));

const StatCard = ({ title, value, icon: Icon, borderColor, bgColor, textColor }) => (
  <div className={`bg-white rounded-xl shadow-sm border-l-4 ${borderColor} p-5 flex items-center gap-4`}>
    <div className={`${bgColor} p-3 rounded-full`}>
      <Icon size={22} className={textColor} />
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <p className="font-bold text-2xl text-slate-800 mt-0.5">{value}</p>
    </div>
  </div>
);

const InventoryLedgerPage = () => {
  const [search, setSearch] = useState('');

  const filtered = mockLedger.filter(l =>
    l.product.toLowerCase().includes(search.toLowerCase()) ||
    l.sku.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: 'Date & Time',
      dataIndex: 'datetime',
      key: 'datetime',
      render: (v) => <span className="text-xs text-slate-500 font-mono whitespace-nowrap">{v}</span>,
    },
    {
      title: 'Product Name',
      dataIndex: 'product',
      key: 'product',
      render: (text) => <span className="font-medium text-slate-800 text-sm">{text}</span>,
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (text) => <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{text}</span>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      align: 'center',
      filters: [
        { text: 'Added', value: 'Added' },
        { text: 'Deducted', value: 'Deducted' },
        { text: 'Reserved', value: 'Reserved' },
      ],
      onFilter: (value, record) => record.type === value,
      render: (v) => <Tag color={typeConfig[v].color} className="font-medium text-xs">{v}</Tag>,
    },
    {
      title: 'Qty Change',
      dataIndex: 'qty',
      key: 'qty',
      align: 'center',
      render: (v, record) => (
        <span className={`font-bold text-sm ${typeConfig[record.type].textClass}`}>{v}</span>
      ),
    },
    {
      title: 'Balance After',
      dataIndex: 'balance',
      key: 'balance',
      align: 'center',
      render: (v) => <span className="font-semibold text-slate-700">{v}</span>,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (v) => <span className="text-slate-600 text-xs">{v}</span>,
    },
    {
      title: 'Initiated By',
      dataIndex: 'by',
      key: 'by',
      render: (v) => (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${v === 'System' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>
          {v}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-slate-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Inventory Ledger</h1>
        <p className="text-slate-500 mt-1 text-sm">Complete record of all stock movements</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Stock Movements" value={totalMovements} icon={Activity} borderColor="border-blue-500" bgColor="bg-blue-50" textColor="text-blue-600" />
        <StatCard title="Stock Added" value={`+${stockAdded} units`} icon={ArrowUpCircle} borderColor="border-emerald-500" bgColor="bg-emerald-50" textColor="text-emerald-600" />
        <StatCard title="Stock Deducted" value={`-${stockDeducted} units`} icon={ArrowDownCircle} borderColor="border-rose-500" bgColor="bg-rose-50" textColor="text-rose-600" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">Stock Movement History</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Search product or SKU..."
              prefix={<Search size={14} className="text-slate-400" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 rounded-lg text-sm"
            />
            <Button icon={<Download size={14} />} className="rounded-lg border-slate-200 text-slate-600">
              Export
            </Button>
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 900 }}
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `${total} records` }}
          rowClassName="hover:bg-slate-50 transition-colors"
          className="text-sm"
        />
      </div>
    </div>
  );
};

export default InventoryLedgerPage;
