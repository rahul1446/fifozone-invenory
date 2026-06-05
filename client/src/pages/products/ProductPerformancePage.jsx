import React, { useState, useEffect } from 'react';
import { Table, Spin, message } from 'antd';
import { TrendingUp, Package, AlertTriangle } from 'lucide-react';
import { getProductsApi } from '../../api/productApi';

const ProductPerformancePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getProductsApi({ limit: 200 });
        const data = res?.data?.products || res?.data || [];
        const arr = Array.isArray(data) ? data : [];
        // Sort by soldThisMonth desc
        arr.sort((a, b) => (b.soldThisMonth || 0) - (a.soldThisMonth || 0));
        setProducts(arr);
      } catch {
        message.error('Failed to load product performance data');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fast = products.filter(p => (p.soldThisMonth || 0) >= 10).length;
  const slow = products.filter(p => (p.soldThisMonth || 0) > 0 && (p.soldThisMonth || 0) < 10).length;
  const dead = products.filter(p => (p.soldThisMonth || 0) === 0).length;

  const getPerformanceTag = (sold) => {
    if (sold >= 10) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Fast</span>;
    if (sold > 0)   return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Slow</span>;
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">Dead</span>;
  };

  const columns = [
    {
      title: '#',
      key: 'rank',
      width: 50,
      render: (_, __, idx) => <span className="font-bold text-slate-400">#{idx + 1}</span>,
    },
    {
      title: 'Product Name',
      dataIndex: 'masterName',
      key: 'name',
      render: (text) => <span className="font-medium text-slate-800 text-sm">{text}</span>,
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (text) => <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{text || '—'}</span>,
    },
    {
      title: 'Units Sold (Month)',
      dataIndex: 'soldThisMonth',
      key: 'units',
      align: 'center',
      render: (v) => <span className="font-bold text-slate-700">{v || 0}</span>,
    },
    {
      title: 'Stock',
      dataIndex: 'totalStock',
      key: 'stock',
      align: 'center',
      render: (v) => <span className={`font-semibold ${v === 0 ? 'text-rose-500' : 'text-slate-700'}`}>{v ?? 0}</span>,
    },
    {
      title: 'MRP',
      dataIndex: 'mrp',
      key: 'mrp',
      align: 'right',
      render: (v) => <span className="font-medium text-slate-600">₹{(v || 0).toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Performance',
      key: 'performance',
      align: 'center',
      render: (_, r) => getPerformanceTag(r.soldThisMonth || 0),
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-slate-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Product Performance</h1>
        <p className="text-slate-500 mt-1 text-sm">Sales velocity and stock health based on real data</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-emerald-500 p-5 flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-full"><TrendingUp size={22} className="text-emerald-600" /></div>
          <div><p className="text-slate-500 text-sm font-medium">Fast Sellers</p><p className="font-bold text-2xl text-slate-800">{fast}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-amber-500 p-5 flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-full"><Package size={22} className="text-amber-600" /></div>
          <div><p className="text-slate-500 text-sm font-medium">Slow Sellers</p><p className="font-bold text-2xl text-slate-800">{slow}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-rose-500 p-5 flex items-center gap-4">
          <div className="bg-rose-50 p-3 rounded-full"><AlertTriangle size={22} className="text-rose-600" /></div>
          <div><p className="text-slate-500 text-sm font-medium">Dead Stock</p><p className="font-bold text-2xl text-slate-800">{dead}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Performance Breakdown</h2>
        <Table
          columns={columns}
          dataSource={products}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{ pageSize: 25, showSizeChanger: false, showTotal: (total) => `${total} products` }}
          rowClassName="hover:bg-slate-50 transition-colors"
          className="text-sm"
          locale={{ emptyText: 'No product performance data available yet' }}
        />
      </div>
    </div>
  );
};

export default ProductPerformancePage;
