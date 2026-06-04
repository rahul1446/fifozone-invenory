import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Spin, message, Tabs, Form, Input, Alert, Divider } from 'antd';
import { ShoppingBag, IndianRupee, Package, RefreshCw, Key, CheckCircle, XCircle, Globe } from 'lucide-react';
import { getOrdersApi } from '../../api/orderApi';
import { updateCredentialsApi, getCredentialsStatusApi } from '../../api/platformApi';

const { TabPane } = Tabs;

const FifozoneAppPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(null);
  const [form] = Form.useForm();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getOrdersApi({ platform: 'fifozone', limit: 50 });
      const data = res?.data?.orders || res?.orders || (Array.isArray(res?.data) ? res.data : []);
      setOrders(data);
    } catch { message.error('Failed to fetch Fifozone orders'); }
    finally { setLoading(false); }
  };

  const fetchStatus = async () => {
    try {
      const res = await getCredentialsStatusApi();
      const s = res?.data || res;
      setConnected(s?.fifozone?.connected || false);
      if (s?.fifozone?.storeUrl) form.setFieldsValue({ storeUrl: s.fifozone.storeUrl });
    } catch { setConnected(false); }
  };

  useEffect(() => { fetchOrders(); fetchStatus(); }, []);

  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      await updateCredentialsApi('fifozone', vals);
      message.success('✅ WooCommerce credentials saved successfully!');
      setConnected(true);
    } catch (err) {
      if (err?.errorFields) return;
      message.error('Failed to save credentials. Check your keys.');
    } finally { setSaving(false); }
  };

  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const delivered = orders.filter(o => o.status === 'delivered').length;
  const pending = orders.filter(o => o.status === 'pending').length;
  const statusColor = { pending: 'gold', processing: 'blue', shipped: 'cyan', delivered: 'green', cancelled: 'red' };

  const columns = [
    { title: 'Order ID', dataIndex: 'orderNumber', key: 'orderNumber', render: v => <span className="font-mono font-semibold text-slate-700">{v || '—'}</span> },
    { title: 'Customer', key: 'customer', render: (_, r) => r.customer?.name || '—' },
    { title: 'Phone', key: 'phone', render: (_, r) => r.customer?.phone || '—' },
    { title: 'Amount', dataIndex: 'totalAmount', key: 'amount', render: v => <span className="font-bold text-slate-800">₹{(v || 0).toLocaleString('en-IN')}</span> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: v => <Tag color={statusColor[v] || 'default'}>{(v || '').toUpperCase()}</Tag> },
    { title: 'Date', dataIndex: 'createdAt', key: 'date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl font-black text-emerald-700">
            <Globe size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Fifozone Website (WooCommerce)</h1>
            <div className="flex items-center gap-2 mt-1">
              {connected === true && <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold"><CheckCircle size={12} /> Connected</span>}
              {connected === false && <span className="flex items-center gap-1 text-xs text-rose-500 font-semibold"><XCircle size={12} /> Not Connected — Add API keys below</span>}
            </div>
          </div>
        </div>
        <Button icon={<RefreshCw size={16} />} onClick={fetchOrders}>Refresh Orders</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: orders.length, icon: <ShoppingBag size={20} className="text-emerald-600" />, border: 'border-emerald-400', bg: 'bg-emerald-50' },
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: <IndianRupee size={20} className="text-teal-600" />, border: 'border-teal-400', bg: 'bg-teal-50' },
          { label: 'Delivered', value: delivered, icon: <Package size={20} className="text-green-600" />, border: 'border-green-400', bg: 'bg-green-50' },
          { label: 'Pending', value: pending, icon: <ShoppingBag size={20} className="text-orange-600" />, border: 'border-orange-400', bg: 'bg-orange-50' },
        ].map(c => (
          <div key={c.label} className={`bg-white rounded-xl shadow-sm border-l-4 ${c.border} p-5 flex items-center gap-4`}>
            <div className={`w-11 h-11 rounded-full ${c.bg} flex items-center justify-center`}>{c.icon}</div>
            <div><p className="text-slate-500 text-sm">{c.label}</p><p className="text-2xl font-bold text-slate-800">{c.value}</p></div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <Tabs defaultActiveKey="orders" className="px-6 pt-2">
          <TabPane tab="📦 Orders" key="orders">
            {loading ? <div className="py-16 flex justify-center"><Spin size="large" /></div> :
              <Table columns={columns} dataSource={orders} rowKey="_id" pagination={{ pageSize: 15, showTotal: t => `${t} orders` }} locale={{ emptyText: '📭 No website orders yet. Connect WooCommerce to start syncing.' }} />
            }
          </TabPane>

          <TabPane tab="🔑 API Settings" key="api">
            <div className="max-w-2xl py-4">
              <Alert
                message="WooCommerce REST API Credentials"
                description={<span>Connect your fifozone.in WooCommerce store. Go to <b>WooCommerce → Settings → Advanced → REST API</b> to generate Consumer Key and Secret.</span>}
                type="info"
                showIcon
                className="mb-6"
              />
              <Form form={form} layout="vertical" requiredMark={false}>
                <Form.Item label={<span className="font-semibold text-slate-700">Store URL</span>} name="storeUrl" rules={[{ required: true, message: 'Required' }, { type: 'url', message: 'Enter a valid URL' }]}>
                  <Input prefix={<Globe size={14} className="text-slate-400" />} placeholder="https://fifozone.in" />
                </Form.Item>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <Form.Item label={<span className="font-semibold text-slate-700">Consumer Key</span>} name="consumerKey" rules={[{ required: true, message: 'Required' }]}>
                    <Input prefix={<Key size={14} className="text-slate-400" />} placeholder="ck_xxxxxxxxxxxxxxxx" />
                  </Form.Item>
                  <Form.Item label={<span className="font-semibold text-slate-700">Consumer Secret</span>} name="consumerSecret" rules={[{ required: true, message: 'Required' }]}>
                    <Input.Password placeholder="cs_xxxxxxxxxxxxxxxx" />
                  </Form.Item>
                </div>
                <Divider />
                <div className="flex items-center gap-3">
                  <Button type="primary" loading={saving} onClick={handleSave} icon={<Key size={15} />} size="large">
                    Save WooCommerce Credentials
                  </Button>
                  <span className="text-slate-400 text-xs">Credentials are encrypted and stored securely.</span>
                </div>
              </Form>
            </div>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};
export default FifozoneAppPage;
