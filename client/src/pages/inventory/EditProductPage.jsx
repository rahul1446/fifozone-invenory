import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Switch, Card, Button, message, Tabs, Table, Modal, Tag, TreeSelect } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, History, PackageSearch, ImagePlus } from 'lucide-react';
import { getProductByIdApi, updateProductApi, deleteProductApi } from '../../api/productApi';
import { getWooCommerceCategoriesApi } from '../../api/platformApi';
import { getInventoryLogsApi } from '../../api/inventoryApi';
import { formatDate } from '../../utils/formatters';
import ProductImageUploader from '../../components/inventory/ProductImageUploader';

const { TextArea } = Input;
const { Option } = Select;

const EditProductPage = () => {
  const { id } = useParams();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [categoryTree, setCategoryTree] = useState([]);
  const [productName, setProductName] = useState('');
  const [images, setImages] = useState([]); // [{url, isPrimary, filename}]
  
  // Tab states
  const [inventoryLogs, setInventoryLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    fetchProduct();
    fetchCategories();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await getWooCommerceCategoriesApi();
      setCategoryTree(response.data || []);
    } catch (error) {
      console.error("Failed to load category tree", error);
    }
  };

  const fetchProduct = async () => {
    try {
      const response = await getProductByIdApi(id);
      const data = response.data;
      setProductName(data.masterName);
      
      form.setFieldsValue({
        masterName: data.masterName,
        sku: data.sku,
        barcode: data.barcode,
        brand: data.brand,
        category: data.category ? data.category.map(c => ({ label: c, value: c })) : [],
        animalType: data.animalType || [],
        description: data.description,
        shortDescription: data.shortDescription,
        mrp: data.mrp,
        costPrice: data.costPrice,
        gstPercent: data.gstPercent,
        fifozonePrice:   data.sellingPrice?.fifozone,
        amazonPrice:     data.sellingPrice?.amazon,
        flipkartPrice:   data.sellingPrice?.flipkart,
        meeshoPrice:     data.sellingPrice?.meesho,
        fifozoneStock:   data.stockByPlatform?.fifozone,
        amazonStock:     data.stockByPlatform?.amazon,
        flipkartStock:   data.stockByPlatform?.flipkart,
        meeshoStock:     data.stockByPlatform?.meesho,
        warehouseStock:  data.stockByPlatform?.warehouse,
        lowStockThreshold: data.lowStockThreshold,
        isActive: data.isActive,
        fifozoneListing: data.platformStatus?.fifozone === 'active',
        amazonListing:   data.platformStatus?.amazon   === 'active',
        flipkartListing: data.platformStatus?.flipkart === 'active',
        meeshoListing:   data.platformStatus?.meesho   === 'active',
        fifozoneId:   data.platformIds?.fifozone?.productId,
        amazonAsin:   data.platformIds?.amazon?.asin,
        flipkartFsin: data.platformIds?.flipkart?.fsin,
        meeshoId:     data.platformIds?.meesho?.productId,
        meeshoSku:    data.platformIds?.meesho?.sku,
      });
      // Pre-load existing images
      if (data.images?.length > 0) {
        setImages(data.images.map(img => ({
          url: img.url,
          isPrimary: img.isPrimary || false,
          filename: img.publicId || '',
        })));
      }
    } catch (error) {
      message.error('Failed to load product details');
      navigate('/inventory/products');
    } finally {
      setFetching(false);
    }
  };

  const fetchInventoryHistory = async () => {
    setLogsLoading(true);
    try {
      const response = await getInventoryLogsApi({ productId: id, limit: 50 });
      setInventoryLogs(response.data.logs || []);
    } catch (error) {
      message.error('Failed to load inventory history');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleTabChange = (key) => {
    if (key === 'history' && inventoryLogs.length === 0) {
      fetchInventoryHistory();
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const platformStatus = {
        fifozone: values.fifozoneListing ? 'active' : 'not_listed',
        amazon:   values.amazonListing   ? 'active' : 'not_listed',
        flipkart: values.flipkartListing ? 'active' : 'not_listed',
        meesho:   values.meeshoListing   ? 'active' : 'not_listed',
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
          fifozone: values.fifozonePrice,
          amazon:   values.amazonPrice,
          flipkart: values.flipkartPrice,
          meesho:   values.meeshoPrice,
        },
        stockByPlatform: {
          fifozone:  values.fifozoneStock,
          amazon:    values.amazonStock,
          flipkart:  values.flipkartStock,
          meesho:    values.meeshoStock,
          warehouse: values.warehouseStock,
        },
        lowStockThreshold: values.lowStockThreshold,
        isActive: values.isActive,
        platformStatus,
        platformIds: {
          fifozone: { productId: values.fifozoneId  || '' },
          amazon:   { asin:      values.amazonAsin  || '' },
          flipkart: { fsin:      values.flipkartFsin || '' },
          meesho:   { productId: values.meeshoId    || '', sku: values.meeshoSku || '' },
        },
        images: images.map(img => ({ url: img.url, isPrimary: img.isPrimary, publicId: img.filename || '' })),
      };

      await updateProductApi(id, payload);
      message.success('Product updated successfully');
      setProductName(values.masterName);
    } catch (error) {
      if (error.response?.status === 409) {
        form.setFields([{ name: 'sku', errors: [error.response?.data?.message || 'SKU already exists'] }]);
        message.error('Duplicate SKU. Please use a unique SKU.');
      } else {
        message.error(error.response?.data?.message || 'Failed to update product');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete Product',
      content: 'Are you sure you want to delete this product? This will remove it from the system and unlink it from platforms. This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteProductApi(id);
          message.success('Product deleted successfully');
          navigate('/inventory/products');
        } catch (error) {
          message.error(error.response?.data?.message || 'Failed to delete product');
        }
      }
    });
  };

  const logColumns = [
    {
      title: 'Date & Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val) => formatDate(val)
    },
    {
      title: 'Change Type',
      dataIndex: 'changeType',
      key: 'changeType',
      render: (type) => {
        const colorMap = {
          sale: 'blue', return: 'green', manual_add: 'emerald', manual_remove: 'red',
          adjustment: 'purple', sync_update: 'cyan', restock: 'teal'
        };
        return <Tag color={colorMap[type] || 'default'}>{type.replace('_', ' ').toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform'
    },
    {
      title: 'Change',
      dataIndex: 'changeQuantity',
      key: 'change',
      render: (qty) => (
        <span className={qty > 0 ? 'text-green-600' : qty < 0 ? 'text-red-600' : ''}>
          {qty > 0 ? `+${qty}` : qty}
        </span>
      )
    },
    {
      title: 'New Stock',
      dataIndex: 'newStock',
      key: 'newStock',
      className: 'font-semibold'
    },
    {
      title: 'Note',
      dataIndex: 'note',
      key: 'note'
    },
    {
      title: 'Performed By',
      dataIndex: 'performedBy',
      key: 'performedBy',
      render: (user) => user?.name || 'System'
    }
  ];

  if (fetching) return <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>;

  const DetailForm = (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main Info) */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Basic Information" className="shadow-sm rounded-xl" bordered={false}>
            <Form.Item label="Master Product Name" name="masterName" rules={[{ required: true, message: 'Required' }]}>
              <Input size="large" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-4">
              <Form.Item label="SKU" name="sku"><Input disabled /></Form.Item>
              <Form.Item label="Barcode" name="barcode"><Input /></Form.Item>
              <Form.Item label="Brand" name="brand"><Input /></Form.Item>
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
                <Select mode="multiple">
                  <Option value="dog">Dog</Option>
                  <Option value="cat">Cat</Option>
                  <Option value="bird">Bird</Option>
                  <Option value="fish">Fish</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </div>

            <Form.Item label="Short Description" name="shortDescription">
              <TextArea rows={2} maxLength={200} showCount />
            </Form.Item>
            <Form.Item label="Full Description" name="description">
              <TextArea rows={4} />
            </Form.Item>
          </Card>

          <Card title="Pricing Setup" className="shadow-sm rounded-xl" bordered={false}>
            <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-slate-100">
              <Form.Item label="Cost Price" name="costPrice"><InputNumber prefix="₹" className="w-full" min={0} /></Form.Item>
              <Form.Item label="MRP" name="mrp"><InputNumber prefix="₹" className="w-full" min={0} /></Form.Item>
              <Form.Item label="GST %" name="gstPercent">
                <Select>
                  <Option value={0}>0%</Option><Option value={5}>5%</Option>
                  <Option value={12}>12%</Option><Option value={18}>18%</Option><Option value={28}>28%</Option>
                </Select>
              </Form.Item>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Form.Item label="Fifozone Price" name="fifozonePrice"><InputNumber prefix="₹" className="w-full" min={0} /></Form.Item>
              <Form.Item label="Amazon Price"   name="amazonPrice">  <InputNumber prefix="₹" className="w-full" min={0} /></Form.Item>
              <Form.Item label="Flipkart Price" name="flipkartPrice"><InputNumber prefix="₹" className="w-full" min={0} /></Form.Item>
              <Form.Item label="Meesho Price"   name="meeshoPrice">  <InputNumber prefix="₹" className="w-full" min={0} /></Form.Item>
            </div>
          </Card>

          <Card title="Stock Allocation" className="shadow-sm rounded-xl" bordered={false}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Form.Item label="Fifozone Stock"  name="fifozoneStock"> <InputNumber className="w-full" min={0} /></Form.Item>
              <Form.Item label="Amazon Stock"    name="amazonStock">   <InputNumber className="w-full" min={0} /></Form.Item>
              <Form.Item label="Flipkart Stock"  name="flipkartStock"> <InputNumber className="w-full" min={0} /></Form.Item>
              <Form.Item label="Meesho Stock"    name="meeshoStock">   <InputNumber className="w-full" min={0} /></Form.Item>
              <Form.Item label="Warehouse Buffer" name="warehouseStock"><InputNumber className="w-full" min={0} /></Form.Item>
            </div>
            <div className="w-1/3 mt-2">
              <Form.Item label="Low Stock Threshold" name="lowStockThreshold"><InputNumber className="w-full" min={0} /></Form.Item>
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">

          {/* ─── Product Images ─── */}
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
            <ProductImageUploader
              value={images}
              onChange={setImages}
              maxImages={8}
            />
          </Card>

          <Card title="Product Status" className="shadow-sm rounded-xl" bordered={false}>
            <Form.Item name="isActive" valuePropName="checked" className="mb-0">
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          </Card>

          <Card title="Platform Listings" className="shadow-sm rounded-xl" bordered={false}>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <Form.Item name="fifozoneListing" valuePropName="checked" className="mb-2"><Switch checkedChildren="List on Fifozone" unCheckedChildren="Do Not List" /></Form.Item>
                <Form.Item label="WooCommerce ID" name="fifozoneId" className="mb-0"><Input size="small" /></Form.Item>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <Form.Item name="amazonListing" valuePropName="checked" className="mb-2"><Switch checkedChildren="List on Amazon" unCheckedChildren="Do Not List" /></Form.Item>
                <Form.Item label="ASIN" name="amazonAsin" className="mb-0"><Input size="small" /></Form.Item>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <Form.Item name="flipkartListing" valuePropName="checked" className="mb-2"><Switch checkedChildren="List on Flipkart" unCheckedChildren="Do Not List" /></Form.Item>
                <Form.Item label="FSIN" name="flipkartFsin" className="mb-0"><Input size="small" /></Form.Item>
              </div>
              <div className="p-4 bg-pink-50 rounded-lg border border-pink-100">
                <Form.Item name="meeshoListing" valuePropName="checked" className="mb-2"><Switch checkedChildren="List on Meesho" unCheckedChildren="Do Not List" /></Form.Item>
                <Form.Item label="Meesho Product ID" name="meeshoId" className="mb-0"><Input size="small" placeholder="Leave blank to auto-create" /></Form.Item>
                <Form.Item label="Supplier SKU" name="meeshoSku" className="mb-0 mt-2"><Input size="small" placeholder="Your supplier SKU" /></Form.Item>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 md:left-[260px] bg-white border-t border-slate-200 p-4 px-8 flex justify-between items-center z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button danger icon={<Trash2 size={18} />} onClick={handleDelete}>Delete Product</Button>
        <div className="flex gap-4">
          <Button onClick={() => navigate('/inventory/products')} size="large">Cancel</Button>
          <Button type="primary" htmlType="submit" size="large" icon={<Save size={18} />} loading={loading} className="bg-emerald-600 hover:bg-emerald-500">Save Changes</Button>
        </div>
      </div>
    </Form>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-24">
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <Button icon={<ArrowLeft size={18} />} onClick={() => navigate('/inventory/products')} type="text" className="text-slate-500" />
        <div>
          <h1 className="text-xl font-bold text-slate-800">Edit Product — {productName}</h1>
        </div>
      </div>

      <Tabs 
        defaultActiveKey="details" 
        onChange={handleTabChange}
        className="bg-white p-4 rounded-xl shadow-sm border border-slate-100"
        items={[
          {
            key: 'details',
            label: <span><PackageSearch size={16} className="inline mr-2" /> Details</span>,
            children: <div className="mt-4">{DetailForm}</div>
          },
          {
            key: 'history',
            label: <span><History size={16} className="inline mr-2" /> Inventory History</span>,
            children: (
              <div className="mt-4">
                <Table 
                  columns={logColumns} 
                  dataSource={inventoryLogs} 
                  rowKey="_id"
                  loading={logsLoading}
                  pagination={{ pageSize: 15 }}
                />
              </div>
            )
          }
        ]}
      />
    </div>
  );
};

export default EditProductPage;
