import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Tag, Modal, Input, Select, Form, Spin, Divider, Timeline, Steps
} from 'antd';
import {
  ArrowLeft, Package, MapPin, CreditCard, Truck, MessageSquare,
  RefreshCw, ExternalLink, RotateCcw, CheckCircle, Clock, XCircle,
  ChevronRight, AlertTriangle, Phone, Mail, Copy, Edit3
} from 'lucide-react';
import { getOrderByIdApi, updateOrderStatusApi } from '../../api/orderApi';
import { formatCurrency, formatRelativeTime } from '../../utils/formatters';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { pushOrderToShiprocketApi, generateAwbApi, requestPickupApi } from '../../api/shiprocketApi';

const STATUS_FLOW = [
  { value: 'pending',           label: 'Pending',          color: 'default' },
  { value: 'confirmed',         label: 'Confirmed',        color: 'blue' },
  { value: 'processing',        label: 'Processing',       color: 'processing' },
  { value: 'shipped',           label: 'Shipped',          color: 'purple' },
  { value: 'out_for_delivery',  label: 'Out for Delivery', color: 'gold' },
  { value: 'delivered',         label: 'Delivered',        color: 'success' },
  { value: 'cancelled',         label: 'Cancelled',        color: 'error' },
  { value: 'return_requested',  label: 'Return Requested', color: 'warning' },
  { value: 'returned',          label: 'Returned',         color: 'warning' },
  { value: 'refunded',          label: 'Refunded',         color: 'default' },
];

const STATUS_COLORS = {
  pending: 'bg-slate-100 text-slate-600',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-sky-100 text-sky-700',
  shipped: 'bg-purple-100 text-purple-700',
  out_for_delivery: 'bg-amber-100 text-amber-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  return_requested: 'bg-orange-100 text-orange-700',
  returned: 'bg-orange-100 text-orange-700',
  refunded: 'bg-slate-100 text-slate-600',
};

const PLATFORM_COLORS = { fifozone: 'green', amazon: 'orange', flipkart: 'gold' };

