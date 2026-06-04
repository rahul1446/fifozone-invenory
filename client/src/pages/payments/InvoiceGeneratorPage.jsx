import React, { useState } from 'react';
import { Table, Tag, Button, Modal, Form, Input, InputNumber, Space } from 'antd';
import { FileText, DollarSign, Download, Plus, Trash2 } from 'lucide-react';

const mockInvoices = [
  { key: '1', invoiceNo: 'INV-2024-001', customer: 'Rajesh Sharma', phone: '9876543210', date: '2024-05-01', items: 'Dog Food (Royal Canin) x2', amount: 2400, status: 'Paid' },
  { key: '2', invoiceNo: 'INV-2024-002', customer: 'Priya Patel', phone: '9123456780', date: '2024-05-03', items: 'Cat Litter x1, Cat Toys x3', amount: 1850, status: 'Paid' },
  { key: '3', invoiceNo: 'INV-2024-003', customer: 'Amit Kumar', phone: '9988776655', date: '2024-05-05', items: 'Pet Grooming Kit x1', amount: 1200, status: 'Unpaid' },
  { key: '4', invoiceNo: 'INV-2024-004', customer: 'Sneha Iyer', phone: '9001122334', date: '2024-05-08', items: 'Pedigree Adult x3', amount: 3600, status: 'Paid' },
  { key: '5', invoiceNo: 'INV-2024-005', customer: 'Vikram Singh', phone: '8877665544', date: '2024-05-10', items: 'Fish Tank Kit x1', amount: 4500, status: 'Paid' },
  { key: '6', invoiceNo: 'INV-2024-006', customer: 'Meena Reddy', phone: '7766554433', date: '2024-05-13', items: 'Whiskas Cat Food x4', amount: 2200, status: 'Unpaid' },
  { key: '7', invoiceNo: 'INV-2024-007', customer: 'Ravi Gupta', phone: '9654321098', date: '2024-05-16', items: 'Dog Leash x2, Collar x2', amount: 980, status: 'Paid' },
  { key: '8', invoiceNo: 'INV-2024-008', customer: 'Ananya Bose', phone: '9321654987', date: '2024-05-20', items: 'Hamster Cage x1, Food x2', amount: 3100, status: 'Unpaid' },
];

const StatCard = ({ title, value, icon: Icon, borderColor, iconBg, iconColor }) => (
  <div className={`bg-white rounded-xl shadow-sm border-l-4 ${borderColor} p-5 flex items-center gap-4`}>
    <div className={`${iconBg} p-3 rounded-full`}>
      <Icon size={22} className={iconColor} />
    </div>
    <div>
      <p className="text-slate-500 text-sm">{title}</p>
      <p className="font-bold text-2xl text-slate-800">{value}</p>
    </div>
  </div>
);

const InvoiceGeneratorPage = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [items, setItems] = useState([{ product: '', qty: 1, price: 0 }]);

  const totalAmount = mockInvoices.reduce((s, i) => s + i.amount, 0);

  const handleAddItem = () => setItems([...items, { product: '', qty: 1, price: 0 }]);
  const handleRemoveItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const handleItemChange = (idx, field, value) => {
    const updated = [...items];
    updated[idx][field] = value;
    setItems(updated);
  };

  const handleGenerate = () => {
    form.validateFields().then(() => {
      setModalOpen(false);
      form.resetFields();
      setItems([{ product: '', qty: 1, price: 0 }]);
    });
  };

  const columns = [
    { title: 'Invoice No', dataIndex: 'invoiceNo', key: 'invoiceNo', render: (v) => <span className="font-mono text-xs font-semibold text-blue-600">{v}</span> },
    { title: 'Customer', dataIndex: 'customer', key: 'customer', render: (v) => <span className="font-medium text-slate-800">{v}</span> },
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Items', dataIndex: 'items', key: 'items', render: (v) => <span className="text-slate-500 text-xs">{v}</span> },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (v) => <span className="font-bold text-slate-800">₹{v.toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={s === 'Paid' ? 'success' : 'error'} className="font-semibold">{s}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      render: () => (
        <Button
          size="small"
          icon={<Download size={14} />}
          className="flex items-center gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
        >
          Download
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Invoice Generator</h1>
          <p className="text-slate-500 mt-1">Create and manage professional invoices</p>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<Plus size={16} />}
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 border-blue-600 hover:bg-blue-700"
        >
          Generate Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StatCard
          title="Total Invoices"
          value={mockInvoices.length}
          icon={FileText}
          borderColor="border-blue-500"
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="Total Invoiced Amount (₹)"
          value={`₹${totalAmount.toLocaleString('en-IN')}`}
          icon={DollarSign}
          borderColor="border-violet-500"
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <Table columns={columns} dataSource={mockInvoices} pagination={{ pageSize: 10 }} scroll={{ x: 800 }} />
      </div>

      <Modal
        title={<span className="text-lg font-bold text-slate-800">Generate New Invoice</span>}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setItems([{ product: '', qty: 1, price: 0 }]); }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="customerName" label="Customer Name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="Enter customer name" />
          </Form.Item>
          <Form.Item name="phone" label="Phone" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="Enter phone number" />
          </Form.Item>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-700">Items</span>
              <Button size="small" icon={<Plus size={12} />} onClick={handleAddItem}>Add Item</Button>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-center">
                <Input
                  placeholder="Product name"
                  value={item.product}
                  onChange={(e) => handleItemChange(idx, 'product', e.target.value)}
                  className="flex-1"
                />
                <InputNumber
                  min={1}
                  value={item.qty}
                  onChange={(v) => handleItemChange(idx, 'qty', v)}
                  placeholder="Qty"
                  style={{ width: 70 }}
                />
                <InputNumber
                  min={0}
                  value={item.price}
                  onChange={(v) => handleItemChange(idx, 'price', v)}
                  placeholder="Price"
                  prefix="₹"
                  style={{ width: 110 }}
                />
                {items.length > 1 && (
                  <Button
                    size="small"
                    danger
                    icon={<Trash2 size={12} />}
                    onClick={() => handleRemoveItem(idx)}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => { setModalOpen(false); form.resetFields(); setItems([{ product: '', qty: 1, price: 0 }]); }}>
              Cancel
            </Button>
            <Button type="primary" onClick={handleGenerate} className="bg-blue-600 border-blue-600">
              Generate Invoice
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default InvoiceGeneratorPage;
