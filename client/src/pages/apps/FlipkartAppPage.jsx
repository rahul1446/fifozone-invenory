import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Spin, message, Tabs, Form, Input, Alert, Divider } from 'antd';
import { ShoppingBag, IndianRupee, Package, RefreshCw, Key, CheckCircle, XCircle } from 'lucide-react';
import { getOrdersApi } from '../../api/orderApi';
import { updateCredentialsApi, getCredentialsStatusApi } from '../../api/platformApi';

const { TabPane } = Tabs;

const FlipkartAppPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(null);
  const [form] = Form.useForm();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getOrdersApi({ platform: 'flipkart', limit: 50 });
      const data = res?.data?.orders || res?.orders || (Array.isArray(res?.data) ? res.data : []);
      setOrders(data);
    } catch { message.error('Failed to fetch Flipkart orders'); }
    finally { setLoading(false); }
  };

  const fetchStatus = async () => {
    try {
      const res = await getCredentialsStatusApi();
      const s = res?.data || res;
      setConnected(s?.flipkart?.connected || false);
      if (s?.flipkart?.clientId) form.setFieldsValue({ clientId: s.flipkart.clientId });
    } catch { setConnected(false); }
  };

  useEffect(() => { fetchOrders(); fetchStatus(); }, []);

  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      await updateCredentialsApi('flipkart', vals);
      message.success('✅ Flipkart API credentials saved successfully!');
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
    { title: 'Amount', dataIndex: 'totalAmount', key: 'amount', render: v => <span className="font-bold text-slate-800">₹{(v || 0).toLocaleString('en-IN')}</span> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: v => <Tag color={statusColor[v] || 'default'}>{(v || '').toUpperCase()}</Tag> },
    { title: 'Date', dataIndex: 'createdAt', key: 'date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center text-2xl font-black text-yellow-600">F</div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Flipkart Integration</h1>
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
          { label: 'Total Orders', value: orders.length, icon: <ShoppingBag size={20} className="text-yellow-600" />, border: 'border-yellow-400', bg: 'bg-yellow-50' },
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: <IndianRupee size={20} className="text-blue-600" />, border: 'border-blue-400', bg: 'bg-blue-50' },
          { label: 'Delivered', value: delivered, icon: <Package size={20} className="text-emerald-600" />, border: 'border-emerald-400', bg: 'bg-emerald-50' },
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
              <Table columns={columns} dataSource={orders} rowKey="_id" pagination={{ pageSize: 15, showTotal: t => `${t} orders` }} locale={{ emptyText: '📭 No Flipkart orders yet. Connect your API to start syncing.' }} />
            }
          </TabPane>

          <TabPane tab="🔑 API Settings" key="api">
            <div className="max-w-2xl py-4">
              <Alert
                message="Flipkart Seller API Credentials"
                description="Enter your Flipkart Seller API credentials to automatically sync orders and update inventory. Get these from Flipkart Seller Hub → API Settings."
                type="info"
                showIcon
                className="mb-6"
              />
              <Form form={form} layout="vertical" requiredMark={false}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <Form.Item label={<span className="font-semibold text-slate-700">Client ID</span>} name="clientId" rules={[{ required: true, message: 'Required' }]}>
                    <Input prefix={<Key size={14} className="text-slate-400" />} placeholder="Your Flipkart Client ID" />
                  </Form.Item>
                  <Form.Item label={<span className="font-semibold text-slate-700">Client Secret</span>} name="clientSecret" rules={[{ required: true, message: 'Required' }]}>
                    <Input.Password placeholder="Your Flipkart Client Secret" />
                  </Form.Item>
                  <Form.Item label={<span className="font-semibold text-slate-700">App ID</span>} name="appId" rules={[{ required: true, message: 'Required' }]}>
                    <Input placeholder="Your Flipkart App ID" />
                  </Form.Item>
                </div>
                <Divider />
                <div className="flex items-center gap-3">
                  <Button type="primary" loading={saving} onClick={handleSave} icon={<Key size={15} />} size="large">
                    Save Flipkart Credentials
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
export default FlipkartAppPage;
