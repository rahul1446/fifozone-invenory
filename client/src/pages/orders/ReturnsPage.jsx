import React, { useState, useEffect } from 'react';
import { Table, Button, Spin, message } from 'antd';
import { RotateCcw, Eye, Package, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getReturnsApi } from '../../api/orderApi';
import { formatCurrency } from '../../utils/formatters';

const ReturnsPage = () => {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await getReturnsApi();
      const data = res?.data?.orders || res?.data || res?.returns || [];
      // If we don't get valid data, default to empty array to show empty state
      setReturns(Array.isArray(data) ? data : []);
    } catch (err) {
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReturns(); }, []);

  const totalReturns = returns.length;
  const rtoOrders = returns.filter(r => r.returnType === 'rto').length;
  const customerReturns = returns.filter(r => r.returnType !== 'rto').length;
  const refundValue = returns.reduce((sum, r) => sum + (r.refundAmount || 0), 0);

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
              <span className="text-[11px] text-slate-400 font-medium mt-0.5">{record.order?.orderNumber || 'N/A'}</span>
            </div>
          </div>
        );
      }
    },
    {
      title: <span className="text-[12px] font-bold text-slate-800">Channel</span>,
      dataIndex: ['order', 'platform'],
      key: 'channel',
      width: 180,
      render: (p) => (
        <span className="px-2.5 py-1 text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-full tracking-wider">
          WEBSITE_{p?.toUpperCase() || 'UNKNOWN'}
        </span>
      )
    },
    {
      title: <span className="text-[12px] font-bold text-slate-800">Refund</span>,
      key: 'refund',
      width: 150,
      render: (_, record) => <span className="text-[13px] font-bold text-rose-600">{formatCurrency(record.refundAmount || 0)}</span>
    },
    {
      title: <span className="text-[12px] font-bold text-slate-800">Status</span>,
      dataIndex: 'returnStatus',
      key: 'status',
      width: 150,
      render: (s) => (
        <span className={`px-3 py-1 text-[11px] font-bold rounded-full capitalize ${s === 'requested' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
          {s?.replace('_', ' ') || 'Requested'}
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
          onClick={(e) => { e.stopPropagation(); navigate(`/returns/${record._id}`); }}
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
            <RotateCcw className="w-4 h-4 text-indigo-600" />
          </div>
          <h1 className="text-[22px] font-extrabold text-slate-900 tracking-tight">Returns & RTO</h1>
        </div>
        <p className="text-[13px] text-slate-400 font-medium ml-11">Track product returns and RTO orders</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-[14px] p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Returns</p>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{totalReturns}</h2>
          </div>
          <div className="w-9 h-9 rounded-[10px] border border-amber-100 bg-amber-50 flex items-center justify-center">
            <RotateCcw className="w-4 h-4 text-amber-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-[14px] p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">RTO Orders</p>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{rtoOrders}</h2>
          </div>
          <div className="w-9 h-9 rounded-[10px] border border-rose-100 bg-rose-50 flex items-center justify-center">
            <RotateCcw className="w-4 h-4 text-rose-500" />
          </div>
        </div>

        <div className="bg-white rounded-[14px] p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Customer Returns</p>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{customerReturns}</h2>
          </div>
          <div className="w-9 h-9 rounded-[10px] border border-blue-100 bg-blue-50 flex items-center justify-center">
            <RotateCcw className="w-4 h-4 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-[14px] p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Refund Value</p>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{formatCurrency(refundValue)}</h2>
          </div>
          <div className="w-9 h-9 rounded-[10px] border border-indigo-100 bg-indigo-50 flex items-center justify-center">
            <RotateCcw className="w-4 h-4 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Main Container / Empty State */}
      {loading ? (
        <div className="flex justify-center py-20"><Spin size="large" /></div>
      ) : returns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-5 border border-slate-100 shadow-sm">
            <Inbox className="w-8 h-8 text-slate-500" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No Returns</h3>
          <p className="text-sm text-slate-400 font-medium">Return tracking will be available once returns are synced from WooCommerce</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <Table
            columns={columns}
            dataSource={returns}
            rowKey="_id"
            pagination={{ pageSize: 20 }}
            scroll={{ x: 1000 }}
            className="border-t border-slate-100"
            rowClassName="cursor-pointer hover:!bg-slate-50 transition-colors"
          />
        </div>
      )}

    </div>
  );
};

export default ReturnsPage;
