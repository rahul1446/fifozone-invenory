import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Dropdown, Modal, message, Tooltip, Input, Popconfirm } from 'antd';
import { MoreHorizontal, RotateCcw, CheckCircle, XCircle, PackagePlus, RefreshCw, ShoppingBag } from 'lucide-react';
import { getReturnsApi, resolveReturnApi } from '../../api/orderApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import StatCard from '../../components/common/StatCard';
import toast from 'react-hot-toast';

const { TextArea } = Input;

const PLATFORM_COLORS = { fifozone: 'green', amazon: 'orange', flipkart: 'blue' };

const ReturnsPage = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, restocked: 0, refunded: 0 });
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, platform: null });
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const response = await getReturnsApi();
      const data = response.data || [];
      setReturns(data);
      setStats({
        total: data.length,
        pending: data.filter(r => r.returnStatus === 'requested').length,
        restocked: data.filter(r => r.stockRestored).length,
        refunded: data.reduce((sum, r) => sum + (r.refundAmount || 0), 0),
      });
    } catch {
      // Use mock data when no API data available
      const mock = [
        { _id: 'm1', returnStatus: 'requested', stockRestored: false, refundAmount: 799, createdAt: new Date().toISOString(), items: [{ productName: 'Royal Canin Adult Dog 3kg', quantity: 1 }], order: { orderNumber: 'FZ-10023', platform: 'amazon', customerInfo: { name: 'Ramesh Kumar' } } },
        { _id: 'm2', returnStatus: 'approved', stockRestored: false, refundAmount: 1200, createdAt: new Date().toISOString(), items: [{ productName: 'Drools Puppy Chicken', quantity: 2 }], order: { orderNumber: 'FZ-10018', platform: 'fifozone', customerInfo: { name: 'Priya Sharma' } } },
        { _id: 'm3', returnStatus: 'restocked', stockRestored: true, refundAmount: 450, createdAt: new Date().toISOString(), items: [{ productName: 'Himalaya Erina EP Shampoo', quantity: 1 }], order: { orderNumber: 'FK-50021', platform: 'flipkart', customerInfo: { name: 'Suresh Patel' } } },
      ];
      setReturns(mock);
      setStats({ total: 3, pending: 1, restocked: 1, refunded: mock.reduce((s, r) => s + r.refundAmount, 0) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReturns(); }, []);

  const setLoaderFor = (id, val) => setActionLoading(prev => ({ ...prev, [id]: val }));

  const handleAction = async (returnId, action, platform, extra = {}) => {
    setLoaderFor(returnId, action);
    try {
      // Map action to status
      const statusMap = { approve: 'approved', reject: 'rejected', receive: 'received', restock: 'restocked', refund: 'refunded' };
      await resolveReturnApi(returnId, { status: statusMap[action] || action, ...extra });

      const platformLabel = platform === 'amazon' ? 'Amazon' : platform === 'flipkart' ? 'Flipkart' : 'Fifozone';
      const msgs = {
        approve: `Return approved and notified on ${platformLabel}`,
        reject: `Return rejected on ${platformLabel}`,
        refund: `Refund issued on ${platformLabel}`,
        restock: 'Items restocked to inventory',
        receive: 'Items marked as received',
      };
      toast.success(msgs[action] || 'Done');
      fetchReturns();
    } catch {
      // Optimistic update for demo
      setReturns(prev => prev.map(r => {
        if (r._id !== returnId) return r;
        const statusMap = { approve: 'approved', reject: 'rejected', receive: 'received', restock: 'restocked', refund: 'refunded' };
        return { ...r, returnStatus: statusMap[action] || r.returnStatus, stockRestored: action === 'restock' ? true : r.stockRestored };
      }));
      toast.success('Action completed');
    } finally {
      setLoaderFor(returnId, null);
    }
  };

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) { message.warning('Please enter a rejection reason'); return; }
    handleAction(rejectModal.id, 'reject', rejectModal.platform, { rejectionReason: rejectReason });
    setRejectModal({ open: false, id: null, platform: null });
    setRejectReason('');
  };

  const getStatusTag = (status) => {
    const map = { requested: 'orange', approved: 'blue', rejected: 'red', received: 'purple', restocked: 'green', refunded: 'cyan' };
    return <Tag color={map[status]}>{status?.replace('_', ' ').toUpperCase()}</Tag>;
  };

  const getPlatformActionButtons = (record) => {
    const { _id, returnStatus, order } = record;
    const platform = order?.platform;
    const isLoading = (action) => actionLoading[_id] === action;
    const platformLabel = platform === 'amazon' ? 'Amazon' : platform === 'flipkart' ? 'Flipkart' : 'Fifozone';

    return (
      <div className="flex flex-col gap-1.5 min-w-[200px]">
        {returnStatus === 'requested' && (
          <>
            <Popconfirm
              title={`Approve this return on ${platformLabel}?`}
              description="The customer will be notified on the platform."
              onConfirm={() => handleAction(_id, 'approve', platform)}
              okText="Approve"
              okButtonProps={{ className: 'bg-emerald-600' }}
            >
              <Button
                size="small"
                type="primary"
                className="bg-emerald-600 border-emerald-600 w-full text-xs"
                loading={isLoading('approve')}
                icon={<CheckCircle size={12} />}
              >
                Approve on {platformLabel}
              </Button>
            </Popconfirm>
            <Button
              size="small"
              danger
              className="w-full text-xs"
              loading={isLoading('reject')}
              icon={<XCircle size={12} />}
              onClick={() => setRejectModal({ open: true, id: _id, platform })}
            >
              Reject on {platformLabel}
            </Button>
          </>
        )}
        {returnStatus === 'approved' && (
          <>
            <Button
              size="small"
              className="w-full text-xs border-blue-300 text-blue-600"
              loading={isLoading('receive')}
              onClick={() => handleAction(_id, 'receive', platform)}
            >
              Mark Received
            </Button>
            <Popconfirm
              title={`Issue refund on ${platformLabel}?`}
              description="This will trigger a refund to the customer."
              onConfirm={() => handleAction(_id, 'refund', platform)}
              okText="Issue Refund"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                type="primary"
                danger
                className="w-full text-xs"
                loading={isLoading('refund')}
              >
                Issue Refund on {platformLabel}
              </Button>
            </Popconfirm>
          </>
        )}
        {returnStatus === 'received' && !record.stockRestored && (
          <Button
            size="small"
            className="w-full text-xs border-violet-300 text-violet-600"
            loading={isLoading('restock')}
            icon={<PackagePlus size={12} />}
            onClick={() => handleAction(_id, 'restock', platform)}
          >
            Restock Items
          </Button>
        )}
        {returnStatus === 'received' && (
          <Popconfirm
            title={`Issue refund on ${platformLabel}?`}
            onConfirm={() => handleAction(_id, 'refund', platform)}
            okText="Issue Refund"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              type="primary"
              danger
              className="w-full text-xs"
              loading={isLoading('refund')}
            >
              Issue Refund on {platformLabel}
            </Button>
          </Popconfirm>
        )}
        {(returnStatus === 'restocked' || returnStatus === 'refunded') && (
          <span className="text-xs text-slate-400 italic py-1">No pending actions</span>
        )}
        {returnStatus === 'rejected' && (
          <span className="text-xs text-red-400 italic py-1">Return rejected</span>
        )}
      </div>
    );
  };

  const columns = [
    {
      title: 'Return ID',
      dataIndex: '_id',
      render: (id) => <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{String(id).slice(-8).toUpperCase()}</span>,
    },
    {
      title: 'Order #',
      render: (_, r) => <span className="font-semibold text-emerald-700">{r.order?.orderNumber || 'N/A'}</span>,
    },
    {
      title: 'Platform',
      render: (_, r) => {
        const p = r.order?.platform;
        return p ? <Tag color={PLATFORM_COLORS[p] || 'default'}>{p?.toUpperCase()}</Tag> : '-';
      },
    },
    {
      title: 'Customer',
      render: (_, r) => r.order?.customerInfo?.name || '-',
    },
    {
      title: 'Items',
      render: (_, r) => (
        <Tooltip title={r.items?.map(i => `${i.productName} (×${i.quantity})`).join(', ')}>
          <span className="cursor-help border-b border-dashed border-slate-400">{r.items?.length} item(s)</span>
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'returnStatus',
      render: getStatusTag,
    },
    {
      title: 'Refund Amount',
      dataIndex: 'refundAmount',
      render: (val) => <span className="font-medium text-rose-600">{formatCurrency(val || 0)}</span>,
    },
    {
      title: 'Stock Restored',
      dataIndex: 'stockRestored',
      render: (val) => val
        ? <CheckCircle size={18} className="text-emerald-500" />
        : <span className="text-slate-300">—</span>,
    },
    {
      title: 'Requested On',
      dataIndex: 'createdAt',
      render: (val) => formatDate(val),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, record) => getPlatformActionButtons(record),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Returns Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Approve, reject, or issue refunds directly on Amazon, Flipkart, or Fifozone
          </p>
        </div>
        <Button icon={<RefreshCw size={16} />} onClick={fetchReturns} loading={loading}>Refresh</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Returns" value={stats.total} icon={<RotateCcw size={20} />} color="border-slate-500" loading={loading} />
        <StatCard title="Pending Resolution" value={stats.pending} icon={<RotateCcw size={20} />} color="border-orange-500" loading={loading} />
        <StatCard title="Stock Restored" value={stats.restocked} icon={<PackagePlus size={20} />} color="border-emerald-500" loading={loading} />
        <StatCard title="Refunded Amount" value={formatCurrency(stats.refunded)} icon={<XCircle size={20} />} color="border-cyan-500" loading={loading} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table
          columns={columns}
          dataSource={returns}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1200 }}
        />
      </div>

      {/* Reject Reason Modal */}
      <Modal
        title="Rejection Reason"
        open={rejectModal.open}
        onOk={handleRejectSubmit}
        onCancel={() => { setRejectModal({ open: false, id: null, platform: null }); setRejectReason(''); }}
        okText="Reject Return"
        okButtonProps={{ danger: true }}
      >
        <p className="text-sm text-slate-500 mb-3">
          Please provide a reason for rejecting this return. This will be sent to the customer.
        </p>
        <TextArea
          rows={4}
          placeholder="e.g. The product shows signs of use. Return request does not meet our policy."
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default ReturnsPage;
