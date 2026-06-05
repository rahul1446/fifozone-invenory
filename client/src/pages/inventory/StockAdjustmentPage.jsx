import React, { useState } from 'react';
import { Table, Tag, Button, Select, InputNumber, Radio, Form, message } from 'antd';
import { CheckSquare, PlusCircle } from 'lucide-react';

import { Input } from 'antd';
const { TextArea } = Input;



const platformOptions = [
  { value: 'All Platforms', label: 'All Platforms' },
  { value: 'Fifozone', label: 'Fifozone' },
];

const columns = [
  {
    title: 'Date',
    dataIndex: 'date',
    key: 'date',
    render: (v) => <span className="text-xs text-slate-500 font-mono">{v}</span>,
  },
  {
    title: 'Product',
    dataIndex: 'product',
    key: 'product',
    render: (v) => <span className="font-medium text-slate-800 text-sm">{v}</span>,
  },
  {
    title: 'Platform',
    dataIndex: 'platform',
    key: 'platform',
    render: (v) => <span className="text-xs text-slate-600">{v}</span>,
  },
  {
    title: 'Type',
    dataIndex: 'type',
    key: 'type',
    align: 'center',
    render: (v) => <Tag color={v === 'Add' ? 'success' : 'error'} className="font-medium text-xs">{v}</Tag>,
  },
  {
    title: 'Qty',
    dataIndex: 'qty',
    key: 'qty',
    align: 'center',
    render: (v, record) => (
      <span className={`font-bold text-sm ${record.type === 'Add' ? 'text-emerald-600' : 'text-rose-600'}`}>
        {record.type === 'Add' ? '+' : '-'}{v}
      </span>
    ),
  },
  {
    title: 'Reason',
    dataIndex: 'reason',
    key: 'reason',
    render: (v) => <span className="text-xs text-slate-600">{v}</span>,
  },
  {
    title: 'Adjusted By',
    dataIndex: 'by',
    key: 'by',
    render: (v) => (
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${v === 'System' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>
        {v}
      </span>
    ),
  },
];

const StockAdjustmentPage = () => {
  const [form] = Form.useForm();
  const [adjustType, setAdjustType] = useState('Add');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        form.resetFields();
        message.success('Stock adjustment recorded successfully!');
      }, 800);
    } catch {}
  };

  return (
    <div className="p-6 min-h-screen bg-slate-50">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Stock Adjustments</h1>
        <p className="text-slate-500 mt-1 text-sm">Manually correct stock discrepancies</p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="bg-blue-50 p-2 rounded-lg">
            <PlusCircle size={18} className="text-blue-600" />
          </div>
          <h2 className="text-base font-semibold text-slate-700">Create New Adjustment</h2>
        </div>

        <Form form={form} layout="vertical" className="max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item name="product" label={<span className="text-slate-600 text-sm font-medium">Product</span>} rules={[{ required: true, message: 'Select a product' }]}>
              <Select
                showSearch
                options={[]}
                placeholder="Type to search product by name or SKU..."
                className="w-full"
                filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>

            <Form.Item name="platform" label={<span className="text-slate-600 text-sm font-medium">Platform</span>} rules={[{ required: true, message: 'Select a platform' }]}>
              <Select options={platformOptions} placeholder="Select platform" className="w-full" />
            </Form.Item>

            <Form.Item name="type" label={<span className="text-slate-600 text-sm font-medium">Adjustment Type</span>} initialValue="Add">
              <Radio.Group onChange={(e) => setAdjustType(e.target.value)} value={adjustType}>
                <Radio value="Add">
                  <span className="text-emerald-600 font-medium">➕ Add Stock</span>
                </Radio>
                <Radio value="Subtract">
                  <span className="text-rose-600 font-medium">➖ Subtract Stock</span>
                </Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item name="qty" label={<span className="text-slate-600 text-sm font-medium">Quantity</span>} rules={[{ required: true, message: 'Enter quantity' }]}>
              <InputNumber min={1} className="w-full" placeholder="Enter quantity" />
            </Form.Item>
          </div>

          <Form.Item name="reason" label={<span className="text-slate-600 text-sm font-medium">Reason for Adjustment</span>} rules={[{ required: true, message: 'Provide a reason' }]}>
            <textarea
              rows={3}
              placeholder="e.g. Damaged units, supplier restock, inventory recount..."
              className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
            />
          </Form.Item>

          <Button
            type="primary"
            loading={loading}
            onClick={handleSubmit}
            icon={<CheckSquare size={15} />}
            className="bg-blue-600 hover:bg-blue-700 border-none rounded-lg font-medium px-6"
          >
            Submit Adjustment
          </Button>
        </Form>
      </div>

      {/* Recent Adjustments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Recent Adjustments</h2>
        <Table
          columns={columns}
          dataSource={[]}
          scroll={{ x: 800 }}
          pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (total) => `${total} records` }}
          rowClassName="hover:bg-slate-50 transition-colors"
          className="text-sm"
        />
      </div>
    </div>
  );
};

export default StockAdjustmentPage;
