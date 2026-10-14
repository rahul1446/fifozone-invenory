import React, { useEffect, useState } from 'react';
import { getProductsApi, bulkDeleteProductsApi } from '../../api/productApi';
import { Table, Tag, Input, Button, Dropdown, Modal, Space } from 'antd';
import { Search, Plus, Download, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import toast from 'react-hot-toast';

const { confirm } = Modal;

const ProductsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialSearch = queryParams.get('search') || '';

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const debouncedSearch = useDebounce(searchTerm, 500);
  
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const fetchProducts = async (page = 1, limit = 20, search = '') => {
    setLoading(true);
    try {
      const res = await getProductsApi({ page, limit, search });
      setProducts(res.data.products);
      setPagination({
        current: res.data.pagination.page,
        pageSize: res.data.pagination.limit,
        total: res.data.pagination.total
      });
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(1, pagination.pageSize, debouncedSearch);
  }, [debouncedSearch]);

  const handleTableChange = (newPagination) => {
    fetchProducts(newPagination.current, newPagination.pageSize, debouncedSearch);
  };

  const handleDelete = (id) => {
    confirm({
      title: 'Are you sure you want to delete this product?',
      content: 'This action is reversible by admin only.',
      okText: 'Yes, delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await bulkDeleteProductsApi([id]);
          toast.success('Product deleted');
          fetchProducts(pagination.current, pagination.pageSize, debouncedSearch);
        } catch (error) {
          toast.error('Deletion failed');
        }
      }
    });
  };

  const columns = [
    {
      title: 'Product Details',
      dataIndex: 'masterName',
      key: 'masterName',
      render: (text, record) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">{text}</span>
          <span className="text-xs text-slate-500">SKU: {record.sku}</span>
        </div>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (text) => <Tag>{text || 'Uncategorized'}</Tag>
    },
    {
      title: 'Stock',
      dataIndex: 'totalStock',
      key: 'totalStock',
      render: (stock, record) => {
        let color = 'success';
        if (stock === 0) color = 'error';
        else if (stock <= record.lowStockThreshold) color = 'warning';
        return <Tag color={color}>{stock} units</Tag>;
      }
    },
    {
      title: 'Price (MRP)',
      dataIndex: 'mrp',
      key: 'mrp',
      render: (mrp) => <span className="font-medium text-slate-700">{formatCurrency(mrp)}</span>
    },
    {
      title: 'Platform Status',
      key: 'platforms',
      render: (_, record) => (
        <div className="flex gap-1">
          {record.platformStatus.fifozone === 'active' && <Tag color="blue">FC</Tag>}
          {record.platformStatus.amazon === 'active' && <Tag color="orange">AMZ</Tag>}
          {record.platformStatus.flipkart === 'active' && <Tag color="yellow">FL</Tag>}
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'edit',
                label: 'Edit Product',
                icon: <Edit size={14} />,
                onClick: () => navigate(`/inventory/products/edit/${record._id}`)
              },
              {
                key: 'delete',
                label: 'Delete',
                danger: true,
                icon: <Trash2 size={14} />,
                onClick: () => handleDelete(record._id)
              }
            ]
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreVertical size={16} className="text-slate-500" />} />
        </Dropdown>
      )
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Product Inventory</h1>
          <p className="text-sm text-slate-500">Manage catalog, stocks, and multi-channel pricing.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Input
            placeholder="Search SKUs, names..."
            prefix={<Search size={16} className="text-slate-400" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 rounded-lg"
          />
          <Button icon={<Download size={16} />} onClick={() => toast('Exporting CSV...')}>
            Export
          </Button>
          <Button type="primary" className="bg-emerald-700 hover:bg-emerald-600" icon={<Plus size={16} />} onClick={() => navigate('/inventory/products/add')}>
            Add Product
          </Button>
        </div>
      </div>

      <Table
        rowSelection={{
          selectedRowKeys,
          onChange: (newSelectedRowKeys) => setSelectedRowKeys(newSelectedRowKeys),
        }}
        columns={columns}
        dataSource={products}
        rowKey="_id"
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} items`
        }}
        loading={loading}
        onChange={handleTableChange}
        className="border border-slate-100 rounded-lg overflow-hidden"
      />
    </div>
  );
};

export default ProductsPage;
