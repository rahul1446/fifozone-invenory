import React, { useState } from 'react';
import { Form, Input, Select, Button, Card, Divider, message } from 'antd';
import { Truck, MapPin, Package, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const { Option } = Select;

const ShippingSettingsPage = () => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleSave = async (values) => {
    setSaving(true);
    try {
      // Save to localStorage for now — backend endpoint can be wired up later
      localStorage.setItem('fifozone_shipping_settings', JSON.stringify(values));
      toast.success('Shipping settings saved successfully!');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Load from localStorage on mount
  const saved = JSON.parse(localStorage.getItem('fifozone_shipping_settings') || '{}');

  const courierOptions = [
    'Delhivery', 'BlueDart', 'Ecom Express', 'Xpressbees',
    'DTDC', 'Amazon Logistics', 'Flipkart Logistics', 'India Post', 'Other',
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl pb-10">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Truck size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Shipping Settings</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Configure your warehouse address and label defaults used for all shipping labels
            </p>
          </div>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={saved}
        onFinish={handleSave}
        className="space-y-6"
      >
        {/* Sender / Warehouse Address */}
        <Card
          title={
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin size={16} className="text-emerald-500" />
              Warehouse / Sender Address
            </div>
          }
          className="rounded-2xl border-slate-200 shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="Sender Name / Company"
              name="senderName"
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input placeholder="Fifozone Pet Supplies" />
            </Form.Item>
            <Form.Item label="Phone Number" name="senderPhone">
              <Input placeholder="+91-9999999999" />
            </Form.Item>
          </div>

          <Form.Item label="Address Line 1" name="addressLine1" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="Shop No. 12, Warehouse Complex" />
          </Form.Item>
          <Form.Item label="Address Line 2 (Optional)" name="addressLine2">
            <Input placeholder="Near ABC Chowk" />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Form.Item label="City" name="city" rules={[{ required: true, message: 'Required' }]}>
              <Input placeholder="Mumbai" />
            </Form.Item>
            <Form.Item label="State" name="state" rules={[{ required: true, message: 'Required' }]}>
              <Select placeholder="Select state" showSearch>
                {['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry'].map(s => (
                  <Option key={s} value={s}>{s}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="PIN Code" name="pincode" rules={[{ required: true, message: 'Required' }]}>
              <Input placeholder="400001" maxLength={6} />
            </Form.Item>
          </div>
        </Card>

        {/* Label Defaults */}
        <Card
          title={
            <div className="flex items-center gap-2 text-slate-700">
              <Package size={16} className="text-violet-500" />
              Label & Shipping Defaults
            </div>
          }
          className="rounded-2xl border-slate-200 shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item label="Default Label Size" name="labelSize" initialValue="A5">
              <Select>
                <Option value="A5">A5 (148 × 210mm) — Standard</Option>
                <Option value="4x6">4×6 inch — Thermal Printer</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Default Courier Partner" name="defaultCourier">
              <Select placeholder="Select default courier" allowClear>
                {courierOptions.map(c => <Option key={c} value={c}>{c}</Option>)}
              </Select>
            </Form.Item>
          </div>

          <Divider className="my-2" />

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
            <strong>How this is used:</strong> The sender address above will be printed on every shipping label
            generated from the Shipping Queue. The default courier will be pre-selected in the tracking entry form
            so you don't have to pick it every time.
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            icon={<Save size={16} />}
            className="bg-emerald-600 hover:bg-emerald-500 border-emerald-600 h-10 px-8 font-semibold rounded-lg"
          >
            Save Shipping Settings
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default ShippingSettingsPage;
