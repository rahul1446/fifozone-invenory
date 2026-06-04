import React, { useState } from 'react';
import { Table, Tag, Button, Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { ShoppingCart, IndianRupee, Clock, Plus, Eye } from 'lucide-react';

const { Option } = Select;

const mockSuppliers = ['Venkys India Ltd', 'Royal Canin India', 'Mars Petcare', 'Himalaya Herbal', 'Drools Pet Food'];
const mockProducts  = ['Royal Canin Adult Dog 3kg', 'Drools Chicken & Egg 1kg', 'Himalaya Erina EP 200ml', 'Fipnil Plus L 1ml', 'Drontal Puppy Liquid'];

const mockData = [
  { key: '1', date: '2026-06-01', invoice: 'INV-1001', supplier: 'Royal Canin India', product: 'Royal Canin Adult Dog 3kg', qty: 50, unitCost: 1200, total: 60000, status: 'Paid' },
  { key: '2', date: '2026-06-01', invoice: 'INV-1002', supplier: 'Drools Pet Food', product: 'Drools Chicken & Egg 1kg', qty: 100, unitCost: 320, total: 32000, status: 'Pending' },
  { key: '3', date: '2026-05-30', invoice: 'INV-0998', supplier: 'Himalaya Herbal', product: 'Himalaya Erina EP 200ml', qty: 80, unitCost: 185, total: 14800, status: 'Paid' },
  { key: '4', date: '2026-05-29', invoice: 'INV-0995', supplier: 'Venkys India Ltd', product: 'Fipnil Plus L 1ml', qty: 200, unitCost: 95, total: 19000, status: 'Pending' },
  { key: '5', date: '2026-05-28', invoice: 'INV-0990', supplier: 'Mars Petcare', product: 'Whiskas Tuna 85g x12', qty: 60, unitCost: 540, total: 32400, status: 'Paid' },
  { key: '6', date: '2026-05-27', invoice: 'INV-0985', supplier: 'Royal Canin India', product: 'Royal Canin Kitten 2kg', qty: 40, unitCost: 1450, total: 58000, status: 'Paid' },
  { key: '7', date: '2026-05-25', invoice: 'INV-0980', supplier: 'Drools Pet Food', product: 'Drools Focus Adult 3kg', qty: 70, unitCost: 480, total: 33600, status: 'Pending' },
  { key: '8', date: '2026-05-24', invoice: 'INV-0975', supplier: 'Himalaya Herbal', product: 'Himalaya Skin Cream 50g', qty: 120, unitCost: 145, total: 17400, status: 'Paid' },
  { key: '9', date: '2026-05-22', invoice: 'INV-0970', supplier: 'Venkys India Ltd', product: 'Drontal Puppy Liquid 30ml', qty: 150, unitCost: 210, total: 31500, status: 'Paid' },
  { key: '10', date: '2026-05-20', invoice: 'INV-0965', supplier: 'Mars Petcare', product: 'Pedigree Adult Chicken 3kg', qty: 90, unitCost: 380, total: 34200, status: 'Pending' },
];

const totalValue   = mockData.reduce((s, r) => s + r.total, 0);
const pendingValue = mockData.filter(r => r.status === 'Pending').reduce((s, r) => s + r.total, 0);

const PurchasesPage = () => {
  const [data, setData] = useState(mockData);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    try {
      const vals = await form.validateFields();
      setSaving(true);
      await new Promise(r => setTimeout(r, 600));
      const newRow = {
        key: Date.now().toString(),
        date: new Date().toISOString().slice(0, 10),
        invoice: vals.invoiceNo,
        supplier: vals.supplier,
        product: vals.product,
        qty: vals.qty,
        unitCost: vals.unitCost,
        total: vals.qty * vals.unitCost,
        status: 'Pending',
      };
      setData(prev => [newRow, ...prev]);
      message.success('Purchase recorded successfully!');
      form.resetFields();
      setModalOpen(false);
    } catch (_) {}
    finally { setSaving(false); }
  };

  const columns = [
    { title: 'Purchase Date', dataIndex: 'date', key: 'date', render: v => <span className="text-slate-500 text-sm">{v}</span> },
    { title: 'Invoice No', dataIndex: 'invoice', key: 'invoice', render: v => <span className="font-mono text-sm font-semibold text-slate-700">{v}</span> },
    { title: 'Supplier', dataIndex: 'supplier', key: 'supplier' },
    { title: 'Product', dataIndex: 'product', key: 'product', width: 220 },
    { title: 'Qty', dataIndex: 'qty', key: 'qty', align: 'right' },
    { title: 'Unit Cost', dataIndex: 'unitCost', key: 'unitCost', align: 'right', render: v => <span>&#8377;{v.toLocaleString('en-IN')}</span> },
    { title: 'Total', dataIndex: 'total', key: 'total', align: 'right', render: v => <span className="font-bold text-slate-800">&#8377;{v.toLocaleString('en-IN')}</span> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: v => <Tag color={v === 'Paid' ? 'green' : 'gold'}>{v}</Tag> },
    { title: 'Action', key: 'action', render: () => <Button size="small" icon={<Eye size={14} />} onClick={() => message.info('Detail view coming soon!')}>View</Button> },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Purchase Management</h1>
          <p className="text-slate-500 text-sm mt-1">Record and track purchases from suppliers</p>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)} className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600">New Purchase</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Purchases', value: data.length, icon: <ShoppingCart size={20} className="text-blue-600" />, border: 'border-blue-500', bg: 'bg-blue-50' },
          { label: 'Total Purchase Value', value: `\u20b9${totalValue.toLocaleString('en-IN')}`, icon: <IndianRupee size={20} className="text-violet-600" />, border: 'border-violet-500', bg: 'bg-violet-50' },
          { label: 'Pending Payments', value: `\u20b9${pendingValue.toLocaleString('en-IN')}`, icon: <Clock size={20} className="text-amber-600" />, border: 'border-amber-500', bg: 'bg-amber-50' },
        ].map(card => (
          <div key={card.label} className={`bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 ${card.border} p-5 flex items-center gap-4`}>
            <div className={`w-11 h-11 rounded-full ${card.bg} flex items-center justify-center flex-shrink-0`}>{card.icon}</div>
            <div>
              <p className="text-slate-500 text-sm">{card.label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-0.5">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table columns={columns} dataSource={data} pagination={{ pageSize: 10, showTotal: t => `${t} records` }} scroll={{ x: 900 }} />
      </div>

      <Modal open={modalOpen} title="Record New Purchase" onCancel={() => { setModalOpen(false); form.resetFields(); }} onOk={handleAdd} okText="Record Purchase" okButtonProps={{ loading: saving }} width={520}>
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="supplier" label="Supplier" rules={[{ required: true }]}>
            <Select placeholder="Select supplier">{mockSuppliers.map(s => <Option key={s} value={s}>{s}</Option>)}</Select>
          </Form.Item>
          <Form.Item name="product" label="Product" rules={[{ required: true }]}>
            <Select placeholder="Select product">{mockProducts.map(p => <Option key={p} value={p}>{p}</Option>)}</Select>
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="qty" label="Quantity" rules={[{ required: true }]}><InputNumber min={1} className="w-full" /></Form.Item>
            <Form.Item name="unitCost" label="Unit Cost (Rs)" rules={[{ required: true }]}><InputNumber min={0} className="w-full" /></Form.Item>
          </div>
          <Form.Item name="invoiceNo" label="Invoice Number" rules={[{ required: true }]}><Input placeholder="e.g. INV-1050" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PurchasesPage;
