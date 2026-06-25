import React, { useState, useEffect, useMemo } from 'react';
import { Form, Input, Button, Select, DatePicker, Switch, Card, Row, Col, Divider, Table, message, Space, Typography, InputNumber, Tag, AutoComplete, Modal, Upload, Alert } from 'antd';
import { PlusOutlined, MinusCircleOutlined, SaveOutlined, SendOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { getSuppliersApi, getPurchasesApi, createPurchaseApi, updatePurchaseApi, deletePurchaseApi } from '../../api/inventoryApi';
import { getProductsApi } from '../../api/productApi';
import { bulkUpdateHsnApi } from '../../api/productApi';
import { useLocation, useNavigate } from 'react-router-dom';
import InvoicePreviewModal from '../../components/inventory/InvoicePreviewModal';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const { Option } = Select;
const { Title, Text } = Typography;

// Helper to convert number to words (Indian numbering system)
const numberToWords = (num) => {
  if (num === 0) return 'Zero';
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

  if ((num = num.toString()).length > 9) return 'Overflow';
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return; var str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim() + ' Only';
};

const StockAdjustmentPage = () => {
  const [form] = Form.useForm();
  const location = useLocation();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [hsnModalOpen, setHsnModalOpen] = useState(false);
  const [hsnUploadData, setHsnUploadData] = useState([]);
  const [hsnUploading, setHsnUploading] = useState(false);

  // Auto-calculated states
  const [netTaxableValue, setNetTaxableValue] = useState(0);
  const [totalIgst, setTotalIgst] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [roundingOff, setRoundingOff] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [amountWords, setAmountWords] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [supRes, prodRes, purRes] = await Promise.all([
        getSuppliersApi(),
        getProductsApi({ limit: 1000 }), // Get a large list for autocomplete
        getPurchasesApi()
      ]);
      setSuppliers(supRes?.data || []);
      setProductsList(prodRes?.data?.products || prodRes?.data || []);
      setHistory(purRes?.data || []);
    } catch (err) {
      console.error(err);
      const errMsg = err?.response?.data?.message || err?.message || String(err);
      message.error(`Failed to load initial data: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (history.length > 0 && location.state?.editInvoiceId) {
      const invoiceToEdit = history.find(h => h._id === location.state.editInvoiceId);
      if (invoiceToEdit) {
        handleEdit(invoiceToEdit);
        // Clear state so it doesn't re-trigger on refresh
        navigate(location.pathname, { replace: true });
      }
    }
  }, [history, location.state, navigate]);

  const handleValuesChange = (_, allValues) => {
    let taxable = 0;
    let igst = 0;
    let discount = 0;

    const items = allValues.items || [];
    items.forEach(item => {
      if (item) {
        const qty = item.qty || 0;
        const rate = item.rate || 0;
        const disc = item.discount || 0;
        const gst = item.gstRate || 0;

        const baseValue = qty * rate;
        const itemTaxable = baseValue - disc;
        const itemIgst = itemTaxable * (gst / 100);

        taxable += itemTaxable;
        igst += itemIgst;
        discount += disc;
      }
    });

    const totalRaw = taxable + igst;
    const rounded = Math.round(totalRaw);
    const roundOffDiff = rounded - totalRaw;

    setNetTaxableValue(taxable);
    setTotalIgst(igst);
    setTotalDiscount(discount);
    setRoundingOff(roundOffDiff);
    setGrandTotal(rounded);
    
    if (rounded > 0) {
      setAmountWords(`Rupees ${numberToWords(rounded)}`);
    } else {
      setAmountWords('');
    }
  };

  const onFinish = async (values, status) => {
    try {
      setSubmitting(true);
      const payload = {
        ...values,
        invoiceDate: values.invoiceDate ? values.invoiceDate.format('DD-MM-YYYY') : '',
        netTaxableValue,
        totalIgst,
        totalDiscount,
        roundingOff,
        grandTotal,
        amountInWords: amountWords,
        status: status, // 'Draft' or 'Posted'
        reverseCharge: values.reverseCharge ? 'Yes' : 'No'
      };

      // Map product name to ID if selected from dropdown
      if (payload.items && payload.items.length > 0) {
        payload.items = payload.items.map(item => {
          const matchedProduct = productsList.find(p => p.masterName === item.productName);
          return {
            ...item,
            productId: matchedProduct ? matchedProduct._id : null
          };
        });
      }

      if (editingInvoiceId) {
        await updatePurchaseApi(editingInvoiceId, payload);
        message.success(`Invoice ${status} (updated) successfully!`);
      } else {
        await createPurchaseApi(payload);
        message.success(`Invoice ${status} successfully!`);
      }
      
      form.resetFields();
      setEditingInvoiceId(null);
      setNetTaxableValue(0); setTotalIgst(0); setTotalDiscount(0); setRoundingOff(0); setGrandTotal(0); setAmountWords('');
      fetchData(); // Refresh history
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to save invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (record) => {
    setEditingInvoiceId(record._id);
    form.setFieldsValue({
      ...record,
      invoiceDate: record.invoiceDate ? dayjs(record.invoiceDate, 'DD-MM-YYYY') : null,
      reverseCharge: record.reverseCharge === 'Yes'
    });
    // Trigger values change for calculation
    handleValuesChange(null, record);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This will reverse any stock added.')) return;
    try {
      await deletePurchaseApi(id);
      message.success('Invoice deleted successfully');
      fetchData();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to delete invoice');
    }
  };

  const handleSupplierChange = (val) => {
    const selectedSupplier = suppliers.find(s => s.name === val);
    if (selectedSupplier) {
      form.setFieldsValue({
        gstInvoiceNo: selectedSupplier.gstin || '',
        placeOfSupply: selectedSupplier.state || '',
        transitInsurance: selectedSupplier.transitInsurancePolicy || ''
      });
    }
  };

  const handleProductSelect = (val, itemIndex) => {
    const product = productsList.find(p => p.masterName === val);
    if (product) {
      const items = form.getFieldValue('items') || [];
      const updatedItems = [...items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        productName: val,
        hsnSac: product.hsnCode || updatedItems[itemIndex]?.hsnSac || '',
        mrp: product.mrp || updatedItems[itemIndex]?.mrp || 0,
        manufacturerName: product.manufacturer || updatedItems[itemIndex]?.manufacturerName || '',
        gstRate: product.gstPercent || updatedItems[itemIndex]?.gstRate || 0,
      };
      form.setFieldsValue({ items: updatedItems });
    }
  };

  const handleHsnExcelUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        // Accept columns: Product Name / product_name / masterName + HSN Code / hsn_code / hsnCode
        const parsed = rows
          .map(row => ({
            masterName: row['Product Name'] || row['product_name'] || row['masterName'] || '',
            hsnCode: String(row['HSN Code'] || row['hsn_code'] || row['hsnCode'] || row['HSN/SAC'] || '').trim()
          }))
          .filter(r => r.masterName && r.hsnCode);
        setHsnUploadData(parsed);
        if (parsed.length === 0) {
          message.error('No valid rows found. Ensure columns are: "Product Name" and "HSN Code"');
        }
      } catch (err) {
        message.error('Failed to parse Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // prevent auto upload
  };

  const handleHsnSave = async () => {
    if (hsnUploadData.length === 0) return;
    setHsnUploading(true);
    try {
      const res = await bulkUpdateHsnApi(hsnUploadData);
      const { updated, notFound } = res.data || {};
      message.success(`HSN updated for ${updated} products!`);
      if (notFound && notFound.length > 0) {
        message.warning(`Not matched: ${notFound.slice(0, 5).join(', ')}${notFound.length > 5 ? '...' : ''}`);
      }
      setHsnModalOpen(false);
      setHsnUploadData([]);
      await fetchData(); // refresh product list with new HSN codes
    } catch (err) {
      message.error(err?.response?.data?.message || 'Failed to update HSN codes');
    } finally {
      setHsnUploading(false);
    }
  };

  const getBatchOptions = (productName) => {
    if (!productName) return [{ value: 'none', label: 'Select a product first', disabled: true }];
    const batchesMap = new Map();
    history.forEach(inv => {
      (inv.items || []).forEach(item => {
        if (item.productName === productName && item.batchNo) {
          if (!batchesMap.has(item.batchNo)) {
            batchesMap.set(item.batchNo, item);
          }
        }
      });
    });
    
    const options = Array.from(batchesMap.values()).map(item => ({
      value: item.batchNo,
      label: (
        <div className="flex justify-between items-center">
          <span className="font-bold">{item.batchNo}</span>
          <span className="text-xs text-slate-400">Exp: {item.expiryDate || 'N/A'}</span>
        </div>
      ),
      mfgDate: item.mfgDate,
      expiryDate: item.expiryDate,
      mrp: item.mrp,
      manufacturerName: item.manufacturerName
    }));

    if (options.length === 0) {
      options.push({ value: 'none', label: 'No saved batches. Type a new one.', disabled: true });
    }

    return options;
  };

  const handleBatchSelect = (val, option, namePath) => {
    const items = form.getFieldValue('items') || [];
    const updatedItems = [...items];
    const currentItem = updatedItems[namePath] || {};
    
    updatedItems[namePath] = {
      ...currentItem,
      batchNo: val,
      mfgDate: option.mfgDate || currentItem.mfgDate,
      expiryDate: option.expiryDate || currentItem.expiryDate,
      mrp: option.mrp || currentItem.mrp,
      manufacturerName: option.manufacturerName || currentItem.manufacturerName,
    };
    form.setFieldsValue({ items: updatedItems });
    handleValuesChange(null, { items: updatedItems });
  };

  const columns = [
    { title: 'Date', dataIndex: 'invoiceDate', key: 'date' },
    { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', render: v => <span className="font-semibold">{v}</span> },
    { title: 'Invoice No.', dataIndex: 'invoiceNo', key: 'invoiceNo', render: v => <span className="font-mono text-xs">{v}</span> },
    { 
      title: 'Products', 
      key: 'products', 
      render: (_, r) => (
        <span className="text-xs text-slate-500">
          {(r.items || []).map(i => i.productName).join(', ') || 'None'}
        </span>
      )
    },
    { title: 'Items', key: 'itemCount', align: 'center', render: (_, r) => (r.items || []).length },
    { title: 'Total Amount', dataIndex: 'grandTotal', key: 'total', align: 'right', render: v => <span className="font-bold">₹{v?.toLocaleString('en-IN')}</span> },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status', 
      align: 'center',
      render: v => <Tag color={v === 'Posted' ? 'green' : v === 'Draft' ? 'orange' : 'default'}>{v}</Tag> 
    },
    {
      title: 'Action',
      key: 'action',
      align: 'center',
      render: (_, r) => (
        <Space size="middle">
          <Button type="text" icon={<EyeOutlined />} onClick={() => setPreviewInvoice(r)} title="Preview Invoice" />
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(r)} title="Edit Invoice" />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r._id)} title="Delete Invoice" />
        </Space>
      )
    }
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto min-h-screen bg-slate-50 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{editingInvoiceId ? 'Edit Purchase Invoice' : 'Purchase Invoice / Goods Receipt'}</h1>
        <p className="text-slate-500 text-sm">Enter supplier tax invoices and add incoming stock</p>
      </div>

      <Form 
        form={form} 
        layout="vertical" 
        onValuesChange={handleValuesChange}
        initialValues={{ reverseCharge: false, items: [{}] }}
      >
        <Card title="Invoice Details" className="shadow-sm border-slate-100 mb-6">
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="supplier" label="Supplier *" rules={[{ required: true, message: 'Supplier is required' }]} tooltip="Select from saved supplier list">
                <Select showSearch placeholder="e.g. Ravindera Medicos" onChange={handleSupplierChange}>
                  {suppliers.map(s => <Option key={s._id} value={s.name}>{s.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="invoiceNo" label="Invoice Number *" rules={[{ required: true, message: 'Invoice number is required' }]} tooltip="Supplier's invoice reference number">
                <Input placeholder="e.g. SR811/26-27" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="invoiceDate" label="Invoice Date *" rules={[{ required: true, message: 'Invoice date is required' }]} tooltip="Date printed on supplier invoice">
                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Form.Item name="gstInvoiceNo" label="GST Invoice No. / IRN" tooltip="GST portal invoice reference or IRN hash">
                <Input placeholder="e.g. SI0302580148" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="placeOfSupply" label="Place of Supply" tooltip="State and code of supply destination">
                <Input placeholder="e.g. Haryana (06)" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="transportMode" label="Transport / Delivery Mode">
                <Select placeholder="Select Mode">
                  <Option value="Personal Delivery">Personal Delivery</Option>
                  <Option value="Road (LR)">Road (LR)</Option>
                  <Option value="Courier">Courier</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Form.Item name="vehicleNo" label="Vehicle No. / LR No." tooltip="If transported by road">
                <Input placeholder="Vehicle or LR Number" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="ewayBillNo" label="E-Way Bill No.">
                <Input placeholder="E-Way Bill Number" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="transitInsurance" label="Transit Insurance Policy No.">
                <Input placeholder="e.g. 6520024307 – Tata AIG" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="reverseCharge" label="Reverse Charge" valuePropName="checked">
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card 
          title="Product Rows" 
          className="shadow-sm border-slate-100 mb-6"
          extra={
            <Button 
              icon={<FileExcelOutlined />} 
              onClick={() => setHsnModalOpen(true)}
              size="small"
            >
              Upload HSN Codes
            </Button>
          }
        >
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => (
                  <div key={key} className="p-4 bg-slate-50 border border-slate-200 rounded-lg mb-4 relative">
                    <div className="absolute top-4 right-4">
                      {fields.length > 1 && (
                        <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)}>Remove</Button>
                      )}
                    </div>
                    <Typography.Title level={5} className="!mt-0 !mb-4">Item {index + 1}</Typography.Title>
                    
                    <Row gutter={16}>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item {...restField} name={[name, 'productName']} label="Product Name / Description *" rules={[{ required: true, message: 'Required' }]}>
                          <Select showSearch placeholder="e.g. Sebolytic 200ml (T)" onChange={(val) => handleProductSelect(val, name)}>
                            {productsList.map(p => <Option key={p._id} value={p.masterName}>{p.masterName}</Option>)}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item {...restField} name={[name, 'hsnSac']} label="HSN / SAC Code *" rules={[{ required: true, message: 'Required' }]}>
                          <Input placeholder="e.g. 33051090" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item shouldUpdate={(prevValues, currentValues) => {
                          const prevItems = prevValues.items || [];
                          const currentItems = currentValues.items || [];
                          return prevItems[name]?.productName !== currentItems[name]?.productName;
                        }} noStyle>
                          {() => {
                            const currentProductName = form.getFieldValue(['items', name, 'productName']);
                            const batchOptions = getBatchOptions(currentProductName);
                            return (
                              <Form.Item {...restField} name={[name, 'batchNo']} label="Batch No.">
                                <AutoComplete
                                  options={batchOptions}
                                  placeholder="e.g. GC348"
                                  onSelect={(val, option) => {
                                    if(val !== 'none') handleBatchSelect(val, option, name);
                                  }}
                                  filterOption={(inputValue, option) => {
                                    if (option.disabled) return true;
                                    return option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1;
                                  }}
                                  onFocus={() => {
                                    // Triggering focus might require an open state, but with options it should open naturally
                                  }}
                                />
                              </Form.Item>
                            );
                          }}
                        </Form.Item>
                      </Col>
                      
                      <Col xs={12} sm={8} md={4}>
                        <Form.Item {...restField} name={[name, 'mfgDate']} label="Mfg Date">
                          <Input placeholder="e.g. Dec-2025" />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={8} md={4}>
                        <Form.Item {...restField} name={[name, 'expiryDate']} label="Expiry Date *">
                          <Input placeholder="e.g. Aug-2027" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={8} md={8}>
                        <Form.Item {...restField} name={[name, 'manufacturerName']} label="Manufacturer Name">
                          <Input placeholder="e.g. Elmed Life Sciences Pvt Ltd" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={8} md={8}>
                        <Form.Item {...restField} name={[name, 'storeLocation']} label="Store / Location">
                          <Input placeholder="e.g. Str-1" />
                        </Form.Item>
                      </Col>

                      <Col xs={12} sm={6} md={4}>
                        <Form.Item {...restField} name={[name, 'qty']} label="Quantity *" rules={[{ required: true, message: 'Required' }]}>
                          <InputNumber placeholder="Qty" style={{ width: '100%' }} min={1} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6} md={4}>
                        <Form.Item {...restField} name={[name, 'unit']} label="Unit *" rules={[{ required: true, message: 'Required' }]}>
                          <Select placeholder="Unit">
                            <Option value="Nos">Nos</Option>
                            <Option value="EA">EA</Option>
                            <Option value="Box">Box</Option>
                            <Option value="Strip">Strip</Option>
                            <Option value="Kg">Kg</Option>
                            <Option value="Litre">Litre</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6} md={4}>
                        <Form.Item {...restField} name={[name, 'mrp']} label="MRP (₹)">
                          <InputNumber placeholder="0.00" style={{ width: '100%' }} precision={2} min={0} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6} md={4}>
                        <Form.Item {...restField} name={[name, 'rate']} label="Rate / PTR (₹) *" rules={[{ required: true, message: 'Required' }]}>
                          <InputNumber placeholder="0.00" style={{ width: '100%' }} precision={2} min={0} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6} md={4}>
                        <Form.Item {...restField} name={[name, 'discount']} label="Discount (₹)">
                          <InputNumber placeholder="0.00" style={{ width: '100%' }} precision={2} min={0} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6} md={4}>
                        <Form.Item {...restField} name={[name, 'gstRate']} label="GST Rate (%)">
                          <Select placeholder="GST %">
                            <Option value={0}>0%</Option>
                            <Option value={5}>5%</Option>
                            <Option value={12}>12%</Option>
                            <Option value={18}>18%</Option>
                            <Option value={28}>28%</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} className="h-12 border-slate-300">
                  Add Another Product
                </Button>
              </>
            )}
          </Form.List>
        </Card>

        <Card title="Bill Summary" className="shadow-sm border-slate-100 mb-6 bg-slate-50/50">
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <div className="bg-white p-4 rounded-lg border border-slate-200 h-full">
                <Typography.Text type="secondary" className="block mb-2">Amount in Words</Typography.Text>
                <Typography.Text strong className="text-lg text-indigo-700">{amountWords || '—'}</Typography.Text>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between mb-2">
                  <Text className="text-slate-500">Net Taxable Value</Text>
                  <Text strong>₹{netTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </div>
                <div className="flex justify-between mb-2">
                  <Text className="text-slate-500">Total IGST</Text>
                  <Text strong>₹{totalIgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </div>
                <div className="flex justify-between mb-2">
                  <Text className="text-slate-500">Total Discount (-)</Text>
                  <Text strong className="text-rose-500">₹{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </div>
                <div className="flex justify-between mb-2">
                  <Text className="text-slate-500">Rounding Off</Text>
                  <Text strong>₹{roundingOff.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </div>
                <Divider className="my-2" />
                <div className="flex justify-between items-center">
                  <Text className="text-lg font-bold text-slate-700">Grand Total</Text>
                  <Text className="text-2xl font-bold text-emerald-600">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </div>
              </div>
            </Col>
          </Row>

          <div className="flex justify-end gap-3 mt-6">
            <Button size="large" icon={<SaveOutlined />} onClick={() => form.validateFields().then(v => onFinish(v, 'Draft'))} loading={submitting}>
              Save as Draft
            </Button>
            <Button size="large" type="primary" icon={<SendOutlined />} onClick={() => form.validateFields().then(v => onFinish(v, 'Posted'))} loading={submitting} className="!bg-emerald-600 !border-emerald-600">
              Post Invoice & Update Stock
            </Button>
          </div>
        </Card>
      </Form>

      <Card title="History — All Adjustment Entries" className="shadow-sm border-slate-100">
        <Table 
          columns={columns} 
          dataSource={history} 
          rowKey="_id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
          locale={{ emptyText: 'No invoice history found' }}
        />
      </Card>
      
      <InvoicePreviewModal 
        open={!!previewInvoice} 
        invoice={previewInvoice} 
        onClose={() => setPreviewInvoice(null)} 
      />

      {/* HSN Upload Modal */}
      <Modal
        title={<span className="font-bold flex items-center gap-2"><FileExcelOutlined className="text-green-600" /> Upload HSN / SAC Codes from Excel</span>}
        open={hsnModalOpen}
        onCancel={() => { setHsnModalOpen(false); setHsnUploadData([]); }}
        width={700}
        footer={[
          <Button key="cancel" onClick={() => { setHsnModalOpen(false); setHsnUploadData([]); }}>Cancel</Button>,
          <Button 
            key="save" 
            type="primary" 
            loading={hsnUploading} 
            disabled={hsnUploadData.length === 0}
            onClick={handleHsnSave}
            className="!bg-emerald-600 !border-emerald-600"
          >
            Save {hsnUploadData.length > 0 ? `(${hsnUploadData.length} products)` : ''}
          </Button>
        ]}
      >
        <div className="space-y-4">
          <Alert
            type="info"
            showIcon
            message="Excel Format"
            description={
              <div className="text-sm">
                Your Excel file must have two columns:
                <ul className="mt-1 ml-4 list-disc">
                  <li><strong>Product Name</strong> — must match exactly as saved in the system</li>
                  <li><strong>HSN Code</strong> — the HSN / SAC code for that product</li>
                </ul>
                <a
                  href="#"
                  className="text-indigo-600 font-semibold mt-1 inline-block"
                  onClick={(e) => {
                    e.preventDefault();
                    const ws = XLSX.utils.aoa_to_sheet([['Product Name', 'HSN Code'], ['Example Product 1', '33051090'], ['Example Product 2', '30049099']]);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'HSN Codes');
                    XLSX.writeFile(wb, 'hsn_template.xlsx');
                  }}
                >
                  ⬇ Download Template
                </a>
              </div>
            }
          />
          <Upload.Dragger
            accept=".xlsx,.xls,.csv"
            beforeUpload={handleHsnExcelUpload}
            showUploadList={false}
            maxCount={1}
          >
            <p className="text-4xl mb-2">📊</p>
            <p className="font-semibold text-slate-700">Click or drag Excel file here</p>
            <p className="text-slate-400 text-sm">Supports .xlsx, .xls, .csv</p>
          </Upload.Dragger>

          {hsnUploadData.length > 0 && (
            <div>
              <div className="font-semibold text-slate-700 mb-2">Preview ({hsnUploadData.length} rows)</div>
              <Table
                dataSource={hsnUploadData.slice(0, 10)}
                columns={[
                  { title: 'Product Name', dataIndex: 'masterName', key: 'name', ellipsis: true },
                  { title: 'HSN Code', dataIndex: 'hsnCode', key: 'hsn', render: v => <Tag color="blue">{v}</Tag> }
                ]}
                pagination={false}
                size="small"
                rowKey={(r, i) => i}
                footer={() => hsnUploadData.length > 10 ? <span className="text-slate-400 text-xs">...and {hsnUploadData.length - 10} more rows</span> : null}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default StockAdjustmentPage;
