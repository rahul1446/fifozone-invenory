import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Input, Spin, message } from 'antd';
import { TrendingUp, Search, Download } from 'lucide-react';
import { getProductsApi } from '../../api/productApi';

const MarginBadge = ({ margin }) => {
  if (!margin && margin !== 0) return <span className="text-slate-400 text-xs">—</span>;
  const color = margin >= 35 ? 'text-emerald-600 bg-emerald-50' : margin >= 20 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50';
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{margin}%</span>;
};

const PricingControlPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getProductsApi({ limit: 200 });
        const data = res?.data?.products || res?.data || [];
        setProducts(Array.isArray(data) ? data : []);
      } catch {
        message.error('Failed to load pricing data');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = products.filter(p =>
    (p.masterName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: 'Product Name',
      dataIndex: 'masterName',
      key: 'name',
      width: 280,
      render: (text) => <span className="font-medium text-slate-800 text-xs">{text}</span>,
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (text) => <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{text}</span>,
    },
    {
      title: 'MRP (₹)',
      dataIndex: 'mrp',
      key: 'mrp',
      align: 'right',
      render: (v) => <span className="font-medium text-slate-700">₹{(v || 0).toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Fifozone (₹)',
      key: 'fifozone',
      align: 'right',
      render: (_, r) => <span className="font-medium text-slate-700">₹{(r.sellingPrice?.fifozone || r.mrp || 0).toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Stock',
      dataIndex: 'totalStock',
      key: 'stock',
      align: 'right',
      render: (v) => <span className={`font-semibold ${v === 0 ? 'text-rose-500' : 'text-slate-700'}`}>{v ?? 0}</span>,
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-slate-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Pricing Management</h1>
        <p className="text-slate-500 mt-1 text-sm">Control pricing and margins across all channels</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-violet-500 p-5 flex items-center gap-4">
          <div className="bg-violet-50 p-3 rounded-full"><TrendingUp size={22} className="text-violet-600" /></div>
          <div><p className="text-slate-500 text-sm font-medium">Total Products</p><p className="font-bold text-2xl text-slate-800 mt-0.5">{products.length}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-emerald-500 p-5 flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-full"><TrendingUp size={22} className="text-emerald-600" /></div>
          <div><p className="text-slate-500 text-sm font-medium">In Stock</p><p className="font-bold text-2xl text-slate-800 mt-0.5">{products.filter(p => p.totalStock > 0).length}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-rose-500 p-5 flex items-center gap-4">
          <div className="bg-rose-50 p-3 rounded-full"><TrendingUp size={22} className="text-rose-600" /></div>
          <div><p className="text-slate-500 text-sm font-medium">Out of Stock</p><p className="font-bold text-2xl text-slate-800 mt-0.5">{products.filter(p => p.totalStock === 0).length}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-700">Pricing Overview</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Search product or SKU..."
              prefix={<Search size={14} className="text-slate-400" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 rounded-lg text-sm"
            />
            <Button icon={<Download size={14} />} className="rounded-lg border-slate-200 text-slate-600">Export</Button>
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="_id"
          loading={loading}
          scroll={{ x: 700 }}
          pagination={{ pageSize: 25, showSizeChanger: false, showTotal: (total) => `${total} products` }}
          rowClassName="hover:bg-slate-50 transition-colors"
          className="text-sm"
          locale={{ emptyText: 'No products found' }}
        />
      </div>
    </div>
  );
};

export default PricingControlPage;
