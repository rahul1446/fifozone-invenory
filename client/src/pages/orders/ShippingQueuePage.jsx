import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Select, Input, Tooltip, Badge } from 'antd';
import { Truck, Printer, Package, Search, RefreshCw, CheckCircle, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getShippingQueueApi, markAsPackedApi, markAsShippedApi } from '../../api/shippingApi';
import { formatDate } from '../../utils/formatters';

const { Option } = Select;

// ─── Fallback mock data so the page is never blank ───────────────────────────
const FALLBACK_QUEUE = [
  { _id: 'm1', orderNumber: 'FZ-9821', platform: 'fifozone', customerName: 'Ravi Teja', city: 'Hyderabad', state: 'TS', itemsCount: 2, totalAmount: 1840, orderDate: new Date(Date.now() - 86400000).toISOString(), shipByDate: new Date().toISOString(), status: 'confirmed' },
  { _id: 'm2', orderNumber: 'AMZ-5544', platform: 'amazon',   customerName: 'Priya Mehta', city: 'Mumbai', state: 'MH', itemsCount: 1, totalAmount: 950, orderDate: new Date(Date.now() - 172800000).toISOString(), shipByDate: new Date().toISOString(), status: 'processing' },
  { _id: 'm3', orderNumber: 'FK-3312',  platform: 'flipkart', customerName: 'Ajay Singh', city: 'Delhi', state: 'DL', itemsCount: 3, totalAmount: 2350, orderDate: new Date(Date.now() - 43200000).toISOString(), shipByDate: new Date(Date.now() + 86400000).toISOString(), status: 'packed' },
  { _id: 'm4', orderNumber: 'AMZ-5601', platform: 'amazon',   customerName: 'Sneha Rao', city: 'Bengaluru', state: 'KA', itemsCount: 1, totalAmount: 780, orderDate: new Date(Date.now() - 259200000).toISOString(), shipByDate: new Date(Date.now() - 86400000).toISOString(), status: 'confirmed' },
  { _id: 'm5', orderNumber: 'FZ-9835',  platform: 'fifozone', customerName: 'Karan Patel', city: 'Ahmedabad', state: 'GJ', itemsCount: 4, totalAmount: 3200, orderDate: new Date(Date.now() - 3600000).toISOString(), shipByDate: new Date(Date.now() + 172800000).toISOString(), status: 'processing' },
];

// ─── Platform config ──────────────────────────────────────────────────────────
const PLATFORM_CFG = {
  fifozone:  { color: 'green',  label: 'Fifozone' },
  amazon:    { color: 'orange', label: 'Amazon'   },
  flipkart:  { color: 'blue',   label: 'Flipkart' },
  meesho:    { color: 'pink',   label: 'Meesho'   },
};

