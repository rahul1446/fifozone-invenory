import React, { useState, useEffect } from 'react';
import { Table, Button, Spin, message } from 'antd';
import { Clock, AlertTriangle, Eye, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getOrdersApi } from '../../api/orderApi';
import { formatCurrency } from '../../utils/formatters';

const PendingOrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getOrdersApi({ status: 'pending', limit: 100 });
      const data = res?.data?.orders || res?.orders || (Array.isArray(res?.data) ? res.data : []);
      setOrders(data);
    } catch (err) {
      message.error('Failed to fetch pending orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const totalValue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);

  const columns = [
    {
      title: <span className="text-[12px] font-bold text-slate-800">Product</span>,
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
      title: <span className="text-[12px] font-bold text-slate-800">Channel</span>,
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
      title: <span className="text-[12px] font-bold text-slate-800">Qty</span>,
      key: 'qty',
      width: 100,
      render: (_, record) => <span className="text-[13px] font-semibold text-slate-700">{record.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0}</span>
    },
    {
      title: <span className="text-[12px] font-bold text-slate-800">Total</span>,
      key: 'total',
      width: 150,
      render: (_, record) => <span className="text-[13px] font-bold text-slate-900">{formatCurrency(record.totalAmount || record.pricing?.total || 0)}</span>
    },
    {
      title: <span className="text-[12px] font-bold text-slate-800">Status</span>,
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (s) => (
        <span className={`px-3 py-1 text-[11px] font-bold rounded-full capitalize bg-amber-50 text-amber-600`}>
          {s?.replace('_', ' ') || 'Pending'}
        </span>
      )
    },
    {
      title: <span className="text-[12px] font-bold text-slate-800">Action</span>,
      key: 'action',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Button 
          type="text" 
          icon={<Eye size={16} className="text-slate-400 hover:text-indigo-600" />} 
          onClick={(e) => { e.stopPropagation(); navigate(`/orders/${record._id}`); }}
        />
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10 max-w-7xl mx-auto p-1">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <h1 className="text-[22px] font-extrabold text-slate-900 tracking-tight">Pending Orders</h1>
        </div>
        <p className="text-[13px] text-slate-400 font-medium ml-11">Orders awaiting processing</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-[14px] p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pending Orders</p>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{orders.length}</h2>
          </div>
          <div className="w-8 h-8 rounded-full border border-amber-200 bg-amber-50 flex items-center justify-center">
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-[14px] p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Value</p>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{formatCurrency(totalValue)}</h2>
          </div>
          <div className="w-8 h-8 rounded-full border border-indigo-200 bg-indigo-50 flex items-center justify-center">
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
        </div>

        <div className="bg-white rounded-[14px] p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Urgent ({'>'} 48H)</p>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">0</h2>
            <p className="text-[10px] text-slate-400 font-medium">Coming soon</p>
          </div>
          <div className="w-8 h-8 rounded-full border border-rose-200 bg-rose-50 flex items-center justify-center self-start">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1000 }}
          rowClassName="cursor-pointer hover:!bg-slate-50 transition-colors"
          onRow={(record) => ({
            onClick: () => navigate(`/orders/${record._id}`)
          })}
        />
      </div>

    </div>
  );
};

export default PendingOrdersPage;
