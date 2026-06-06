import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Spin, message } from 'antd';
import { TrendingUp, Package, AlertTriangle } from 'lucide-react';
import { getProductsApi } from '../../api/productApi';
import { setProductsStart, setProductsSuccess, setProductsFailure } from '../../store/productSlice';

const ProductPerformancePage = () => {
  const dispatch = useDispatch();
  
  const { products, pagination, stats, loading } = useSelector((state) => state.products);

  const [filters, setFilters] = useState({
    page: 1,
    limit: 25,
    sortField: 'soldThisMonth',
    sortOrder: 'desc',
  });

  const fetchProducts = useCallback(async () => {
    dispatch(setProductsStart());
    try {
      // we add sort params if backend supports it, but for now we rely on the standard fetch
      const response = await getProductsApi(filters);
      dispatch(setProductsSuccess(response.data));
    } catch (error) {
      dispatch(setProductsFailure(error.message));
      message.error('Failed to load product performance data');
    }
  }, [dispatch, filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleTableChange = (pagination) => {
    setFilters(prev => ({ ...prev, page: pagination.current, limit: pagination.pageSize }));
  };

  // Currently these stats are calculated locally for the current page since we don't have global performance stats yet.
  // Ideally, backend should send fast, slow, dead stats.
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
      render: (_, __, idx) => <span className="font-bold text-slate-400">#{(filters.page - 1) * filters.limit + idx + 1}</span>,
    },
    {
      title: 'Product Name',
      dataIndex: 'masterName',
      key: 'name',
      render: (text) => (
        <div className="min-w-0" style={{ maxWidth: '280px' }}>
          <p className="font-medium text-slate-800 text-sm truncate" title={text}>{text}</p>
        </div>
      ),
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
          <div><p className="text-slate-500 text-sm font-medium">Fast Sellers (Visible)</p><p className="font-bold text-2xl text-slate-800">{fast}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-amber-500 p-5 flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-full"><Package size={22} className="text-amber-600" /></div>
          <div><p className="text-slate-500 text-sm font-medium">Slow Sellers (Visible)</p><p className="font-bold text-2xl text-slate-800">{slow}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-rose-500 p-5 flex items-center gap-4">
          <div className="bg-rose-50 p-3 rounded-full"><AlertTriangle size={22} className="text-rose-600" /></div>
          <div><p className="text-slate-500 text-sm font-medium">Dead Stock (Visible)</p><p className="font-bold text-2xl text-slate-800">{dead}</p></div>
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
          pagination={{ 
            current: filters.page,
            pageSize: filters.limit,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ['25', '50', '100', '250'],
            showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total} products`
          }}
          onChange={handleTableChange}
          rowClassName="hover:bg-slate-50 transition-colors"
          className="text-sm"
          locale={{ emptyText: 'No product performance data available yet' }}
        />
      </div>
    </div>
  );
};

export default ProductPerformancePage;