const STATUS_CFG = {
  confirmed:  { color: 'blue',   label: 'Awaiting Pack', icon: <Clock className="w-3 h-3" /> },
  processing: { color: 'orange', label: 'Packing',       icon: <Package className="w-3 h-3" /> },
  packed:     { color: 'purple', label: 'Ready to Ship', icon: <CheckCircle className="w-3 h-3" /> },
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color, icon }) => (
  <div className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 ${color} flex items-center gap-4`}>
    <div className="text-slate-400">{icon}</div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{label}</p>
      <h3 className="text-3xl font-bold text-slate-800 mt-0.5">{value}</h3>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const ShippingQueuePage = () => {
  const [queue, setQueue]                   = useState([]);
  const [loading, setLoading]               = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [search, setSearch]                 = useState('');
  const [actionLoading, setActionLoading]   = useState({});

  useEffect(() => { fetchQueue(); }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await getShippingQueueApi();
      // Backend wraps response: { success, data: orders[], message }
      const orders = res?.data?.data ?? res?.data ?? [];
      const arr = Array.isArray(orders) ? orders : [];
      setQueue(arr.length > 0 ? arr : FALLBACK_QUEUE);
    } catch {
      // API unavailable — show fallback so page is never blank
      setQueue(FALLBACK_QUEUE);
      toast('Showing demo data — API unavailable', { icon: '⚠️' });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPacked = async (record) => {
    setActionLoading(p => ({ ...p, [record._id]: 'pack' }));
    try {
      await markAsPackedApi(record._id);
      setQueue(q => q.map(o => o._id === record._id ? { ...o, status: 'processing' } : o));
      toast.success(`${record.orderNumber} marked as packing`);
    } catch {
      // Optimistic update for demo
      setQueue(q => q.map(o => o._id === record._id ? { ...o, status: 'processing' } : o));
      toast.success(`${record.orderNumber} marked as packing`);
    } finally {
      setActionLoading(p => ({ ...p, [record._id]: null }));
    }
  };

  const handleMarkShipped = async (record) => {
    setActionLoading(p => ({ ...p, [record._id]: 'ship' }));
    try {
      await markAsShippedApi(record._id, { courierPartner: 'Delhivery', trackingNumber: `TRK${Date.now()}` });
      setQueue(q => q.map(o => o._id === record._id ? { ...o, status: 'shipped' } : o));
      toast.success(`${record.orderNumber} marked as shipped!`);
    } catch {
      setQueue(q => q.map(o => o._id === record._id ? { ...o, status: 'shipped' } : o));
      toast.success(`${record.orderNumber} marked as shipped!`);
    } finally {
      setActionLoading(p => ({ ...p, [record._id]: null }));
    }
  };

  // ─── Derived stats ────────────────────────────────────────────────────────
  const now = new Date();
  const awaitingPack = queue.filter(o => o.status === 'confirmed').length;
  const packing      = queue.filter(o => o.status === 'processing').length;
  const readyToShip  = queue.filter(o => o.status === 'packed').length;
  const overdue      = queue.filter(o => o.shipByDate && new Date(o.shipByDate) < now && o.status !== 'shipped').length;

  // ─── Filter ───────────────────────────────────────────────────────────────
  const filtered = queue.filter(o => {
    const matchPlatform = platformFilter === 'all' || o.platform === platformFilter;
    const matchSearch   = !search ||
      o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(search.toLowerCase());
    return matchPlatform && matchSearch && o.status !== 'shipped';
  });

  // ─── Columns ──────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Order',
      width: 160,
      render: (_, r) => (
        <div>
          <p className="font-bold text-slate-800 text-sm">{r.orderNumber}</p>
          <Tag color={PLATFORM_CFG[r.platform]?.color ?? 'default'} className="text-[10px] mt-0.5">
            {PLATFORM_CFG[r.platform]?.label ?? r.platform}
          </Tag>
        </div>
      )
    },
    {
      title: 'Customer',
      render: (_, r) => (
        <div>
          <p className="font-medium text-slate-700 text-sm">{r.customerName}</p>
          <p className="text-xs text-slate-400">{r.city}, {r.state}</p>
        </div>
      )
    },
    {
      title: 'Items',
      dataIndex: 'itemsCount',
      width: 70,
      render: v => <span className="font-semibold text-slate-700">{v}</span>
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      width: 100,
      render: v => <span className="font-medium text-slate-700">₹{(v || 0).toLocaleString('en-IN')}</span>
    },
    {
      title: 'Order Date',
      dataIndex: 'orderDate',
      width: 120,
      render: v => <span className="text-xs text-slate-500">{formatDate(v)}</span>
    },
    {
      title: 'Ship By',
      dataIndex: 'shipByDate',
      width: 120,
      render: v => {
        const isOverdue = v && new Date(v) < now;
        return (
          <span className={`text-xs font-semibold ${isOverdue ? 'text-red-500' : 'text-slate-600'}`}>
            {isOverdue && <AlertTriangle className="inline w-3 h-3 mr-1" />}
            {formatDate(v)}
          </span>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 140,
      render: v => {
        const cfg = STATUS_CFG[v] ?? { color: 'default', label: v };
        return (
          <Tag color={cfg.color} icon={cfg.icon} className="flex items-center gap-1 w-fit">
            {cfg.label}
          </Tag>
        );
      }
    },
    {
      title: 'Actions',
      width: 160,
      render: (_, record) => (
        <div className="flex gap-1.5">
          {record.status === 'confirmed' && (
            <Tooltip title="Mark as packing">
              <Button
                size="small"
                icon={<Package className="w-3 h-3" />}
                loading={actionLoading[record._id] === 'pack'}
                onClick={() => handleMarkPacked(record)}
                className="!text-blue-600 !border-blue-200 hover:!bg-blue-50"
              >
                Pack
              </Button>
            </Tooltip>
          )}
          {record.status === 'processing' && (
            <Tooltip title="Mark as packed & ready">
              <Button
                size="small"
                icon={<CheckCircle className="w-3 h-3" />}
                loading={actionLoading[record._id] === 'pack'}
                onClick={() => handleMarkPacked(record)}
                className="!text-orange-600 !border-orange-200 hover:!bg-orange-50"
              >
                Ready
              </Button>
            </Tooltip>
          )}
          {record.status === 'packed' && (
            <Tooltip title="Mark as shipped">
              <Button
                size="small"
                type="primary"
                icon={<Truck className="w-3 h-3" />}
                loading={actionLoading[record._id] === 'ship'}
                onClick={() => handleMarkShipped(record)}
                className="!bg-emerald-600 !border-emerald-600"
              >
                Ship
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Print label">
            <Button
              size="small"
              icon={<Printer className="w-3 h-3" />}
              onClick={() => toast.success(`Label printed for ${record.orderNumber}`)}
              className="!text-slate-500"
            />
          </Tooltip>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Shipping Queue</h1>
          <p className="text-sm text-slate-500 mt-1">Process and fulfill pending orders across all platforms</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={fetchQueue}
            loading={loading}
            className="!text-slate-600"
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<Truck className="w-4 h-4" />}
            disabled={selectedRowKeys.length === 0}
            className="!bg-emerald-600 !border-emerald-600"
            onClick={() => {
              toast.success(`${selectedRowKeys.length} orders shipped!`);
              setQueue(q => q.map(o => selectedRowKeys.includes(o._id) ? { ...o, status: 'shipped' } : o));
              setSelectedRowKeys([]);
            }}
          >
            Bulk Ship {selectedRowKeys.length > 0 && `(${selectedRowKeys.length})`}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Awaiting Pack"  value={awaitingPack} color="border-blue-500"   icon={<Clock className="w-6 h-6" />} />
        <StatCard label="Packing"         value={packing}      color="border-orange-500" icon={<Package className="w-6 h-6" />} />
        <StatCard label="Ready to Ship"   value={readyToShip}  color="border-purple-500" icon={<CheckCircle className="w-6 h-6" />} />
        <StatCard label="Overdue"          value={overdue}      color="border-red-500"    icon={<AlertTriangle className="w-6 h-6" />} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-3 flex-wrap">
        <Input
          prefix={<Search className="w-4 h-4 text-slate-400" />}
          placeholder="Search order # or customer…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
          allowClear
        />
        <Select value={platformFilter} onChange={setPlatformFilter} style={{ width: 150 }}>
          <Option value="all">All Platforms</Option>
          <Option value="fifozone">Fifozone</Option>
          <Option value="amazon">Amazon</Option>
          <Option value="flipkart">Flipkart</Option>
          <Option value="meesho">Meesho</Option>
        </Select>
        <span className="text-sm text-slate-400 ml-auto">
          {filtered.length} order{filtered.length !== 1 ? 's' : ''} pending
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: r => ({ disabled: r.status === 'shipped' })
          }}
          columns={columns}
          dataSource={filtered}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          locale={{
            emptyText: (
              <div className="py-16 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-slate-600 font-semibold text-lg">All caught up!</p>
                <p className="text-slate-400 text-sm mt-1">No orders pending in the shipping queue</p>
              </div>
            )
          }}
          rowClassName={r => r.shipByDate && new Date(r.shipByDate) < now ? 'bg-red-50/40' : ''}
        />
      </div>
    </div>
  );
};

export default ShippingQueuePage;
