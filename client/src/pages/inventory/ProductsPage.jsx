import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Table, Select, Button, Input, message } from 'antd';
import { Package, Plus, Search, Filter, Download, Eye, AlertTriangle } from 'lucide-react';
import { getProductsApi } from '../../api/productApi';
import { setProductsStart, setProductsSuccess, setProductsFailure } from '../../store/productSlice';
import { useDebounce } from '../../hooks/useDebounce';

const { Option } = Select;

const decodeHtml = (html) => html ? html.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'") : '';

const ProductsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { products, pagination, loading } = useSelector((state) => state.products);
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchTerm, 400);

  const [filters, setFilters] = useState({
    stock: 'All',
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

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const columns = [
    {
      title: <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">PRODUCT</span>,
      dataIndex: 'masterName',
      key: 'product',
      width: 450,
      render: (text, record) => {
        const primaryImage = record.images?.find((img) => img.isPrimary)?.url || record.images?.[0]?.url;
        return (
          <div className="flex items-center gap-3 py-1">
            {primaryImage ? (
              <img src={primaryImage} alt="Product" className="w-10 h-10 object-cover rounded border border-slate-200" />
            ) : (
              <div className="w-10 h-10 bg-slate-50 rounded flex items-center justify-center text-slate-300 border border-slate-200">
                <Package size={20} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <Link to={`/inventory/products/${record._id}/edit`} className="font-semibold text-[13px] text-slate-800 hover:text-indigo-600 transition-colors line-clamp-1">
                {decodeHtml(text)}
              </Link>
              <div className="text-[11px] text-slate-500 mt-0.5 font-medium">{record.sku || 'N/A'}{record.packSize ? ` - ${record.packSize}` : ''}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">CATEGORY</span>,
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (categories) => {
        const cat = categories && categories.length > 0 ? categories[0] : 'OTHER_PET';
        return <span className="text-[12px] font-semibold text-slate-600 uppercase tracking-tight">{typeof cat === 'string' && cat.includes('|') ? cat.split('|')[1] : cat}</span>;
      },
    },
    {
      title: <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">PRICE</span>,
      dataIndex: 'mrp',
      key: 'price',
      width: 100,
      render: (val, record) => <span className="text-[13px] font-medium text-slate-700">₹{val || record.sellingPrice?.fifozone || 0}</span>,
    },
    {
      title: <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">COST</span>,
      key: 'cost',
      width: 100,
      render: () => <span className="text-[13px] font-medium text-slate-400">₹0</span>,
    },
    {
      title: <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">STOCK</span>,
      key: 'totalStock',
      width: 100,
      render: (_, record) => (
        <span className="text-[13px] font-bold text-slate-800">{record.totalStock || 0}</span>
      ),
    },
    {
      title: <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">STATUS</span>,
      key: 'status',
      width: 100,
      render: () => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
          Active
        </span>
      ),
    },
    {
      title: <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ACTIONS</span>,
      key: 'actions',
      width: 80,
      render: () => (
        <Button type="text" size="small" icon={<Eye size={16} className="text-slate-600 hover:text-indigo-600 transition-colors" />} />
      ),
    },
  ];

  const totalProducts = pagination?.total || 0;
  const inStockCount = products?.filter(p => p.totalStock > 0).length || 0;
  const lowStockCount = products?.filter(p => p.totalStock > 0 && p.totalStock <= 5).length || 0;
  const outOfStockCount = products?.filter(p => p.totalStock === 0).length || 0;

  return (
    <div className="space-y-6 animate-fade-in pb-10 max-w-[1400px] mx-auto p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
            <Package size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">All Products</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your product catalog — synced from FifoZone</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            icon={<Download size={15} />} 
            className="h-10 px-5 text-[13px] font-semibold text-slate-700 rounded-xl border-slate-200 hover:bg-slate-50 shadow-sm"
          >
            Export
          </Button>
          <Button 
            type="primary" 
            icon={<Plus size={15} strokeWidth={3} />} 
            onClick={() => navigate('/inventory/products/add')} 
            className="h-10 px-5 text-[13px] font-semibold bg-indigo-500 border-indigo-500 hover:bg-indigo-600 hover:border-indigo-600 rounded-xl shadow-sm"
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">TOTAL PRODUCTS</p>
            <h3 className="text-2xl font-black text-slate-800">{totalProducts.toLocaleString()}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <Package size={20} className="text-indigo-600" />
          </div>
        </div>

        {/* In Stock */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">IN STOCK</p>
            <h3 className="text-2xl font-black text-slate-800">{inStockCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Package size={20} className="text-emerald-600" />
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">LOW STOCK</p>
            <h3 className="text-2xl font-black text-slate-800">{lowStockCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-amber-500" />
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">OUT OF STOCK</p>
            <h3 className="text-2xl font-black text-slate-800">{outOfStockCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
            <Package size={20} className="text-rose-500" />
          </div>
        </div>
      </div>

      {/* Filters & Search & Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 pt-5 pb-4 space-y-4">
          {/* Filters Row */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-slate-500 text-[13px] font-medium mr-2">
              <Filter size={16} />
              Filters
            </div>
            <Select
              value={filters.stock}
              onChange={(val) => handleFilterChange('stock', val)}
              className="w-[140px]"
              size="middle"
              options={[
                { value: 'All', label: 'Stock Status' },
                { value: 'In Stock', label: 'In Stock' },
                { value: 'Low Stock', label: 'Low Stock' },
                { value: 'Out of Stock', label: 'Out of Stock' },
              ]}
            />
          </div>
          
          {/* Search Row */}
          <div className="w-full max-w-md">
            <Input
              placeholder="Search products..."
              prefix={<Search size={16} className="text-slate-400 mr-1" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-xl border-slate-200 text-[13px] px-3 py-2 bg-slate-50/50 hover:border-indigo-300 focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={products}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ['25', '50', '100'],
            showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total} products`,
            onChange: (page, pageSize) => {
              setFilters(prev => ({ ...prev, page, limit: pageSize }));
            }
          }}
          scroll={{ x: 1000 }}
          className="premium-table border-t border-slate-100"
        />
      </div>

    </div>
  );
};

export default ProductsPage;
