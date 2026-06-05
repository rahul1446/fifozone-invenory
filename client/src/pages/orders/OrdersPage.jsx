import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Table, Select, Button, message } from 'antd';
import { RefreshCw, Bug, Printer, Download, Package, Eye, Filter, ShoppingCart } from 'lucide-react';
import { getOrdersApi } from '../../api/orderApi';
import { setOrdersStart, setOrdersSuccess, setOrdersFailure } from '../../store/orderSlice';
import { formatCurrency } from '../../utils/formatters';

const { Option } = Select;

const OrdersPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { orders, pagination, loading } = useSelector(state => state.orders);

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

  const openOrderDetails = (id) => {
    navigate(`/orders/${id}`);
  };

  // Compute Stats for cards
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalQty = orders.reduce((sum, o) => sum + (o.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 0), 0);
  const profitableCount = orders.filter(o => (o.totalAmount || 0) > 0).length;

  const columns = [
    {
      title: <span className="text-[13px] font-bold text-slate-800">Product</span>,
      key: 'product',
      width: 400,
      render: (_, record) => {
        const item = record.items?.[0];
        const title = item?.productSnapshot?.masterName || item?.productName || 'Unknown Product';
        const img = item?.productSnapshot?.images?.[0];
        return (
          <div className="flex items-center gap-4 py-2">
            {img ? (
              <img src={img} alt="product" className="w-10 h-10 rounded-md object-cover border border-slate-200" />
            ) : (
              <div className="w-10 h-10 rounded-md bg-slate-50 flex items-center justify-center border border-slate-100">
                <Package size={18} className="text-slate-400" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-slate-900 leading-snug line-clamp-1">
                {title} {record.items?.length > 1 ? `+${record.items.length - 1}` : ''}
              </span>
              <span className="text-[11px] text-slate-400 font-medium mt-0.5">{record.orderNumber}</span>
            </div>
          </div>
        );
      }
    },
    {
      title: <span className="text-[13px] font-bold text-slate-800">Channel</span>,
      dataIndex: 'platform',
      key: 'channel',
      width: 180,
      render: (p) => (
        <span className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-full tracking-wider">
          WEBSITE_{p?.toUpperCase() || 'UNKNOWN'}
        </span>
      )
    },
    {
      title: <span className="text-[13px] font-bold text-slate-800">Qty</span>,
      key: 'qty',
      width: 100,
      render: (_, record) => <span className="text-[13px] font-semibold text-slate-700">{record.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0}</span>
    },
    {
      title: <span className="text-[13px] font-bold text-slate-800">Total</span>,
      key: 'total',
      width: 150,
      render: (_, record) => <span className="text-[13px] font-bold text-slate-900">{formatCurrency(record.totalAmount || record.pricing?.total || 0)}</span>
    },
    {
      title: <span className="text-[13px] font-bold text-slate-800">Status</span>,
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (s) => {
        const isDelivered = s === 'delivered';
        const color = isDelivered ? 'bg-emerald-50 text-emerald-600' : 
                     s === 'pending' ? 'bg-amber-50 text-amber-600' : 
                     s === 'cancelled' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600';
        return (
          <span className={`px-3 py-1 text-[11px] font-bold rounded-full capitalize ${color}`}>
            {s?.replace('_', ' ')}
          </span>
        );
      }
    },
    {
      title: <span className="text-[13px] font-bold text-slate-800">Action</span>,
      key: 'action',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Button 
          type="text" 
          icon={<Eye size={16} className="text-slate-400 hover:text-indigo-600" />} 
          onClick={(e) => { e.stopPropagation(); openOrderDetails(record._id); }}
        />
      )
    }
  ];

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
          <Button icon={<Bug size={14} />} className="text-slate-600 font-semibold rounded-lg h-9 border-slate-200 shadow-sm text-xs">Debug</Button>
          <Button icon={<RefreshCw size={14} />} onClick={fetchOrders} loading={loading} className="text-slate-600 font-semibold rounded-lg h-9 border-slate-200 shadow-sm text-xs">Refresh</Button>
          <Button icon={<Printer size={14} />} className="text-slate-600 font-semibold rounded-lg h-9 border-slate-200 shadow-sm text-xs">Print</Button>
          <Button icon={<Download size={14} />} className="text-slate-600 font-semibold rounded-lg h-9 border-slate-200 shadow-sm text-xs">Export</Button>
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
        <div className="flex items-center gap-4 mb-5">
          <div className="flex items-center gap-2 text-slate-400 font-medium text-sm">
            <Filter size={16} />
            <span className="text-[13px] text-slate-500 font-semibold">Filters</span>
          </div>
          
          <Select 
            value={filters.status === 'All' ? null : filters.status} 
            onChange={v => handleFilterChange('status', v || 'All')}
            placeholder="Status"
            className="w-32"
            allowClear
          >
            <Option value="pending">Pending</Option>
            <Option value="processing">Processing</Option>
            <Option value="shipped">Shipped</Option>
            <Option value="delivered">Delivered</Option>
            <Option value="cancelled">Cancelled</Option>
          </Select>

          <Select 
            value={filters.platform === 'All' ? null : filters.platform} 
            onChange={v => handleFilterChange('platform', v || 'All')}
            placeholder="Channel"
            className="w-32"
            allowClear
          >
            <Option value="fifozone">Fifozone</Option>
            <Option value="amazon">Amazon</Option>
            <Option value="flipkart">Flipkart</Option>
            <Option value="meesho">Meesho</Option>
          </Select>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination?.page || 1,
            pageSize: pagination?.limit || 20,
            total: pagination?.total || 0,
            onChange: (page, limit) => setFilters(p => ({ ...p, page, limit })),
            position: ['bottomCenter']
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
