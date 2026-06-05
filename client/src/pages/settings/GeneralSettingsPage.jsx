import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Form, Input, Button, Card, message, Select, Upload, ColorPicker } from 'antd';
import { Save, UploadCloud, Building, Globe, Mail, Phone, MapPin, Hash, Plus } from 'lucide-react';
import { getSettingsApi, updateSettingsApi } from '../../api/settingsApi';
import { setSettingsSuccess } from '../../store/settingsSlice';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;

const GeneralSettingsPage = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await getSettingsApi();
      const settings = response.data.data;
      if (settings) {
        form.setFieldsValue({
          companyName: settings.companyName,
          email: settings.email,
          phone: settings.phone,
          address: settings.address,
          gstin: settings.gstin,
          currency: settings.currency,
          timezone: settings.timezone,
          primaryColor: settings.primaryColor,
        });
        setLogoUrl(settings.logoUrl || '');
        dispatch(setSettingsSuccess(settings));
      }
    } catch (error) {
      console.error('Failed to fetch settings', error);
      message.error('Could not load settings');
    }
  };

  const handleUpload = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      const url = res.data.url;
      setLogoUrl(url);
      onSuccess('Ok');
      message.success('Logo uploaded successfully');
    } catch (err) {
      onError({ err });
      message.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // ColorPicker returns a complex object, extract hex
      let primaryColor = values.primaryColor;
      if (typeof primaryColor === 'object' && primaryColor.toHexString) {
        primaryColor = primaryColor.toHexString();
      }

      const payload = { ...values, logoUrl, primaryColor };
      const res = await updateSettingsApi(payload);
      
      message.success('Settings updated successfully');
      dispatch(setSettingsSuccess(res.data.data));
    } catch (error) {
      message.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">General Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure your company identity, branding, and local settings</p>
        </div>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <div className="space-y-6">
          
          {/* Company Identity */}
          <Card 
            title={<div className="flex items-center gap-2 text-slate-700"><Building size={18}/> Company Profile</div>} 
            className="shadow-sm rounded-xl border-slate-100"
            bordered={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <Form.Item label="Company Name" name="companyName" rules={[{ required: true }]}>
                <Input size="large" prefix={<Building size={16} className="text-slate-400 mr-1"/>} placeholder="e.g. Fifozone" />
              </Form.Item>
              <Form.Item label="Email Address" name="email">
                <Input size="large" prefix={<Mail size={16} className="text-slate-400 mr-1"/>} placeholder="contact@company.com" />
              </Form.Item>
              <Form.Item label="Phone Number" name="phone">
                <Input size="large" prefix={<Phone size={16} className="text-slate-400 mr-1"/>} placeholder="+91 98765 43210" />
              </Form.Item>
              <Form.Item label="GSTIN / Tax ID" name="gstin">
                <Input size="large" prefix={<Hash size={16} className="text-slate-400 mr-1"/>} placeholder="Enter GST Number" />
              </Form.Item>
            </div>
            <Form.Item label="Registered Address" name="address">
              <TextArea rows={3} placeholder="Full company address..." />
            </Form.Item>
          </Card>

          {/* Branding & Logo */}
          <Card 
            title={<div className="flex items-center gap-2 text-slate-700"><Globe size={18}/> Branding</div>} 
            className="shadow-sm rounded-xl border-slate-100"
            bordered={false}
          >
            <div className="flex gap-8">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Company Logo</p>
                <Upload
                  name="logo"
                  listType="picture-card"
                  showUploadList={false}
                  customRequest={handleUpload}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div>
                      <Plus className={`mx-auto text-slate-400 ${uploading ? 'animate-spin' : ''}`} />
                      <div className="mt-2 text-sm text-slate-500">Upload</div>
                    </div>
                  )}
                </Upload>
              </div>
              <div>
                <Form.Item label="Primary Brand Color" name="primaryColor">
                  <ColorPicker showText />
                </Form.Item>
                <p className="text-xs text-slate-400 mt-2 max-w-xs">
                  This color is stored in your configuration and can be used to customize public facing elements.
                </p>
              </div>
            </div>
          </Card>

          {/* Localization */}
          <Card 
            title={<div className="flex items-center gap-2 text-slate-700"><MapPin size={18}/> Localization</div>} 
            className="shadow-sm rounded-xl border-slate-100"
            bordered={false}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <Form.Item label="Default Currency" name="currency">
                <Select size="large">
                  <Option value="INR">₹ INR (Indian Rupee)</Option>
                  <Option value="USD">$ USD (US Dollar)</Option>
                  <Option value="EUR">€ EUR (Euro)</Option>
                  <Option value="GBP">£ GBP (British Pound)</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Timezone" name="timezone">
                <Select size="large">
                  <Option value="Asia/Kolkata">Asia/Kolkata (IST)</Option>
                  <Option value="UTC">UTC (Coordinated Universal Time)</Option>
                  <Option value="America/New_York">America/New_York (EST)</Option>
                </Select>
              </Form.Item>
            </div>
          </Card>
        </div>

        {/* Sticky Save Bar */}
        <div className="fixed bottom-0 left-0 right-0 md:left-[260px] bg-white border-t border-slate-200 p-4 px-8 flex justify-end z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            icon={<Save size={18} />}
            loading={loading}
            className="bg-emerald-600 hover:bg-emerald-500 border-emerald-600"
          >
            Save Settings
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default GeneralSettingsPage;
