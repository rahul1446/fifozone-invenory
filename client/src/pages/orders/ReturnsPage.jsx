import React, { useState, useEffect } from 'react';
import { Table, Button, Spin, message, Modal, Select } from 'antd';
import { RotateCcw, Eye, Package, Inbox, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getReturnsApi, resolveReturnApi } from '../../api/orderApi';
import { formatCurrency } from '../../utils/formatters';

const ReturnsPage = () => {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [itemConditions, setItemConditions] = useState({});
  const [processingStatus, setProcessingStatus] = useState(false);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await getReturnsApi();
      const data = res?.data?.orders || res?.data || res?.returns || [];
      setReturns(Array.isArray(data) ? data : []);
    } catch (err) {
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReturns(); }, []);

  const openProcessModal = (record) => {
    setSelectedReturn(record);
    const initialConditions = {};
    (record.items || []).forEach(item => {
      initialConditions[item._id] = item.condition || 'good';
    });
    setItemConditions(initialConditions);
    setProcessModalOpen(true);
  };

  const handleConditionChange = (itemId, condition) => {
    setItemConditions(prev => ({ ...prev, [itemId]: condition }));
  };

  const handleProcessReturn = async () => {
    if (!selectedReturn) return;
    setProcessingStatus(true);
    try {
      await resolveReturnApi(selectedReturn._id, {
        status: 'restocked',
        itemConditions: itemConditions
      });
      message.success('Return processed and inventory adjusted successfully');
      setProcessModalOpen(false);
      fetchReturns();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to process return');
    } finally {
      setProcessingStatus(false);
    }
  };

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
          type="primary" 
          ghost
          size="small"
          className="text-xs font-semibold"
          onClick={(e) => { e.stopPropagation(); openProcessModal(record); }}
          disabled={record.status === 'restocked'}
        >
          {record.status === 'restocked' ? 'Processed' : 'Process'}
        </Button>
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

      {/* Process Return Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-slate-800">Process Return Items</span>
          </div>
        }
        open={processModalOpen}
        onCancel={() => setProcessModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setProcessModalOpen(false)} className="font-semibold text-slate-600">Cancel</Button>,
          <Button key="submit" type="primary" loading={processingStatus} onClick={handleProcessReturn} className="font-semibold bg-indigo-600">Confirm & Process</Button>
        ]}
        width={700}
      >
        <div className="py-4 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800 flex gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Select the physical condition of each returned item. Items marked as <b>Good</b> will be restocked to sellable inventory. Items marked as <b>Damaged, Opened, or Expired</b> will be permanently written off.</p>
          </div>

          <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
            <Table
              dataSource={selectedReturn?.items || []}
              rowKey="_id"
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Product',
                  key: 'product',
                  render: (_, item) => {
                    const title = item.productSnapshot?.masterName || item.productName || 'Unknown Product';
                    return <span className="text-sm font-semibold text-slate-800">{title}</span>;
                  }
                },
                {
                  title: 'Qty',
                  dataIndex: 'quantity',
                  key: 'qty',
                  width: 60,
                  render: (q) => <span className="font-bold">{q}</span>
                },
                {
                  title: 'Condition',
                  key: 'condition',
                  width: 150,
                  render: (_, item) => (
                    <Select
                      value={itemConditions[item._id]}
                      onChange={(val) => handleConditionChange(item._id, val)}
                      className="w-full"
                      options={[
                        { value: 'good', label: '✅ Good / Sellable' },
                        { value: 'damaged', label: '❌ Damaged' },
                        { value: 'opened', label: '📦 Opened / Used' },
                        { value: 'expired', label: '⚠️ Expired' }
                      ]}
                    />
                  )
                }
              ]}
            />
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default ReturnsPage;
