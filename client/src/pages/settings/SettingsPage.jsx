import React, { useState, useEffect } from 'react';
import {
  Form, Input, Button, message, Divider, Tabs, Switch, Tag
} from 'antd';
import {
  SaveOutlined, CheckCircleOutlined, WarningOutlined, EyeInvisibleOutlined, EyeTwoTone
} from '@ant-design/icons';
import { Settings, Truck, ShoppingCart, Building2, Palette } from 'lucide-react';
import { getSettingsApi, updateSettingsApi, testShiprocketApi } from '../../api/settingsApi';

const SectionCard = ({ icon, title, subtitle, children, badge }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
        <div>
          <h2 className="font-bold text-slate-800 text-base">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {badge}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const StatusBadge = ({ configured }) =>
  configured
    ? <Tag icon={<CheckCircleOutlined />} color="success" className="font-semibold">Connected</Tag>
    : <Tag icon={<WarningOutlined />}     color="warning" className="font-semibold">Not configured</Tag>;

const SettingsPage = () => {
  const [generalForm] = Form.useForm();
  const [srForm]      = Form.useForm();
  const [wcForm]      = Form.useForm();

  const [loading,   setLoading]   = useState(true);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingSR,  setSavingSR]  = useState(false);
  const [savingWC,  setSavingWC]  = useState(false);
  const [testingSR, setTestingSR] = useState(false);
  const [settings,  setSettings]  = useState(null);

  // ── Fetch ──
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await getSettingsApi();
      const data = res?.data?.data || res?.data;
      setSettings(data);

      generalForm.setFieldsValue({
        companyName:  data.companyName,
        email:        data.email,
        phone:        data.phone,
        address:      data.address,
        gstin:        data.gstin,
        currency:     data.currency,
        timezone:     data.timezone,
      });

      srForm.setFieldsValue({
        srEmail:         data.shiprocket?.email || '',
        srPassword:      data.shiprocket?.hasPassword ? '••••••••' : '',
        srPickup:        data.shiprocket?.pickupLocation || 'Primary',
      });

      wcForm.setFieldsValue({
        wcSiteUrl:        data.woocommerce?.siteUrl || '',
        wcConsumerKey:    data.woocommerce?.consumerKey || '',
        wcConsumerSecret: data.woocommerce?.consumerSecret || '',
      });
    } catch {
      message.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  // ── Save handlers ──
  const saveGeneral = async () => {
    const vals = await generalForm.validateFields();
    setSavingGeneral(true);
    try {
      await updateSettingsApi(vals);
      message.success('Company settings saved!');
      fetchSettings();
    } catch { message.error('Failed to save'); }
    finally { setSavingGeneral(false); }
  };

  const saveSR = async () => {
    const vals = await srForm.validateFields();
    setSavingSR(true);
    try {
      await updateSettingsApi({
        shiprocket: {
          email:          vals.srEmail,
          password:       vals.srPassword,
          pickupLocation: vals.srPickup || 'Primary',
        }
      });
      message.success('✅ Shiprocket credentials saved! You can now push orders.');
      fetchSettings();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSavingSR(false);
    }
  };

  const testSRConnection = async () => {
    setTestingSR(true);
    try {
      const res = await testShiprocketApi();
      message.success(res?.data?.message || '✅ Connected successfully!');
    } catch (err) {
      message.error(err?.response?.data?.message || 'Connection failed. Check your credentials.');
    } finally {
      setTestingSR(false);
    }
  };

  const saveWC = async () => {
    const vals = await wcForm.validateFields();
    setSavingWC(true);
    try {
      await updateSettingsApi({
        woocommerce: {
          siteUrl:        vals.wcSiteUrl,
          consumerKey:    vals.wcConsumerKey,
          consumerSecret: vals.wcConsumerSecret,
        }
      });
      message.success('✅ WooCommerce credentials saved!');
      fetchSettings();
    } catch { message.error('Failed to save'); }
    finally { setSavingWC(false); }
  };

  return (
    <div className="space-y-5 pb-10 max-w-[900px] mx-auto p-1">

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
        <div className="p-2.5 bg-slate-100 rounded-xl">
          <Settings size={20} className="text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
          <p className="text-sm text-slate-500">Manage your store configuration and integrations</p>
        </div>
      </div>

      <Tabs
        size="large"
        tabPosition="left"
        className="settings-tabs"
        items={[
          // ── Company ──────────────────────────────────────────
          {
            key: 'company',
            label: (
              <span className="flex items-center gap-2 font-medium">
                <Building2 size={16} /> Company
              </span>
            ),
            children: (
              <SectionCard
                icon={<Building2 size={18} className="text-slate-600" />}
                title="Company Information"
                subtitle="Basic details shown on invoices and reports"
              >
                <Form form={generalForm} layout="vertical" className="max-w-[560px]">
                  <Form.Item name="companyName" label="Company Name" rules={[{ required: true }]}>
                    <Input placeholder="Fifozone" size="large" className="rounded-xl" />
                  </Form.Item>
                  <div className="grid grid-cols-2 gap-4">
                    <Form.Item name="email" label="Business Email">
                      <Input placeholder="contact@fifozone.in" size="large" className="rounded-xl" />
                    </Form.Item>
                    <Form.Item name="phone" label="Phone">
                      <Input placeholder="+91 98765 43210" size="large" className="rounded-xl" />
                    </Form.Item>
                  </div>
                  <Form.Item name="address" label="Warehouse / Office Address">
                    <Input.TextArea rows={2} placeholder="Street, City, State, PIN" className="rounded-xl" />
                  </Form.Item>
                  <div className="grid grid-cols-2 gap-4">
                    <Form.Item name="gstin" label="GSTIN">
                      <Input placeholder="22AAAAA0000A1Z5" size="large" className="rounded-xl" />
                    </Form.Item>
                    <Form.Item name="currency" label="Currency">
                      <Input placeholder="INR" size="large" className="rounded-xl" />
                    </Form.Item>
                  </div>
                  <Button type="primary" size="large" icon={<SaveOutlined />}
                    loading={savingGeneral} onClick={saveGeneral}
                    className="!bg-slate-800 !border-slate-800 hover:!bg-slate-700 rounded-xl font-semibold">
                    Save Company Info
                  </Button>
                </Form>
              </SectionCard>
            )
          },

          // ── Shiprocket ───────────────────────────────────────
          {
            key: 'shiprocket',
            label: (
              <span className="flex items-center gap-2 font-medium">
                <Truck size={16} /> Shiprocket
              </span>
            ),
            children: (
              <SectionCard
                icon={<Truck size={18} className="text-blue-600" />}
                title="Shiprocket Integration"
                subtitle="Used for AWB generation, label printing, order tracking and courier pickup"
                badge={<StatusBadge configured={settings?.shiprocket?.isConfigured} />}
              >
                {/* Info Banner */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                  <p className="text-sm text-blue-700 font-semibold mb-1">🚀 How to connect</p>
                  <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
                    <li>Enter your Shiprocket login email and password below</li>
                    <li>Enter the exact Pickup Location name from your Shiprocket account</li>
                    <li>Click Save — done! All shipping features will activate immediately</li>
                  </ol>
                  <a href="https://app.shiprocket.in/settings/warehouse" target="_blank" rel="noreferrer"
                    className="text-xs text-blue-500 underline mt-2 block font-medium">
                    → Find your Pickup Location name on Shiprocket ↗
                  </a>
                </div>

                <Form form={srForm} layout="vertical" className="max-w-[560px]">
                  <Form.Item name="srEmail" label="Shiprocket Email"
                    rules={[{ required: true, message: 'Email is required' }, { type: 'email' }]}>
                    <Input
                      prefix={<span className="text-slate-400 text-sm">✉️</span>}
                      placeholder="yourlogin@email.com"
                      size="large" className="rounded-xl"
                    />
                  </Form.Item>

                  <Form.Item name="srPassword" label="Shiprocket Password"
                    rules={[{ required: true, message: 'Password is required' }]}
                    extra="Your password is stored securely and never shown again after saving.">
                    <Input.Password
                      prefix={<span className="text-slate-400 text-sm">🔒</span>}
                      placeholder="Enter your Shiprocket password"
                      size="large" className="rounded-xl"
                      iconRender={v => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                      onFocus={e => {
                        // Clear masked placeholder when user clicks to type
                        if (e.target.value === '••••••••') srForm.setFieldValue('srPassword', '');
                      }}
                    />
                  </Form.Item>

                  <Form.Item name="srPickup" label="Pickup Location Name"
                    rules={[{ required: true, message: 'Required' }]}
                    extra='Must exactly match the name in Shiprocket → Settings → Manage Pickup Addresses. Default is "Primary".'>
                    <Input
                      prefix={<span className="text-slate-400 text-sm">📍</span>}
                      placeholder="Primary"
                      size="large" className="rounded-xl"
                    />
                  </Form.Item>

                  <div className="flex gap-3 flex-wrap">
                    <Button type="primary" size="large" icon={<SaveOutlined />}
                      loading={savingSR} onClick={saveSR}
                      className="!bg-blue-600 !border-blue-600 hover:!bg-blue-700 rounded-xl font-semibold">
                      Save Shiprocket Credentials
                    </Button>
                    {settings?.shiprocket?.isConfigured && (
                      <Button size="large" loading={testingSR} onClick={testSRConnection}
                        className="!border-emerald-400 !text-emerald-600 hover:!bg-emerald-50 rounded-xl font-semibold">
                        🔌 Test Connection
                      </Button>
                    )}
                  </div>

                  {settings?.shiprocket?.isConfigured && (
                    <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2">
                      <CheckCircleOutlined className="text-emerald-500" />
                      <span className="text-sm text-emerald-700 font-medium">
                        Shiprocket is connected. All shipping features are active.
                      </span>
                    </div>
                  )}
                </Form>
              </SectionCard>
            )
          },

          // ── WooCommerce ──────────────────────────────────────
          {
            key: 'woocommerce',
            label: (
              <span className="flex items-center gap-2 font-medium">
                <ShoppingCart size={16} /> WooCommerce
              </span>
            ),
            children: (
              <SectionCard
                icon={<ShoppingCart size={18} className="text-purple-600" />}
                title="WooCommerce Integration"
                subtitle="Sync products, pricing and orders with your WordPress store"
                badge={<StatusBadge configured={settings?.woocommerce?.isConfigured} />}
              >
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-6">
                  <p className="text-sm text-purple-700 font-semibold mb-1">🔌 How to get your keys</p>
                  <ol className="text-xs text-purple-600 space-y-1 list-decimal list-inside">
                    <li>Login to your WordPress admin panel</li>
                    <li>Go to WooCommerce → Settings → Advanced → REST API</li>
                    <li>Create a new key with Read/Write permissions</li>
                    <li>Copy the Consumer Key and Consumer Secret here</li>
                  </ol>
                </div>

                <Form form={wcForm} layout="vertical" className="max-w-[560px]">
                  <Form.Item name="wcSiteUrl" label="WordPress Site URL"
                    rules={[{ required: true }]}>
                    <Input placeholder="https://fifozone.in" size="large" className="rounded-xl" />
                  </Form.Item>
                  <Form.Item name="wcConsumerKey" label="Consumer Key"
                    rules={[{ required: true }]}>
                    <Input.Password placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      size="large" className="rounded-xl" />
                  </Form.Item>
                  <Form.Item name="wcConsumerSecret" label="Consumer Secret"
                    rules={[{ required: true }]}>
                    <Input.Password placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      size="large" className="rounded-xl" />
                  </Form.Item>
                  <Button type="primary" size="large" icon={<SaveOutlined />}
                    loading={savingWC} onClick={saveWC}
                    className="!bg-purple-600 !border-purple-600 hover:!bg-purple-700 rounded-xl font-semibold">
                    Save WooCommerce Credentials
                  </Button>
                </Form>
              </SectionCard>
            )
          },
        ]}
      />
    </div>
  );
};

export default SettingsPage;
