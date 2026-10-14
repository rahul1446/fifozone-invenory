import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Table, Tag, Input, Button, Dropdown, Modal, Select, Tooltip } from 'antd';
import { 
  Search, Plus, Download, MoreVertical, Edit, Trash2, 
  Package, ExternalLink, AlertTriangle, CheckCircle, 
  RefreshCw, Filter, RotateCcw, Boxes
} from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { 
  getProductsApi, 
  bulkDeleteProductsApi, 
  bulkSyncProductsApi, 
  bulkEditProductsApi, 
  deleteProductApi 
} from '../../api/productApi';
import { formatCurrency } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';

const { confirm } = Modal;
const { Option } = Select;

const decodeHtml = (html) => {
  if (!html) return '';
  return html
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8217;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#8230;/g, '...');
};

const ProductsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialSearch = queryParams.get('search') || '';

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ total: 0, inStock: 0, lowStock: 0, outOfStock: 0 });
  const [categoriesList, setCategoriesList] = useState([]);
  const [brandsList, setBrandsList] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25, total: 0 });

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const debouncedSearch = useDebounce(searchTerm, 400);

  const [filters, setFilters] = useState({
    platform: 'All',
    stock: 'All',
    category: 'All',
    brand: 'All',
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [restockModalVisible, setRestockModalVisible] = useState(false);
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockLoading, setRestockLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // ── Fetch Products ────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async (page = 1, limit = 25) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
      };

      if (debouncedSearch && debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (filters.platform && filters.platform !== 'All') {
        params.platform = filters.platform;
      }
      if (filters.stock && filters.stock !== 'All') {
        params.stock = filters.stock;
      }
      if (filters.category && filters.category !== 'All') {
        params.category = filters.category;
      }
      if (filters.brand && filters.brand !== 'All') {
        params.brand = filters.brand;
      }

      const res = await getProductsApi(params);
      const data = res?.data || res;

      if (data && Array.isArray(data.products)) {
        setProducts(data.products);
        if (data.stats) setStats(data.stats);
        if (data.categories) setCategoriesList(data.categories.filter(Boolean));
        if (data.brands) setBrandsList(data.brands.filter(Boolean));
        if (data.pagination) {
          setPagination({
            current: data.pagination.page || page,
            pageSize: data.pagination.limit || limit,
            total: data.pagination.total || 0,
          });
        }
      } else if (Array.isArray(data)) {
        setProducts(data);
        setPagination(prev => ({ ...prev, total: data.length }));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters]);

  useEffect(() => {
    fetchProducts(1, pagination.pageSize);
  }, [debouncedSearch, filters]);

  const handleTableChange = (newPagination) => {
    fetchProducts(newPagination.current, newPagination.pageSize);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilters({
      platform: 'All',
      stock: 'All',
      category: 'All',
      brand: 'All',
    });
  };

  // ── Single & Bulk Delete ──────────────────────────────────────────────────
  const handleDelete = (id, name = 'this product') => {
    confirm({
      title: 'Are you sure you want to delete this product?',
      content: `"${name}" will be removed from your catalog and synced platforms.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteProductApi(id);
          toast.success('Product deleted successfully');
          fetchProducts(pagination.current, pagination.pageSize);
        } catch (error) {
          toast.error(error?.response?.data?.message || 'Deletion failed');
        }
      }
    });
  };

  const handleBulkDelete = () => {
    if (!selectedRowKeys.length) return;
    confirm({
      title: `Delete ${selectedRowKeys.length} selected products?`,
      content: 'This will remove the selected items from the catalog.',
      okText: 'Yes, Delete Selected',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await bulkDeleteProductsApi(selectedRowKeys);
          toast.success(`${selectedRowKeys.length} products deleted`);
          setSelectedRowKeys([]);
          fetchProducts(1, pagination.pageSize);
        } catch (error) {
          toast.error('Bulk deletion failed');
        }
      }
    });
  };

  // ── Quick Restock ─────────────────────────────────────────────────────────
  const handleRestock = async () => {
    if (!restockQty || isNaN(restockQty) || Number(restockQty) <= 0) {
      toast.error('Please enter a valid stock quantity');
      return;
    }
    setRestockLoading(true);
    try {
      await bulkEditProductsApi([restockProduct._id], { stockAddQty: Number(restockQty) });
      toast.success(`Added ${restockQty} units to ${restockProduct.masterName}`);
      setRestockModalVisible(false);
      setRestockQty('');
      setRestockProduct(null);
      fetchProducts(pagination.current, pagination.pageSize);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update stock');
    } finally {
      setRestockLoading(false);
    }
  };

  // ── Bulk Sync ─────────────────────────────────────────────────────────────
  const handleBulkSync = async () => {
    if (!selectedRowKeys.length) return;
    setSyncing(true);
    try {
      await bulkSyncProductsApi(selectedRowKeys);
      toast.success(`Initiated sync for ${selectedRowKeys.length} products`);
      setSelectedRowKeys([]);
      fetchProducts(pagination.current, pagination.pageSize);
    } catch (error) {
      toast.error('Failed to trigger bulk sync');
    } finally {
      setSyncing(false);
    }
  };

  // ── Export to Excel ───────────────────────────────────────────────────────
  const handleExport = () => {
    if (!products.length) {
      toast.error('No products to export');
      return;
    }
    const dataToExport = products.map((p, idx) => ({
      'S.No': idx + 1,
      'SKU': p.sku || '',
      'Product Name': decodeHtml(p.masterName || ''),
      'Brand': p.brand || '',
      'Category': Array.isArray(p.category) ? p.category.join(', ') : (p.category || ''),
      'MRP (₹)': p.mrp || 0,
      'Fifozone Price (₹)': p.sellingPrice?.fifozone || p.mrp || 0,
      'Total Stock': p.totalStock ?? 0,
      'Fifozone Stock': p.stockByPlatform?.fifozone ?? 0,
      'Amazon Stock': p.stockByPlatform?.amazon ?? 0,
      'Flipkart Stock': p.stockByPlatform?.flipkart ?? 0,
      'Meesho Stock': p.stockByPlatform?.meesho ?? 0,
      'Fifozone Status': p.platformStatus?.fifozone || 'not_listed',
      'Amazon Status': p.platformStatus?.amazon || 'not_listed',
      'Flipkart Status': p.platformStatus?.flipkart || 'not_listed',
      'Meesho Status': p.platformStatus?.meesho || 'not_listed',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, `Fifozone_Products_Catalog_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Product catalog exported successfully');
  };

  // ── Helper to resolve primary image URL ───────────────────────────────────
  const getProductImage = (record) => {
    if (!record?.images || !Array.isArray(record.images) || record.images.length === 0) return null;
    const primary = record.images.find(img => img && (img.isPrimary || img.url));
    const candidate = primary || record.images[0];
    if (typeof candidate === 'string') return candidate;
    return candidate?.url || null;
  };

  // ── Columns Definition ────────────────────────────────────────────────────
  const columns = [
    {
      title: 'PRODUCT DETAILS',
      key: 'productDetails',
      width: 420,
      render: (_, record) => {
        const imageUrl = getProductImage(record);
        return (
          <div className="flex items-center gap-3 py-1">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={record.masterName}
                loading="lazy"
                className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-white shrink-0 shadow-xs"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextSibling) {
                    e.currentTarget.nextSibling.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div 
              className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0" 
              style={{ display: imageUrl ? 'none' : 'flex' }}
            >
              <Package size={22} />
            </div>

            <div className="flex-1 min-w-0">
              <Link 
                to={`/inventory/products/${record._id}/edit`}
                className="font-semibold text-[13px] text-slate-800 hover:text-emerald-600 transition-colors line-clamp-1"
                title={record.masterName}
              >
                {decodeHtml(record.masterName)}
              </Link>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[11px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                  {record.sku || 'NO-SKU'}
                </span>
                {record.brand && record.brand !== 'Generic' && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    • {record.brand}
                  </span>
                )}
                {record.packSize && (
                  <span className="text-[11px] text-slate-400">
                    ({record.packSize})
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      title: 'CATEGORY',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (categories) => {
        const cat = Array.isArray(categories) && categories.length > 0 ? categories[0] : (categories || 'Uncategorized');
        const display = typeof cat === 'string' && cat.includes('|') ? cat.split('|')[1].trim() : cat;
        return (
          <span className="text-[12px] font-medium text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md inline-block max-w-[140px] truncate" title={display}>
            {display}
          </span>
        );
      }
    },
    {
      title: 'STOCK',
      key: 'stock',
      width: 140,
      render: (_, record) => {
        const stock = record.totalStock ?? 0;
        const lowThreshold = record.lowStockThreshold || 5;

        let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        let label = `${stock} in stock`;

        if (stock === 0) {
          badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
          label = 'Out of Stock';
        } else if (stock <= lowThreshold) {
          badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
          label = `${stock} low stock`;
        }

        return (
          <div className="flex flex-col items-start gap-1">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}>
              {label}
            </span>
            {record.stockByPlatform && (
              <span className="text-[10px] text-slate-400">
                FZ: {record.stockByPlatform.fifozone ?? 0} | AMZ: {record.stockByPlatform.amazon ?? 0} | FLK: {record.stockByPlatform.flipkart ?? 0}
              </span>
            )}
          </div>
        );
      }
    },
    {
      title: 'PRICING',
      key: 'pricing',
      width: 130,
      render: (_, record) => {
        const mrp = record.mrp || 0;
        const selling = record.sellingPrice?.fifozone || mrp;
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 text-[13px]">
              {formatCurrency(selling)}
            </span>
            {mrp > selling && (
              <span className="text-[11px] text-slate-400 line-through">
                MRP: {formatCurrency(mrp)}
              </span>
            )}
          </div>
        );
      }
    },
    {
      title: 'PLATFORMS',
      key: 'platforms',
      width: 150,
      render: (_, record) => {
        const platforms = [];
        if (record.platformStatus?.fifozone && record.platformStatus.fifozone !== 'not_listed') {
          platforms.push({ name: 'FZ', title: 'Fifozone', color: 'green' });
        }
        if (record.platformStatus?.amazon && record.platformStatus.amazon !== 'not_listed') {
          platforms.push({ name: 'AMZ', title: 'Amazon', color: 'orange' });
        }
        if (record.platformStatus?.flipkart && record.platformStatus.flipkart !== 'not_listed') {
          platforms.push({ name: 'FLK', title: 'Flipkart', color: 'blue' });
        }
        if (record.platformStatus?.meesho && record.platformStatus.meesho !== 'not_listed') {
          platforms.push({ name: 'MSH', title: 'Meesho', color: 'purple' });
        }

        if (platforms.length === 0) {
          return <span className="text-[11px] text-slate-400">None</span>;
        }

        return (
          <div className="flex items-center gap-1 flex-wrap">
            {platforms.map(p => (
              <Tooltip key={p.name} title={p.title}>
                <Tag color={p.color} className="m-0 text-[10px] font-bold px-1.5 py-0 border-0">
                  {p.name}
                </Tag>
              </Tooltip>
            ))}
          </div>
        );
      }
    },
    {
      title: 'LIVE',
      key: 'link',
      width: 60,
      align: 'center',
      render: (_, record) => {
        const url = record.platformIds?.fifozone?.url;
        if (!url) return <span className="text-slate-300 text-xs">—</span>;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-emerald-600 p-1.5 rounded hover:bg-slate-50 transition-colors inline-block"
            title="View on live Fifozone store"
          >
            <ExternalLink size={15} />
          </a>
        );
      }
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'edit',
                label: 'Edit Product',
                icon: <Edit size={14} />,
                onClick: () => navigate(`/inventory/products/${record._id}/edit`)
              },
              {
                key: 'restock',
                label: 'Add Stock',
                icon: <Boxes size={14} />,
                onClick: () => {
                  setRestockProduct(record);
                  setRestockQty('');
                  setRestockModalVisible(true);
                }
              },
              {
                type: 'divider'
              },
              {
                key: 'delete',
                label: 'Delete Product',
                danger: true,
                icon: <Trash2 size={14} />,
                onClick: () => handleDelete(record._id, record.masterName)
              }
            ]
          }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button type="text" size="small" icon={<MoreVertical size={16} className="text-slate-500" />} />
        </Dropdown>
      )
    }
  ];

  const totalProducts = stats.total || pagination.total || products.length || 0;
  const inStockCount = stats.inStock || 0;
  const lowStockCount = stats.lowStock || 0;
  const outOfStockCount = stats.outOfStock || 0;

  return (
    <div className="space-y-6 pb-12 max-w-[1500px] mx-auto px-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600">
            <Package size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Product Catalog</h1>
            <p className="text-sm text-slate-500 mt-0.5">High-speed catalog sync, multi-platform inventory, and pricing</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {selectedRowKeys.length > 0 && (
            <>
              <Button
                danger
                onClick={handleBulkDelete}
                className="h-10 px-4 rounded-xl font-medium"
              >
                Delete Selected ({selectedRowKeys.length})
              </Button>
              <Button
                onClick={handleBulkSync}
                loading={syncing}
                icon={<RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />}
                className="h-10 px-4 rounded-xl font-medium"
              >
                Sync Selected ({selectedRowKeys.length})
              </Button>
            </>
          )}

          <Button
            icon={<Download size={15} />}
            onClick={handleExport}
            className="h-10 px-4 text-slate-700 font-medium rounded-xl border-slate-200 hover:bg-slate-50 shadow-xs"
          >
            Export Excel
          </Button>

          <Button
            type="primary"
            icon={<Plus size={16} strokeWidth={2.5} />}
            onClick={() => navigate('/inventory/products/add')}
            className="h-10 px-5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 border-0 rounded-xl shadow-xs"
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">TOTAL PRODUCTS</p>
            <h3 className="text-2xl font-black text-slate-800">{totalProducts.toLocaleString()}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Package size={22} />
          </div>
        </div>

        {/* In Stock */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">IN STOCK</p>
            <h3 className="text-2xl font-black text-slate-800">{inStockCount.toLocaleString()}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle size={22} />
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">LOW STOCK</p>
            <h3 className="text-2xl font-black text-slate-800">{lowStockCount.toLocaleString()}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
            <AlertTriangle size={22} />
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">OUT OF STOCK</p>
            <h3 className="text-2xl font-black text-slate-800">{outOfStockCount.toLocaleString()}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
            <Package size={22} />
          </div>
        </div>
      </div>

      {/* Filters Bar & Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Filter Controls */}
        <div className="p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mr-1 uppercase tracking-wider">
              <Filter size={15} />
              <span>Filters:</span>
            </div>

            {/* Platform Filter */}
            <Select
              value={filters.platform}
              onChange={(val) => handleFilterChange('platform', val)}
              className="w-[145px]"
              size="middle"
              options={[
                { value: 'All', label: 'All Platforms' },
                { value: 'fifozone', label: 'Fifozone' },
                { value: 'amazon', label: 'Amazon' },
                { value: 'flipkart', label: 'Flipkart' },
                { value: 'meesho', label: 'Meesho' },
              ]}
            />

            {/* Stock Filter */}
            <Select
              value={filters.stock}
              onChange={(val) => handleFilterChange('stock', val)}
              className="w-[145px]"
              size="middle"
              options={[
                { value: 'All', label: 'All Stock Levels' },
                { value: 'In Stock', label: 'In Stock' },
                { value: 'Low Stock', label: 'Low Stock' },
                { value: 'Out of Stock', label: 'Out of Stock' },
              ]}
            />

            {/* Category Filter */}
            <Select
              value={filters.category}
              onChange={(val) => handleFilterChange('category', val)}
              className="w-[170px]"
              size="middle"
              showSearch
              placeholder="Category"
              optionFilterProp="children"
            >
              <Option value="All">All Categories</Option>
              {categoriesList.map(cat => (
                <Option key={cat} value={cat}>
                  {typeof cat === 'string' && cat.includes('|') ? cat.split('|')[1].trim() : cat}
                </Option>
              ))}
            </Select>

            {/* Brand Filter */}
            {brandsList.length > 0 && (
              <Select
                value={filters.brand}
                onChange={(val) => handleFilterChange('brand', val)}
                className="w-[150px]"
                size="middle"
                showSearch
                placeholder="Brand"
                optionFilterProp="children"
              >
                <Option value="All">All Brands</Option>
                {brandsList.map(b => (
                  <Option key={b} value={b}>{b}</Option>
                ))}
              </Select>
            )}

            {/* Search Input */}
            <div className="flex-1 min-w-[220px]">
              <Input
                placeholder="Search products by SKU, name, or barcode..."
                prefix={<Search size={16} className="text-slate-400 mr-1" />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
                className="rounded-xl border-slate-200 text-xs px-3 py-2 bg-slate-50/50 hover:border-emerald-300 focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Reset Button */}
            {(filters.platform !== 'All' || filters.stock !== 'All' || filters.category !== 'All' || filters.brand !== 'All' || searchTerm) && (
              <Button
                icon={<RotateCcw size={14} />}
                onClick={handleResetFilters}
                className="text-xs text-slate-500 hover:text-slate-800 rounded-xl"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Products Table */}
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: (newSelectedRowKeys) => setSelectedRowKeys(newSelectedRowKeys),
          }}
          columns={columns}
          dataSource={products}
          rowKey="_id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ['25', '50', '100', '250'],
            showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total} products`,
          }}
          loading={loading}
          onChange={handleTableChange}
          scroll={{ x: 1050 }}
          className="[&_.ant-table-thead_th]:bg-slate-50/70 [&_.ant-table-thead_th]:text-[11px] [&_.ant-table-thead_th]:font-bold [&_.ant-table-thead_th]:text-slate-500"
        />
      </div>

      {/* Restock Modal */}
      <Modal
        title="Quick Restock Product"
        open={restockModalVisible}
        onOk={handleRestock}
        confirmLoading={restockLoading}
        onCancel={() => {
          setRestockModalVisible(false);
          setRestockProduct(null);
          setRestockQty('');
        }}
        okText="Update Stock"
        okButtonProps={{ className: 'bg-emerald-600 hover:bg-emerald-500' }}
      >
        <div className="py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Product</p>
            <p className="text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {restockProduct?.masterName}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Current Stock</p>
            <p className="text-sm text-slate-700 font-bold">
              {restockProduct?.totalStock ?? 0} units
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Units to Add</p>
            <Input
              type="number"
              placeholder="e.g. 25"
              value={restockQty}
              onChange={e => setRestockQty(e.target.value)}
              onPressEnter={handleRestock}
              autoFocus
              className="rounded-lg"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductsPage;
