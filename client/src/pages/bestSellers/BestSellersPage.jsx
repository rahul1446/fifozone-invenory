import React, { useState, useEffect } from 'react';
import { Table, Tag, Spin, message, Input } from 'antd';
import { Award, TrendingUp, Package, Search } from 'lucide-react';
import { getProductsApi } from '../../api/productApi';

const medalEmoji = ['🥇', '🥈', '🥉'];

const BestSellersPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await getProductsApi({ sort: '-soldThisMonth', limit: 50 });
        let data = res?.data?.products || res?.products || (Array.isArray(res?.data) ? res.data : []);
        data = data
          .filter(p => p.soldThisMonth > 0 || p.totalStock > 0)
          .sort((a, b) => (b.soldThisMonth || 0) - (a.soldThisMonth || 0));
        setProducts(data);
      } catch { message.error('Failed to load best sellers'); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = products.filter(p =>
    !search || p.masterName?.toLowerCase().includes(search.toLowerCase()) || p.brand?.toLowerCase().includes(search.toLowerCase())
  );

  const totalSold = filtered.reduce((s, p) => s + (p.soldThisMonth || 0), 0);
  const totalRevenue = filtered.reduce((s, p) => s + ((p.soldThisMonth || 0) * (p.mrp || 0)), 0);

  const columns = [
    {
      title: 'Rank', key: 'rank', width: 70,
      render: (_, __, idx) => (
        <span className="font-bold text-2xl">{medalEmoji[idx] || `#${idx + 1}`}</span>
      )
    },
    {
      title: 'Product', key: 'product',
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"><Package size={16} className="text-slate-400" /></div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{r.masterName}</p>
            <p className="text-slate-400 text-xs font-mono">{r.sku}</p>
          </div>
        </div>
      )
    },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', render: v => v || '—' },
    { title: 'Category', dataIndex: 'category', key: 'category', render: v => v ? <Tag>{v}</Tag> : '—' },
    {
      title: 'Units Sold (Month)', dataIndex: 'soldThisMonth', key: 'sold',
      align: 'right',
      render: v => (
        <div className="flex items-center justify-end gap-2">
          <div className="w-20 bg-slate-100 rounded-full h-2">
            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, ((v || 0) / (products[0]?.soldThisMonth || 1)) * 100)}%` }} />
          </div>
          <span className="font-bold text-slate-800 w-8 text-right">{v || 0}</span>
        </div>
      )
    },
    { title: 'MRP', dataIndex: 'mrp', key: 'mrp', align: 'right', render: v => <span>&#8377;{(v || 0).toLocaleString('en-IN')}</span> },
    { title: 'Stock', dataIndex: 'totalStock', key: 'stock', align: 'right', render: v => <span className={`font-semibold ${(v || 0) < 10 ? 'text-rose-500' : 'text-emerald-600'}`}>{v || 0}</span> },
  ];

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Award size={24} className="text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Best Sellers</h1>
          <p className="text-slate-500 text-sm">Top performing products this month</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Best Sellers Listed', value: filtered.length, icon: <Award size={20} className="text-amber-600" />, border: 'border-amber-500', bg: 'bg-amber-50' },
          { label: 'Total Units Sold', value: totalSold, icon: <TrendingUp size={20} className="text-emerald-600" />, border: 'border-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Est. Revenue', value: `\u20b9${totalRevenue.toLocaleString('en-IN')}`, icon: <Package size={20} className="text-blue-600" />, border: 'border-blue-500', bg: 'bg-blue-50' },
        ].map(c => (
          <div key={c.label} className={`bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 ${c.border} p-5 flex items-center gap-4`}>
            <div className={`w-11 h-11 rounded-full ${c.bg} flex items-center justify-center`}>{c.icon}</div>
            <div><p className="text-slate-500 text-sm">{c.label}</p><p className="text-2xl font-bold text-slate-800 mt-0.5">{c.value}</p></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100"><Input prefix={<Search size={16} className="text-slate-400" />} placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" /></div>
        <Table columns={columns} dataSource={filtered} rowKey="_id" pagination={{ pageSize: 20, showTotal: t => `${t} products` }} locale={{ emptyText: 'No products with sales data yet' }} />
      </div>
    </div>
  );
};
export default BestSellersPage;
