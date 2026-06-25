import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Table, Select, Button, message, DatePicker } from 'antd';
import { RefreshCw, Bug, Printer, Download, Package, Eye, Filter, ShoppingCart, Truck } from 'lucide-react';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { getOrdersApi } from '../../api/orderApi';
import { bulkPushOrdersToShiprocketApi } from '../../api/shiprocketApi';
import { setOrdersStart, setOrdersSuccess, setOrdersFailure } from '../../store/orderSlice';
import { formatCurrency } from '../../utils/formatters';

const { Option } = Select;

const OrdersPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { orders, pagination, loading } = useSelector(state => state.orders);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [pushing, setPushing] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    platform: 'All',
    status: 'All',
    paymentStatus: 'All',
    startDate: null,
    endDate: null,
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

  const handleDateRangeChange = (dates) => {
    if (dates) {
      setFilters(prev => ({ 
        ...prev, 
        startDate: dates[0].format('YYYY-MM-DD'), 
        endDate: dates[1].format('YYYY-MM-DD'),
        page: 1 
      }));
    } else {
      setFilters(prev => ({ ...prev, startDate: null, endDate: null, page: 1 }));
    }
  };

  const handleBulkPush = async () => {
    if (selectedRowKeys.length === 0) return;
    setPushing(true);
    try {
      const res = await bulkPushOrdersToShiprocketApi(selectedRowKeys);
      message.success(`Pushed ${res.data.successful} orders. Failed: ${res.data.failed}`);
      setSelectedRowKeys([]);
      fetchOrders();
    } catch (err) {
      message.error(err.response?.data?.message || 'Bulk push failed');
    } finally {
      setPushing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!orders || orders.length === 0) {
      message.warning('No orders to export');
      return;
    }
    const exportData = orders.map(o => ({
      'Order ID': o.orderNumber || o.platformOrderId || o._id,
      'Customer Name': o.customer?.name || 'Unknown',
      'Date': new Date(o.orderDate || o.createdAt).toLocaleDateString(),
      'Status': o.status,
      'Platform': o.platform || 'Direct',
      'Total Amount': o.totalAmount || o.pricing?.total || 0,
      'Payment Status': o.paymentStatus || 'pending'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    XLSX.writeFile(workbook, `Fifozone_Orders_${dayjs().format('YYYY-MM-DD')}.xlsx`);
  };

  const handleDebug = () => {
    console.log('--- DEBUG: CURRENT ORDERS DATA ---', orders);
    console.log('--- DEBUG: CURRENT FILTERS ---', filters);
    message.info('Debug data has been logged to the browser console! (Press F12 to view)');
  };

  const openOrderDetails = (id) => {
    navigate(`/orders/${id}`);
  };

  // Compute Stats for cards
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalQty = orders.reduce((sum, o) => sum + (o.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 0), 0);
  const profitableCount = orders.filter(o => (o.totalAmount || 0) > 0).length;

  const columns = [
    {
      title: <span className="text-[13px] font-bold text-slate-800">Order</span>,
      key: 'order',
      render: (_, record) => {
        const orderDisplayNumber = record.rawPlatformData?.number || (record.platformOrderId && `#${record.platformOrderId}`) || record.orderNumber;
        return (
          <span className="text-[13px] font-semibold text-blue-600 hover:text-blue-800">
            {orderDisplayNumber} <span className="text-slate-700 ml-1">{record.customer?.name || 'Unknown'}</span>
          </span>
        );
      }
    },
    {
      key: 'preview',
      width: 50,
      render: (_, record) => (
        <Button 
          type="text" 
          icon={<Eye size={16} className="text-slate-400 hover:text-blue-600" />} 
          onClick={(e) => { e.stopPropagation(); openOrderDetails(record._id); }}
        />
      )
    },
    {
      title: <span className="text-[13px] font-bold text-slate-800">Date</span>,
      key: 'date',
      render: (_, record) => {
        const dateStr = new Date(record.orderDate || record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return <span className="text-[13px] font-medium text-slate-600">{dateStr}</span>;
      }
    },
    {
      title: <span className="text-[13px] font-bold text-slate-800">Status</span>,
      dataIndex: 'status',
      key: 'status',
      render: (s) => {
        const isDelivered = s === 'delivered';
        const isProcessing = s === 'processing';
        const isCancelled = s === 'cancelled';
        
        let colorClass = 'bg-slate-100 text-slate-600';
        if (isProcessing) colorClass = 'bg-[#c6e1c6] text-[#5b841b]'; // Woo processing green
        else if (isCancelled) colorClass = 'bg-[#e5e5e5] text-[#767676]'; // Woo cancelled gray
        else if (isDelivered) colorClass = 'bg-emerald-100 text-emerald-700';

        return (
          <span className={`px-2.5 py-1 text-[12px] font-semibold rounded-[4px] capitalize ${colorClass}`}>
            {s?.replace('_', ' ')}
          </span>
        );
      }
    },
    {
      title: <span className="text-[13px] font-bold text-slate-800">Total</span>,
      key: 'total',
      render: (_, record) => <span className="text-[13px] font-medium text-slate-700">{formatCurrency(record.totalAmount || record.pricing?.total || 0)}</span>
    },
    {
      title: <span className="text-[13px] font-bold text-slate-800">Origin</span>,
      key: 'origin',
      render: (_, record) => {
        const platform = record.platform?.toLowerCase();
        let originText = 'Direct';
        if (platform === 'amazon') originText = 'Amazon';
        if (platform === 'flipkart') originText = 'Flipkart';
        
        return <span className="text-[13px] font-medium text-slate-600">{originText}</span>;
      }
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10 max-w-7xl mx-auto p-1">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-indigo-600" />
            </div>
            <h1 className="text-[22px] font-extrabold text-slate-900 tracking-tight">Complete Order Details</h1>
          </div>
          <p className="text-[13px] text-slate-400 font-medium ml-11">View full order information with inventory impact and profitability metrics</p>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedRowKeys.length > 0 && (
            <Button 
              type="primary" 
              icon={<Truck size={14} />} 
              onClick={handleBulkPush} 
              loading={pushing} 
              className="font-semibold rounded-lg h-9 bg-blue-600 hover:bg-blue-700 border-none shadow-sm text-xs mr-2"
            >
              Push to Shiprocket ({selectedRowKeys.length})
            </Button>
          )}
          <Button onClick={handleDebug} icon={<Bug size={14} />} className="text-slate-600 font-semibold rounded-lg h-9 border-slate-200 shadow-sm text-xs">Debug</Button>
          <Button icon={<RefreshCw size={14} />} onClick={fetchOrders} loading={loading} className="text-slate-600 font-semibold rounded-lg h-9 border-slate-200 shadow-sm text-xs">Refresh</Button>
          <Button onClick={handlePrint} icon={<Printer size={14} />} className="text-slate-600 font-semibold rounded-lg h-9 border-slate-200 shadow-sm text-xs">Print</Button>
          <Button onClick={handleExport} icon={<Download size={14} />} className="text-slate-600 font-semibold rounded-lg h-9 border-slate-200 shadow-sm text-xs">Export</Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-[14px] p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-[110px]">
          <p className="text-[12px] font-semibold text-slate-400">Total Revenue</p>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1.5">{formatCurrency(totalRevenue)}</h2>
            <p className="text-[11px] text-slate-400 font-medium">{orders.length} orders</p>
          </div>
        </div>
        <div className="bg-white rounded-[14px] p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-[110px]">
          <p className="text-[12px] font-semibold text-slate-400">Total Profit</p>
          <div>
            <h2 className="text-2xl font-black text-emerald-500 tracking-tight leading-none mb-1.5">{formatCurrency(totalRevenue)}</h2>
            <p className="text-[11px] text-slate-400 font-medium">{profitableCount} profitable</p>
          </div>
        </div>
        <div className="bg-white rounded-[14px] p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-[110px]">
          <p className="text-[12px] font-semibold text-slate-400">Total Quantity Sold</p>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1.5">{totalQty}</h2>
            <p className="text-[11px] text-slate-400 font-medium">units</p>
          </div>
        </div>
        <div className="bg-white rounded-[14px] p-5 border border-slate-100 shadow-sm flex flex-col justify-between h-[110px]">
          <p className="text-[12px] font-semibold text-slate-400">Margin %</p>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1.5">100.0%</h2>
            <p className="text-[11px] text-slate-400 font-medium">profit margin</p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6 pt-5">
        
        {/* Filters Row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400 font-medium text-sm">
              <Filter size={16} />
              <span className="text-[13px] text-slate-500 font-semibold">Filters</span>
            </div>
            
            <Select 
              value={filters.status === 'All' ? null : filters.status} 
              onChange={v => handleFilterChange('status', v || 'All')}
              placeholder="Status"
              className="w-[140px] font-medium"
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'processing', label: 'Processing' },
                { value: 'packed', label: 'Packed' },
                { value: 'shipped', label: 'Shipped' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'failed', label: 'Failed' },
                { value: 'draft', label: 'Draft' }
              ]}
              allowClear
            />
            
            <Select 
              value={filters.platform === 'All' ? null : filters.platform}
              onChange={v => handleFilterChange('platform', v || 'All')}
              placeholder="Channel"
              className="w-[140px] font-medium"
              options={[
                { value: 'All', label: 'All Channels' },
                { value: 'fifozone', label: 'Fifozone' },
                { value: 'amazon', label: 'Amazon' },
                { value: 'flipkart', label: 'Flipkart' }
              ]}
              allowClear
            />
            <DatePicker.RangePicker 
              onChange={handleDateRangeChange} 
              className="w-[240px]" 
              ranges={{
                Today: [dayjs(), dayjs()],
                Yesterday: [dayjs().subtract(1, 'days'), dayjs().subtract(1, 'days')],
                'Last 7 Days': [dayjs().subtract(6, 'days'), dayjs()],
                'Last 30 Days': [dayjs().subtract(29, 'days'), dayjs()],
              }}
            />
          </div>
          <div className="text-[13px] font-medium text-slate-500">
            Showing {orders.length} orders on this page (Total: {pagination?.total || 0})
          </div>
        </div>

        {/* Table */}
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={orders}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination?.page || 1,
            pageSize: pagination?.limit || 20,
            total: pagination?.total || 0,
            onChange: (page, limit) => setFilters(p => ({ ...p, page, limit })),
            position: ['bottomCenter'],
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          scroll={{ x: 1000 }}
          className="border-t border-slate-100"
          rowClassName="cursor-pointer hover:!bg-slate-50 transition-colors"
          onRow={(record) => ({
            onClick: () => openOrderDetails(record._id)
          })}
        />
      </div>

    </div>
  );
};

export default OrdersPage;
