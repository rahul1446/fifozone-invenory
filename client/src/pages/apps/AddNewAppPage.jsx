import React, { useState } from 'react';
import { Modal, Form, Input, Button, Tag } from 'antd';
import { Plus, Zap, CheckCircle } from 'lucide-react';

const platforms = [
  {
    name: 'Snapdeal',
    description: 'Connect your Snapdeal seller account to sync orders and inventory.',
    color: 'bg-gray-100',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200',
    initials: 'SD',
    initialsColor: 'bg-gray-200 text-gray-700',
    status: 'coming_soon',
  },
  {
    name: 'Nykaa',
    description: 'Integrate with Nykaa to manage beauty & wellness product listings.',
    color: 'bg-pink-50',
    textColor: 'text-pink-600',
    borderColor: 'border-pink-100',
    initials: 'NK',
    initialsColor: 'bg-pink-100 text-pink-700',
    status: 'coming_soon',
  },
  {
    name: 'Myntra',
    description: 'Sync your Myntra fashion & lifestyle inventory seamlessly.',
    color: 'bg-red-50',
    textColor: 'text-red-600',
    borderColor: 'border-red-100',
    initials: 'MN',
    initialsColor: 'bg-red-100 text-red-700',
    status: 'coming_soon',
  },
  {
    name: 'AJIO',
    description: 'Connect AJIO marketplace for fashion & apparel management.',
    color: 'bg-violet-50',
    textColor: 'text-violet-600',
    borderColor: 'border-violet-100',
    initials: 'AJ',
    initialsColor: 'bg-violet-100 text-violet-700',
    status: 'coming_soon',
  },
  {
    name: 'JioMart',
    description: "List and sell on JioMart — India's fastest growing grocery platform.",
    color: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-100',
    initials: 'JM',
    initialsColor: 'bg-blue-100 text-blue-700',
    status: 'coming_soon',
  },
  {
    name: 'Custom API',
    description: 'Connect any platform using your custom webhook or REST API endpoint.',
    color: 'bg-slate-50',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-200',
    initials: 'API',
    initialsColor: 'bg-slate-200 text-slate-700',
    status: 'available',
  },
];

const AddNewAppPage = () => {
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [connected, setConnected] = useState(false);

  const handleConnect = () => {
    form.validateFields().then(() => {
      setConnected(true);
      setTimeout(() => {
        setCustomModalOpen(false);
        setConnected(false);
        form.resetFields();
      }, 1500);
    });
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Add New Integration</h1>
        <p className="text-slate-500 mt-1">Connect a new marketplace or platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map((platform) => (
          <div
            key={platform.name}
            className={`bg-white rounded-xl shadow-sm border ${platform.borderColor} p-6 flex flex-col items-start gap-4 hover:shadow-md transition-shadow duration-200`}
          >
            <div className="flex items-center gap-3 w-full">
              <div className={`${platform.initialsColor} w-12 h-12 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0`}>
                {platform.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-lg">{platform.name}</span>
                  {platform.status === 'coming_soon' && (
                    <Tag color="default" className="text-xs">Coming Soon</Tag>
                  )}
                  {platform.status === 'available' && (
                    <Tag color="success" className="text-xs">Available</Tag>
                  )}
                </div>
              </div>
            </div>

            <p className="text-slate-500 text-sm leading-relaxed">{platform.description}</p>

            <div className="mt-auto w-full">
              {platform.status === 'coming_soon' ? (
                <Button
                  disabled
                  block
                  className="rounded-lg border-slate-200 text-slate-400 bg-slate-50"
                >
                  Coming Soon
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<Plus size={14} />}
                  block
                  onClick={() => setCustomModalOpen(true)}
                  className="rounded-lg bg-slate-700 border-slate-700 hover:bg-slate-800 flex items-center justify-center gap-2"
                >
                  Connect
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Custom API Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-slate-600" />
            <span className="text-lg font-bold text-slate-800">Connect Custom API</span>
          </div>
        }
        open={customModalOpen}
        onCancel={() => { setCustomModalOpen(false); form.resetFields(); setConnected(false); }}
        footer={null}
        width={480}
      >
        {connected ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <CheckCircle size={48} className="text-emerald-500" />
            <p className="text-lg font-semibold text-slate-800">Successfully Connected!</p>
            <p className="text-slate-500 text-sm">Your custom API integration is now active.</p>
          </div>
        ) : (
          <Form form={form} layout="vertical" className="mt-4">
            <Form.Item
              name="webhookUrl"
              label="Webhook URL"
              rules={[{ required: true, message: 'Please enter your webhook URL' }, { type: 'url', message: 'Please enter a valid URL' }]}
            >
              <Input placeholder="https://your-domain.com/api/webhook" size="large" />
            </Form.Item>
            <Form.Item
              name="apiKey"
              label="API Key"
              rules={[{ required: true, message: 'Please enter your API key' }]}
            >
              <Input.Password placeholder="Enter your secret API key" size="large" />
            </Form.Item>
            <div className="flex justify-end gap-2 mt-2">
              <Button onClick={() => { setCustomModalOpen(false); form.resetFields(); }}>Cancel</Button>
              <Button
                type="primary"
                onClick={handleConnect}
                className="bg-slate-700 border-slate-700 hover:bg-slate-800"
              >
                Connect
              </Button>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default AddNewAppPage;
