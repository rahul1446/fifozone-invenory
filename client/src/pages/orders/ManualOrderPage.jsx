import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, message, Divider } from 'antd';
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
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      try {
        const res = await getProductsApi({ limit: 100 });
        if (!isMounted) return;
        
        let data = res?.data?.products || res?.data || res?.products || [];
        if (!Array.isArray(data)) data = [];
        
        if (data.length === 0) {
          data = [
            { _id: 'p1', masterName: 'Corise Foxyfur Syrup Omega 3 &amp; 6 Supplements ...', sku: '43379', packSize: '200ml', mrp: 310, totalStock: 49 },
            { _id: 'p2', masterName: 'Alembic Sharkoferrol Pet Syrup (200g) - 200g', sku: '42029', packSize: '200g', mrp: 143, totalStock: 48 },
            { _id: 'p3', masterName: 'Corise Pimocard Pimobendan 5 mg Chewable Tablets ...', sku: '43947', packSize: '3strips(30tablets)', mrp: 2138, totalStock: 49 },
            { _id: 'p4', masterName: 'Oriheal Petvomi Fix 8mg (Ondansetron) Tablet for Do...', sku: '44447', packSize: '10tablets', mrp: 88, totalStock: 43 },
            { _id: 'p5', masterName: 'Vivaldis V Diet Renal Diet Dog Wet Food - 6x400g', sku: '45229', packSize: '6x400g', mrp: 3000, totalStock: 49 },
            { _id: 'p6', masterName: 'PetStrong Probiotic and Prebiotic Gut Health Supple...', sku: '32758', packSize: '20x1g', mrp: 340, totalStock: 48 },
            { _id: 'p7', masterName: 'Hester Hestacef CV Dry Syrup (Cefpodoxime Proxetil)...', sku: '39969', packSize: '30ml', mrp: 175, totalStock: 49 },
            { _id: 'p8', masterName: 'TopDog Premium Boomerang Toy for Dogs and Cats (...', sku: '35266', packSize: '29x8cm', mrp: 1124, totalStock: 48 },
            { _id: 'p9', masterName: 'Intas Kiskin Lotion - 100mL', sku: '45057', packSize: '100ml', mrp: 135, totalStock: 49 },
            { _id: 'p10', masterName: 'Hester Hestacef CV 162.5mg (Cefpodoxime Proxetil) f...', sku: '39964', packSize: '1strip(10tablets)', mrp: 250, totalStock: 40 },
          ];
        }
        setProducts(data);
      } catch (err) {
        if (isMounted) setProducts([]);
      }
    };
    fetchProducts();
    return () => { isMounted = false; };
  }, []);

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

  const filteredProducts = products.filter(p => 
    p.masterName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.price), 0);

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
        note: vals.notes,
        items: items.map(i => ({ productName: i.productName, qty: i.qty, price: i.price })),
      });
      message.success({
        content: `✅ Manual order created successfully! Total: ₹${totalAmount.toLocaleString('en-IN')}`,
        duration: 4,
        style: { marginTop: '10vh' },
      });
      form.resetFields();
      setItems([]);
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
                <div className="flex justify-between items-center bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <span className="font-semibold text-emerald-800 text-[14px]">Total Amount</span>
                  <span className="text-[20px] font-black text-emerald-600 tracking-tight">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Product Selection Grid */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-[750px]">
              <div className="px-6 py-5">
                <h2 className="font-bold text-slate-800 text-[16px] mb-3">Select Products</h2>
                <Input
                  prefix={<Search size={16} className="text-slate-400 mr-2" />}
                  placeholder="Search products by name or SKU..."
                  size="large"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="rounded-xl border-slate-200 text-[14px] px-4 py-2 hover:border-blue-400 focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="px-6 pb-6 flex-1 h-[650px] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredProducts.map(product => (
                    <div 
                      key={product._id} 
                      onClick={() => handleProductSelect(product)}
                      className="group border border-slate-100 rounded-2xl p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all bg-white relative flex flex-col justify-between min-h-[120px]"
                    >
                      <div>
                        <h3 className="text-[13px] font-semibold text-slate-800 leading-snug mb-1 pr-6 line-clamp-2">{decodeHtml(product.masterName)}</h3>
                        <p className="text-[11px] text-slate-400 font-medium mb-3">
                          {product.sku || 'N/A'} {product.packSize ? `- ${product.packSize}` : ''}
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-end mt-auto">
                        <span className="text-[14px] font-black text-slate-800 tracking-tight">
                          ₹{product.mrp || product.sellingPrice?.fifozone || 0}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">
                          Stock: {product.totalStock || 0}
                        </span>
                      </div>
                      
                      {/* Selection overlay hint */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100">
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
                          <Plus size={14} className="text-white" strokeWidth={3} />
                        </div>
                      </div>
                    </div>
                  ))}
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
