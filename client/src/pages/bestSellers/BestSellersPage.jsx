import React from 'react';
import { Table, Tag } from 'antd';
import { Package, IndianRupee, Tag as TagIcon } from 'lucide-react';

const mockProducts = [
  { key: '1', rank: 1, name: 'Royal Canin Adult Labrador 3kg', sku: 'RC-LAB-3KG', category: 'Dog Food', stock: 142, avgPrice: 2800, stockValue: 397600, unitsSold: 1840, bestPlatform: 'amazon' },
  { key: '2', rank: 2, name: 'Pedigree Adult Chicken & Vegetables 3kg', sku: 'PD-CHK-3KG', category: 'Dog Food', stock: 218, avgPrice: 1350, stockValue: 294300, unitsSold: 1620, bestPlatform: 'flipkart' },
  { key: '3', rank: 3, name: 'Whiskas Adult Tuna Pouches x7', sku: 'WH-TUN-7PK', category: 'Cat Food', stock: 390, avgPrice: 680, stockValue: 265200, unitsSold: 1405, bestPlatform: 'meesho' },
  { key: '4', rank: 4, name: 'Drools Absolute Calcium Sticks 40pcs', sku: 'DR-CAL-40', category: 'Dog Treats', stock: 560, avgPrice: 299, stockValue: 167440, unitsSold: 1298, bestPlatform: 'meesho' },
  { key: '5', rank: 5, name: 'Himalaya Erina Dog Shampoo 400ml', sku: 'HM-SHP-400', category: 'Grooming', stock: 305, avgPrice: 390, stockValue: 118950, unitsSold: 1102, bestPlatform: 'amazon' },
  { key: '6', rank: 6, name: 'Royal Canin Persian Adult Cat 400g', sku: 'RC-PRS-400', category: 'Cat Food', stock: 178, avgPrice: 1200, stockValue: 213600, unitsSold: 980, bestPlatform: 'amazon' },
  { key: '7', rank: 7, name: 'Trixie Plush Rabbit Dog Toy 30cm', sku: 'TX-PLU-30', category: 'Pet Toys', stock: 420, avgPrice: 450, stockValue: 189000, unitsSold: 875, bestPlatform: 'flipkart' },
  { key: '8', rank: 8, name: 'Farmina N&D Quinoa Cat Skin 300g', sku: 'FM-QUI-300', category: 'Cat Food', stock: 95, avgPrice: 1800, stockValue: 171000, unitsSold: 760, bestPlatform: 'fifozone' },
  { key: '9', rank: 9, name: 'Pets Empire Retractable Dog Leash 5m', sku: 'PE-LEA-5M', category: 'Accessories', stock: 234, avgPrice: 499, stockValue: 116766, unitsSold: 698, bestPlatform: 'amazon' },
  { key: '10', rank: 10, name: 'Ocean Free Arowana Premium Pellets', sku: 'OF-ARW-100', category: 'Fish Food', stock: 312, avgPrice: 440, stockValue: 137280, unitsSold: 612, bestPlatform: 'flipkart' },
  { key: '11', rank: 11, name: 'Himalaya Tick Guard Dog Spray 200ml', sku: 'HM-TGD-200', category: 'Grooming', stock: 188, avgPrice: 349, stockValue: 65612, unitsSold: 545, bestPlatform: 'meesho' },
  { key: '12', rank: 12, name: 'Pedigree Dentastix Daily Oral Care', sku: 'PD-DEN-110', category: 'Dog Treats', stock: 445, avgPrice: 299, stockValue: 133055, unitsSold: 498, bestPlatform: 'amazon' },
  { key: '13', rank: 13, name: 'Trixie Cat Scratching Post 50cm', sku: 'TX-SCR-50', category: 'Cat Accessories', stock: 67, avgPrice: 899, stockValue: 60233, unitsSold: 432, bestPlatform: 'fifozone' },
  { key: '14', rank: 14, name: 'Drools Focus Puppy Super Premium 1.2kg', sku: 'DR-FOC-1.2', category: 'Dog Food', stock: 150, avgPrice: 1100, stockValue: 165000, unitsSold: 385, bestPlatform: 'flipkart' },
  { key: '15', rank: 15, name: 'Tetrafin Goldfish Flakes 100g', sku: 'TF-GLD-100', category: 'Fish Food', stock: 290, avgPrice: 175, stockValue: 50750, unitsSold: 310, bestPlatform: 'meesho' },
];

const platformColors = { amazon: 'orange', flipkart: 'blue', meesho: 'pink', fifozone: 'green' };

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

const BestSellersPage = () => {
  const totalStockValue = mockProducts.reduce((s, p) => s + p.stockValue, 0);
  const avgPrice = Math.round(mockProducts.reduce((s, p) => s + p.avgPrice, 0) / mockProducts.length);

  const columns = [
    {
      title: '#',
      dataIndex: 'rank',
      key: 'rank',
      width: 50,
      render: (v) => (
        <span className={`font-bold text-base ${v <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
          {v <= 3 ? ['🥇', '🥈', '🥉'][v - 1] : v}
        </span>
      ),
    },
    {
      title: 'Product Name',
      dataIndex: 'name',
      key: 'name',
      render: (v) => <span className="font-semibold text-slate-800">{v}</span>,
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (v) => <span className="font-mono text-xs text-slate-500">{v}</span>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (v) => <Tag color="default" className="text-slate-600">{v}</Tag>,
    },
    {
      title: 'Stock',
      dataIndex: 'stock',
      key: 'stock',
      align: 'center',
      render: (v) => (
        <span className={`font-semibold ${v < 100 ? 'text-rose-500' : 'text-slate-700'}`}>{v}</span>
      ),
    },
    {
      title: 'Avg Price (₹)',
      dataIndex: 'avgPrice',
      key: 'avgPrice',
      align: 'right',
      render: (v) => <span className="text-slate-700">₹{v.toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Stock Value (₹)',
      dataIndex: 'stockValue',
      key: 'stockValue',
      align: 'right',
      render: (v) => <span className="font-bold text-slate-800">₹{v.toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Units Sold',
      dataIndex: 'unitsSold',
      key: 'unitsSold',
      align: 'center',
      render: (v) => <span className="font-semibold text-emerald-600">{v.toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Best Platform',
      dataIndex: 'bestPlatform',
      key: 'bestPlatform',
      render: (p) => (
        <Tag color={platformColors[p]} className="capitalize font-semibold">
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </Tag>
      ),
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Product Catalog</h1>
        <p className="text-slate-500 mt-1">Complete synced catalog with stock valuation</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Products"
          value={mockProducts.length}
          icon={Package}
          borderColor="border-blue-500"
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Total Stock Value (₹)"
          value={`₹${totalStockValue.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          borderColor="border-emerald-500"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Average Price (₹)"
          value={`₹${avgPrice.toLocaleString('en-IN')}`}
          icon={TagIcon}
          borderColor="border-violet-500"
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <Table
          columns={columns}
          dataSource={mockProducts}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1100 }}
        />
      </div>
    </div>
  );
};

export default BestSellersPage;
