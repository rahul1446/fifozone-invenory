import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, Form, Input, InputNumber, Select, Spin, message, Progress } from 'antd';
import { AlertTriangle, Package, RefreshCw } from 'lucide-react';
import { getProductsApi } from '../../api/productApi';

const { Option } = Select;

const LowStockPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await getProductsApi({ stock: 'Low Stock', limit: 200 });
      let data = res?.data?.products || res?.products || (Array.isArray(res?.data) ? res.data : []);
      if (data.length === 0) {
        // Fallback: fetch all and filter client-side
        const res2 = await getProductsApi({ limit: 500 });
        const all = res2?.data?.products || res2?.products || (Array.isArray(res2?.data) ? res2.data : []);
        data = all.filter(p => p.totalStock <= (p.lowStockThreshold || 10));
      }
      setProducts(data);
    } catch { message.error('Failed to load low stock products'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const critical = products.filter(p => p.totalStock === 0);
  const low = products.filter(p => p.totalStock > 0);

  const columns = [
    {
      title: 'Product', key: 'product',
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0"><Package size={16} className="text-slate-400" /></div>
          <div><p className="font-semibold text-slate-800 text-sm">{r.masterName}</p><p className="text-slate-400 text-xs font-mono">{r.sku}</p></div>
        </div>
      )
    },
    {
      title: 'Stock Level', key: 'stock', width: 220,
      render: (_, r) => {
        const threshold = r.lowStockThreshold || 10;
        const pct = Math.min(100, Math.round((r.totalStock / (threshold * 2)) * 100));
        const color = r.totalStock === 0 ? '#f43f5e' : r.totalStock < threshold ? '#f59e0b' : '#10b981';
        return (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600">{r.totalStock} / {threshold}</span>
              <span style={{ color }} className="font-semibold">{r.totalStock === 0 ? 'OUT OF STOCK' : 'LOW'}</span>
            </div>
            <Progress percent={pct} strokeColor={color} size="small" showInfo={false} />
          </div>
        );
      }
    },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', render: v => v || '—' },
    { title: 'Category', dataIndex: 'category', key: 'category', render: v => v || '—' },
    { title: 'MRP', dataIndex: 'mrp', key: 'mrp', render: v => <span>&#8377;{(v || 0).toLocaleString('en-IN')}</span> },
    {
      title: 'Status', key: 'status',
      render: (_, r) => <Tag color={r.totalStock === 0 ? 'red' : 'gold'}>{r.totalStock === 0 ? 'Out of Stock' : 'Low Stock'}</Tag>
    },
    {
      title: 'Action', key: 'action',
      render: () => <Button size="small" type="primary" className="!bg-emerald-600 !border-emerald-600" onClick={() => message.info('Go to Stock Adjustment to restock')}>Restock</Button>
    },
  ];

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle size={24} className="text-amber-500" />
          <div><h1 className="text-2xl font-bold text-slate-800">Low Stock Alerts</h1><p className="text-slate-500 text-sm">{products.length} items need attention</p></div>
        </div>
        <Button icon={<RefreshCw size={16} />} onClick={fetchProducts}>Refresh</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-l-4 border-rose-500 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-rose-50 flex items-center justify-center"><Package size={20} className="text-rose-600" /></div>
          <div><p className="text-slate-500 text-sm">Out of Stock</p><p className="text-2xl font-bold text-rose-600">{critical.length}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-l-4 border-amber-500 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center"><AlertTriangle size={20} className="text-amber-600" /></div>
          <div><p className="text-slate-500 text-sm">Low Stock</p><p className="text-2xl font-bold text-amber-600">{low.length}</p></div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table columns={columns} dataSource={products} rowKey="_id" pagination={{ pageSize: 20, showTotal: t => `${t} products` }} scroll={{ x: 900 }} locale={{ emptyText: 'All products have healthy stock levels!' }} rowClassName={r => r.totalStock === 0 ? 'bg-rose-50' : ''} />
      </div>
    </div>
  );
};
export default LowStockPage;
