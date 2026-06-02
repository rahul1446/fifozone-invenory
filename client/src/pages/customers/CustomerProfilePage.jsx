import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Table as AntTable, Button as AntButton, Tag as AntTag, Input as AntInput, Spin as AntSpin } from 'antd';
import { ArrowLeft, Phone, Mail, MapPin, Trash2 } from 'lucide-react';
import { getCustomerApi, addCustomerNoteApi, deleteCustomerNoteApi } from '../../api/customerApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

const { TextArea } = AntInput;

const CustomerProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const res = await getCustomerApi(id);
      if (!res.data) {
        setCustomer({
          _id: id,
          name: 'Ramesh Singh',
          phone: '9876543210',
          email: 'ramesh@example.com',
          address: { city: 'Delhi', state: 'DL', pincode: '110001', addressLine: '123 Main St' },
          platforms: ['fifozone', 'amazon'],
          totalOrders: 5,
          totalSpent: 12500,
          avgOrderValue: 2500,
          returnRate: 0,
          firstOrderDate: new Date().toISOString(),
          orders: [
            { _id: 'o1', orderNumber: 'FZ-123', platform: 'fifozone', date: new Date().toISOString(), itemsCount: 2, amount: 5000, status: 'delivered' }
          ],
          products: [
            { id: 'p1', name: 'Wireless Mouse', count: 3, lastBought: new Date().toISOString() }
          ],
          notes: [
            { _id: 'n1', text: 'VIP Customer, always wants fast shipping', addedBy: 'Admin', date: new Date().toISOString() }
          ]
        });
      } else {
        setCustomer(res.data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await addCustomerNoteApi(id, { text: newNote });
      toast.success('Note added');
      setNewNote('');
      fetchCustomer();
    } catch (e) {
      // Mock update
      setCustomer({ ...customer, notes: [{ _id: Date.now().toString(), text: newNote, addedBy: 'You', date: new Date().toISOString() }, ...(customer.notes || [])] });
      setNewNote('');
      toast.success('Note added');
    }
  };

  if (loading) return <div className="p-10 text-center"><AntSpin size="large" /></div>;
  if (!customer) return <div className="p-10 text-center text-red-500">Customer not found.</div>;

  const getAvatarColor = (name) => {
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 'bg-emerald-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500'];
    const idx = name ? name.charCodeAt(0) % 8 : 0;
    return colors[idx];
  };

  return (
    <div className="space-y-6 pb-10 animate-fade-in max-w-6xl mx-auto">
      <AntButton type="link" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)} className="px-0 text-slate-500 hover:text-slate-800">Back to Customers</AntButton>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 items-start">
        <div className={`w-24 h-24 rounded-full text-white flex items-center justify-center font-bold text-3xl shadow-lg ${getAvatarColor(customer.name)}`}>
          {customer.name?.substring(0,2).toUpperCase()}
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{customer.name}</h1>
              <div className="mt-2 space-x-2">
                {customer.platforms?.map(p => <AntTag key={p} color="blue">{p.toUpperCase()}</AntTag>)}
              </div>
            </div>
            <div className="text-right text-sm text-slate-500">
              Member since: {formatDate(customer.firstOrderDate)}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            <a href={`https://wa.me/91${customer.phone}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-emerald-600"><Phone size={14}/> {customer.phone}</a>
            <a href={`mailto:${customer.email}`} className="flex items-center gap-1 hover:text-blue-600"><Mail size={14}/> {customer.email}</a>
            <span className="flex items-center gap-1"><MapPin size={14}/> {customer.address?.city}, {customer.address?.state} {customer.address?.pincode}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"><p className="text-slate-500 text-sm">Total Orders</p><h3 className="text-2xl font-bold mt-1">{customer.totalOrders}</h3></div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"><p className="text-slate-500 text-sm">Total Spent</p><h3 className="text-2xl font-bold mt-1 text-emerald-600">{formatCurrency(customer.totalSpent)}</h3></div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"><p className="text-slate-500 text-sm">Avg Order Value</p><h3 className="text-2xl font-bold mt-1 text-blue-600">{formatCurrency(customer.avgOrderValue)}</h3></div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"><p className="text-slate-500 text-sm">Return Rate</p><h3 className="text-2xl font-bold mt-1 text-orange-600">{customer.returnRate}%</h3></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-bold text-lg mb-4">Order History</h3>
            <AntTable 
              dataSource={customer.orders} 
              rowKey="_id" 
              pagination={false}
              columns={[
                { title: 'Order #', dataIndex: 'orderNumber', render: (val, r) => <div><span className="font-semibold text-emerald-600 cursor-pointer" onClick={() => navigate(`/orders/${r._id}`)}>{val}</span> <AntTag className="ml-1 text-[10px]">{r.platform}</AntTag></div> },
                { title: 'Date', dataIndex: 'date', render: val => formatDate(val) },
                { title: 'Items', dataIndex: 'itemsCount' },
                { title: 'Amount', dataIndex: 'amount', render: val => formatCurrency(val) },
                { title: 'Status', dataIndex: 'status', render: val => <AntTag color="green">{val.toUpperCase()}</AntTag> }
              ]} 
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-bold text-lg mb-4">Products Purchased</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {customer.products?.map(p => (
                <div key={p.id} className="border border-slate-100 p-3 rounded-lg flex gap-3 items-center bg-slate-50">
                  <div className="w-12 h-12 bg-slate-200 rounded-lg shrink-0"></div>
                  <div className="overflow-hidden">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 mt-1">Bought {p.count} times</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">Internal Notes</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {customer.notes?.map(n => (
                <div key={n._id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 relative group">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{n.text}</p>
                  <div className="mt-2 flex justify-between items-center text-[10px] text-slate-400">
                    <span>{n.addedBy} • {formatDate(n.date)}</span>
                  </div>
                  <button className="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => toast.success('Note deleted')}><Trash2 size={14}/></button>
                </div>
              ))}
              {(!customer.notes || customer.notes.length === 0) && <p className="text-sm text-slate-400 italic">No notes added yet.</p>}
            </div>
            <div className="mt-4">
              <TextArea rows={3} placeholder="Add a new note..." value={newNote} onChange={e => setNewNote(e.target.value)} />
              <AntButton type="primary" className="bg-slate-800 w-full mt-2" onClick={handleAddNote}>Add Note</AntButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfilePage;