const InfoBlock = ({ label, value, icon, copyable }) => {
  const copy = () => { navigator.clipboard.writeText(value); toast.success('Copied!'); };
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-slate-400">{icon}</span>}
        <span className="text-sm text-slate-700 font-medium">{value || '—'}</span>
        {copyable && value && (
          <button onClick={copy} className="text-slate-400 hover:text-slate-600 transition-colors ml-1">
            <Copy size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [statusForm] = Form.useForm();
  const [trackingForm] = Form.useForm();
  const [noteForm] = Form.useForm();

  // Shiprocket states
  const [pushingOrder, setPushingOrder] = useState(false);
  const [generatingAwb, setGeneratingAwb] = useState(false);
  const [requestingPickup, setRequestingPickup] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOrderByIdApi(id);
      const data = res.data?.data || res.data;
      setOrder(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const handleStatusUpdate = async (values) => {
    setUpdatingStatus(true);
    try {
      await updateOrderStatusApi(id, values);
      toast.success('Order status updated');
      setStatusModalOpen(false);
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleTrackingUpdate = async (values) => {
    setUpdatingStatus(true);
    try {
      await updateOrderStatusApi(id, { status: order.status, ...values });
      toast.success('Tracking information updated');
      setTrackingModalOpen(false);
      fetchOrder();
    } catch (err) {
      toast.error('Failed to update tracking');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveNote = async (values) => {
    try {
      await updateOrderStatusApi(id, { status: order.status, note: values.note });
      toast.success('Note saved');
      setNoteModalOpen(false);
      fetchOrder();
    } catch (err) {
      toast.error('Failed to save note');
    }
  };

  const handlePushToShiprocket = async () => {
    setPushingOrder(true);
    try {
      await pushOrderToShiprocketApi(id);
      toast.success('Successfully pushed order to Shiprocket');
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to push order');
    } finally {
      setPushingOrder(false);
    }
  };

  const handleGenerateAwb = async () => {
    setGeneratingAwb(true);
    try {
      await generateAwbApi(id);
      toast.success('AWB generated successfully');
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate AWB');
    } finally {
      setGeneratingAwb(false);
    }
  };

  const handleRequestPickup = async () => {
    setRequestingPickup(true);
    try {
      await requestPickupApi(id);
      toast.success('Pickup requested successfully');
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request pickup');
    } finally {
      setRequestingPickup(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle size={40} className="text-amber-400" />
        <p className="text-slate-500 text-lg font-medium">Order not found</p>
        <Button onClick={() => navigate('/orders')}>Back to Orders</Button>
      </div>
    );
  }

  const subtotal = order.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || order.subtotal || 0;

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/orders')}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-800">{order.orderNumber}</h1>
                <Tag color={PLATFORM_COLORS[order.platform] || 'default'} className="uppercase text-xs font-bold !m-0">
                  {order.platform}
                </Tag>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-600'}`}>
                  {STATUS_FLOW.find(s => s.value === order.status)?.label || order.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Placed {dayjs(order.createdAt).format('DD MMM YYYY, hh:mm A')} · {formatRelativeTime(order.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button icon={<RefreshCw size={14} />} onClick={fetchOrder} className="!text-sm !flex !items-center !gap-1.5">
              Refresh
            </Button>
            <Button
              icon={<Edit3 size={14} />}
              onClick={() => { statusForm.setFieldsValue({ status: order.status }); setStatusModalOpen(true); }}
              className="!text-sm !flex !items-center !gap-1.5"
            >
              Update Status
            </Button>
            {order.platform !== 'fifozone' && (
              <Button
                icon={<ExternalLink size={14} />}
                href={`https://${order.platform === 'amazon' ? 'sellercentral.amazon.in' : 'seller.flipkart.com'}`}
                target="_blank"
                className="!text-sm !flex !items-center !gap-1.5"
              >
                View on {order.platform}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Main Content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Package size={16} className="text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-800">Order Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit Price</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {order.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            {item.productSnapshot?.images?.[0] ? (
                              <img src={item.productSnapshot.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <Package size={14} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 text-sm">
                              {item.productSnapshot?.masterName || item.productSnapshot?.name || 'Product'}
                            </p>
                            <p className="text-xs text-slate-400">SKU: {item.productSnapshot?.sku || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-3 py-3 font-medium text-slate-700">{item.quantity}</td>
                      <td className="text-right px-3 py-3 text-slate-600">{formatCurrency(item.unitPrice || 0)}</td>
                      <td className="text-right px-5 py-3 font-bold text-slate-800">{formatCurrency(item.totalPrice || (item.unitPrice * item.quantity))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Order Totals */}
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              <div className="max-w-xs ml-auto space-y-1.5">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {order.shippingCharge > 0 && (
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Shipping</span>
                    <span>{formatCurrency(order.shippingCharge)}</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount</span>
                    <span>−{formatCurrency(order.discount)}</span>
                  </div>
                )}
                {order.platformFee > 0 && (
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Platform Fee</span>
                    <span>{formatCurrency(order.platformFee)}</span>
                  </div>
                )}
                <Divider className="!my-2" />
                <div className="flex justify-between font-bold text-slate-900 text-base">
                  <span>Total</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-5">
              <Clock size={16} className="text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-800">Status Timeline</h2>
            </div>
            {order.statusHistory?.length > 0 ? (
              <Timeline
                items={order.statusHistory.map((sh, idx) => ({
                  key: idx,
                  color: idx === 0 ? 'green' : 'gray',
                  children: (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[sh.status] || 'bg-slate-100 text-slate-600'}`}>
                          {STATUS_FLOW.find(s => s.value === sh.status)?.label || sh.status}
                        </span>
                        <span className="text-xs text-slate-400">
                          {dayjs(sh.timestamp || sh.createdAt).format('DD MMM, hh:mm A')}
                        </span>
                      </div>
                      {sh.note && <p className="text-xs text-slate-500 mt-1">{sh.note}</p>}
                    </div>
                  )
                }))}
              />
            ) : (
              <p className="text-sm text-slate-400">No status history available.</p>
            )}
          </div>

          {/* Shipping Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-emerald-600" />
                <h2 className="text-sm font-semibold text-slate-800">Shipping & Tracking</h2>
              </div>
              <Button size="small" icon={<Edit3 size={12} />} onClick={() => {
                trackingForm.setFieldsValue({ trackingNumber: order.trackingNumber, courierPartner: order.courierPartner });
                setTrackingModalOpen(true);
              }} className="!text-xs">
                Update
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoBlock label="Courier" value={order.courierPartner} />
              <InfoBlock label="Tracking #" value={order.trackingNumber} copyable />
              <InfoBlock label="Est. Delivery" value={order.estimatedDelivery ? dayjs(order.estimatedDelivery).format('DD MMM YYYY') : null} />
              {order.deliveredAt && <InfoBlock label="Delivered At" value={dayjs(order.deliveredAt).format('DD MMM YYYY, hh:mm A')} />}
            </div>
            {order.trackingUrl && (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold hover:text-emerald-800 transition-colors"
              >
                <ExternalLink size={12} /> Track Shipment
              </a>
            )}
          </div>

          {/* Shiprocket Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package size={16} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-800">Shiprocket Automation</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {!order.shiprocketOrderId ? (
                <Button type="primary" onClick={handlePushToShiprocket} loading={pushingOrder} className="!bg-blue-600">
                  Push to Shiprocket
                </Button>
              ) : (
                <div className="space-y-4 w-full">
                  <div className="flex gap-6 border-b border-slate-100 pb-4">
                    <InfoBlock label="Shiprocket Order ID" value={order.shiprocketOrderId} />
                    <InfoBlock label="Shipment ID" value={order.shiprocketShipmentId} />
                    {order.awbCode && <InfoBlock label="AWB Code" value={order.awbCode} />}
                  </div>
                  <div className="flex gap-3">
                    {!order.awbCode ? (
                      <Button onClick={handleGenerateAwb} loading={generatingAwb} className="!border-blue-600 !text-blue-600">
                        Generate AWB Tracking
                      </Button>
                    ) : (
                      <Button type="primary" onClick={handleRequestPickup} loading={requestingPickup} className="!bg-emerald-600 !border-emerald-600">
                        Request Courier Pickup
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-5">
          {/* Customer Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-800">Customer</h2>
            </div>
            <div className="space-y-3">
              <InfoBlock label="Name" value={order.customer?.name} />
              <InfoBlock label="Email" value={order.customer?.email} icon={<Mail size={12} />} copyable />
              <InfoBlock label="Phone" value={order.customer?.phone} icon={<Phone size={12} />} copyable />
              {order.customer?.alternatePhone && (
                <InfoBlock label="Alt. Phone" value={order.customer.alternatePhone} />
              )}
            </div>

            <Divider className="!my-3" />
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Shipping Address</p>
            <p className="text-sm text-slate-700 leading-relaxed">
              {[order.shippingAddress?.line1, order.shippingAddress?.line2, order.shippingAddress?.city,
                order.shippingAddress?.state, order.shippingAddress?.pincode].filter(Boolean).join(', ')}
            </p>
            {order.shippingAddress?.phone && (
              <p className="text-xs text-slate-500 mt-1">{order.shippingAddress.phone}</p>
            )}
          </div>

          {/* Payment Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={16} className="text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-800">Payment</h2>
            </div>
            <div className="space-y-3">
              <InfoBlock label="Method" value={order.paymentMethod} />
              <InfoBlock label="Status" value={
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                  order.paymentStatus === 'refunded' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {order.paymentStatus?.replace('_', ' ').toUpperCase() || 'Unknown'}
                </span>
              } />
              <InfoBlock label="Currency" value={order.currency || 'INR'} />
              <InfoBlock label="Total Amount" value={formatCurrency(order.totalAmount)} />
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-emerald-600" />
                <h2 className="text-sm font-semibold text-slate-800">Internal Note</h2>
              </div>
              <Button size="small" icon={<Edit3 size={12} />} onClick={() => {
                noteForm.setFieldsValue({ note: order.internalNote });
                setNoteModalOpen(true);
              }} className="!text-xs">
                Edit
              </Button>
            </div>
            {order.internalNote ? (
              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3">{order.internalNote}</p>
            ) : (
              <p className="text-xs text-slate-400 italic">No internal note added yet.</p>
            )}
          </div>

          {/* Platform Note */}
          {order.platformNote && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Platform Note</p>
              <p className="text-sm text-amber-800">{order.platformNote}</p>
            </div>
          )}

          {/* Platform Order ID */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <InfoBlock label="Platform Order ID" value={order.platformOrderId} copyable />
            <InfoBlock label="Internal ID" value={order._id} copyable />
          </div>
        </div>
      </div>

      {/* Update Status Modal */}
      <Modal
        title="Update Order Status"
        open={statusModalOpen}
        onCancel={() => setStatusModalOpen(false)}
        footer={null}
        width={480}
      >
        <Form form={statusForm} layout="vertical" onFinish={handleStatusUpdate} className="mt-4">
          <Form.Item name="status" label="New Status" rules={[{ required: true }]}>
            <Select placeholder="Select new status">
              {STATUS_FLOW.map(s => (
                <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}
          >
            {({ getFieldValue }) =>
              getFieldValue('status') === 'shipped' ? (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Shipping Details</h4>
                  <Form.Item name="courierPartner" label="Courier Partner" rules={[{ required: true, message: 'Required for shipped status' }]}>
                    <Select placeholder="Select courier">
                      {['Delhivery', 'Blue Dart', 'DTDC', 'FedEx', 'Xpressbees', 'Shiprocket', 'Amazon Logistics', 'Flipkart Logistics', 'Other'].map(c => (
                        <Select.Option key={c} value={c}>{c}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="trackingNumber" label="Tracking Number" rules={[{ required: true, message: 'Required for shipped status' }]} className="!mb-0">
                    <Input placeholder="e.g., DL1234567890" />
                  </Form.Item>
                </div>
              ) : null
            }
          </Form.Item>
          <Form.Item name="note" label="Note (optional)">
            <Input.TextArea rows={2} placeholder="e.g., Dispatched via Delhivery" />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setStatusModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={updatingStatus}
              className="!bg-emerald-600 !border-emerald-600">
              Update Status
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Update Tracking Modal */}
      <Modal
        title="Update Tracking Information"
        open={trackingModalOpen}
        onCancel={() => setTrackingModalOpen(false)}
        footer={null}
        width={480}
      >
        <Form form={trackingForm} layout="vertical" onFinish={handleTrackingUpdate} className="mt-4">
          <Form.Item name="courierPartner" label="Courier Partner">
            <Select placeholder="Select courier">
              {['Delhivery', 'Blue Dart', 'DTDC', 'FedEx', 'Xpressbees', 'Shiprocket', 'Amazon Logistics', 'Flipkart Logistics', 'Other'].map(c => (
                <Select.Option key={c} value={c}>{c}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="trackingNumber" label="Tracking Number">
            <Input placeholder="e.g., DL1234567890" />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setTrackingModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={updatingStatus}
              className="!bg-emerald-600 !border-emerald-600">
              Save Tracking
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Notes Modal */}
      <Modal
        title="Edit Internal Note"
        open={noteModalOpen}
        onCancel={() => setNoteModalOpen(false)}
        footer={null}
        width={480}
      >
        <Form form={noteForm} layout="vertical" onFinish={handleSaveNote} className="mt-4">
          <Form.Item name="note" label="Internal Note">
            <Input.TextArea rows={4} placeholder="Add a private note visible only to admin/manager..." />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setNoteModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit"
              className="!bg-emerald-600 !border-emerald-600">
              Save Note
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default OrderDetailPage;
