import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, Form, Input, InputNumber, Select, Spin, message } from 'antd';
import { ShoppingCart, IndianRupee, Clock, Plus, RefreshCw } from 'lucide-react';
import { getPurchasesApi, createPurchaseApi } from '../../api/inventoryApi';

const { Option } = Select;

const PurchasesPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await getPurchasesApi();
      const purchases = res?.data || (Array.isArray(res) ? res : []);
      setData(purchases);
    } catch { message.error('Failed to load purchases'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPurchases(); }, []);

  const handleAdd = async () => {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      await createPurchaseApi(vals);
      message.success('Purchase recorded successfully!');
      form.resetFields();
      setModalOpen(false);
      fetchPurchases();
    } catch (err) {
      if (err?.response) message.error(err.response.data?.message || 'Failed to record purchase');
    } finally { setSaving(false); }
  };

  const totalValue = data.reduce((s, r) => s + (r.total || 0), 0);
  const pendingValue = data.filter(r => r.status === 'Pending').reduce((s, r) => s + (r.total || 0), 0);

  const columns = [
    { title: 'Purchase Date', dataIndex: 'purchaseDate', key: 'date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { title: 'Invoice No', dataIndex: 'invoiceNo', key: 'invoice', render: v => <span className="font-mono text-sm font-semibold text-slate-700">{v}</span> },
    { title: 'Supplier', dataIndex: 'supplier', key: 'supplier' },
    { title: 'Product', dataIndex: 'product', key: 'product', width: 220 },
    { title: 'Qty', dataIndex: 'qty', key: 'qty', align: 'right' },
    { title: 'Unit Cost', dataIndex: 'unitCost', key: 'unitCost', align: 'right', render: v => <span>&#8377;{(v || 0).toLocaleString('en-IN')}</span> },
    { title: 'Total', dataIndex: 'total', key: 'total', align: 'right', render: v => <span className="font-bold text-slate-800">&#8377;{(v || 0).toLocaleString('en-IN')}</span> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: v => <Tag color={v === 'Paid' ? 'green' : 'gold'}>{v || 'Pending'}</Tag> },
  ];

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Purchase Management</h1><p className="text-slate-500 text-sm mt-1">Record and track supplier purchases</p></div>
        <div className="flex gap-2">
          <Button icon={<RefreshCw size={16} />} onClick={fetchPurchases}>Refresh</Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)} className="!bg-emerald-600 !border-emerald-600">New Purchase</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Purchases', value: data.length, icon: <ShoppingCart size={20} className="text-blue-600" />, border: 'border-blue-500', bg: 'bg-blue-50' },
          { label: 'Total Purchase Value', value: `\u20b9${totalValue.toLocaleString('en-IN')}`, icon: <IndianRupee size={20} className="text-violet-600" />, border: 'border-violet-500', bg: 'bg-violet-50' },
          { label: 'Pending Payments', value: `\u20b9${pendingValue.toLocaleString('en-IN')}`, icon: <Clock size={20} className="text-amber-600" />, border: 'border-amber-500', bg: 'bg-amber-50' },
        ].map(card => (
          <div key={card.label} className={`bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 ${card.border} p-5 flex items-center gap-4`}>
            <div className={`w-11 h-11 rounded-full ${card.bg} flex items-center justify-center flex-shrink-0`}>{card.icon}</div>
            <div><p className="text-slate-500 text-sm">{card.label}</p><p className="text-2xl font-bold text-slate-800 mt-0.5">{card.value}</p></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table columns={columns} dataSource={data} rowKey="_id" pagination={{ pageSize: 10, showTotal: t => `${t} records` }} scroll={{ x: 900 }} locale={{ emptyText: 'No purchase records found' }} />
      </div>
      <Modal open={modalOpen} title="Record New Purchase" onCancel={() => { setModalOpen(false); form.resetFields(); }} onOk={handleAdd} okText="Record Purchase" okButtonProps={{ loading: saving }} width={520}>
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="supplier" label="Supplier" rules={[{ required: true }]}><Input placeholder="e.g. Royal Canin India" /></Form.Item>
          <Form.Item name="product" label="Product" rules={[{ required: true }]}><Input placeholder="e.g. Royal Canin Adult Dog 3kg" /></Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="qty" label="Quantity" rules={[{ required: true }]}><InputNumber min={1} className="w-full" /></Form.Item>
            <Form.Item name="unitCost" label="Unit Cost (Rs)" rules={[{ required: true }]}><InputNumber min={0} className="w-full" /></Form.Item>
          </div>
          <Form.Item name="invoiceNo" label="Invoice Number" rules={[{ required: true }]}><Input placeholder="e.g. INV-1050" /></Form.Item>
          <Form.Item name="status" label="Payment Status" initialValue="Pending">
            <Select><Option value="Pending">Pending</Option><Option value="Paid">Paid</Option></Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
export default PurchasesPage;
