import React, { useState } from 'react';
import { Modal, Table, Form, InputNumber, Select, Button, Progress, message } from 'antd';
import { Edit3, AlertTriangle, Package } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';

const PLATFORM_STATUS_OPTIONS = [
  { value: '',         label: 'No Change' },
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

/**
 * BulkEditModal — allows editing price, stock, threshold, status for multiple products at once.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onSuccess: () => void
 *  - selectedProducts: Product[]
 */
const BulkEditModal = ({ open, onClose, onSuccess, selectedProducts = [] }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleApply = async (values) => {
    const updates = {};
    if (values.fifozonePrice !== undefined) updates['sellingPrice.fifozone'] = values.fifozonePrice;
    if (values.amazonPrice !== undefined)   updates['sellingPrice.amazon'] = values.amazonPrice;
    if (values.flipkartPrice !== undefined) updates['sellingPrice.flipkart'] = values.flipkartPrice;
    if (values.lowStockThreshold !== undefined) updates.lowStockThreshold = values.lowStockThreshold;
    if (values.stockAdd)                    updates._stockAdd = values.stockAdd;
    if (values.fifozoneStatus)              updates['platformStatus.fifozone'] = values.fifozoneStatus;
    if (values.amazonStatus)               updates['platformStatus.amazon'] = values.amazonStatus;
    if (values.flipkartStatus)             updates['platformStatus.flipkart'] = values.flipkartStatus;

    if (Object.keys(updates).length === 0) {
      toast.error('No changes specified. Fill in at least one field to update.');
      return;
    }

    setSaving(true);
    setProgress(0);
    let done = 0;

    try {
      for (const product of selectedProducts) {
        const payload = { ...updates };
        if (payload._stockAdd) {
          payload.totalStock = (product.totalStock || 0) + payload._stockAdd;
          delete payload._stockAdd;
        }
        await axiosInstance.patch(`/products/${product._id}`, payload);
        done++;
        setProgress(Math.round((done / selectedProducts.length) * 100));
      }
      toast.success(`Updated ${done} products successfully`);
      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk update partially failed');
    } finally {
      setSaving(false);
      setProgress(0);
    }
  };

  const previewColumns = [
    {
      title: 'Product',
      dataIndex: 'masterName',
      render: (name, record) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center shrink-0">
            {record.images?.[0]?.url
              ? <img src={record.images[0].url} alt="" className="w-7 h-7 rounded object-cover" />
              : <Package size={12} className="text-slate-400" />
            }
          </div>
          <span className="text-xs font-medium text-slate-700 truncate max-w-[160px]">{name}</span>
        </div>
      )
    },
    { title: 'Stock', dataIndex: 'totalStock', render: v => <span className="text-xs font-bold text-slate-700">{v}</span> },
    { title: 'Fifozone', dataIndex: ['sellingPrice', 'fifozone'], render: v => <span className="text-xs text-slate-500">{v ? `Rs.${v}` : 'Not set'}</span> },
    { title: 'Amazon',   dataIndex: ['sellingPrice', 'amazon'],   render: v => <span className="text-xs text-slate-500">{v ? `Rs.${v}` : 'Not set'}</span> },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <Edit3 size={18} className="text-emerald-600" />
          <span>Bulk Edit — {selectedProducts.length} Products Selected</span>
        </div>
      }
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      footer={null}
      width={780}
      destroyOnClose
    >
      <div className="mb-4 max-h-48 overflow-y-auto rounded-xl border border-slate-200">
        <Table
          dataSource={selectedProducts}
          columns={previewColumns}
          rowKey="_id"
          pagination={false}
          size="small"
          className="[&_.ant-table-thead>tr>th]:!bg-slate-50 [&_.ant-table-thead>tr>th]:!text-xs [&_.ant-table-thead>tr>th]:!py-2"
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
        <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">
          <strong>Warning:</strong> This will update <strong>{selectedProducts.length} products</strong>.
          Only filled fields will be updated — blank fields remain unchanged.
        </p>
      </div>

      {saving && (
        <div className="mb-4">
          <Progress percent={progress} status="active" strokeColor="#059669" />
          <p className="text-xs text-slate-500 mt-1">Updating products, please wait...</p>
        </div>
      )}

      <Form form={form} layout="vertical" onFinish={handleApply}>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pricing (leave blank to skip)</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Form.Item name="fifozonePrice" label="Fifozone Price (Rs.)" className="!mb-0">
            <InputNumber min={0} className="!w-full" placeholder="e.g., 299" />
          </Form.Item>
          <Form.Item name="amazonPrice" label="Amazon Price (Rs.)" className="!mb-0">
            <InputNumber min={0} className="!w-full" placeholder="e.g., 320" />
          </Form.Item>
          <Form.Item name="flipkartPrice" label="Flipkart Price (Rs.)" className="!mb-0">
            <InputNumber min={0} className="!w-full" placeholder="e.g., 310" />
          </Form.Item>
        </div>

        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Inventory</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Form.Item name="stockAdd" label="Add Quantity to Stock" className="!mb-0">
            <InputNumber min={0} className="!w-full" placeholder="e.g., 50" />
          </Form.Item>
          <Form.Item name="lowStockThreshold" label="Low Stock Threshold" className="!mb-0">
            <InputNumber min={0} className="!w-full" placeholder="e.g., 10" />
          </Form.Item>
        </div>

        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Platform Status</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Form.Item name="fifozoneStatus" label="Fifozone Status" className="!mb-0">
            <Select placeholder="No Change">
              {PLATFORM_STATUS_OPTIONS.map(o => (
                <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="amazonStatus" label="Amazon Status" className="!mb-0">
            <Select placeholder="No Change">
              {PLATFORM_STATUS_OPTIONS.map(o => (
                <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="flipkartStatus" label="Flipkart Status" className="!mb-0">
            <Select placeholder="No Change">
              {PLATFORM_STATUS_OPTIONS.map(o => (
                <Select.Option key={o.value} value={o.value}>{o.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
          <Button onClick={() => { form.resetFields(); onClose(); }}>Cancel</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600"
          >
            Apply to {selectedProducts.length} Products
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default BulkEditModal;
