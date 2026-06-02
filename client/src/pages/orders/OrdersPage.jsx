import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Table, Select, Button, Input, Tag, Dropdown, DatePicker, Tooltip, message, Modal } from 'antd';
import { Search, Phone, MoreHorizontal, RefreshCw } from 'lucide-react';
import { getOrdersApi, updateOrderStatusApi, bulkUpdateOrderStatusApi } from '../../api/orderApi';
import { setOrdersStart, setOrdersSuccess, setOrdersFailure } from '../../store/orderSlice';
import { formatCurrency, formatDate } from '../../utils/formatters';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

const OrdersPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { orders, pagination, loading } = useSelector(state => state.orders);

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [updateNote, setUpdateNote] = useState('');

  const [filters, setFilters] = useState({
    search: '',
    platform: 'All',
    status: 'All',
    paymentStatus: 'All',
    page: 1,
    limit: 20
  });

  const fetchOrders = useCallback(async () => {
    dispatch(setOrdersStart());
    try {
      const response = await getOrdersApi(filters);
      dispatch(setOrdersSuccess(response.data));
    } catch (error) {
      dispatch(setOrdersFailure(error.message));
      message.error('Failed to fetch orders');
    }
  }, [dispatch, filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '', platform: 'All', status: 'All', paymentStatus: 'All', page: 1, limit: 20
    });
  };

  const openOrderDetails = (id) => {
    navigate(`/orders/${id}`);
  };

  const handleStatusUpdate = async (orderId, status, extraData = {}) => {
    try {
      await updateOrderStatusApi(orderId, { status, note: updateNote, ...extraData });
      message.success(`Order marked as ${status}`);
      setUpdateNote('');
      fetchOrders();
      if (drawerOpen && selectedOrder?._id === orderId) {
        openOrderDetails(orderId); // Refresh drawer
      }
    } catch (error) {
      message.error('Failed to update order status');
    }
  };

  const promptShippingDetails = (orderId) => {
    let trackingNumber = '';
    let courierPartner = '';
    Modal.confirm({
      title: 'Mark as Shipped',
      content: (
        <div className="space-y-4 mt-4">
          <Input placeholder="Courier Partner (e.g. BlueDart)" onChange={e => courierPartner = e.target.value} />
          <Input placeholder="Tracking Number" onChange={e => trackingNumber = e.target.value} />
        </div>
      ),
      onOk: () => handleStatusUpdate(orderId, 'shipped', { trackingNumber, courierPartner })
    });
  };

  const handleBulkUpdate = async (status) => {
    try {
      await bulkUpdateOrderStatusApi(selectedRowKeys, status);
      message.success(`Selected orders marked as ${status}`);
      setSelectedRowKeys([]);
      fetchOrders();
    } catch (error) {
      message.error('Bulk update failed');
    }
  };

  const getPlatformTag = (platform) => {
    const map = { fifozone: { c: 'green', l: 'Fifozone' }, amazon: { c: 'orange', l: 'Amazon' }, flipkart: { c: 'gold', l: 'Flipkart' } };
    const p = map[platform];
    return p ? <Tag color={p.c}>{p.l}</Tag> : <Tag>{platform}</Tag>;
  };

  const getStatusTag = (status) => {
    const map = {
      pending: 'default', confirmed: 'blue', processing: 'cyan', shipped: 'purple',
      out_for_delivery: 'gold', delivered: 'green', cancelled: 'red', return_requested: 'orange', returned: 'volcano'
    };
    return <Tag color={map[status]}>{status.replace('_', ' ').toUpperCase()}</Tag>;
  };

  const columns = [
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      render: (text, record) => <span className="font-semibold cursor-pointer text-brand-700" onClick={() => openOrderDetails(record._id)}>{text}</span>
    },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      render: (val) => getPlatformTag(val)
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      render: (val) => formatDate(val)
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) => record.customer?.name || record.customerInfo?.name || '—'
    },
    {
      title: 'Phone',
      key: 'phone',
      render: (_, record) => {
        const phone = record.customer?.phone || record.customerInfo?.phone;
        if (!phone) return '-';
        return (
          <a href={`https://wa.me/91${phone}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700">
            <Phone size={14} /> {phone}
          </a>
        );
      }
    },
    {
      title: 'Items',
      key: 'items',
      render: (_, record) => (
        <Tooltip title={record.items.map(i => i.productName).join(', ')}>
          <span className="cursor-help border-b border-dashed border-slate-400">{record.items.length} items</span>
        </Tooltip>
      )
    },
    {
      title: 'Amount',
      key: 'total',
      render: (_, record) => {
        const amt = record.totalAmount || record.pricing?.total || 0;
        return <span className="font-bold">{formatCurrency(amt)}</span>;
      }
    },
    {
      title: 'Payment',
      dataIndex: 'paymentStatus',
      key: 'payment',
      render: (val) => <Tag color={val === 'paid' ? 'green' : val === 'refunded' ? 'blue' : 'orange'}>{val.toUpperCase()}</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (val) => getStatusTag(val)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              { key: 'view', label: 'View Details', onClick: () => openOrderDetails(record._id) },
              { type: 'divider' },
              ...(record.status === 'pending' ? [{ key: 'confirm', label: 'Confirm Order', onClick: () => handleStatusUpdate(record._id, 'confirmed') }] : []),
              ...(['confirmed', 'processing'].includes(record.status) ? [{ key: 'ship', label: 'Mark as Shipped', onClick: () => promptShippingDetails(record._id) }] : []),
              ...(['shipped', 'out_for_delivery'].includes(record.status) ? [{ key: 'deliver', label: 'Mark as Delivered', onClick: () => handleStatusUpdate(record._id, 'delivered') }] : []),
              ...(record.status !== 'cancelled' && record.status !== 'delivered' ? [{ key: 'cancel', label: 'Cancel Order', danger: true, onClick: () => handleStatusUpdate(record._id, 'cancelled') }] : []),
            ]
          }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button type="text" icon={<MoreHorizontal size={18} className="text-slate-500" />} />
        </Dropdown>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Manage orders across all platforms</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input placeholder="Search Order ID, name..." prefix={<Search size={16} />} value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} />
          <Select value={filters.platform} onChange={v => handleFilterChange('platform', v)}>
            <Option value="All">All Platforms</Option><Option value="fifozone">Fifozone</Option><Option value="amazon">Amazon</Option><Option value="flipkart">Flipkart</Option>
          </Select>
          <Select value={filters.status} onChange={v => handleFilterChange('status', v)}>
            <Option value="All">All Statuses</Option><Option value="pending">Pending</Option><Option value="processing">Processing</Option><Option value="shipped">Shipped</Option><Option value="delivered">Delivered</Option>
          </Select>
          <Select value={filters.paymentStatus} onChange={v => handleFilterChange('paymentStatus', v)}>
            <Option value="All">All Payment</Option><Option value="paid">Paid</Option><Option value="pending">Pending</Option>
          </Select>
          <RangePicker className="w-full" />
        </div>
        <div className="flex justify-end">
          <Button type="link" onClick={clearFilters}>Clear Filters</Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedRowKeys.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between shadow-sm">
          <span className="font-medium text-blue-800 ml-2">{selectedRowKeys.length} orders selected</span>
          <div className="flex gap-2">
            <Button onClick={() => handleBulkUpdate('confirmed')}>Confirm</Button>
            <Button onClick={() => handleBulkUpdate('shipped')}>Mark Shipped</Button>
            <Button onClick={() => handleBulkUpdate('delivered')} className="bg-emerald-600 text-white border-0 hover:bg-emerald-500">Mark Delivered</Button>
            <Button type="text" onClick={() => setSelectedRowKeys([])}>Clear</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          columns={columns}
          dataSource={orders}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination?.page || 1,
            pageSize: pagination?.limit || 20,
            total: pagination?.total || 0,
            onChange: (page, limit) => setFilters(p => ({ ...p, page, limit }))
          }}
          scroll={{ x: 1000 }}
          onRow={(record) => ({
            onClick: () => navigate(`/orders/${record._id}`),
            className: 'cursor-pointer hover:bg-emerald-50/30 transition-colors',
          })}
        />
      </div>
    </div>
  );
};

export default OrdersPage;
