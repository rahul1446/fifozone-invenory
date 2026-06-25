import React, { useState, useEffect, useMemo } from 'react';
import { Table, Tag, Button, Modal, Form, Input, Select, Spin, message, Divider, Drawer, Space, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { Users, MapPin, Phone, Mail, Plus, RefreshCw, Edit, FileText, Eye } from 'lucide-react';
import { getSuppliersApi, createSupplierApi, updateSupplierApi, getPurchasesApi } from '../../api/inventoryApi';
import { useNavigate } from 'react-router-dom';
import InvoicePreviewModal from '../../components/inventory/InvoicePreviewModal';

const { Option } = Select;

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSupplierForHistory, setSelectedSupplierForHistory] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterDates, setFilterDates] = useState(null);
  const [filterProduct, setFilterProduct] = useState('');
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      let matchDate = true;
      let matchProduct = true;

      if (filterDates && filterDates[0] && filterDates[1]) {
        const pDate = dayjs(p.invoiceDate, 'DD-MM-YYYY');
        const dateToCompare = pDate.isValid() ? pDate : dayjs(p.purchaseDate);
        if (dateToCompare.isValid()) {
           matchDate = dateToCompare.isAfter(filterDates[0].startOf('day')) && dateToCompare.isBefore(filterDates[1].endOf('day'));
        }
      }

      if (filterProduct) {
        matchProduct = p.items && p.items.some(item => 
          item.productName?.toLowerCase().includes(filterProduct.toLowerCase())
        );
      }

      return matchDate && matchProduct;
    });
  }, [purchases, filterDates, filterProduct]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await getSuppliersApi();
      const data = res?.data || (Array.isArray(res) ? res : []);
      setSuppliers(data);
    } catch (err) { 
      console.error(err);
      const errMsg = err?.response?.data?.message || err?.message || String(err);
      message.error(`Failed to load suppliers: ${errMsg}`); 
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      if (editingId) {
        await updateSupplierApi(editingId, vals);
        message.success('Supplier updated successfully!');
      } else {
        await createSupplierApi(vals);
        message.success('Supplier added successfully!');
      }
      form.resetFields();
      setModalOpen(false);
      setEditingId(null);
      fetchSuppliers();
    } catch (err) {
      if (err?.response) message.error(err.response.data?.message || 'Failed to save supplier');
    } finally { setSaving(false); }
  };

  const openEditModal = (record) => {
    setEditingId(record._id);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const openAddModal = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openHistoryDrawer = async (supplier) => {
    setSelectedSupplierForHistory(supplier);
    setDrawerOpen(true);
    setLoadingPurchases(true);
    try {
      const res = await getPurchasesApi();
      const allPurchases = res?.data || [];
      const supplierPurchases = allPurchases.filter(p => p.supplier === supplier.name);
      setPurchases(supplierPurchases);
    } catch (err) {
      message.error('Failed to load supplier history');
    } finally {
      setLoadingPurchases(false);
    }
  };

  const columns = [
    { 
      title: 'Supplier Name', 
      dataIndex: 'name', 
      key: 'name', 
      render: (v, r) => (
        <a className="font-semibold text-indigo-600 cursor-pointer" onClick={() => openHistoryDrawer(r)}>
          {v}
        </a>
      ) 
    },
    { title: 'Contact Person', dataIndex: 'contactPerson', key: 'contact', render: v => v || '—' },
    { title: 'Phone', dataIndex: 'mobileNumber', key: 'phone', render: (v, r) => v ? <span className="flex items-center gap-1"><Phone size={13} className="text-slate-400" />{v}</span> : (r.phone ? <span className="flex items-center gap-1"><Phone size={13} className="text-slate-400" />{r.phone}</span> : '—') },
    { title: 'Email', dataIndex: 'email', key: 'email', render: v => v ? <span className="flex items-center gap-1"><Mail size={13} className="text-slate-400" />{v}</span> : '—' },
    { title: 'City', dataIndex: 'city', key: 'city', render: (v, r) => v ? <span className="flex items-center gap-1"><MapPin size={13} className="text-slate-400" />{v}{r.state ? `, ${r.state}` : ''}</span> : '—' },
    { title: 'GSTIN', dataIndex: 'gstin', key: 'gstin', render: v => v ? <span className="text-slate-600 font-mono text-xs">{v}</span> : '—' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: v => <Tag color={v === 'Active' ? 'green' : 'default'}>{v || 'Active'}</Tag> },
    { 
      title: 'Action', 
      key: 'action', 
      align: 'center',
      render: (_, r) => (
        <Space>
          <Button size="small" type="text" onClick={() => openHistoryDrawer(r)} icon={<FileText size={14} className="text-slate-500 hover:text-indigo-600" />} title="View Invoices" />
          <Button size="small" type="text" onClick={() => openEditModal(r)} icon={<Edit size={14} className="text-slate-500 hover:text-indigo-600" />} title="Edit Supplier" />
        </Space>
      ) 
    },
  ];

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div className="space-y-6 pb-10 max-w-[1400px] mx-auto p-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-slate-600" />
          <div><h1 className="text-2xl font-bold text-slate-800">Suppliers</h1><p className="text-slate-500 text-sm">{suppliers.length} suppliers registered</p></div>
        </div>
        <div className="flex gap-2">
          <Button icon={<RefreshCw size={16} />} onClick={fetchSuppliers}>Refresh</Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={openAddModal} className="!bg-emerald-600 !border-emerald-600">Add Supplier</Button>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table columns={columns} dataSource={suppliers} rowKey="_id" pagination={{ pageSize: 20, showTotal: t => `${t} suppliers` }} scroll={{ x: 1100 }} locale={{ emptyText: 'No suppliers found' }} />
      </div>
      
      <Modal 
        open={modalOpen} 
        title={editingId ? "Edit Supplier" : "Add New Supplier"} 
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditingId(null); }} 
        onOk={handleSave} 
        okText={editingId ? "Update" : "Save"} 
        okButtonProps={{ loading: saving, className: '!bg-emerald-600 !border-emerald-600' }} 
        width={850}
        style={{ top: 20 }}
      >
        <Form form={form} layout="vertical" className="mt-4 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
          
          <Divider orientation="left" className="!mt-0">Basic Details</Divider>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="name" label="Supplier Name *" rules={[{ required: true, message: 'Supplier name is required' }]} tooltip="Full registered business name">
              <Input placeholder="e.g. Ravindera Medicos" />
            </Form.Item>
            <Form.Item name="supplierCode" label="Supplier Code" tooltip="System-generated or manual internal code">
              <Input placeholder="e.g. 1031931" />
            </Form.Item>
          </div>

          <Divider orientation="left">Tax & Licences</Divider>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="gstin" label="GSTIN / UIN *" rules={[{ required: true, message: 'GSTIN is required' }]} tooltip="15-digit GST Identification Number">
              <Input placeholder="e.g. 07AASPM9782F1ZY" />
            </Form.Item>
            <Form.Item name="panNo" label="PAN Number" tooltip="10-character Permanent Account Number">
              <Input placeholder="e.g. AANCA0973A" />
            </Form.Item>
            <Form.Item name="fssaiLic" label="FSSAI Licence No." tooltip="Enter FSSAI licence number if applicable">
              <Input placeholder="e.g. 13318005000857" />
            </Form.Item>
            <Form.Item name="drugLic20B" label="Drug Licence 20B">
              <Input placeholder="e.g. WLF20B2024DL000800" />
            </Form.Item>
            <Form.Item name="drugLic21B" label="Drug Licence 21B">
              <Input placeholder="e.g. RLF21DL2024001427" />
            </Form.Item>
          </div>

          <Divider orientation="left">Contact & Location</Divider>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="mobileNumber" label="Mobile Number" tooltip="Primary contact number">
              <Input placeholder="e.g. 9811357056" />
            </Form.Item>
            <Form.Item name="alternateNumber" label="Alternate Number" tooltip="Secondary contact number">
              <Input placeholder="e.g. 9910469746" />
            </Form.Item>
            <Form.Item name="email" label="Email Address" rules={[{ type: 'email', message: 'Enter valid email' }]}>
              <Input placeholder="e.g. ravinderamedico@yahoo.co.in" />
            </Form.Item>
            <Form.Item name="brokerName" label="Broker / Agent Name" tooltip="Sales rep or broker assigned">
              <Input placeholder="e.g. VIRBAC" />
            </Form.Item>
          </div>
          
          <Form.Item name="registeredAddress" label="Registered Address *" rules={[{ required: true, message: 'Registered Address is required' }]} tooltip="Full address — building, area, city, state, PIN">
            <Input.TextArea placeholder="e.g. E-44, Shastri Nagar, Delhi-110052" rows={2} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="city" label="City"><Input placeholder="e.g. Delhi / Gurugram" /></Form.Item>
            <Form.Item name="state" label="State *" rules={[{ required: true, message: 'State is required' }]}>
              <Select placeholder="Select state from dropdown" showSearch>
                <Option value="Andhra Pradesh">Andhra Pradesh</Option>
                <Option value="Delhi">Delhi</Option>
                <Option value="Haryana">Haryana</Option>
                <Option value="Karnataka">Karnataka</Option>
                <Option value="Maharashtra">Maharashtra</Option>
                <Option value="Tamil Nadu">Tamil Nadu</Option>
                <Option value="Telangana">Telangana</Option>
                <Option value="Uttar Pradesh">Uttar Pradesh</Option>
                <Option value="West Bengal">West Bengal</Option>
                {/* Simplified list for brevity, the user can add more or type */}
              </Select>
            </Form.Item>
          </div>

          <Divider orientation="left">Bank & Payment Details</Divider>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="bankName" label="Bank Name"><Input placeholder="e.g. HDFC Bank" /></Form.Item>
            <Form.Item name="accountNumber" label="Account Number"><Input placeholder="e.g. 00912320001782" /></Form.Item>
            <Form.Item name="ifscCode" label="IFSC Code"><Input placeholder="e.g. HDFC0001441" /></Form.Item>
            <Form.Item name="upiNumber" label="UPI / PayTM Number"><Input placeholder="e.g. 9811357056" /></Form.Item>
            
            <Form.Item name="paymentTerms" label="Payment Terms">
              <Select placeholder="Select Payment Terms">
                <Option value="100% Advance">100% Advance</Option>
                <Option value="Credit 7 Days">Credit 7 Days</Option>
                <Option value="Credit 15 Days">Credit 15 Days</Option>
                <Option value="Credit 30 Days">Credit 30 Days</Option>
              </Select>
            </Form.Item>
            <Form.Item name="latePaymentInterest" label="Late Payment Interest (% p.a.)" tooltip="Annual penal interest on delayed payments">
              <Input placeholder="e.g. 14 / 18" />
            </Form.Item>
          </div>

          <Divider orientation="left">Other Details</Divider>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="jurisdictionCity" label="Jurisdiction City"><Input placeholder="e.g. Delhi / Hyderabad" /></Form.Item>
            <Form.Item name="transitInsurancePolicy" label="Transit Insurance Policy No."><Input placeholder="e.g. 6520024307 – Tata AIG" /></Form.Item>
          </div>

          <Form.Item name="termsConditions" label="Terms & Conditions / Notes">
            <Input.TextArea placeholder="Return policy, special terms, or any notes" rows={2} />
          </Form.Item>
          
          <Form.Item name="status" label="Status" initialValue="Active">
            <Select>
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={
          <div className="flex flex-col gap-2">
            <div className="font-bold text-slate-800">History: {selectedSupplierForHistory?.name}</div>
            <div className="flex gap-2 items-center">
              <DatePicker.RangePicker 
                format="DD-MM-YYYY"
                onChange={(dates) => setFilterDates(dates)} 
                allowClear 
              />
              <Input 
                placeholder="Search by product name..." 
                value={filterProduct} 
                onChange={(e) => setFilterProduct(e.target.value)}
                allowClear
                style={{ width: 250 }}
              />
            </div>
          </div>
        }
        width={850}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        bodyStyle={{ padding: 0 }}
      >
        <div className="p-4 bg-slate-50 min-h-full">
          <Table
            loading={loadingPurchases}
            dataSource={filteredPurchases}
            rowKey="_id"
            pagination={{ pageSize: 15 }}
            expandable={{
              expandedRowRender: (record) => (
                <div className="pl-8 py-2 bg-white rounded shadow-sm border border-slate-100">
                  <div className="font-semibold text-slate-600 mb-2">Products in Invoice:</div>
                  <Table
                    dataSource={record.items || []}
                    columns={[
                      { title: 'Product Name', dataIndex: 'productName', key: 'productName' },
                      { title: 'Batch', dataIndex: 'batchNo', key: 'batchNo' },
                      { title: 'Qty', dataIndex: 'qty', key: 'qty' },
                      { title: 'Rate', dataIndex: 'rate', key: 'rate', render: v => `₹${v}` }
                    ]}
                    pagination={false}
                    size="small"
                    rowKey={(r, i) => i}
                  />
                </div>
              )
            }}
            columns={[
              { title: 'Date', dataIndex: 'invoiceDate', key: 'date' },
              { title: 'Invoice No.', dataIndex: 'invoiceNo', key: 'invoiceNo', render: v => <span className="font-mono text-xs">{v}</span> },
              { title: 'Items', key: 'items', render: (_, r) => (r.items || []).length },
              { title: 'Total', dataIndex: 'grandTotal', key: 'total', render: v => <span className="font-bold">₹{v?.toLocaleString('en-IN')}</span> },
              { title: 'Status', dataIndex: 'status', key: 'status', render: v => <Tag color={v === 'Posted' ? 'green' : v === 'Draft' ? 'orange' : 'default'}>{v}</Tag> },
              { 
                title: 'Action', 
                key: 'action', 
                render: (_, r) => (
                  <Space>
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<Eye size={14} className="text-slate-500 hover:text-indigo-600" />}
                      onClick={() => setPreviewInvoice(r)}
                      title="Preview Invoice"
                    />
                    <Button 
                      type="primary" 
                      size="small" 
                      className="!bg-indigo-600 !border-indigo-600"
                      onClick={() => {
                        setDrawerOpen(false);
                        navigate('/inventory/adjustments', { state: { editInvoiceId: r._id } });
                      }}
                    >
                      Edit
                    </Button>
                  </Space>
                )
              }
            ]}
            locale={{ emptyText: 'No invoices found for this supplier' }}
          />
        </div>
      </Drawer>
      
      <InvoicePreviewModal 
        open={!!previewInvoice} 
        invoice={previewInvoice} 
        onClose={() => setPreviewInvoice(null)} 
      />
    </div>
  );
};

export default SuppliersPage;
