import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Switch, Card, Button, message, Checkbox, Tooltip, Alert, TreeSelect } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, ImagePlus, FileUp, Globe, ShoppingCart, Package } from 'lucide-react';
import { createProductApi } from '../../api/productApi';
import { getWooCommerceCategoriesApi } from '../../api/platformApi';
import ProductImageUploader from '../../components/inventory/ProductImageUploader';
import ImportWizard from '../../components/inventory/ImportWizard';

const { TextArea } = Input;
const { Option } = Select;

// Platform config
const PLATFORMS = [
  { key: 'fifozone', label: 'Fifozone', color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', icon: '🛒', desc: 'Your WooCommerce store' },
  { key: 'amazon',   label: 'Amazon',   color: 'orange',  bg: 'bg-orange-50',  border: 'border-orange-300',  text: 'text-orange-700',  icon: '📦', desc: 'Amazon India (SP-API)' },
  { key: 'flipkart', label: 'Flipkart', color: 'blue',    bg: 'bg-blue-50',    border: 'border-blue-300',    text: 'text-blue-700',    icon: '🏪', desc: 'Flipkart Seller Hub' },
  { key: 'meesho',   label: 'Meesho',   color: 'pink',    bg: 'bg-pink-50',    border: 'border-pink-300',    text: 'text-pink-700',    icon: '🛍️', desc: 'Meesho Supplier Hub' },
];

const AddProductPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categoryTree, setCategoryTree] = useState([]);

  useEffect(() => {
    getWooCommerceCategoriesApi()
      .then(res => setCategoryTree(res.data || []))
      .catch(err => console.error("Failed to load category tree", err));
  }, []);
  const [images, setImages] = useState([]);
  const [importOpen, setImportOpen] = useState(false);

  // ── Platform selection state ──────────────────────────────────────────────
  const [selectedPlatforms, setSelectedPlatforms] = useState(['fifozone', 'amazon', 'flipkart', 'meesho']); // default: all

  const allSelected = selectedPlatforms.length === 4;
  const isSelected = (key) => selectedPlatforms.includes(key);

  const toggleAll = () => {
    if (allSelected) setSelectedPlatforms([]);
    else setSelectedPlatforms(['fifozone', 'amazon', 'flipkart', 'meesho']);
  };

  const togglePlatform = (key) => {
    setSelectedPlatforms(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const onFinish = async (values) => {
    if (selectedPlatforms.length === 0) {
      message.warning('Please select at least one platform to publish to.');
      return;
    }
    setLoading(true);
    try {
      const platformStatus = {
        fifozone: isSelected('fifozone') ? 'active' : 'not_listed',
        amazon:   isSelected('amazon')   ? 'active' : 'not_listed',
        flipkart: isSelected('flipkart') ? 'active' : 'not_listed',
        meesho:   isSelected('meesho')   ? 'active' : 'not_listed',
      };

      const payload = {
        masterName: values.masterName,
        sku: values.sku,
        barcode: values.barcode,
        brand: values.brand,
        category: (values.category || []).map(c => typeof c === 'object' ? c.value : c),
        animalType: values.animalType,
        description: values.description,
        shortDescription: values.shortDescription,
        mrp: values.mrp,
        costPrice: values.costPrice,
        gstPercent: values.gstPercent,
        sellingPrice: {
          fifozone: isSelected('fifozone') ? (values.fifozonePrice || values.mrp) : undefined,
          amazon:   isSelected('amazon')   ? (values.amazonPrice   || values.mrp) : undefined,
          flipkart: isSelected('flipkart') ? (values.flipkartPrice || values.mrp) : undefined,
          meesho:   isSelected('meesho')   ? (values.meeshoPrice   || values.mrp) : undefined,
        },
        stockByPlatform: {
          fifozone:  isSelected('fifozone') ? (values.fifozoneStock || 0) : 0,
          amazon:    isSelected('amazon')   ? (values.amazonStock   || 0) : 0,
          flipkart:  isSelected('flipkart') ? (values.flipkartStock || 0) : 0,
          meesho:    isSelected('meesho')   ? (values.meeshoStock   || 0) : 0,
          warehouse: values.warehouseStock || 0,
        },
        lowStockThreshold: values.lowStockThreshold || 10,
        isActive: values.isActive,
        platformStatus,
        publishTo: selectedPlatforms,
        platformIds: {
          fifozone: { productId: values.fifozoneId  || '' },
          amazon:   { asin:      values.amazonAsin  || '' },
          flipkart: { fsin:      values.flipkartFsin || '' },
          meesho:   { productId: values.meeshoId    || '', sku: values.meeshoSku || '' },
        },
        images: images.map(img => ({ url: img.url, isPrimary: img.isPrimary, publicId: img.filename || '' })),
      };

      await createProductApi(payload);
      message.success(`Product created and published to ${selectedPlatforms.join(', ')}!`);
      navigate('/inventory/products');
    } catch (error) {
      if (error.response?.status === 409) {
        form.setFields([{ name: 'sku', errors: [error.response?.data?.message || 'SKU already exists'] }]);
        message.error('Duplicate SKU. Please use a unique SKU.');
      } else {
        message.error(error.response?.data?.message || 'Failed to create product');
      }
    } finally {
      setLoading(false);
    }
  };

  const generateSku = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    form.setFieldsValue({ sku: `FI-SKU-${randomNum}` });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-24">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button icon={<ArrowLeft size={18} />} onClick={() => navigate(-1)} type="text" className="text-slate-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Add New Product</h1>
            <p className="text-sm text-slate-500">Create a master product and choose which platforms to publish it to.</p>
          </div>
        </div>
        <Button
          icon={<FileUp size={16} />}
          onClick={() => setImportOpen(true)}
          className="border-emerald-300 text-emerald-700 hover:!text-emerald-800 hover:!border-emerald-500 !flex !items-center !gap-1.5"
        >
          Import CSV / Excel
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════════════
           PLATFORM SELECTION — prominent, above the form
          ══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-emerald-600" />
            <h2 className="text-base font-bold text-slate-800">Publish To Platforms</h2>
          </div>
          <button
            type="button"
            onClick={toggleAll}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              allSelected
                ? 'bg-slate-800 text-white border-slate-800 hover:bg-slate-700'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
            }`}
          >
            {allSelected ? '✓ All Selected' : 'Select All'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLATFORMS.map(p => {
            const active = isSelected(p.key);
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => togglePlatform(p.key)}
                className={`relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 w-full ${
                  active
                    ? `${p.border} ${p.bg} shadow-sm scale-[1.02]`
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {/* Checkmark */}
                <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  active ? `border-current ${p.text} bg-white` : 'border-slate-300'
                }`}>
                  {active && <div className={`w-2.5 h-2.5 rounded-full ${p.bg.replace('bg-', 'bg-').replace('-50', '-500')}`} />}
                </div>

                <div className="text-2xl">{p.icon}</div>
                <div>
                  <p className={`font-bold text-sm ${active ? p.text : 'text-slate-700'}`}>{p.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{p.desc}</p>
                  {active && (
                    <span className={`inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${p.bg} ${p.text} border ${p.border}`}>
                      Will Publish
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {selectedPlatforms.length === 0 && (
          <Alert
            type="warning"
            showIcon
            message="Please select at least one platform to publish this product to."
            className="mt-4"
          />
        )}
        {selectedPlatforms.length > 0 && (
          <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
            <Globe size={11} />
            This product will be created in your dashboard and pushed to:{' '}
            <strong className="text-slate-600">{selectedPlatforms.join(', ')}</strong>
          </p>
        )}
      </div>

      {/* ── Form ── */}
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ isActive: true, lowStockThreshold: 10 }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column (Main Info) */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Basic Information" className="shadow-sm rounded-xl" bordered={false}>
              <Form.Item label="Master Product Name" name="masterName" rules={[{ required: true, message: 'Required' }]}>
                <Input placeholder="e.g. Fipnil Spot-On 50mg" size="large" />
              </Form.Item>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item label="SKU" name="sku">
                  <div className="flex gap-2">
                    <Input placeholder="Internal SKU" className="flex-1" />
                    <Button onClick={generateSku}>Auto</Button>
                  </div>
                </Form.Item>
                <Form.Item label="Barcode" name="barcode">
                  <Input placeholder="EAN/UPC" />
                </Form.Item>
                <Form.Item label="Brand" name="brand">
                  <Input placeholder="e.g. Vetoquinol" />
                </Form.Item>
                <Form.Item label="Category" name="category">
                  <TreeSelect
                    treeData={categoryTree}
                    treeCheckable={true}
                    treeCheckStrictly={true}
                    showCheckedStrategy={TreeSelect.SHOW_ALL}
                    placeholder="Select categories and sub-categories"
                    style={{ width: '100%' }}
                    maxTagCount="responsive"
                    treeNodeFilterProp="title"
                    showSearch
                  />
                </Form.Item>
                <Form.Item label="Animal Type" name="animalType">
                  <Select mode="multiple" placeholder="Select types">
                    <Option value="dog">Dog</Option>
                    <Option value="cat">Cat</Option>
                    <Option value="bird">Bird</Option>
                    <Option value="fish">Fish</Option>
                    <Option value="other">Other</Option>
                  </Select>
                </Form.Item>
              </div>

              <Form.Item label="Short Description" name="shortDescription">
                <TextArea rows={2} maxLength={200} showCount placeholder="Brief summary for listings" />
              </Form.Item>
              <Form.Item label="Full Description" name="description">
                <TextArea rows={4} placeholder="Detailed product description" />
              </Form.Item>
            </Card>

            {/* ── Pricing (dynamic per selected platforms) ── */}
            <Card
              title={
                <div className="flex items-center gap-2">
                  <span>Pricing Setup</span>
                  <span className="text-xs font-normal text-slate-400">— showing prices for selected platforms only</span>
                </div>
              }
              className="shadow-sm rounded-xl"
              bordered={false}
            >
              {/* Base prices (always visible) */}
              <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-slate-100">
                <Form.Item label="Cost Price" name="costPrice">
                  <InputNumber prefix="₹" className="w-full" min={0} />
                </Form.Item>
                <Form.Item label="MRP" name="mrp">
                  <InputNumber prefix="₹" className="w-full" min={0} />
                </Form.Item>
                <Form.Item label="GST %" name="gstPercent">
                  <Select placeholder="Tax">
                    <Option value={0}>0%</Option>
                    <Option value={5}>5%</Option>
                    <Option value={12}>12%</Option>
                    <Option value={18}>18%</Option>
                    <Option value={28}>28%</Option>
                  </Select>
                </Form.Item>
              </div>

              {/* Platform-specific prices — only shown if platform is selected */}
              <div className="space-y-3">
                {PLATFORMS.map(p => isSelected(p.key) && (
                  <div key={p.key} className={`flex items-center gap-3 p-3 rounded-xl ${p.bg} border ${p.border}`}>
                    <span className="text-lg">{p.icon}</span>
                    <span className={`font-semibold text-sm w-24 shrink-0 ${p.text}`}>{p.label} Price</span>
                    <Form.Item name={`${p.key}Price`} className="mb-0 flex-1">
                      <InputNumber
                        prefix="₹"
                        className="w-full"
                        min={0}
                        placeholder="Leave blank to use MRP"
                      />
                    </Form.Item>
                  </div>
                ))}
                {selectedPlatforms.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-2">Select platforms above to set platform-specific prices</p>
                )}
              </div>
            </Card>

            {/* ── Stock (dynamic per selected platforms) ── */}
            <Card
              title={
                <div className="flex items-center gap-2">
                  <span>Stock Allocation</span>
                  <span className="text-xs font-normal text-slate-400">— per selected platforms</span>
                </div>
              }
              className="shadow-sm rounded-xl"
              bordered={false}
            >
              <div className={`grid gap-4 mb-4 ${selectedPlatforms.length > 0 ? `grid-cols-${Math.min(selectedPlatforms.length + 1, 4)}` : 'grid-cols-1'}`}>
                {PLATFORMS.map(p => isSelected(p.key) && (
                  <Form.Item key={p.key} label={`${p.label} Stock`} name={`${p.key}Stock`}>
                    <InputNumber
                      className="w-full"
                      min={0}
                      prefix={<span className="text-base">{p.icon}</span>}
                    />
                  </Form.Item>
                ))}
                <Form.Item
                  label="Warehouse Buffer"
                  name="warehouseStock"
                  tooltip="Unallocated reserve stock kept in physical warehouse"
                >
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
              </div>
              <div className="w-1/3">
                <Form.Item label="Low Stock Threshold" name="lowStockThreshold">
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
              </div>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Product Images */}
            <Card
              title={
                <div className="flex items-center gap-2">
                  <ImagePlus size={16} className="text-emerald-600" />
                  <span>Product Images</span>
                  {images.length > 0 && (
                    <span className="ml-auto text-xs font-normal text-slate-400">{images.length} uploaded</span>
                  )}
                </div>
              }
              className="shadow-sm rounded-xl"
              bordered={false}
            >
              <ProductImageUploader value={images} onChange={setImages} maxImages={8} />
            </Card>

            {/* Product Status */}
            <Card title="Product Status" className="shadow-sm rounded-xl" bordered={false}>
              <Form.Item name="isActive" valuePropName="checked" className="mb-0">
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
              <p className="text-xs text-slate-400 mt-2">Inactive products are hidden from global sync operations.</p>
            </Card>

            {/* Platform IDs — only for selected platforms */}
            {selectedPlatforms.length > 0 && (
              <Card
                title={
                  <div className="flex items-center gap-2">
                    <Package size={15} className="text-slate-500" />
                    <span>Platform IDs</span>
                    <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </div>
                }
                className="shadow-sm rounded-xl"
                bordered={false}
              >
                <p className="text-xs text-slate-400 mb-3">
                  If this product already exists on a platform, enter its ID to link them. Leave blank to auto-create.
                </p>
                <div className="space-y-3">
                  {isSelected('fifozone') && (
                    <div className={`p-3 rounded-xl ${PLATFORMS[0].bg} border ${PLATFORMS[0].border}`}>
                      <p className={`text-xs font-semibold mb-1.5 ${PLATFORMS[0].text}`}>🛒 Fifozone WooCommerce ID</p>
                      <Form.Item name="fifozoneId" className="mb-0">
                        <Input placeholder="Leave blank to auto-create" size="small" />
                      </Form.Item>
                    </div>
                  )}
                  {isSelected('amazon') && (
                    <div className={`p-3 rounded-xl ${PLATFORMS[1].bg} border ${PLATFORMS[1].border}`}>
                      <p className={`text-xs font-semibold mb-1.5 ${PLATFORMS[1].text}`}>📦 Amazon ASIN</p>
                      <Form.Item name="amazonAsin" className="mb-0">
                        <Input placeholder="e.g. B08XYZ1234" size="small" />
                      </Form.Item>
                    </div>
                  )}
                  {isSelected('flipkart') && (
                    <div className={`p-3 rounded-xl ${PLATFORMS[2].bg} border ${PLATFORMS[2].border}`}>
                      <p className={`text-xs font-semibold mb-1.5 ${PLATFORMS[2].text}`}>🏪 Flipkart FSIN</p>
                      <Form.Item name="flipkartFsin" className="mb-0">
                        <Input placeholder="e.g. FSIN1234567" size="small" />
                      </Form.Item>
                    </div>
                  )}
                  {isSelected('meesho') && (
                    <div className={`p-3 rounded-xl ${PLATFORMS[3].bg} border ${PLATFORMS[3].border}`}>
                      <p className={`text-xs font-semibold mb-1.5 ${PLATFORMS[3].text}`}>🛍️ Meesho Product ID</p>
                      <Form.Item name="meeshoId" className="mb-0">
                        <Input placeholder="Leave blank to auto-create" size="small" />
                      </Form.Item>
                      <p className={`text-xs font-semibold mb-1.5 mt-2 ${PLATFORMS[3].text}`}>Meesho Supplier SKU</p>
                      <Form.Item name="meeshoSku" className="mb-0">
                        <Input placeholder="Your supplier SKU on Meesho" size="small" />
                      </Form.Item>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* ── Sticky Save Bar ── */}
        <div className="fixed bottom-0 left-0 right-0 md:left-[260px] bg-white border-t border-slate-200 p-4 px-8 flex justify-between items-center z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Globe size={14} />
            Publishing to:{' '}
            {selectedPlatforms.length === 0
              ? <span className="text-red-500 font-medium">No platform selected</span>
              : selectedPlatforms.map(p => {
                  const cfg = PLATFORMS.find(x => x.key === p);
                  return (
                    <span key={p} className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  );
                })
            }
          </div>
          <div className="flex gap-3">
            <Button onClick={() => navigate(-1)} size="large" disabled={loading}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<Save size={18} />}
              loading={loading}
              disabled={selectedPlatforms.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 border-emerald-600"
            >
              Save & Sync to {selectedPlatforms.length === 3 ? 'All Platforms' : selectedPlatforms.join(' + ')}
            </Button>
          </div>
        </div>
      </Form>

      {/* Import Wizard */}
      <ImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImportComplete={() => {
          setImportOpen(false);
          navigate('/inventory/products');
        }}
      />
    </div>
  );
};

export default AddProductPage;
