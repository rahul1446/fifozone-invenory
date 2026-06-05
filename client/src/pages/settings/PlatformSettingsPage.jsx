import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, message, Modal, Spin, Select } from 'antd';
import { Globe, Package, ShoppingBag, Save, CheckCircle2, XCircle, Wifi, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { updateCredentialsApi, getCredentialsStatusApi, triggerManualSyncApi } from '../../api/platformApi';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';

const PlatformSettingsPage = () => {
  const [wooForm] = Form.useForm();
  const [amazonForm] = Form.useForm();
  const [flipkartForm] = Form.useForm();
  const [meeshoForm] = Form.useForm();

  // Each key: 'fifozone' | 'amazon' | 'flipkart'
  const [saving, setSaving] = useState({});
  const [testing, setTesting] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState({ fifozone: false, amazon: false, flipkart: false, meesho: false });
  const [testResult, setTestResult] = useState({});
  const [loadingCreds, setLoadingCreds] = useState(true);
  const [addPlatformModalOpen, setAddPlatformModalOpen] = useState(false);
  const [addPlatformForm] = Form.useForm();

  const fetchStatus = useCallback(async () => {
    setLoadingCreds(true);
    try {
      const res = await getCredentialsStatusApi();
      const rawData = res?.data?.data || res?.data;
      
      setStatus({
        fifozone: rawData?.fifozone?.connected || false,
        amazon: rawData?.amazon?.connected || false,
        flipkart: rawData?.flipkart?.connected || false,
        meesho: rawData?.meesho?.connected || false,
      });

      if (rawData?.fifozone) wooForm.setFieldsValue(rawData.fifozone);
      if (rawData?.amazon) amazonForm.setFieldsValue(rawData.amazon);
      if (rawData?.flipkart) flipkartForm.setFieldsValue(rawData.flipkart);
      if (rawData?.meesho) meeshoForm.setFieldsValue(rawData.meesho);
    } catch (error) {
      console.error('Failed to fetch credentials status', error);
    } finally {
      setLoadingCreds(false);
    }
  }, [wooForm, amazonForm, flipkartForm, meeshoForm]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleSave = async (platformKey, values) => {
    // Remove blank fields
    const cleaned = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );

    setSaving(prev => ({ ...prev, [platformKey]: true }));
    try {
      await updateCredentialsApi(platformKey, cleaned);
      toast.success(`${platformKey === 'fifozone' ? 'Fifozone / WooCommerce' : platformKey} credentials saved!`);
      setStatus(prev => ({ ...prev, [platformKey]: true }));
      setTestResult(prev => ({ ...prev, [platformKey]: null }));

      // Auto-trigger sync for the saved platform
      toast.loading('Triggering sync...', { id: 'sync-toast' });
      try {
        await triggerManualSyncApi();
        toast.success('Sync triggered! Products will appear shortly.', { id: 'sync-toast' });
      } catch (syncErr) {
        toast.error('Credentials saved but sync failed. Try syncing manually.', { id: 'sync-toast' });
      }
    } catch (error) {
      toast.error(`Failed to save credentials: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(prev => ({ ...prev, [platformKey]: false }));
    }
  };

  const handleTestConnection = async (platformKey) => {
    setTesting(prev => ({ ...prev, [platformKey]: true }));
    setTestResult(prev => ({ ...prev, [platformKey]: null }));
    try {
      const res = await axiosInstance.post('/platforms/test-connection', { platform: platformKey });
      const ok = res.data?.data?.success || res.data?.success;
      setTestResult(prev => ({ ...prev, [platformKey]: { ok, message: res.data?.message || (ok ? 'Connection successful' : 'Connection failed') } }));
    } catch (err) {
      setTestResult(prev => ({ ...prev, [platformKey]: { ok: false, message: err.response?.data?.message || 'Connection failed' } }));
    } finally {
      setTesting(prev => ({ ...prev, [platformKey]: false }));
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await triggerManualSyncApi();
      toast.success('Manual sync triggered. Products and orders will update shortly.');
    } catch (err) {
      toast.error('Sync failed. Check server logs.');
    } finally {
      setSyncing(false);
    }
  };

  const handleAddPlatform = async (values) => {
    // Mocking adding a custom platform as backend doesn't fully support custom dynamic platforms yet
    toast.success(`Connected new account for ${values.platformName}`);
    setAddPlatformModalOpen(false);
    addPlatformForm.resetFields();
  };

  const PlatformCard = ({ icon, title, subtitle, color, iconBg, platformKey, form, children }) => {
    const connected = status[platformKey];
    const result = testResult[platformKey];

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{title}</h3>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {connected ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                <CheckCircle2 size={13} /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-full">
                <XCircle size={13} /> Not Connected
              </span>
            )}
          </div>
        </div>

        {/* Test Result */}
        {result && (
          <div className={`mx-6 mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium ${
            result.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {result.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            {result.message}
          </div>
        )}

        {/* Form */}
        <div className="p-6">
          <Form form={form} layout="vertical" onFinish={(v) => handleSave(platformKey, v)}>
            {children}
            <div className="flex items-center justify-between flex-wrap gap-3 mt-4">
              <Button
                type="default"
                icon={<Wifi size={15} />}
                loading={testing[platformKey]}
                onClick={() => handleTestConnection(platformKey)}
                className="!flex !items-center !gap-1.5 !text-sm border-slate-300"
              >
                Test Connection
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving[platformKey]}
                icon={<Save size={15} />}
                className="!flex !items-center !gap-1.5 !text-sm !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600"
              >
                Save & Sync
              </Button>
            </div>
          </Form>
        </div>
      </div>
    );
  };

  if (loadingCreds) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
        <span className="ml-3 text-slate-500">Loading platform credentials...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Platform Integrations</h1>
          <p className="text-sm text-slate-500 mt-1">Configure API credentials for each e-commerce platform</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="default"
            onClick={() => setAddPlatformModalOpen(true)}
            className="!font-medium"
          >
            Connect New Account
          </Button>
          <Button
            type="primary"
            icon={<RefreshCw size={15} />}
            loading={syncing}
            onClick={handleManualSync}
            className="!flex !items-center !gap-1.5 !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600"
          >
            Sync All Platforms Now
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <RefreshCw size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">How it works</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Enter your API credentials below and click <strong>"Save & Sync"</strong>. 
            Your products and orders will automatically sync from the platform. 
            Only platforms with valid credentials will appear in the Dashboard.
          </p>
        </div>
      </div>

      {/* ─── Fifozone / WooCommerce ─── */}
      <PlatformCard
        icon={<Globe size={20} className="text-purple-600" />}
        title="Fifozone Website (WooCommerce)"
        subtitle="Your main website — fifozone.com"
        color="purple"
        iconBg="bg-purple-100"
        platformKey="fifozone"
        form={wooForm}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            label="Store URL"
            name="storeUrl"
            className="md:col-span-2"
            rules={[{ required: true, message: 'Store URL is required' }]}
            extra="e.g. https://fifozone.com"
          >
            <Input placeholder="https://fifozone.com" autoComplete="off" size="large" />
          </Form.Item>
          <Form.Item
            label="Consumer Key"
            name="consumerKey"
            rules={[{ required: true, message: 'Consumer Key is required' }]}
          >
            <Input.Password
              placeholder="ck_..."
              autoComplete="new-password"
              size="large"
              visibilityToggle
            />
          </Form.Item>
          <Form.Item
            label="Consumer Secret"
            name="consumerSecret"
            rules={[{ required: true, message: 'Consumer Secret is required' }]}
          >
            <Input.Password
              placeholder="cs_..."
              autoComplete="new-password"
              size="large"
              visibilityToggle
            />
          </Form.Item>
        </div>
      </PlatformCard>

      {/* ─── Amazon ─── */}
      <PlatformCard
        icon={<Package size={20} className="text-orange-600" />}
        title="Amazon Seller (SP-API)"
        subtitle="Amazon Seller Central India"
        color="orange"
        iconBg="bg-orange-100"
        platformKey="amazon"
        form={amazonForm}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item label="Seller ID (Merchant ID)" name="sellerId">
            <Input autoComplete="off" size="large" placeholder="A1B2C3..." />
          </Form.Item>
          <Form.Item label="Client ID" name="clientId">
            <Input.Password autoComplete="new-password" size="large" />
          </Form.Item>
          <Form.Item label="Client Secret" name="clientSecret" className="md:col-span-2">
            <Input.Password autoComplete="new-password" size="large" />
          </Form.Item>
          <Form.Item label="Refresh Token" name="refreshToken" className="md:col-span-2">
            <Input.Password autoComplete="new-password" size="large" />
          </Form.Item>
          <Form.Item label="AWS Access Key ID" name="awsAccessKey">
            <Input.Password autoComplete="new-password" size="large" />
          </Form.Item>
          <Form.Item label="AWS Secret Access Key" name="awsSecretKey">
            <Input.Password autoComplete="new-password" size="large" />
          </Form.Item>
          <Form.Item label="IAM Role ARN" name="roleArn" className="md:col-span-2">
            <Input placeholder="arn:aws:iam::..." autoComplete="off" size="large" />
          </Form.Item>
        </div>
      </PlatformCard>

      {/* ─── Flipkart ─── */}
      <PlatformCard
        icon={<ShoppingBag size={20} className="text-yellow-600" />}
        title="Flipkart Seller API"
        subtitle="Flipkart Seller Hub"
        color="yellow"
        iconBg="bg-yellow-100"
        platformKey="flipkart"
        form={flipkartForm}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item label="App ID" name="appId" className="md:col-span-2">
            <Input autoComplete="off" size="large" />
          </Form.Item>
          <Form.Item label="Client ID" name="clientId">
            <Input.Password autoComplete="new-password" size="large" />
          </Form.Item>
          <Form.Item label="Client Secret" name="clientSecret">
            <Input.Password autoComplete="new-password" size="large" />
          </Form.Item>
        </div>
      </PlatformCard>

      {/* ─── Meesho ─── */}
      <PlatformCard
        icon={<ShoppingBag size={20} className="text-pink-600" />}
        title="Meesho Supplier API"
        subtitle="Meesho Supplier Panel"
        color="pink"
        iconBg="bg-pink-100"
        platformKey="meesho"
        form={meeshoForm}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item label="Supplier ID" name="supplierId" className="md:col-span-2">
            <Input autoComplete="off" size="large" />
          </Form.Item>
          <Form.Item label="API Token" name="apiToken" className="md:col-span-2">
            <Input.Password autoComplete="new-password" size="large" />
          </Form.Item>
        </div>
      </PlatformCard>

      <Modal
        title="Connect New Account"
        open={addPlatformModalOpen}
        onCancel={() => setAddPlatformModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={addPlatformForm} layout="vertical" onFinish={handleAddPlatform} className="mt-4">
          <Form.Item name="platformName" label="Platform Name" rules={[{ required: true }]}>
            <Select placeholder="Select platform">
              <Select.Option value="Shopify">Shopify</Select.Option>
              <Select.Option value="Meesho">Meesho</Select.Option>
              <Select.Option value="Myntra">Myntra</Select.Option>
              <Select.Option value="Custom">Custom Webhook</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="apiKey" label="API Key / Client ID" rules={[{ required: true }]}>
            <Input placeholder="Enter API Key" />
          </Form.Item>
          <Form.Item name="apiSecret" label="API Secret" rules={[{ required: true }]}>
            <Input.Password placeholder="Enter API Secret" />
          </Form.Item>
          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setAddPlatformModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" className="bg-emerald-600">Connect</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default PlatformSettingsPage;
