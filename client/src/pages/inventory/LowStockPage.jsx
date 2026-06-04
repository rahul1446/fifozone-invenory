import React from 'react';
import { Table, Tag, Button, Progress } from 'antd';
import { AlertTriangle, PackageX, ShoppingBag } from 'lucide-react';

const mockLowStock = [
  { key: '1', name: 'NexGard Spectra (Dog)', sku: 'NEX-DOG-07', stock: 0, threshold: 20, lastRestocked: '2026-05-15' },
  { key: '2', name: 'Savavet Kitazole Plus', sku: 'SAV-KIT-08', stock: 3, threshold: 25, lastRestocked: '2026-05-10' },
  { key: '3', name: 'Royal Canin Persian Adult', sku: 'RC-PER-05', stock: 5, threshold: 30, lastRestocked: '2026-05-20' },
  { key: '4', name: 'Droncit Tablet (Cats)', sku: 'DRN-CAT-02', stock: 8, threshold: 40, lastRestocked: '2026-05-25' },
  { key: '5', name: 'Beaphar Fiprotec Spray', sku: 'BEA-SPR-04', stock: 10, threshold: 25, lastRestocked: '2026-05-18' },
  { key: '6', name: 'Virbac Endogard Large', sku: 'VIR-END-09', stock: 12, threshold: 30, lastRestocked: '2026-05-22' },
  { key: '7', name: 'Fipnil Plus Spot On (Small)', sku: 'FIP-SML-01', stock: 0, threshold: 15, lastRestocked: '2026-05-08' },
  { key: '8', name: 'Himalaya Hexaprin Shampoo', sku: 'HIM-HEX-10', stock: 14, threshold: 35, lastRestocked: '2026-05-28' },
  { key: '9', name: 'Pedigree Dentastix Daily', sku: 'PED-DEN-06', stock: 7, threshold: 50, lastRestocked: '2026-05-14' },
  { key: '10', name: 'Himalaya Erina EP Shampoo', sku: 'HIM-SHP-03', stock: 2, threshold: 20, lastRestocked: '2026-05-30' },
];

const criticalCount = mockLowStock.filter(p => p.stock === 0).length;
const lowCount = mockLowStock.filter(p => p.stock > 0).length;

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

const getStockPercent = (stock, threshold) => {
  if (threshold === 0) return 0;
  return Math.min(Math.round((stock / threshold) * 100), 100);
};

const getProgressStatus = (stock, threshold) => {
  const pct = getStockPercent(stock, threshold);
  if (pct === 0) return 'exception';
  if (pct < 40) return 'active';
  return 'normal';
};

const getProgressColor = (stock, threshold) => {
  const pct = getStockPercent(stock, threshold);
  if (pct === 0) return '#f43f5e';
  if (pct < 40) return '#f59e0b';
  return '#22c55e';
};

const columns = [
  {
    title: 'Product Name',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <span className="font-medium text-slate-800 text-sm">{text}</span>,
  },
  {
    title: 'SKU',
    dataIndex: 'sku',
    key: 'sku',
    render: (text) => <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{text}</span>,
  },
  {
    title: 'Current Stock',
    dataIndex: 'stock',
    key: 'stock',
    align: 'center',
    render: (v) => (
      <span className={`font-bold text-sm ${v === 0 ? 'text-rose-600' : v < 10 ? 'text-amber-600' : 'text-slate-700'}`}>
        {v}
      </span>
    ),
  },
  {
    title: 'Threshold',
    dataIndex: 'threshold',
    key: 'threshold',
    align: 'center',
    render: (v) => <span className="font-medium text-slate-500">{v}</span>,
  },
  {
    title: 'Stock Level',
    key: 'progress',
    render: (_, record) => (
      <div className="min-w-[120px]">
        <Progress
          percent={getStockPercent(record.stock, record.threshold)}
          size="small"
          strokeColor={getProgressColor(record.stock, record.threshold)}
          showInfo={false}
          trailColor="#f1f5f9"
        />
        <span className="text-xs text-slate-400">{getStockPercent(record.stock, record.threshold)}% of threshold</span>
      </div>
    ),
  },
  {
    title: 'Status',
    key: 'status',
    align: 'center',
    render: (_, record) => (
      record.stock === 0
        ? <Tag color="error" className="font-bold text-xs">🔴 Critical</Tag>
        : <Tag color="warning" className="font-medium text-xs">🟡 Low</Tag>
    ),
  },
  {
    title: 'Last Restocked',
    dataIndex: 'lastRestocked',
    key: 'lastRestocked',
    render: (v) => <span className="text-xs text-slate-500">{v}</span>,
  },
  {
    title: 'Action',
    key: 'action',
    align: 'center',
    render: () => (
      <Button
        type="primary"
        size="small"
        icon={<ShoppingBag size={12} />}
        className="bg-emerald-600 hover:bg-emerald-700 border-none rounded-lg text-xs font-medium"
      >
        Reorder
      </Button>
    ),
  },
];

const LowStockPage = () => (
  <div className="p-6 min-h-screen bg-slate-50">
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-800">Low Stock Alerts</h1>
      <p className="text-slate-500 mt-1 text-sm">Products running below minimum threshold</p>
    </div>

    {/* Alert Banner */}
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 flex items-start gap-3">
      <AlertTriangle size={18} className="text-rose-500 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-rose-700 font-semibold text-sm">Immediate Action Required</p>
        <p className="text-rose-500 text-xs mt-0.5">
          {criticalCount} product(s) are completely out of stock and {lowCount} are running low. Reorder immediately to avoid stockouts.
        </p>
      </div>
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <StatCard title="Critical (Out of Stock)" value={criticalCount} icon={PackageX} borderColor="border-rose-500" bgColor="bg-rose-50" textColor="text-rose-600" />
      <StatCard title="Low Stock Products" value={lowCount} icon={AlertTriangle} borderColor="border-amber-500" bgColor="bg-amber-50" textColor="text-amber-600" />
    </div>

    {/* Table */}
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <h2 className="text-base font-semibold text-slate-700 mb-4">Products Below Threshold</h2>
      <Table
        columns={columns}
        dataSource={mockLowStock}
        scroll={{ x: 900 }}
        pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `${total} alerts` }}
        rowClassName={(record) =>
          record.stock === 0
            ? 'bg-rose-50 hover:bg-rose-100 transition-colors'
            : 'hover:bg-slate-50 transition-colors'
        }
        className="text-sm"
      />
    </div>
  </div>
);

export default LowStockPage;
