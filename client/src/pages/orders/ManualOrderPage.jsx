import React, { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, message, Divider } from 'antd';
import { Plus, Trash2, ShoppingCart, User, MapPin, Phone, Package } from 'lucide-react';

const { Option } = Select;
const { TextArea } = Input;

const defaultItem = () => ({ id: Date.now(), productName: '', qty: 1, price: 0 });

const ManualOrderPage = () => {
  const [form] = Form.useForm();
  const [items, setItems] = useState([defaultItem()]);
  const [submitting, setSubmitting] = useState(false);

  const addItem = () => setItems(prev => [...prev, defaultItem()]);

  const removeItem = (id) => {
    if (items.length === 1) return message.warning('At least one item is required');
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.price), 0);

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      if (items.some(i => !i.productName || !i.price)) {
        return message.error('Please fill in all item details');
      }
      setSubmitting(true);
      await new Promise(r => setTimeout(r, 1000));
      message.success({
        content: `✅ Manual order created successfully! Total: ₹${totalAmount.toLocaleString('en-IN')}`,
        duration: 4,
        style: { marginTop: '10vh' },
      });
      form.resetFields();
      setItems([defaultItem()]);
    } catch {
      message.error('Please fill in all required fields');
    } finally {
      setSubmitting(false);
    }
  };

  const SectionCard = ({ icon: Icon, title, children, iconColor }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
        <div className="p-2 rounded-lg bg-white shadow-sm">
          <Icon size={18} style={{ color: iconColor }} />
        </div>
        <h2 className="font-semibold text-slate-700 text-base">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-xl">
            <ShoppingCart size={20} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Create Manual Order</h1>
            <p className="text-sm text-slate-500 mt-0.5">Create orders for offline / WhatsApp / phone customers</p>
          </div>
        </div>
      </div>

      <Form form={form} layout="vertical" requiredMark={false}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Customer Details */}
          <SectionCard icon={User} title="Customer Details" iconColor="#3b82f6">
            <div className="space-y-4">
              <Form.Item
                name="customerName"
                label={<span className="text-sm font-medium text-slate-600">Customer Name</span>}
                rules={[{ required: true, message: 'Customer name is required' }]}
              >
                <Input
                  prefix={<User size={15} className="text-slate-400" />}
                  placeholder="e.g. Priya Sharma"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="phone"
                label={<span className="text-sm font-medium text-slate-600">Phone Number</span>}
                rules={[
                  { required: true, message: 'Phone number is required' },
                  { pattern: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit Indian mobile number' },
                ]}
              >
                <Input
                  prefix={<Phone size={15} className="text-slate-400" />}
                  addonBefore="+91"
                  placeholder="9876543210"
                  size="large"
                  maxLength={10}
                />
              </Form.Item>

              <Form.Item
                name="address"
                label={<span className="text-sm font-medium text-slate-600">Delivery Address</span>}
                rules={[{ required: true, message: 'Address is required' }]}
              >
                <TextArea
                  prefix={<MapPin size={15} className="text-slate-400" />}
                  placeholder="Flat No, Street, Area, City, State - Pincode"
                  rows={3}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="pincode"
                label={<span className="text-sm font-medium text-slate-600">Pincode</span>}
                rules={[
                  { required: true, message: 'Pincode is required' },
                  { pattern: /^\d{6}$/, message: 'Enter a valid 6-digit pincode' },
                ]}
              >
                <Input placeholder="400001" size="large" maxLength={6} />
              </Form.Item>

              <Form.Item
                name="platform"
                label={<span className="text-sm font-medium text-slate-600">Order Source / Platform</span>}
                rules={[{ required: true, message: 'Please select a platform' }]}
                initialValue="manual"
              >
                <Select size="large" placeholder="Select platform">
                  <Option value="fifozone">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Fifozone
                    </span>
                  </Option>
                  <Option value="manual">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" /> Manual (Phone / WhatsApp)
                    </span>
                  </Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="paymentMethod"
                label={<span className="text-sm font-medium text-slate-600">Payment Method</span>}
                rules={[{ required: true, message: 'Please select payment method' }]}
                initialValue="cod"
              >
                <Select size="large">
                  <Option value="cod">Cash on Delivery (COD)</Option>
                  <Option value="upi">UPI / Online Transfer</Option>
                  <Option value="card">Card Payment</Option>
                  <Option value="prepaid">Prepaid</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="notes"
                label={<span className="text-sm font-medium text-slate-600">Order Notes (Optional)</span>}
              >
                <TextArea placeholder="Special instructions, delivery preferences..." rows={2} />
              </Form.Item>
            </div>
          </SectionCard>

          {/* Right: Order Items */}
          <div className="space-y-5">
            <SectionCard icon={Package} title="Order Items" iconColor="#8b5cf6">
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Item {index + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <Input
                      placeholder="Product name (e.g. Royal Canin Adult 3kg)"
                      value={item.productName}
                      onChange={e => updateItem(item.id, 'productName', e.target.value)}
                      size="middle"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block font-medium">Quantity</label>
                        <InputNumber
                          min={1}
                          max={999}
                          value={item.qty}
                          onChange={val => updateItem(item.id, 'qty', val || 1)}
                          className="w-full"
                          size="middle"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block font-medium">Price per unit (₹)</label>
                        <InputNumber
                          min={0}
                          value={item.price}
                          onChange={val => updateItem(item.id, 'price', val || 0)}
                          className="w-full"
                          size="middle"
                          prefix="₹"
                        />
                      </div>
                    </div>

                    {item.productName && item.price > 0 && (
                      <div className="text-right text-sm font-semibold text-emerald-600">
                        Subtotal: ₹{(item.qty * item.price).toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  type="dashed"
                  block
                  icon={<Plus size={15} />}
                  onClick={addItem}
                  className="flex items-center justify-center gap-1 border-slate-300 text-slate-600 hover:border-emerald-400 hover:text-emerald-600"
                  size="large"
                >
                  Add Another Item
                </Button>
              </div>
            </SectionCard>

            {/* Order Summary */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 p-5">
              <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <ShoppingCart size={16} className="text-emerald-600" />
                Order Summary
              </h3>

              <div className="space-y-2">
                {items.filter(i => i.productName && i.price > 0).map((item, idx) => (
                  <div key={item.id} className="flex justify-between text-sm text-slate-600">
                    <span>{item.productName || `Item ${idx + 1}`} × {item.qty}</span>
                    <span>₹{(item.qty * item.price).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {items.filter(i => i.productName && i.price > 0).length > 0 && (
                  <Divider className="my-2" />
                )}
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700">
                    Total ({items.reduce((s, i) => s + i.qty, 0)} item{items.reduce((s, i) => s + i.qty, 0) > 1 ? 's' : ''})
                  </span>
                  <span className="text-xl font-bold text-emerald-700">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <Button
            type="primary"
            size="large"
            block
            loading={submitting}
            onClick={handleSubmit}
            icon={<ShoppingCart size={17} />}
            className="h-12 text-base font-semibold bg-emerald-600 border-emerald-600 hover:bg-emerald-500 hover:border-emerald-500 flex items-center justify-center gap-2"
          >
            {submitting ? 'Creating Order...' : 'Create Order'}
          </Button>
          <p className="text-center text-xs text-slate-400 mt-3">
            Order will be saved and confirmation SMS will be sent to the customer
          </p>
        </div>
      </Form>
    </div>
  );
};

export default ManualOrderPage;
