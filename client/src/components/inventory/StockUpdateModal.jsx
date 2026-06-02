import React, { useState } from 'react';
import { Modal, Form, InputNumber, Select, Input, Button, Divider } from 'antd';
import { Package, Plus, Minus, ArrowUpCircle } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';

const REASON_OPTIONS = [
  { value: 'restock',        label: '📦 Restock from Supplier' },
  { value: 'return',         label: '↩️ Returned Stock' },
  { value: 'manual_add',    label: '➕ Manual Addition' },
  { value: 'manual_remove', label: '➖ Manual Removal' },
  { value: 'adjustment',    label: '⚖️ Stock Adjustment / Correction' },
  { value: 'damaged',       label: '💥 Damaged / Defective Removal' },
  { value: 'expired',       label: '⌛ Expired Stock Removal' },
];

const PLATFORM_OPTIONS = [
  { value: 'fifozone',  label: 'Fifozone' },
  { value: 'amazon',   label: 'Amazon' },
  { value: 'flipkart', label: 'Flipkart' },
  { value: 'warehouse', label: 'Warehouse (Buffer)' },
];

/**
 * StockUpdateModal — Reusable modal to update stock for a product.
 * 
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onSuccess: () => void   (called after successful update)
 *  - product: { _id, masterName, sku, totalStock, stockByPlatform, lowStockThreshold }
 */
const StockUpdateModal = ({ open, onClose, onSuccess, product }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('add'); // 'add' or 'remove'

  if (!product) return null;

  const stock = product.totalStock ?? 0;
  const threshold = product.lowStockThreshold ?? 10;

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const quantity = mode === 'remove' ? -Math.abs(values.quantity) : Math.abs(values.quantity);
      await axiosInstance.post(`/inventory/stock-update`, {
        productId: product._id,
        changeType: values.changeType,
        platform: values.platform || 'warehouse',
        changeQuantity: quantity,
        note: values.note || '',
      });
      toast.success(`Stock updated successfully for "${product.masterName}"`);
      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stock');
    } finally {
      setSaving(false);
    }
  };

  const stockPercent = threshold > 0 ? Math.min(Math.round((stock / threshold) * 100), 100) : 100;
  const stockColor = stockPercent <= 25 ? 'text-red-600' : stockPercent <= 60 ? 'text-amber-500' : 'text-emerald-600';
  const barColor = stockPercent <= 25 ? 'bg-red-500' : stockPercent <= 60 ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <ArrowUpCircle size={18} className="text-emerald-600" />
          <span>Update Stock</span>
        </div>
      }
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      footer={null}
      width={520}
      destroyOnClose
    >
      {/* Product Info */}
      <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
            <Package size={16} className="text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">{product.masterName}</p>
            {product.sku && <p className="text-xs text-slate-400 mt-0.5">SKU: {product.sku}</p>}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">Current Stock</span>
                <span className={`text-sm font-bold ${stockColor}`}>{stock} units</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${stockPercent}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Threshold: {threshold} units</p>
            </div>
          </div>
        </div>

        {/* Per-platform breakdown */}
        {product.stockByPlatform && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {['fifozone', 'amazon', 'flipkart', 'warehouse'].map(p => (
              <div key={p} className="text-center bg-white rounded-lg py-1.5 border border-slate-200">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">{p === 'fifozone' ? 'Fifo' : p.charAt(0).toUpperCase() + p.slice(1, 4)}</p>
                <p className="text-sm font-bold text-slate-700">{product.stockByPlatform?.[p] ?? 0}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Remove Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setMode('add'); form.setFieldValue('changeType', 'restock'); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border font-semibold text-sm transition-all ${
            mode === 'add'
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <Plus size={16} /> Add Stock
        </button>
        <button
          onClick={() => { setMode('remove'); form.setFieldValue('changeType', 'manual_remove'); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border font-semibold text-sm transition-all ${
            mode === 'remove'
              ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-200'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <Minus size={16} /> Remove Stock
        </button>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="quantity"
            label={mode === 'add' ? 'Quantity to Add' : 'Quantity to Remove'}
            rules={[{ required: true, message: 'Enter quantity' }, { type: 'number', min: 1, message: 'Must be at least 1' }]}
          >
            <InputNumber
              min={1}
              className="!w-full"
              placeholder="e.g., 50"
              addonBefore={mode === 'add' ? <Plus size={12} className="text-emerald-600" /> : <Minus size={12} className="text-red-500" />}
            />
          </Form.Item>

          <Form.Item name="platform" label="Update Platform Stock" initialValue="warehouse">
            <Select>
              {PLATFORM_OPTIONS.map(p => (
                <Select.Option key={p.value} value={p.value}>{p.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <Form.Item
          name="changeType"
          label="Reason for Change"
          initialValue={mode === 'add' ? 'restock' : 'manual_remove'}
          rules={[{ required: true }]}
        >
          <Select placeholder="Select reason">
            {REASON_OPTIONS.filter(r => {
              if (mode === 'add') return !['manual_remove', 'damaged', 'expired'].includes(r.value);
              return !['restock', 'manual_add', 'return'].includes(r.value);
            }).map(r => (
              <Select.Option key={r.value} value={r.value}>{r.label}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="note" label="Note (optional)">
          <Input.TextArea rows={2} placeholder="Add a note for the audit log..." />
        </Form.Item>

        <div className="flex justify-end gap-2 mt-2">
          <Button onClick={() => { form.resetFields(); onClose(); }}>Cancel</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            className={mode === 'add' ? '!bg-emerald-600 !border-emerald-600' : '!bg-red-500 !border-red-500'}
          >
            {mode === 'add' ? 'Add Stock' : 'Remove Stock'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default StockUpdateModal;
