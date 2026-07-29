import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Input, Select, Space, Tooltip, Modal, Spin,
  message, Timeline, Badge, Popconfirm, Row, Col, Card
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, TruckOutlined, FileTextOutlined,
  CloseCircleOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { Truck, Package, MapPin, ExternalLink, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
  getAllShipmentsApi, trackShipmentApi, printLabelApi, printInvoiceApi,
  cancelShiprocketOrderApi, generateManifestApi, getNDRListApi, submitNDRActionApi,
  checkServiceabilityApi
} from '../../api/shiprocketApi';

const { Option } = Select;

const SR_STATUS_COLOR = {
  'PICKED UP':        'blue',
  'IN TRANSIT':       'purple',
  'OUT FOR DELIVERY': 'gold',
  'DELIVERED':        'green',
  'RTO INITIATED':    'orange',
  'RTO DELIVERED':    'orange',
  'CANCELED':         'red',
  'NDR':              'red',
};

// ─────────────────────────────────────────────
// Rate / Serviceability Calculator Modal
// ─────────────────────────────────────────────
const ServiceabilityModal = ({ open, onClose }) => {
  const [form, setForm] = useState({ pickup: '', delivery: '', weight: '0.5', cod: false });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const check = async () => {
    if (!form.pickup || !form.delivery) return message.warning('Enter both pincodes');
    setLoading(true);
    try {
      const res = await checkServiceabilityApi({
        pickupPostcode: form.pickup, deliveryPostcode: form.delivery,
        weight: form.weight, cod: form.cod
      });
      setResults(res?.data?.data);
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to check serviceability');
    } finally { setLoading(false); }
  };

  const couriers = results?.data?.available_courier_companies || [];

  return (
    <Modal title={<span className="font-bold flex items-center gap-2"><TruckOutlined /> Rate & Serviceability Check</span>}
      open={open} onCancel={onClose} footer={null} width={700}>
      <div className="space-y-4 mt-4">
        <Row gutter={12}>
          <Col span={8}>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Pickup Pincode</label>
            <Input placeholder="e.g. 110001" value={form.pickup} onChange={e => setForm(f => ({ ...f, pickup: e.target.value }))} />
          </Col>
          <Col span={8}>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Delivery Pincode</label>
            <Input placeholder="e.g. 400001" value={form.delivery} onChange={e => setForm(f => ({ ...f, delivery: e.target.value }))} />
          </Col>
          <Col span={4}>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Weight (kg)</label>
            <Input placeholder="0.5" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
          </Col>
          <Col span={4}>
            <label className="text-xs font-semibold text-slate-500 block mb-1">COD?</label>
            <Select value={form.cod ? 'yes' : 'no'} onChange={v => setForm(f => ({ ...f, cod: v === 'yes' }))} className="w-full">
              <Option value="no">Prepaid</Option>
              <Option value="yes">COD</Option>
            </Select>
          </Col>
        </Row>
        <Button type="primary" loading={loading} onClick={check} className="!bg-blue-600">
          Check Serviceability & Rates
        </Button>

        {loading && <div className="text-center py-6"><Spin /></div>}

        {couriers.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-600 mb-3">{couriers.length} courier(s) available</p>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {couriers.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{c.courier_name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">ETA: {c.estimated_delivery_days} day(s) · {c.cod === 1 ? 'COD ✓' : 'Prepaid only'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600">₹{c.rate || c.freight_charge || '—'}</div>
                    {c.cod_charges > 0 && <div className="text-xs text-slate-400">+₹{c.cod_charges} COD</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {results && couriers.length === 0 && (
          <div className="text-center py-6 bg-red-50 rounded-xl border border-red-100">
            <AlertTriangle className="text-red-400 mx-auto mb-2" />
            <p className="text-red-600 font-medium text-sm">No courier available for this route</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// Tracking Timeline Modal
// ─────────────────────────────────────────────
const TrackModal = ({ open, onClose, orderId, orderNumber }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!open || !orderId) return;
    setLoading(true);
    trackShipmentApi(orderId)
      .then(res => setData(res?.data?.data))
      .catch(err => message.error(err?.response?.data?.message || 'Failed to track'))
      .finally(() => setLoading(false));
  }, [open, orderId]);

  const tracking = data?.tracking_data;
  const activities = tracking?.shipment_track_activities || [];

  return (
    <Modal title={<span className="font-bold flex items-center gap-2"><TruckOutlined /> Tracking — {orderNumber}</span>}
      open={open} onCancel={onClose} footer={null} width={560}>
      {loading && <div className="text-center py-10"><Spin size="large" /></div>}
      {!loading && data && (
        <div className="mt-4 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-400">AWB</p>
              <p className="font-mono font-bold text-slate-700">{tracking?.awb_code || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Courier</p>
              <p className="font-semibold text-slate-700">{tracking?.courier_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Current Status</p>
              <Tag color={SR_STATUS_COLOR[tracking?.current_status] || 'default'} className="font-semibold mt-1">
                {tracking?.current_status || '—'}
              </Tag>
            </div>
            <div>
              <p className="text-xs text-slate-400">ETA</p>
              <p className="font-semibold text-slate-700">{tracking?.etd || '—'}</p>
            </div>
          </div>

          {activities.length > 0 && (
            <div className="max-h-[350px] overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Activity History</p>
              <Timeline
                items={activities.map((a, i) => ({
                  color: i === 0 ? 'green' : 'gray',
                  children: (
                    <div key={i}>
                      <p className="text-sm font-semibold text-slate-700">{a.activity}</p>
                      <p className="text-xs text-slate-400">{a.location} · {dayjs(a.date).format('DD MMM YYYY, hh:mm A')}</p>
                    </div>
                  )
                }))}
              />
            </div>
          )}

          {tracking?.track_url && (
            <a href={tracking.track_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:underline">
              <ExternalLink size={14} /> Open tracking page
            </a>
          )}
        </div>
      )}
    </Modal>
  );
};

// ─────────────────────────────────────────────
// NDR Management Modal
// ─────────────────────────────────────────────
const NDRModal = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [ndrs, setNdrs] = useState([]);
  const [submitting, setSubmitting] = useState({});

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getNDRListApi()
      .then(res => setNdrs(res?.data?.data?.data || []))
      .catch(() => message.error('Failed to fetch NDR list'))
      .finally(() => setLoading(false));
  }, [open]);

  const handleAction = async (awb, action) => {
    setSubmitting(s => ({ ...s, [awb]: true }));
    try {
      await submitNDRActionApi({ awbCode: awb, action });
      message.success(`NDR action "${action}" submitted for ${awb}`);
      setNdrs(prev => prev.filter(n => n.awb !== awb));
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to submit action');
    } finally {
      setSubmitting(s => ({ ...s, [awb]: false }));
    }
  };

  return (
    <Modal title={<span className="font-bold flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> NDR — Non-Delivery Reports</span>}
      open={open} onCancel={onClose} footer={null} width={720}>
      {loading && <div className="text-center py-10"><Spin /></div>}
      {!loading && ndrs.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <CheckCircleOutlined className="text-4xl text-emerald-400 block mb-3" />
          <p className="font-medium">No pending NDRs</p>
        </div>
      )}
      {!loading && ndrs.length > 0 && (
        <div className="space-y-3 mt-4 max-h-[450px] overflow-y-auto pr-1">
          {ndrs.map(n => (
            <div key={n.awb} className="bg-red-50 border border-red-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-800 font-mono">{n.awb}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{n.name} · {n.city}</p>
                  <p className="text-xs text-red-600 font-semibold mt-1">Reason: {n.ndr_reason || n.reason || '—'}</p>
                  <p className="text-xs text-slate-400">Attempts: {n.total_attempts || 1}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="small" type="primary"
                    loading={submitting[n.awb]}
                    onClick={() => handleAction(n.awb, 're-attempt')}
                    className="!bg-emerald-500 !border-emerald-500 !text-xs">
                    Re-attempt
                  </Button>
                  <Popconfirm title="Initiate RTO?" onConfirm={() => handleAction(n.awb, 'rto')} okType="danger">
                    <Button size="small" danger loading={submitting[n.awb]} className="!text-xs">
                      RTO
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

// ─────────────────────────────────────────────
// Main Shipments Page
// ─────────────────────────────────────────────
const ShipmentsPage = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ inTransit: 0, delivered: 0, rto: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [trackModal, setTrackModal]   = useState({ open: false, id: null, number: '' });
  const [serviceModal, setServiceModal] = useState(false);
  const [ndrModal, setNdrModal]       = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [manifestLoading, setManifestLoading] = useState(false);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch current page + all-status counts in parallel
      const [pageRes, shippedRes, deliveredRes, rtoRes] = await Promise.all([
        getAllShipmentsApi({ page, limit: 50, status: filterStatus }),
        getAllShipmentsApi({ page: 1, limit: 1, status: 'shipped' }),
        getAllShipmentsApi({ page: 1, limit: 1, status: 'delivered' }),
        getAllShipmentsApi({ page: 1, limit: 1, status: 'returned' }),
      ]);
      const data = pageRes?.data?.data;
      setShipments(data?.shipments || []);
      setTotal(data?.total || 0);
      setStatusCounts({
        inTransit: shippedRes?.data?.data?.total  || 0,
        delivered: deliveredRes?.data?.data?.total || 0,
        rto:       rtoRes?.data?.data?.total       || 0,
      });
    } catch { message.error('Failed to load shipments'); }
    finally { setLoading(false); }
  }, [page, filterStatus]);

  useEffect(() => { fetchShipments(); }, [fetchShipments]);

  const handlePrintLabel = async (id) => {
    try {
      const res = await printLabelApi(id);
      const url = res?.data?.data?.label_url;
      if (url) window.open(url, '_blank');
      else message.warning('Label URL not returned. Check Shiprocket dashboard.');
    } catch (err) { message.error(err?.response?.data?.message || 'Failed to print label'); }
  };

  const handleGenerateManifest = async () => {
    const ids = shipments.filter(s => selectedRowKeys.includes(s._id)).map(s => s.shiprocketShipmentId).filter(Boolean);
    if (!ids.length) return message.warning('Select shipments with a Shiprocket Shipment ID');
    setManifestLoading(true);
    try {
      const res = await generateManifestApi(ids);
      const url = res?.data?.data?.manifest_url;
      if (url) window.open(url, '_blank');
      else message.success('Manifest generation queued. Check Shiprocket dashboard.');
    } catch (err) { message.error(err?.response?.data?.message || 'Failed to generate manifest'); }
    finally { setManifestLoading(false); }
  };

  const filtered = shipments.filter(s =>
    !search || s.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    s.awbCode?.toLowerCase().includes(search.toLowerCase()) ||
    s.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total,                        // real DB total from API
    inTransit: statusCounts.inTransit,
    delivered: statusCounts.delivered,
    rto:       statusCounts.rto,
  };

  const columns = [
    {
      title: 'Order', key: 'order',
      render: (_, r) => (
        <div>
          <button onClick={() => navigate(`/orders/${r._id}`)}
            className="font-bold text-blue-600 hover:underline text-sm">{r.orderNumber}</button>
          <div className="text-xs text-slate-400 mt-0.5">{r.customer?.name}</div>
        </div>
      )
    },
    {
      title: 'SR Order ID', dataIndex: 'shiprocketOrderId', key: 'srId',
      render: v => <span className="font-mono text-xs text-slate-600">{v || '—'}</span>
    },
    {
      title: 'AWB Code', dataIndex: 'awbCode', key: 'awb',
      render: v => v
        ? <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{v}</span>
        : <span className="text-slate-300 text-xs">Not generated</span>
    },
    {
      title: 'Courier', dataIndex: 'courierPartner', key: 'courier',
      render: v => v || <span className="text-slate-300 text-xs">—</span>
    },
    {
      title: 'Status', key: 'status',
      render: (_, r) => (
        <div className="space-y-1">
          <Badge
            status={r.status === 'delivered' ? 'success' : r.status === 'shipped' ? 'processing' : r.status === 'returned' ? 'warning' : 'default'}
            text={<span className="capitalize text-sm font-medium">{r.status?.replace('_', ' ')}</span>}
          />
          {r.shiprocketStatus && (
            <div><Tag color={SR_STATUS_COLOR[r.shiprocketStatus] || 'default'} className="text-xs">{r.shiprocketStatus}</Tag></div>
          )}
        </div>
      )
    },
    {
      title: 'Date', key: 'date',
      render: (_, r) => <span className="text-xs text-slate-500">{dayjs(r.createdAt).format('DD MMM YY')}</span>
    },
    {
      title: 'Actions', key: 'actions', align: 'right',
      render: (_, r) => (
        <Space>
          {r.awbCode && (
            <Tooltip title="Track Shipment">
              <Button size="small" type="text" icon={<TruckOutlined className="text-blue-500" />}
                onClick={() => setTrackModal({ open: true, id: r._id, number: r.orderNumber })} />
            </Tooltip>
          )}
          {r.shiprocketShipmentId && (
            <Tooltip title="Print Label">
              <Button size="small" type="text" icon={<FileTextOutlined className="text-purple-500" />}
                onClick={() => handlePrintLabel(r._id)} />
            </Tooltip>
          )}
          <Tooltip title="View Order">
            <Button size="small" type="text" icon={<ExternalLink size={14} className="text-slate-400" />}
              onClick={() => navigate(`/orders/${r._id}`)} />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-5 pb-10 max-w-[1400px] mx-auto p-1">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <Truck size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Shiprocket Shipments</h1>
            <p className="text-sm text-slate-500">Track and manage all your Shiprocket shipments</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button icon={<AlertTriangle size={14} />} onClick={() => setNdrModal(true)}
            className="!border-red-300 !text-red-600 hover:!bg-red-50 font-semibold">
            NDR Management
          </Button>
          <Button icon={<TruckOutlined />} onClick={() => setServiceModal(true)}
            className="!border-blue-300 !text-blue-600 hover:!bg-blue-50 font-semibold">
            Rate Calculator
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchShipments}>Refresh</Button>
        </div>
      </div>

      {/* Stats */}
      <Row gutter={16}>
        {[
          { label: 'Total Pushed', count: stats.total,     bg: 'bg-blue-50 border-blue-100',     text: 'text-blue-700' },
          { label: 'In Transit',   count: stats.inTransit, bg: 'bg-purple-50 border-purple-100', text: 'text-purple-700' },
          { label: 'Delivered',    count: stats.delivered, bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700' },
          { label: 'RTO',          count: stats.rto,       bg: 'bg-orange-50 border-orange-100', text: 'text-orange-700' },
        ].map(s => (
          <Col xs={12} md={6} key={s.label}>
            <div className={`rounded-2xl border p-4 ${s.bg}`}>
              <div className={`text-3xl font-black ${s.text}`}>{s.count}</div>
              <div className="text-sm text-slate-500 mt-1">{s.label}</div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <Input prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Search by order #, AWB, customer..." value={search}
            onChange={e => setSearch(e.target.value)} allowClear style={{ width: 260 }} />
          <Select placeholder="Filter by status" allowClear value={filterStatus || undefined}
            onChange={v => setFilterStatus(v || '')} style={{ width: 160 }}>
            <Option value="shipped">Shipped</Option>
            <Option value="out_for_delivery">Out for Delivery</Option>
            <Option value="delivered">Delivered</Option>
            <Option value="returned">RTO / Returned</Option>
            <Option value="cancelled">Cancelled</Option>
          </Select>
          {selectedRowKeys.length > 0 && (
            <Button loading={manifestLoading} onClick={handleGenerateManifest}
              className="!border-indigo-400 !text-indigo-600 hover:!bg-indigo-50 font-semibold">
              Generate Manifest ({selectedRowKeys.length})
            </Button>
          )}
          <div className="ml-auto text-sm text-slate-400">{total} shipment(s)</div>
        </div>

        <Table
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          dataSource={filtered}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: page, pageSize: 50, total,
            onChange: setPage,
            showTotal: t => `${t} shipments`
          }}
        />
      </div>

      {/* Modals */}
      <TrackModal open={trackModal.open} onClose={() => setTrackModal({ open: false, id: null, number: '' })}
        orderId={trackModal.id} orderNumber={trackModal.number} />
      <ServiceabilityModal open={serviceModal} onClose={() => setServiceModal(false)} />
      <NDRModal open={ndrModal} onClose={() => setNdrModal(false)} />
    </div>
  );
};

export default ShipmentsPage;
