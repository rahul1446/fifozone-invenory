import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Input, Button, Select, DatePicker, Tooltip } from 'antd';
import { 
  Search, Download, Eye, ShoppingCart, IndianRupee, 
  Clock, CheckCircle, Filter, RotateCcw, Truck, RefreshCw 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { getOrdersApi } from '../../api/orderApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';

const { RangePicker } = DatePicker;
const { Option } = Select;

const OrdersPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25, total: 0 });

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);

  const [filters, setFilters] = useState({
    platform: 'All',
    status: 'All',
    startDate: null,
    endDate: null,
  });

  const fetchOrders = useCallback(async (page = 1, limit = 25) => {
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
      if (filters.status && filters.status !== 'All') {
        params.status = filters.status;
      }
      if (filters.startDate) {
        params.startDate = filters.startDate;
      }
      if (filters.endDate) {
        params.endDate = filters.endDate;
      }

      const res = await getOrdersApi(params);
      const data = res?.data || res;

      if (data && Array.isArray(data.orders)) {
        setOrders(data.orders);
        if (data.pagination) {
          setPagination({
            current: data.pagination.page || page,
            pageSize: data.pagination.limit || limit,
            total: data.pagination.total || 0,
          });
        }
      } else if (Array.isArray(data)) {
        setOrders(data);
        setPagination(prev => ({ ...prev, total: data.length }));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters]);

  useEffect(() => {
    fetchOrders(1, pagination.pageSize);
  }, [debouncedSearch, filters]);

  const handleTableChange = (newPagination) => {
    fetchOrders(newPagination.current, newPagination.pageSize);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDateRangeChange = (dates) => {
    if (dates && dates[0] && dates[1]) {
      setFilters(prev => ({
        ...prev,
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD'),
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        startDate: null,
        endDate: null,
      }));
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilters({
      platform: 'All',
      status: 'All',
      startDate: null,
      endDate: null,
    });
  };

  const handleExport = () => {
    if (!orders.length) {
      toast.error('No orders to export');
      return;
    }
    const dataToExport = orders.map((o, idx) => ({
      'S.No': idx + 1,
      'Order ID': o.orderNumber || o.platformOrderId || o._id,
      'Customer Name': o.customer?.name || 'Customer',
      'Phone': o.customer?.phone || '',
      'City': o.shippingAddress?.city || o.customer?.city || '',
      'Platform': (o.platform || 'fifozone').toUpperCase(),
      'Order Date': formatDate(o.orderDate || o.createdAt),
      'Status': (o.status || 'pending').toUpperCase(),
      'Payment Status': (o.paymentStatus || 'pending').toUpperCase(),
      'Total Amount (₹)': o.totalAmount || o.pricing?.total || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    XLSX.writeFile(workbook, `Fifozone_Orders_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Orders exported successfully');
  };

  const getStatusColor = (status) => {
    const map = {
      pending: 'orange',
      confirmed: 'blue',
      processing: 'cyan',
      shipped: 'purple',
      out_for_delivery: 'volcano',
      delivered: 'success',
      completed: 'success',
      cancelled: 'error',
      return_requested: 'warning',
      returned: 'default',
      refunded: 'default'
    };
    return map[status?.toLowerCase()] || 'default';
  };

  const getPlatformBadge = (platform) => {
    const p = (platform || 'fifozone').toLowerCase();
    switch (p) {
      case 'fifozone':
        return <Tag color="green" className="font-bold border-0 text-[10px]">FIFOZONE</Tag>;
      case 'amazon':
        return <Tag color="orange" className="font-bold border-0 text-[10px]">AMAZON</Tag>;
      case 'flipkart':
        return <Tag color="blue" className="font-bold border-0 text-[10px]">FLIPKART</Tag>;
      case 'meesho':
        return <Tag color="purple" className="font-bold border-0 text-[10px]">MEESHO</Tag>;
      default:
        return <Tag className="font-bold border-0 text-[10px]">{p.toUpperCase()}</Tag>;
    }
  };

  const columns = [
    {
      title: 'ORDER #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 170,
      render: (text, record) => {
        const orderDisplayNumber = record.rawPlatformData?.number || (record.platformOrderId && `#${record.platformOrderId}`) || text;
        return (
          <div className="flex flex-col">
            <span 
              onClick={() => navigate(`/orders/${record._id}`)}
              className="font-bold text-slate-800 hover:text-emerald-600 transition-colors cursor-pointer text-[13px]"
            >
              {orderDisplayNumber}
            </span>
            <span className="text-[11px] text-slate-400">
              {formatDate(record.orderDate || record.createdAt)}
            </span>
          </div>
        );
      }
    },
    {
      title: 'CUSTOMER',
      dataIndex: 'customer',
      key: 'customer',
      width: 220,
      render: (customer, record) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800 text-[13px]">
            {customer?.name || record.shippingAddress?.name || 'Customer'}
          </span>
          <span className="text-[11px] text-slate-500">
            {customer?.phone || record.shippingAddress?.phone || 'No phone'} 
            {(customer?.city || record.shippingAddress?.city) && ` • ${customer?.city || record.shippingAddress?.city}`}
          </span>
        </div>
      )
    },
    {
      title: 'PLATFORM',
      dataIndex: 'platform',
      key: 'platform',
      width: 120,
      render: (platform) => getPlatformBadge(platform)
    },
    {
      title: 'ITEMS',
      key: 'items',
      width: 100,
      render: (_, record) => {
        const count = record.items?.reduce((acc, item) => acc + (item.quantity || 1), 0) || 1;
        return (
          <span className="text-xs font-semibold text-slate-600">
            {count} {count === 1 ? 'item' : 'items'}
          </span>
        );
      }
    },
    {
      title: 'TOTAL AMOUNT',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 130,
      render: (amount, record) => (
        <span className="font-bold text-slate-800 text-[13px]">
          {formatCurrency(amount || record.pricing?.total || 0)}
        </span>
      )
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => (
        <Tag color={getStatusColor(status)} className="uppercase text-[10px] font-bold px-2 py-0.5">
          {(status || 'pending').replace(/_/g, ' ')}
        </Tag>
      )
    },
    {
      title: 'ACTION',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Button 
          type="text" 
          size="small"
          icon={<Eye size={16} className="text-slate-400 hover:text-emerald-600" />} 
          onClick={() => navigate(`/orders/${record._id}`)}
          title="View full order details"
        />
      )
    }
  ];

  // Compute Stats for cards
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || o.pricing?.total || 0), 0);
  const pendingCount = orders.filter(o => ['pending', 'processing', 'confirmed'].includes(o.status?.toLowerCase())).length;
  const deliveredCount = orders.filter(o => ['delivered', 'completed'].includes(o.status?.toLowerCase())).length;

  return (
    <div className="space-y-6 pb-12 max-w-[1500px] mx-auto px-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600">
            <ShoppingCart size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Orders Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track multi-channel orders, fulfillment statuses, and revenues</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            icon={<Download size={15} />}
            onClick={handleExport}
            className="h-10 px-4 text-slate-700 font-medium rounded-xl border-slate-200 hover:bg-slate-50 shadow-xs"
          >
            Export Excel
          </Button>
          <Button
            type="primary"
            onClick={() => navigate('/orders/manual')}
            className="h-10 px-5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 border-0 rounded-xl shadow-xs"
          >
            Create Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">TOTAL ORDERS</p>
            <h3 className="text-2xl font-black text-slate-800">{pagination.total.toLocaleString()}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <ShoppingCart size={22} />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">PAGE REVENUE</p>
            <h3 className="text-2xl font-black text-slate-800">{formatCurrency(totalRevenue)}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <IndianRupee size={22} />
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">PENDING / PROCESSING</p>
            <h3 className="text-2xl font-black text-slate-800">{pendingCount}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
            <Clock size={22} />
          </div>
        </div>

        {/* Delivered Orders */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">DELIVERED</p>
            <h3 className="text-2xl font-black text-slate-800">{deliveredCount}</h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
            <CheckCircle size={22} />
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
                { value: 'All', label: 'All Channels' },
                { value: 'fifozone', label: 'Fifozone' },
                { value: 'amazon', label: 'Amazon' },
                { value: 'flipkart', label: 'Flipkart' },
                { value: 'meesho', label: 'Meesho' },
              ]}
            />

            {/* Status Filter */}
            <Select
              value={filters.status}
              onChange={(val) => handleFilterChange('status', val)}
              className="w-[160px]"
              size="middle"
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'processing', label: 'Processing' },
                { value: 'shipped', label: 'Shipped' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'return_requested', label: 'Return Requested' },
              ]}
            />

            {/* Date Range Picker */}
            <RangePicker
              onChange={handleDateRangeChange}
              className="rounded-xl border-slate-200 text-xs py-1.5"
            />

            {/* Search Input */}
            <div className="flex-1 min-w-[220px]">
              <Input
                placeholder="Search by Order ID, Customer name, Phone..."
                prefix={<Search size={16} className="text-slate-400 mr-1" />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
                className="rounded-xl border-slate-200 text-xs px-3 py-2 bg-slate-50/50 hover:border-emerald-300 focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Reset Button */}
            {(filters.platform !== 'All' || filters.status !== 'All' || filters.startDate || searchTerm) && (
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

        {/* Orders Table */}
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="_id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total} orders`,
          }}
          loading={loading}
          onChange={handleTableChange}
          scroll={{ x: 950 }}
          className="[&_.ant-table-thead_th]:bg-slate-50/70 [&_.ant-table-thead_th]:text-[11px] [&_.ant-table-thead_th]:font-bold [&_.ant-table-thead_th]:text-slate-500"
        />
      </div>
    </div>
  );
};

export default OrdersPage;
