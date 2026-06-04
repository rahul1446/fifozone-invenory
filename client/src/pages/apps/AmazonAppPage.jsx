import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Button, Spin, message, Tabs, Form, Input, Alert, Divider, Badge } from 'antd';
import { ShoppingBag, IndianRupee, Package, RefreshCw, Key, CheckCircle, XCircle, Wifi } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import { updateCredentialsApi, getCredentialsStatusApi } from '../../api/platformApi';

const { TabPane } = Tabs;
const PLATFORM = 'amazon';

const statusColor = { pending: 'gold', processing: 'blue', shipped: 'cyan', delivered: 'green', cancelled: 'red', returned: 'orange' };

const AmazonAppPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [form] = Form.useForm();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/orders', { params: { platform: PLATFORM, limit: 50 } });
      const raw = res?.data?.data || res?.data || {};
      const list = Array.isArray(raw) ? raw : (raw.orders || []);
      setOrders(list);
    } catch (err) {
      console.error('Order fetch error:', err);
      setOrders([]);
    } finally { setLoading(false); }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/platforms/credentials/status');
      const s = res?.data?.data || res?.data || {};
      const platform = s?.amazon || {};
      setConnected(!!platform.connected);
      if (platform.sellerId) form.setFieldsValue({ sellerId: platform.sellerId });
      if (platform.marketplaceId) form.setFieldsValue({ marketplaceId: platform.marketplaceId });
    } catch { setConnected(false); }
  }, [form]);

  useEffect(() => { fetchOrders(); fetchStatus(); }, [fetchOrders, fetchStatus]);

  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      await updateCredentialsApi(PLATFORM, vals);
      message.success('✅ Amazon SP-API credentials saved!');
      setConnected(true);
      setTestResult(null);
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Failed to save. Check your keys and try again.');
    } finally { setSaving(false); }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await axiosInstance.post('/platforms/test-connection', { platform: PLATFORM });
      const d = res?.data?.data || res?.data || {};
      if (d?.success) {
        setTestResult({ ok: true, msg: res?.data?.message || 'Connection successful!' });
        setConnected(true);
      } else {
        setTestResult({ ok: false, msg: res?.data?.message || 'Connection failed.' });
      }
    } catch (err) {
      setTestResult({ ok: false, msg: err?.response?.data?.message || 'Connection test failed.' });
    } finally { setTesting(false); }
  };

  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const delivered = orders.filter(o => o.status === 'delivered').length;
  const pending = orders.filter(o => ['pending', 'processing'].includes(o.status)).length;

  const columns = [
    { title: 'Order ID', dataIndex: 'orderNumber', key: 'id', render: v => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v || '—'}</span> },
    { title: 'Customer', key: 'customer', render: (_, r) => <span>{r.customer?.name || r.shippingAddress?.name || '—'}</span> },
    { title: 'Items', key: 'items', render: (_, r) => <span className="text-slate-500 text-sm">{r.items?.length || 0} item{r.items?.length !== 1 ? 's' : ''}</span> },
    { title: 'Amount', dataIndex: 'totalAmount', key: 'amount', render: v => <span className="font-bold text-slate-800">₹{(v || 0).toLocaleString('en-IN')}</span> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: v => <Tag color={statusColor[v] || 'default'}>{(v || '').toUpperCase()}</Tag> },
    { title: 'Date', dataIndex: 'createdAt', key: 'date', render: v => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
  ];

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-2xl font-black text-orange-600">A</div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Amazon Integration</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {connected === true  && <Badge status="success" text={<span className="text-xs text-emerald-600 font-semibold">Connected</span>} />}
              {connected === false && <Badge status="error"   text={<span className="text-xs text-rose-500 font-semibold">Not Connected — go to API Settings tab</span>} />}
              {connected === null  && <Badge status="processing" text={<span className="text-xs text-slate-400">Checking...</span>} />}
            </div>
          </div>
        </div>
        <Button icon={<RefreshCw size={15} />} onClick={fetchOrders} loading={loading}>Refresh</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: orders.length, icon: <ShoppingBag size={18} className="text-orange-600" />, border: 'border-orange-400', bg: 'bg-orange-50' },
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: <IndianRupee size={18} className="text-amber-600" />, border: 'border-amber-400', bg: 'bg-amber-50' },
          { label: 'Delivered', value: delivered, icon: <Package size={18} className="text-emerald-600" />, border: 'border-emerald-400', bg: 'bg-emerald-50' },
          { label: 'Pending / Processing', value: pending, icon: <ShoppingBag size={18} className="text-blue-600" />, border: 'border-blue-400', bg: 'bg-blue-50' },
        ].map(c => (
          <div key={c.label} className={`bg-white rounded-xl shadow-sm border-l-4 ${c.border} p-4 flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center shrink-0`}>{c.icon}</div>
            <div><p className="text-slate-500 text-xs">{c.label}</p><p className="text-xl font-bold text-slate-800">{c.value}</p></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <Tabs defaultActiveKey="orders" className="px-6 pt-2">
          <TabPane tab="📦 Orders" key="orders">
            {loading
              ? <div className="py-16 flex justify-center"><Spin size="large" /></div>
              : <Table columns={columns} dataSource={orders} rowKey={r => r._id || r.orderNumber || Math.random()} pagination={{ pageSize: 15, showTotal: t => `${t} Amazon orders` }} locale={{ emptyText: '📭 No Amazon orders yet. Connect API to start syncing.' }} scroll={{ x: 700 }} />
            }
          </TabPane>

          <TabPane tab="🔑 API Settings" key="api">
            <div className="max-w-2xl py-4">
              <Alert message="Amazon Seller Partner (SP-API) Credentials" description="Required to auto-sync orders & inventory from your Amazon Seller account. Get these from Amazon Seller Central → Apps & Services → Develop Apps." type="info" showIcon className="mb-6" />

              {testResult && (
                <Alert type={testResult.ok ? 'success' : 'error'} message={testResult.msg} showIcon className="mb-5"
                  icon={testResult.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
                />
              )}

              <Form form={form} layout="vertical" requiredMark={false}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <Form.Item label={<span className="font-semibold text-slate-700">Seller ID</span>} name="sellerId" rules={[{ required: true, message: 'Required' }]}>
                    <Input prefix={<Key size={13} className="text-slate-400" />} placeholder="A2EUQ1WTGCTBG2" />
                  </Form.Item>
                  <Form.Item label={<span className="font-semibold text-slate-700">Marketplace ID</span>} name="marketplaceId">
                    <Input placeholder="A21TJRUUN4KGV (India)" />
                  </Form.Item>
                  <Form.Item label={<span className="font-semibold text-slate-700">LWA Client ID</span>} name="clientId" rules={[{ required: true, message: 'Required' }]}>
                    <Input prefix={<Key size={13} className="text-slate-400" />} placeholder="amzn1.application-oa2-client..." />
                  </Form.Item>
                  <Form.Item label={<span className="font-semibold text-slate-700">LWA Client Secret</span>} name="clientSecret" rules={[{ required: true, message: 'Required' }]}>
                    <Input.Password placeholder="Your LWA client secret" />
                  </Form.Item>
                  <Form.Item label={<span className="font-semibold text-slate-700">Refresh Token</span>} name="refreshToken" rules={[{ required: true, message: 'Required' }]} className="sm:col-span-2">
                    <Input.Password placeholder="Atzr|IwEBIA..." />
                  </Form.Item>
                  <Form.Item label={<span className="font-semibold text-slate-700">AWS Access Key ID</span>} name="awsAccessKeyId" rules={[{ required: true, message: 'Required' }]}>
                    <Input.Password placeholder="AKIAIOSFODNN7EXAMPLE" />
                  </Form.Item>
                  <Form.Item label={<span className="font-semibold text-slate-700">AWS Secret Access Key</span>} name="awsSecretKey" rules={[{ required: true, message: 'Required' }]}>
                    <Input.Password placeholder="wJalrXUtnFEMI/K7MDENG..." />
                  </Form.Item>
                  <Form.Item label={<span className="font-semibold text-slate-700">Role ARN</span>} name="roleArn" className="sm:col-span-2">
                    <Input placeholder="arn:aws:iam::123456789:role/SellerCentralRole" />
                  </Form.Item>
                </div>
                <Divider />
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="primary" loading={saving} onClick={handleSave} icon={<Key size={14} />} size="large">Save Credentials</Button>
                  <Button loading={testing} onClick={handleTestConnection} icon={<Wifi size={14} />} size="large">Test Connection</Button>
                  <span className="text-slate-400 text-xs">Credentials are encrypted and stored securely in your database.</span>
                </div>
              </Form>
            </div>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};
export default AmazonAppPage;
