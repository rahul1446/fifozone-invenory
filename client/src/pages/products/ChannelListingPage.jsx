import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Spin, message, Input } from 'antd';
import { Link2, Package, Search, RefreshCw } from 'lucide-react';
import { getProductsApi } from '../../api/productApi';

const statusColor = { active: 'green', inactive: 'red', not_listed: 'default' };
const statusLabel = { active: 'Active', inactive: 'Inactive', not_listed: 'Not Listed' };

const ChannelListingPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await getProductsApi({ limit: 200 });
      const data = res?.data?.products || res?.products || (Array.isArray(res?.data) ? res.data : []);
      setProducts(data);
    } catch { message.error('Failed to load products'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const filtered = products.filter(p =>
    !search || p.masterName?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const PlatformDot = ({ status }) => (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : status === 'inactive' ? 'bg-rose-500' : 'bg-slate-300'}`} />
  );

  const columns = [
    {
      title: 'Product', key: 'product', width: 250,
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0"><Package size={14} className="text-slate-400" /></div>
          <div><p className="font-semibold text-slate-800 text-sm">{r.masterName}</p><p className="font-mono text-xs text-slate-400">{r.sku}</p></div>
        </div>
      )
    },
    {
      title: 'Fifozone', key: 'fifozone',
      render: (_, r) => {
        const s = r.platformStatus?.fifozone || 'not_listed';
        return <span className="flex items-center gap-1.5"><PlatformDot status={s} /><Tag color={statusColor[s]}>{statusLabel[s]}</Tag></span>;
      }
    },
    {
      title: 'Amazon', key: 'amazon',
      render: (_, r) => {
        const s = r.platformStatus?.amazon || 'not_listed';
        return <span className="flex items-center gap-1.5"><PlatformDot status={s} /><Tag color={statusColor[s]}>{statusLabel[s]}</Tag></span>;
      }
    },
    {
      title: 'Flipkart', key: 'flipkart',
      render: (_, r) => {
        const s = r.platformStatus?.flipkart || 'not_listed';
        return <span className="flex items-center gap-1.5"><PlatformDot status={s} /><Tag color={statusColor[s]}>{statusLabel[s]}</Tag></span>;
      }
    },
    {
      title: 'Meesho', key: 'meesho',
      render: (_, r) => {
        const s = r.platformStatus?.meesho || 'not_listed';
        return <span className="flex items-center gap-1.5"><PlatformDot status={s} /><Tag color={statusColor[s]}>{statusLabel[s]}</Tag></span>;
      }
    },
    { title: 'Total Stock', dataIndex: 'totalStock', key: 'stock', align: 'right', render: v => <span className={`font-bold ${(v || 0) < 10 ? 'text-rose-500' : 'text-emerald-600'}`}>{v || 0}</span> },
    {
      title: 'Action', key: 'action',
      render: (_, r) => <Button size="small" icon={<Link2 size={14} />} onClick={() => message.info('Use Edit Product to manage listings')}>Manage</Button>
    },
  ];

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Channel Listing</h1><p className="text-slate-500 text-sm mt-1">Product listing status across all platforms</p></div>
        <Button icon={<RefreshCw size={16} />} onClick={fetchProducts}>Refresh</Button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100"><Input prefix={<Search size={16} className="text-slate-400" />} placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" /></div>
        <Table columns={columns} dataSource={filtered} rowKey="_id" pagination={{ pageSize: 20, showTotal: t => `${t} products` }} scroll={{ x: 900 }} locale={{ emptyText: 'No products found' }} />
      </div>
    </div>
  );
};
export default ChannelListingPage;
