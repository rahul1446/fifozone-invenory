import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Tag, Button, Input, message } from 'antd';
import { Link2, Package, Search, RefreshCw } from 'lucide-react';
import { getProductsApi } from '../../api/productApi';
import { setProductsStart, setProductsSuccess, setProductsFailure } from '../../store/productSlice';
import { useDebounce } from '../../hooks/useDebounce';
import { useNavigate } from 'react-router-dom';

const statusColor = { active: 'green', inactive: 'red', not_listed: 'default' };
const statusLabel = { active: 'Active', inactive: 'Inactive', not_listed: 'Not Listed' };

const ChannelListingPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { products, pagination, stats, loading } = useSelector((state) => state.products);
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);

  const [filters, setFilters] = useState({
    page: 1,
    limit: 25,
  });

  const fetchProducts = useCallback(async () => {
    dispatch(setProductsStart());
    try {
      const params = {
        ...filters,
        search: debouncedSearch,
      };
      const response = await getProductsApi(params);
      dispatch(setProductsSuccess(response.data));
    } catch (error) {
      dispatch(setProductsFailure(error.message));
      message.error('Failed to fetch products');
    }
  }, [dispatch, filters, debouncedSearch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleTableChange = (pagination) => {
    setFilters(prev => ({ ...prev, page: pagination.current, limit: pagination.pageSize }));
  };

  const PlatformDot = ({ status }) => (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : status === 'inactive' ? 'bg-rose-500' : 'bg-slate-300'}`} />
  );

  const columns = [
    {
      title: 'Product', key: 'product', width: 280,
      render: (_, r) => (
        <div className="flex items-center gap-3 py-1">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0"><Package size={14} className="text-slate-400" /></div>
          <div className="min-w-0 flex-1" style={{ maxWidth: '220px' }}>
            <p className="font-semibold text-slate-800 text-sm truncate" title={r.masterName}>{r.masterName}</p>
            <p className="font-mono text-xs text-slate-400 truncate">{r.sku}</p>
          </div>
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
      title: 'Action', key: 'action', align: 'center',
      render: (_, r) => <Button size="small" icon={<Link2 size={14} />} onClick={() => navigate(`/products/${r._id}/edit`)}>Manage</Button>
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Channel Listing</h1>
          <p className="text-slate-500 text-sm mt-1">Product listing status across all platforms</p>
        </div>
        <Button icon={<RefreshCw size={16} />} onClick={fetchProducts} loading={loading}>Refresh</Button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <Input 
            prefix={<Search size={16} className="text-slate-400" />} 
            placeholder="Search products..." 
            value={searchTerm} 
            onChange={e => { setSearchTerm(e.target.value); setFilters(prev => ({ ...prev, page: 1 })); }} 
            className="max-w-xs rounded-lg" 
          />
        </div>
        <Table 
          columns={columns} 
          dataSource={products} 
          rowKey="_id" 
          loading={loading}
          pagination={{ 
            current: filters.page,
            pageSize: filters.limit,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ['25', '50', '100', '250'],
            showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total} products`
          }} 
          onChange={handleTableChange}
          scroll={{ x: 1000 }} 
          locale={{ emptyText: 'No products found' }} 
          rowClassName="hover:bg-slate-50/50 transition-colors"
          className="[&_.ant-table-thead_th]:bg-slate-50/50 [&_.ant-table-thead_th]:border-b [&_.ant-table-thead_th]:border-slate-100"
        />
      </div>
    </div>
  );
};

export default ChannelListingPage;
