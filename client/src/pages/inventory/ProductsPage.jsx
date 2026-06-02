import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Table, Select, Button, Input, Tag, Dropdown, Space, Modal, message } from 'antd';
import { Package, Plus, MoreHorizontal, Search, Filter, Download, Trash2, RefreshCw } from 'lucide-react';
import {
  getProductsApi,
  deleteProductApi,
  bulkDeleteProductsApi,
  bulkSyncProductsApi,
} from '../../api/productApi';
import { setProductsStart, setProductsSuccess, setProductsFailure } from '../../store/productSlice';
import { formatCurrency } from '../../utils/formatters';
import BulkEditModal from '../../components/inventory/BulkEditModal';
import StockUpdateModal from '../../components/inventory/StockUpdateModal';
import { useDebounce } from '../../hooks/useDebounce';

const { Option } = Select;

const ProductsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { products, categories, brands, pagination, loading } = useSelector((state) => state.products);

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [stockModalProduct, setStockModalProduct] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchTerm, 400);

  const [filters, setFilters] = useState({
    platform: 'All',
    status: 'All',
    category: 'All',
    brand: 'All',
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

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      platform: 'All',
      status: 'All',
      category: 'All',
      brand: 'All',
      stock: 'All',
      page: 1,
      limit: 25,
    });
    setSearchParams({});
  };

  const handleBulkDelete = () => {
    Modal.confirm({
      title: 'Are you sure you want to delete these products?',
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await bulkDeleteProductsApi(selectedRowKeys);
          message.success('Selected products deleted');
          setSelectedRowKeys([]);
          fetchProducts();
        } catch (error) {
          message.error('Failed to delete products');
        }
      },
    });
  };

  const handleBulkSync = async () => {
    try {
      await bulkSyncProductsApi(selectedRowKeys);
      message.success('Sync triggered for selected products');
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('Failed to trigger bulk sync');
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this product?',
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteProductApi(id);
          message.success('Product deleted');
          fetchProducts();
        } catch (error) {
          message.error('Failed to delete product');
        }
      },
    });
  };


  const PLATFORM_BADGE = {
    fifozone:  { label: 'Fifozone',  active: 'bg-purple-100 text-purple-700 border-purple-200', inactive: 'bg-slate-100 text-slate-400 border-slate-200' },
    amazon:    { label: 'Amazon',    active: 'bg-orange-100 text-orange-700 border-orange-200', inactive: 'bg-slate-100 text-slate-400 border-slate-200' },
    flipkart:  { label: 'Flipkart',  active: 'bg-yellow-100 text-yellow-700 border-yellow-200', inactive: 'bg-slate-100 text-slate-400 border-slate-200' },
    meesho:    { label: 'Meesho',    active: 'bg-pink-100 text-pink-700 border-pink-200',       inactive: 'bg-slate-100 text-slate-400 border-slate-200' },
  };

  const columns = [
    {
      title: 'Image',
      dataIndex: 'images',
      key: 'image',
      width: 60,
      render: (images) => {
        const primaryImage = images?.find((img) => img.isPrimary)?.url || images?.[0]?.url;
        return primaryImage ? (
          <img src={primaryImage} alt="Product" className="w-10 h-10 object-cover rounded-md border border-slate-200" />
        ) : (
          <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center text-slate-400 border border-slate-200">
            <Package size={20} />
          </div>
        );
      },
    },
    {
      title: 'Product Name',
      dataIndex: 'masterName',
      key: 'name',
      render: (text, record) => (
        <Link to={`/inventory/products/${record._id}/edit`} className="font-semibold text-brand-800 hover:text-brand-600 transition-colors">
          {text}
        </Link>
      ),
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (text) => <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{text}</span>,
    },
    {
      title: 'Brand',
      dataIndex: 'brand',
      key: 'brand',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: 'Listed On',
      key: 'platformStatus',
      width: 200,
      render: (_, record) => {
        const ps = record.platformStatus || {};
        return (
          <div className="flex flex-wrap gap-1">
            {['fifozone', 'amazon', 'flipkart', 'meesho'].map((p) => {
              const status = ps[p];
              if (!status || status === 'not_listed') return null;
              const cfg = PLATFORM_BADGE[p];
              const isActive = status === 'active';
              return (
                <span
                  key={p}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    isActive ? cfg.active : cfg.inactive
                  }`}
                  title={`${cfg.label}: ${status}`}
                >
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-1 opacity-70" />
                  )}
                  {cfg.label}
                </span>
              );
            })}
            {Object.values(ps).every(v => !v || v === 'not_listed') && (
              <span className="text-xs text-slate-400 italic">Not listed</span>
            )}
          </div>
        );
      },
    },
    {
      title: 'MRP',
      dataIndex: 'mrp',
      key: 'mrp',
      render: (val) => formatCurrency(val),
    },
    {
      title: 'Stock',
      key: 'totalStock',
      render: (_, record) => {
        const isLow = record.totalStock <= record.lowStockThreshold;
        return (
          <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-emerald-600'}`}>
            {record.totalStock}
          </span>
        );
      },
    },
    {
      title: 'Sold (Month)',
      dataIndex: 'soldThisMonth',
      key: 'soldThisMonth',
    },
    {
      title: 'Dead?',
      dataIndex: 'isDead',
      key: 'isDead',
      render: (isDead) => (
        <Tag color={isDead ? 'error' : 'success'} className="rounded-full px-2.5 font-medium border-0">
          {isDead ? 'Dead' : 'Active'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
      {
        key: 'edit',
        label: <Link to={`/inventory/products/${record._id}/edit`}>Edit</Link>,
      },
      {
        key: 'restock',
        label: 'Restock / Update Stock',
        onClick: () => setStockModalProduct(record),
      },
      {
        key: 'delete',
        label: 'Delete',
        danger: true,
        onClick: () => handleDelete(record._id),
      },
            ],
          }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button type="text" icon={<MoreHorizontal size={18} className="text-slate-500" />} />
        </Dropdown>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Products</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your inventory across Fifozone, Amazon, Flipkart &amp; Meesho</p>
        </div>
        <div className="flex items-center gap-3">
          <Button icon={<Download size={16} />}>Export</Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={() => navigate('/inventory/products/add')} className="bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/20">
            Add Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            placeholder="Search by name, SKU, brand, barcode..."
            prefix={<Search size={16} className="text-slate-400" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="lg:col-span-2 rounded-lg"
          />
          <Select
            value={filters.platform}
            onChange={(val) => handleFilterChange('platform', val)}
            className="w-full"
            options={[
              { value: 'All', label: 'All Platforms' },
              { value: 'Fifozone', label: 'Fifozone' },
              { value: 'Amazon', label: 'Amazon' },
              { value: 'Flipkart', label: 'Flipkart' },
              { value: 'Meesho', label: 'Meesho' },
            ]}
          />
          <Select
            value={filters.category}
            onChange={(val) => handleFilterChange('category', val)}
            className="w-full"
            showSearch
            options={[{ value: 'All', label: 'All Categories' }, ...categories.map(c => ({ value: c, label: c }))]}
          />
          <Select
            value={filters.stock}
            onChange={(val) => handleFilterChange('stock', val)}
            className="w-full"
            options={[
              { value: 'All', label: 'All Stock Levels' },
              { value: 'Low Stock', label: 'Low Stock' },
              { value: 'Out of Stock', label: 'Out of Stock' },
              { value: 'In Stock', label: 'In Stock' },
            ]}
          />
        </div>
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-500">
            <Filter size={14} className="inline mr-1.5 align-text-bottom" />
            Filters active
          </div>
          <Button type="link" onClick={clearFilters} className="text-slate-500 hover:text-slate-800 px-0">
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedRowKeys.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between animate-fade-in shadow-sm">
          <span className="font-medium text-emerald-800 ml-2">{selectedRowKeys.length} products selected</span>
          <div className="flex gap-2">
            <Button onClick={() => setBulkEditOpen(true)} className="border-emerald-300 text-emerald-700 hover:text-emerald-800 hover:border-emerald-400">Bulk Edit</Button>
            <Button onClick={handleBulkSync} icon={<RefreshCw size={14} />} className="border-emerald-300 text-emerald-700 hover:text-emerald-800 hover:border-emerald-400">Sync</Button>
            <Button danger icon={<Trash2 size={14} />} onClick={handleBulkDelete}>Delete</Button>
            <Button type="text" onClick={() => setSelectedRowKeys([])} className="text-emerald-700">Clear</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table
          rowSelection={rowSelection}
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
          className="premium-table"
        />
      </div>

      <BulkEditModal
        open={bulkEditOpen}
        onClose={() => setBulkEditOpen(false)}
        selectedProducts={products.filter(p => selectedRowKeys.includes(p._id))}
        onSuccess={() => {
          setSelectedRowKeys([]);
          setBulkEditOpen(false);
          fetchProducts();
        }}
      />

      <StockUpdateModal
        open={!!stockModalProduct}
        product={stockModalProduct}
        onClose={() => setStockModalProduct(null)}
        onSuccess={() => { setStockModalProduct(null); fetchProducts(); }}
      />
    </div>
  );
};

export default ProductsPage;
