import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, Form, Input, InputNumber, Spin, message } from 'antd';
import { FileText, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { getInvoicesApi, createInvoiceApi } from '../../api/paymentApi';

const InvoiceGeneratorPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([{ product: '', qty: 1, price: 0 }]);
  const [customer, setCustomer] = useState('');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await getInvoicesApi();
      const data = res?.data || (Array.isArray(res) ? res : []);
      setInvoices(data);
    } catch { message.error('Failed to load invoices'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const addItem = () => setItems(prev => [...prev, { product: '', qty: 1, price: 0 }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  const invoiceTotal = items.reduce((s, i) => s + (i.qty * i.price), 0);

  const handleCreate = async () => {
    if (!customer.trim()) { message.warning('Please enter customer name'); return; }
    if (items.some(i => !i.product.trim())) { message.warning('Please fill all product names'); return; }
    setSaving(true);
    try {
      await createInvoiceApi({ customer, items });
      message.success('Invoice created successfully!');
      setModalOpen(false);
      setCustomer('');
      setItems([{ product: '', qty: 1, price: 0 }]);
      fetchInvoices();
    } catch { message.error('Failed to create invoice'); }
    finally { setSaving(false); }
  };

  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.amount || 0), 0);
  const totalUnpaid = invoices.filter(i => i.status === 'Unpaid').reduce((s, i) => s + (i.amount || 0), 0);

  const columns = [
    { title: 'Invoice No', dataIndex: 'invoiceNo', key: 'invoiceNo', render: v => <span className="font-mono font-semibold text-slate-700">{v}</span> },
    { title: 'Customer', dataIndex: 'customer', key: 'customer' },
    { title: 'Items', dataIndex: 'items', key: 'items', render: v => `${(v || []).length} item(s)` },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: v => <span className="font-bold">&#8377;{(v || 0).toLocaleString('en-IN')}</span> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: v => <Tag color={v === 'Paid' ? 'green' : 'gold'}>{v || 'Unpaid'}</Tag> },
    { title: 'Date', dataIndex: 'invoiceDate', key: 'date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '—' },
    { title: 'Action', key: 'action', render: () => <Button size="small" onClick={() => message.info('PDF download coming soon!')}>Download PDF</Button> },
  ];

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={24} className="text-slate-600" />
          <div><h1 className="text-2xl font-bold text-slate-800">Invoice Generator</h1><p className="text-slate-500 text-sm">{invoices.length} invoices generated</p></div>
        </div>
        <div className="flex gap-2">
          <Button icon={<RefreshCw size={16} />} onClick={fetchInvoices}>Refresh</Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)} className="!bg-emerald-600 !border-emerald-600">New Invoice</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-l-4 border-emerald-500 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center"><FileText size={20} className="text-emerald-600" /></div>
          <div><p className="text-slate-500 text-sm">Total Paid</p><p className="text-2xl font-bold text-slate-800">&#8377;{totalPaid.toLocaleString('en-IN')}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-l-4 border-amber-500 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center"><FileText size={20} className="text-amber-600" /></div>
          <div><p className="text-slate-500 text-sm">Total Unpaid</p><p className="text-2xl font-bold text-slate-800">&#8377;{totalUnpaid.toLocaleString('en-IN')}</p></div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table columns={columns} dataSource={invoices} rowKey="_id" pagination={{ pageSize: 10, showTotal: t => `${t} invoices` }} locale={{ emptyText: 'No invoices yet — create one!' }} />
      </div>
      <Modal open={modalOpen} title="Create New Invoice" onCancel={() => setModalOpen(false)} onOk={handleCreate} okText="Create Invoice" okButtonProps={{ loading: saving }} width={600}>
        <div className="mt-4 space-y-4">
          <div><label className="text-sm font-medium text-slate-700">Customer Name *</label><Input className="mt-1" placeholder="Customer or business name" value={customer} onChange={e => setCustomer(e.target.value)} /></div>
          <div>
            <div className="flex justify-between items-center mb-2"><label className="text-sm font-medium text-slate-700">Items</label><Button size="small" icon={<Plus size={14} />} onClick={addItem}>Add Item</Button></div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_100px_auto] gap-2 mb-2 items-center">
                <Input placeholder="Product name" value={item.product} onChange={e => updateItem(i, 'product', e.target.value)} />
                <InputNumber min={1} value={item.qty} onChange={v => updateItem(i, 'qty', v)} placeholder="Qty" className="w-full" />
                <InputNumber min={0} value={item.price} onChange={v => updateItem(i, 'price', v)} placeholder="Price" prefix="₹" className="w-full" />
                {items.length > 1 && <Button size="small" danger icon={<Trash2 size={14} />} onClick={() => removeItem(i)} />}
              </div>
            ))}
            <div className="text-right font-bold text-slate-800 mt-2">Total: &#8377;{invoiceTotal.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default InvoiceGeneratorPage;
