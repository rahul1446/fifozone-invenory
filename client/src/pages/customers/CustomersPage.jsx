import React, { useState, useEffect } from 'react';
import { Table, Input, Select, Button, Tag, Tooltip, Modal } from 'antd';
import { Search, Download, Phone, Mail, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getCustomersApi, exportCustomersApi } from '../../api/customerApi';
import { formatCurrency, formatRelativeTime } from '../../utils/formatters';
import toast from 'react-hot-toast';

const { Option } = Select;



const AVATAR_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 'bg-emerald-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500'];
const getAvatarColor = (name) => AVATAR_COLORS[(name || 'A').charCodeAt(0) % 8];

const CustomersPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('All');
  const [noteModal, setNoteModal] = useState({ open: false, customer: null });
  const [noteText, setNoteText] = useState('');

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await getCustomersApi();
      // Response: { statusCode, data: { customers, total }, message }
      const data = res?.data?.data;
      const arr = Array.isArray(data?.customers) ? data.customers : Array.isArray(data) ? data : null;
      setCustomers(arr || []);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    toast.loading('Preparing export...', { id: 'export' });
    try {
      const response = await exportCustomersApi();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'customers.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Export downloaded successfully', { id: 'export' });
    } catch (err) {
      toast.error('Export failed', { id: 'export' });
    }
  };

  const filtered = customers.filter(c => {
    if (platform !== 'All' && !(c.platforms || []).includes(platform)) return false;
    if (search && !`${c.name} ${c.phone} ${c.email} ${c.city}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const total = customers.length;
  const newThisMonth = customers.filter(c => dayjs(c.createdAt).isSame(dayjs(), 'month')).length;
  const repeatCustomers = customers.filter(c => (c.totalOrders || 0) > 1).length;
  const avgLTV = total > 0 ? Math.round(customers.reduce((s, c) => s + (c.totalSpent || 0), 0) / total) : 0;

  const columns = [
    {
      title: '',
      width: 48,
      render: (_, r) => (
        <div className={`w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-sm ${getAvatarColor(r.name)}`}>
          {(r.name || 'U').substring(0, 2).toUpperCase()}
        </div>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      render: val => <span className="font-semibold text-slate-800">{val || '—'}</span>,
    },
    {
      title: 'Contact',
      render: (_, r) => (
        <div className="flex gap-3">
          {r.phone && (
            <Tooltip title={`WhatsApp: ${r.phone}`}>
              <a
                href={`https://wa.me/91${(r.phone || '').replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:text-emerald-700"
                onClick={e => e.stopPropagation()}
              >
                <Phone size={15} />
              </a>
            </Tooltip>
          )}
          {r.email && (
            <Tooltip title={r.email}>
              <a
                href={`mailto:${r.email}`}
                className="text-blue-600 hover:text-blue-700"
                onClick={e => e.stopPropagation()}
              >
                <Mail size={15} />
              </a>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Location',
      render: (_, r) => (
        <span className="text-slate-500 text-sm">
          {[r.city, r.state].filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    {
      title: 'Platforms',
      dataIndex: 'platforms',
      render: vals => (Array.isArray(vals) ? vals : []).map(v => (
        <Tag key={v} color={v === 'fifozone' ? 'green' : v === 'amazon' ? 'orange' : 'blue'} className="text-[10px]">
          {v.substring(0, 3).toUpperCase()}
        </Tag>
      )),
    },
    {
      title: 'Orders',
      dataIndex: 'totalOrders',
      render: val => <Tag color={val > 1 ? 'blue' : 'default'}>{val || 0}</Tag>,
    },
    {
      title: 'Total Spent',
      dataIndex: 'totalSpent',
      sorter: (a, b) => (a.totalSpent || 0) - (b.totalSpent || 0),
      render: val => <span className="font-bold text-emerald-700">{formatCurrency(val || 0)}</span>,
    },
    {
      title: 'Last Order',
      dataIndex: 'lastOrderDate',
      render: val => <span className="text-xs text-slate-500">{val ? formatRelativeTime(val) : '—'}</span>,
    },
    {
      title: 'Notes',
      render: (_, r) => (
        <div className="flex gap-1.5">
          {r.notes?.length > 0 && (
            <Tooltip title={r.notes[0]?.text}>
              <MessageCircle size={14} className="text-amber-500 cursor-help" />
            </Tooltip>
          )}
          <Button
            size="small"
            className="text-xs"
            onClick={e => { e.stopPropagation(); navigate(`/customers/${r._id}`); }}
          >
            Profile
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
          <p className="text-sm text-slate-500 mt-1">Your customer base across all platforms</p>
        </div>
        <Button icon={<Download size={16} />} onClick={handleExport}>Export CSV</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Customers', value: total, border: 'border-l-slate-400', color: 'text-slate-800' },
          { label: 'New This Month', value: `+${newThisMonth}`, border: 'border-l-blue-500', color: 'text-blue-600' },
          { label: 'Repeat Customers', value: `${repeatCustomers} (${total ? Math.round(repeatCustomers / total * 100) : 0}%)`, border: 'border-l-emerald-500', color: 'text-emerald-600' },
          { label: 'Avg Lifetime Value', value: formatCurrency(avgLTV), border: 'border-l-orange-500', color: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 ${s.border}`}>
            <p className="text-slate-500 text-sm font-medium">{s.label}</p>
            <h3 className={`text-2xl font-bold mt-2 ${s.color}`}>{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-wrap gap-3">
          <Input
            className="w-64"
            placeholder="Search name, phone, email, city..."
            prefix={<Search size={14} className="text-slate-400" />}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Select value={platform} onChange={setPlatform} className="w-40">
            <Option value="All">All Platforms</Option>
            <Option value="fifozone">Fifozone</Option>
            <Option value="amazon">Amazon</Option>
            <Option value="flipkart">Flipkart</Option>
          </Select>
          <Button onClick={() => { setSearch(''); setPlatform('All'); }}>Clear</Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="_id"
          loading={loading}
          onRow={record => ({
            onClick: () => navigate(`/customers/${record._id}`),
            className: 'cursor-pointer hover:bg-slate-50 transition-colors',
          })}
          pagination={{ pageSize: 15, showSizeChanger: false }}
          scroll={{ x: 900 }}
        />
      </div>
    </div>
  );
};

export default CustomersPage;
