import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Select, Button, message, Divider, Spin } from 'antd';
import { Plus, Trash2, ShoppingCart, User, Search, Package } from 'lucide-react';
import { createManualOrderApi } from '../../api/orderApi';
import { getProductsApi } from '../../api/productApi';

const { Option } = Select;
const { TextArea } = Input;

const decodeHtml = (html) => html ? html.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'") : '';

const ManualOrderPage = () => {
  const [form] = Form.useForm();
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  const fetchProducts = useCallback(async (search = '') => {
    setLoadingProducts(true);
    try {
      const params = { limit: 2000 };
      if (search) params.search = search;
      const res = await getProductsApi(params);
      let data = res?.data?.products || res?.data || res?.products || [];
      if (!Array.isArray(data)) data = [];
      setProducts(data);
      setTotalProducts(res?.data?.total || data.length);
    } catch (err) {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchProducts]);

  const handleProductSelect = (product) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product._id);
      if (existing) {
        return prev.map(i => i.productId === product._id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { 
        id: Math.random().toString(36).substr(2, 9), 
        productId: product._id,
        productName: product.masterName, 
        qty: 1, 
        price: product.mrp || product.sellingPrice?.fifozone || 0 
      }];
    });
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const [discount, setDiscount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [hideOutOfStock, setHideOutOfStock] = useState(true);

  // Client-side filter as a fallback (backend search already narrows it)
  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery ||
      p.masterName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const hasStock = hideOutOfStock ? (p.totalStock || 0) > 0 : true;
    return matchesSearch && hasStock;
  });

  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const finalAmount = Math.max(0, subtotal - discount);

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      if (items.length === 0) {
        return message.error('Please select at least one product from the list.');
      }
      setSubmitting(true);
      const vals = form.getFieldsValue();
      await createManualOrderApi({
        customerName: vals.customerName,
        customerPhone: vals.phone,
        customerAddress: vals.address,
        platform: vals.platform || 'fifozone',
        paymentMethod: vals.paymentMethod || 'cod',
        note: vals.notes,
        discount,
        discountReason,
        items: items.map(i => ({ productName: i.productName, qty: i.qty, price: i.price })),
      });
      message.success({
        content: `✅ Manual order created! Total: ₹${finalAmount.toLocaleString('en-IN')}${discount > 0 ? ` (Discount: ₹${discount.toLocaleString('en-IN')})` : ''}`,
        duration: 4,
        style: { marginTop: '10vh' },
      });
      form.resetFields();
      setItems([]);
      setDiscount(0);
      setDiscountReason('');
    } catch {
      message.error('Please fill in all required customer details');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10 max-w-[1400px] mx-auto p-1">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 rounded-xl">
            <ShoppingCart size={20} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Create Manual Order</h1>
            <p className="text-sm text-slate-500 mt-0.5">Create orders for offline / WhatsApp / phone customers</p>
          </div>
        </div>
        <Button
          type="primary"
          size="large"
          loading={submitting}
          onClick={handleSubmit}
          className="h-10 text-[13px] font-semibold bg-emerald-600 border-emerald-600 hover:bg-emerald-500 hover:border-emerald-500 px-6 rounded-xl shadow-sm"
        >
          Create Order
        </Button>
      </div>

      <Form form={form} layout="vertical" requiredMark={false}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Side: Customer & Selected Items */}
          <div className="lg:col-span-4 space-y-6 sticky top-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                <User size={16} className="text-blue-500" />
                <h2 className="font-semibold text-slate-800 text-[14px]">Customer Details</h2>
              </div>
              <div className="p-5 space-y-4">
                <Form.Item
                  name="customerName"
                  label={<span className="text-[13px] font-medium text-slate-600">Customer Name</span>}
                  rules={[{ required: true, message: 'Customer name is required' }]}
                  className="mb-0"
                >
                  <Input placeholder="e.g. Priya Sharma" size="large" className="rounded-xl text-sm" />
                </Form.Item>

                <Form.Item
                  name="phone"
                  label={<span className="text-[13px] font-medium text-slate-600">Phone Number</span>}
                  rules={[
                    { required: true, message: 'Phone number is required' },
                    { pattern: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit number' },
                  ]}
                  className="mb-0"
                >
                  <Input addonBefore="+91" placeholder="9876543210" size="large" maxLength={10} className="rounded-xl text-sm" />
                </Form.Item>

                <Form.Item
                  name="address"
                  label={<span className="text-[13px] font-medium text-slate-600">Delivery Address</span>}
                  rules={[{ required: true, message: 'Address is required' }]}
                  className="mb-0"
                >
                  <TextArea placeholder="Flat No, Street, Area, City, State - Pincode" rows={2} size="large" className="rounded-xl text-sm" />
                </Form.Item>

                <div className="grid grid-cols-2 gap-4">
                  <Form.Item
                    name="platform"
                    label={<span className="text-[13px] font-medium text-slate-600">Order Source</span>}
                    initialValue="manual"
                    className="mb-0"
                  >
                    <Select size="large" className="rounded-xl text-sm">
                      <Option value="manual">Manual</Option>
                      <Option value="fifozone">Fifozone</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="paymentMethod"
                    label={<span className="text-[13px] font-medium text-slate-600">Payment</span>}
                    initialValue="cod"
                    className="mb-0"
                  >
                    <Select size="large" className="rounded-xl text-sm">
                      <Option value="cod">COD</Option>
                      <Option value="upi">UPI</Option>
                    </Select>
                  </Form.Item>
                </div>
              </div>
            </div>

            {/* Selected Items Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-emerald-600" />
                  <h2 className="font-semibold text-slate-800 text-[14px]">Selected Items</h2>
                </div>
                {items.length > 0 ? (
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-md">
                    {items.reduce((s,i) => s + i.qty, 0)} items
                  </span>
                ) : null}
              </div>
              
              <div className="p-5">
                {items.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50">
                    <p className="text-[13px] text-slate-400 font-medium">No products selected.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Click products from the right panel to add them here.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-slate-700 leading-snug line-clamp-2 pr-2">{decodeHtml(item.productName)}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[11px] text-slate-500 font-medium bg-slate-200/50 px-1.5 py-0.5 rounded">₹{item.price}</span>
                            <span className="text-[10px] text-slate-400 font-bold">×</span>
                            <span className="text-[11px] text-slate-500 font-bold bg-slate-200/50 px-1.5 py-0.5 rounded">{item.qty} qty</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="text-[13px] font-bold text-slate-800">₹{(item.qty * item.price).toLocaleString('en-IN')}</span>
                          <button type="button" onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-600 bg-white p-1 rounded shadow-sm border border-slate-200 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <Divider className="my-4 border-slate-100" />

                {/* Discount Section */}
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-3 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-orange-600 font-semibold text-[13px]">🏷️ Apply Discount</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[11px] text-slate-500 font-medium block mb-1">Discount Amount (₹)</label>
                      <Input
                        type="number"
                        min={0}
                        max={subtotal}
                        value={discount || ''}
                        onChange={e => setDiscount(Math.min(subtotal, parseFloat(e.target.value) || 0))}
                        placeholder="0"
                        prefix="₹"
                        className="rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[11px] text-slate-500 font-medium block mb-1">Reason</label>
                      <Select
                        value={discountReason}
                        onChange={setDiscountReason}
                        placeholder="Select reason"
                        className="w-full"
                        allowClear
                      >
                        <Option value="relative">Relative / Family</Option>
                        <Option value="loyalty">Loyal Customer</Option>
                        <Option value="staff">Staff Discount</Option>
                        <Option value="bulk">Bulk Purchase</Option>
                        <Option value="damaged">Damaged Packaging</Option>
                        <Option value="promotion">Promotion / Offer</Option>
                        <Option value="other">Other</Option>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Bill Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[13px] text-slate-500">
                    <span>Subtotal ({items.reduce((s,i) => s+i.qty,0)} items)</span>
                    <span className="font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-[13px] text-orange-600">
                      <span>Discount {discountReason ? `(${discountReason})` : ''}</span>
                      <span className="font-semibold">- ₹{discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-emerald-50 rounded-xl p-4 border border-emerald-100 mt-2">
                    <span className="font-semibold text-emerald-800 text-[14px]">Final Amount</span>
                    <span className="text-[20px] font-black text-emerald-600 tracking-tight">₹{finalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Product Selection Grid */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-slate-800 text-[16px]">Select Products</h2>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-500 select-none">
                      <input
                        type="checkbox"
                        checked={hideOutOfStock}
                        onChange={e => setHideOutOfStock(e.target.checked)}
                        className="rounded"
                      />
                      Hide out of stock
                    </label>
                    <span className="text-xs text-slate-400 font-medium">
                      {loadingProducts ? 'Loading...' : `${filteredProducts.length} of ${totalProducts} products`}
                    </span>
                  </div>
                </div>
                <Input
                  prefix={loadingProducts ? <Spin size="small" /> : <Search size={16} className="text-slate-400 mr-2" />}
                  placeholder="Search products by name or SKU..."
                  size="large"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  allowClear
                  className="rounded-xl border-slate-200 text-[14px] px-4 py-2 hover:border-blue-400 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="px-6 pb-6 flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredProducts.map(product => {
                    const outOfStock = (product.totalStock || 0) === 0;
                    return (
                      <div 
                        key={product._id} 
                        onClick={() => !outOfStock && handleProductSelect(product)}
                        className={`group border rounded-2xl p-4 transition-all bg-white relative flex flex-col justify-between min-h-[120px] ${
                          outOfStock 
                            ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed' 
                            : 'border-slate-100 cursor-pointer hover:border-blue-300 hover:shadow-md'
                        }`}
                      >
                        {outOfStock && (
                          <div className="absolute top-2 right-2">
                            <span className="text-[10px] font-bold bg-red-100 text-red-500 px-2 py-0.5 rounded-full">Out of Stock</span>
                          </div>
                        )}
                        <div>
                          <h3 className={`text-[13px] font-semibold leading-snug mb-1 pr-6 line-clamp-2 ${outOfStock ? 'text-slate-400' : 'text-slate-800'}`}>{decodeHtml(product.masterName)}</h3>
                          <p className="text-[11px] text-slate-400 font-medium mb-3">
                            {product.sku || 'N/A'} {product.packSize ? `- ${product.packSize}` : ''}
                          </p>
                        </div>
                        
                        <div className="flex justify-between items-end mt-auto">
                          <span className={`text-[14px] font-black tracking-tight ${outOfStock ? 'text-slate-400' : 'text-slate-800'}`}>
                            ₹{product.mrp || product.sellingPrice?.fifozone || 0}
                          </span>
                          <span className={`text-[11px] font-medium ${outOfStock ? 'text-red-400' : 'text-slate-400'}`}>
                            Stock: {product.totalStock || 0}
                          </span>
                        </div>
                        
                        {/* Add hint — only for in-stock */}
                        {!outOfStock && (
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100">
                            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
                              <Plus size={14} className="text-white" strokeWidth={3} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 ? (
                    <div className="col-span-2 text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Package size={32} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium text-[14px]">No products found matching "{searchQuery}"</p>
                      <p className="text-slate-400 text-[12px] mt-1">Try searching by a different name or SKU</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </Form>
    </div>
  );
};

export default ManualOrderPage;
