import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, Form, Input, InputNumber, Select, Spin, message } from 'antd';
import { Users, MapPin, Phone, Mail, Plus, RefreshCw } from 'lucide-react';
import { getSuppliersApi, createSupplierApi } from '../../api/inventoryApi';

const { Option } = Select;

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await getSuppliersApi();
      const data = res?.data || (Array.isArray(res) ? res : []);
      setSuppliers(data);
    } catch { message.error('Failed to load suppliers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleAdd = async () => {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      await createSupplierApi(vals);
      message.success('Supplier added successfully!');
      form.resetFields();
      setModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      if (err?.response) message.error(err.response.data?.message || 'Failed to add supplier');
    } finally { setSaving(false); }
  };

  const columns = [
    { title: 'Supplier Name', dataIndex: 'name', key: 'name', render: v => <span className="font-semibold text-slate-800">{v}</span> },
    { title: 'Contact Person', dataIndex: 'contactPerson', key: 'contact', render: v => v || '—' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: v => v ? <span className="flex items-center gap-1"><Phone size={13} className="text-slate-400" />{v}</span> : '—' },
    { title: 'Email', dataIndex: 'email', key: 'email', render: v => v ? <span className="flex items-center gap-1"><Mail size={13} className="text-slate-400" />{v}</span> : '—' },
    { title: 'City', dataIndex: 'city', key: 'city', render: (v, r) => v ? <span className="flex items-center gap-1"><MapPin size={13} className="text-slate-400" />{v}{r.state ? `, ${r.state}` : ''}</span> : '—' },
    { title: 'Products', dataIndex: 'productsSupplied', key: 'products', align: 'center', render: v => <span className="font-semibold text-slate-700">{v || 0}</span> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: v => <Tag color={v === 'Active' ? 'green' : 'default'}>{v || 'Active'}</Tag> },
  ];

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-slate-600" />
          <div><h1 className="text-2xl font-bold text-slate-800">Suppliers</h1><p className="text-slate-500 text-sm">{suppliers.length} suppliers registered</p></div>
        </div>
        <div className="flex gap-2">
          <Button icon={<RefreshCw size={16} />} onClick={fetchSuppliers}>Refresh</Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)} className="!bg-emerald-600 !border-emerald-600">Add Supplier</Button>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table columns={columns} dataSource={suppliers} rowKey="_id" pagination={{ pageSize: 20, showTotal: t => `${t} suppliers` }} scroll={{ x: 900 }} locale={{ emptyText: 'No suppliers found' }} />
      </div>
      <Modal open={modalOpen} title="Add New Supplier" onCancel={() => { setModalOpen(false); form.resetFields(); }} onOk={handleAdd} okText="Add Supplier" okButtonProps={{ loading: saving, className: '!bg-emerald-600 !border-emerald-600' }} width={520}>
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="Supplier Name" rules={[{ required: true }]}><Input placeholder="e.g. Royal Canin India" /></Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="contactPerson" label="Contact Person"><Input placeholder="Full name" /></Form.Item>
            <Form.Item name="phone" label="Phone"><Input placeholder="9XXXXXXXXX" /></Form.Item>
          </div>
          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Enter valid email' }]}><Input placeholder="supplier@example.com" /></Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="city" label="City"><Input placeholder="Mumbai" /></Form.Item>
            <Form.Item name="state" label="State"><Input placeholder="Maharashtra" /></Form.Item>
          </div>
          <Form.Item name="status" label="Status" initialValue="Active"><Select><Option value="Active">Active</Option><Option value="Inactive">Inactive</Option></Select></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
export default SuppliersPage;
