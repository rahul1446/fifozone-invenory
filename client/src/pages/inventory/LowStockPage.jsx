import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Tag, Button, Spin, message, Progress, Modal, Form, InputNumber } from 'antd';
import { AlertTriangle, Package, RefreshCw, Edit3 } from 'lucide-react';
import { getProductsApi, bulkEditProductsApi } from '../../api/productApi';
import { setProductsStart, setProductsSuccess, setProductsFailure } from '../../store/productSlice';
import { useNavigate } from 'react-router-dom';

const LowStockPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  
  const { products, pagination, stats, loading } = useSelector((state) => state.products);

  const [filters, setFilters] = useState({
    page: 1,
    limit: 25,
    stock: 'Attention Required',
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = useCallback(async () => {
    dispatch(setProductsStart());
    try {
      const response = await getProductsApi(filters);
      dispatch(setProductsSuccess(response.data));
    } catch (error) {
      dispatch(setProductsFailure(error.message));
      message.error('Failed to load low stock products');
    }
  }, [dispatch, filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleTableChange = (pagination) => {
    setFilters(prev => ({ ...prev, page: pagination.current, limit: pagination.pageSize }));
  };

  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const handleMassEdit = async (values) => {
    if (selectedRowKeys.length === 0) return;
    
    const updates = {};
    if (values.stockAddQty !== undefined && values.stockAddQty !== null) {
      updates.stockAddQty = values.stockAddQty;
    }
    if (values.lowStockThreshold !== undefined && values.lowStockThreshold !== null) {
      updates.lowStockThreshold = values.lowStockThreshold;
    }

    if (Object.keys(updates).length === 0) {
      message.warning('Please enter at least one value to update');
      return;
    }

    try {
      setIsSubmitting(true);
      await bulkEditProductsApi(selectedRowKeys, updates);
      message.success(`Successfully updated ${selectedRowKeys.length} products`);
      setIsModalVisible(false);
      setSelectedRowKeys([]);
      form.resetFields();
      fetchProducts();
    } catch (error) {
      message.error(error?.response?.data?.message || 'Failed to apply mass edit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Product', key: 'product',
      render: (_, r) => (
        <div className="flex items-center gap-3 py-1">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0"><Package size={16} className="text-slate-400" /></div>
          <div className="min-w-0" style={{ maxWidth: '250px' }}>
            <p className="font-semibold text-slate-800 text-sm truncate" title={r.masterName}>{r.masterName}</p>
            <p className="text-slate-400 text-xs font-mono truncate">{r.sku}</p>
          </div>
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
      render: (_, r) => <Button size="small" type="primary" className="!bg-emerald-600 !border-emerald-600" onClick={() => navigate(`/products/${r._id}/edit`)}>Restock</Button>
    },
  ];

  const totalOutOfStock = stats?.outOfStock || 0;
  const totalLowStock = stats?.lowStock || 0;
  const totalAlerts = totalOutOfStock + totalLowStock;

  return (
    <div className="space-y-6 pb-10 max-w-[1400px] mx-auto p-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle size={24} className="text-amber-500" />
          <div><h1 className="text-2xl font-bold text-slate-800">Low Stock Alerts</h1><p className="text-slate-500 text-sm">{totalAlerts} items need attention</p></div>
        </div>
        <div className="flex items-center gap-3">
          {selectedRowKeys.length > 0 && (
            <Button 
              type="primary" 
              icon={<Edit3 size={16} />} 
              onClick={() => setIsModalVisible(true)}
              className="!bg-blue-600"
            >
              Mass Edit ({selectedRowKeys.length})
            </Button>
          )}
          <Button icon={<RefreshCw size={16} />} onClick={fetchProducts} loading={loading}>Refresh</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-l-4 border-rose-500 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-rose-50 flex items-center justify-center"><Package size={20} className="text-rose-600" /></div>
          <div><p className="text-slate-500 text-sm">Out of Stock</p><p className="text-2xl font-bold text-rose-600">{totalOutOfStock}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-l-4 border-amber-500 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center"><AlertTriangle size={20} className="text-amber-600" /></div>
          <div><p className="text-slate-500 text-sm">Low Stock</p><p className="text-2xl font-bold text-amber-600">{totalLowStock}</p></div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table 
          rowSelection={rowSelection}
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
          scroll={{ x: 900 }} 
          locale={{ emptyText: 'All products have healthy stock levels!' }} 
          rowClassName={r => r.totalStock === 0 ? 'bg-rose-50' : 'hover:bg-slate-50/50 transition-colors'} 
          className="[&_.ant-table-thead_th]:bg-slate-50/50 [&_.ant-table-thead_th]:border-b [&_.ant-table-thead_th]:border-slate-100"
        />
      </div>

      <Modal
        title={`Mass Edit ${selectedRowKeys.length} Products`}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={isSubmitting}
        okText="Apply Changes"
        destroyOnClose
      >
        <p className="text-slate-500 text-sm mb-4">
          The values you enter below will be applied to all selected products. Leave a field blank to keep its current value.
        </p>
        <Form form={form} layout="vertical" onFinish={handleMassEdit}>
          <Form.Item 
            label="Add to Warehouse Stock" 
            name="stockAddQty"
            tooltip="Quickly add this quantity to the current stock. E.g. enter 10 to add 10 units."
          >
            <InputNumber placeholder="e.g. 50" style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item 
            label="Set Low Stock Threshold" 
            name="lowStockThreshold"
            tooltip="Set a new global threshold level for these products."
          >
            <InputNumber placeholder="e.g. 10" style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LowStockPage;
