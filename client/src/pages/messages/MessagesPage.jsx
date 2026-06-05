import React, { useState, useEffect } from 'react';
import { Table, Input, Select, DatePicker, Button, Tag, Modal, Spin, Tooltip, Alert } from 'antd';
import { Search, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getMessagesApi, getMessageThreadApi, replyToMessageApi,
  markMessageReadApi, getTemplatesApi, createTemplateApi
} from '../../api/messageApi';
import { formatDate } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;



const MessagesPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ platform: 'All', status: 'All', type: 'All', search: '' });
  const debouncedSearch = useDebounce(filters.search, 500);

  const [selectedMessage, setSelectedMessage] = useState(null);
  const [threadModalOpen, setThreadModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  const [templates, setTemplates] = useState([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ title: '', body: '', platforms: ['all'] });
  const [sendingReply, setSendingReply] = useState(false);

  const unreadCount = messages.filter(m => m.status === 'unread').length;
  const repliedToday = messages.filter(m => m.status === 'replied' && dayjs(m.updatedAt || m.receivedAt).isSame(dayjs(), 'day')).length;
  const pendingReply = messages.filter(m => m.status === 'pending').length;

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.platform, filters.status, filters.type, debouncedSearch]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.platform && filters.platform !== 'All') params.platform = filters.platform;
      if (filters.status && filters.status !== 'All') params.status = filters.status;
      if (filters.type && filters.type !== 'All') params.type = filters.type;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await getMessagesApi(params);
      // Response shape: { statusCode, data: { messages, total }, message }
      const data = res?.data?.data;
      const msgArray = Array.isArray(data?.messages) ? data.messages : Array.isArray(data) ? data : null;
      setMessages(msgArray || []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await getTemplatesApi();
      const data = res?.data?.data;
      const arr = Array.isArray(data) ? data : Array.isArray(data?.templates) ? data.templates : null;
      setTemplates(arr || []);
    } catch {
      setTemplates([]);
    }
  };

  // Check if a message ID is a real MongoDB ObjectId (24 hex chars) or a mock string ID
  const isRealDbId = (id) => /^[a-f\d]{24}$/i.test(String(id));

  const handleOpenThread = async (record) => {
    setSelectedMessage(record);
    setThreadModalOpen(true);
    setReplyText('');

    if (!isRealDbId(record._id)) return; // No thread API call needed for non-DB IDs

    try {
      const res = await getMessageThreadApi(record._id);
      const thread = res?.data?.data;
      if (thread) setSelectedMessage(thread);
      if (record.status === 'unread') {
        await markMessageReadApi(record._id).catch(() => {});
        setMessages(prev => prev.map(m => m._id === record._id ? { ...m, status: 'read' } : m));
      }
    } catch {
      // keep existing record data — that's fine
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setSendingReply(true);

    const newMsg = {
      sender: 'seller',
      senderName: 'Fifozone Support',
      body: replyText,
      timestamp: new Date().toISOString(),
    };

    if (!isRealDbId(selectedMessage._id)) {
      setSelectedMessage(prev => ({
        ...prev,
        status: 'replied',
        threadMessages: [...(prev.threadMessages || []), newMsg],
      }));
      setMessages(prev => prev.map(m =>
        m._id === selectedMessage._id ? { ...m, status: 'replied' } : m
      ));
      setReplyText('');
      setSendingReply(false);
      toast.success('Reply sent successfully!');
      return;
    }

    // ── Real DB message ──────────────────────────────────────────────────────
    try {
      await replyToMessageApi(selectedMessage._id, { body: replyText });
      setSelectedMessage(prev => ({
        ...prev,
        status: 'replied',
        threadMessages: [...(prev.threadMessages || []), newMsg],
      }));
      setMessages(prev => prev.map(m =>
        m._id === selectedMessage._id ? { ...m, status: 'replied' } : m
      ));
      setReplyText('');
      toast.success('Reply sent successfully!');
    } catch (err) {
      console.error('Reply error:', err?.response?.data || err.message);
      toast.error(err?.response?.data?.message || 'Failed to send reply. Please try again.');
    } finally {
      setSendingReply(false);
    }
  };

  const filteredMessages = messages.filter(m => {
    if (filters.platform !== 'All' && m.platform !== filters.platform) return false;
    if (filters.status !== 'All' && m.status !== filters.status) return false;
    if (filters.search && !`${m.customerName} ${m.subject} ${m.orderNumber || ''}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const platformColors = { fifozone: 'green', amazon: 'orange', flipkart: 'blue' };
  const statusColors = { unread: 'red', read: 'default', replied: 'green', pending: 'orange', closed: 'default' };

  const columns = [
    {
      title: 'Platform',
      dataIndex: 'platform',
      width: 100,
      render: val => <Tag color={platformColors[val?.toLowerCase()] || 'default'}>{val?.toUpperCase()}</Tag>,
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      render: (val, record) => <span className={record.status === 'unread' ? 'font-bold text-slate-900' : 'text-slate-600'}>{val || '—'}</span>,
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      render: val => (
        <Tooltip title={val}>
          <span className="text-slate-700">{val?.length > 55 ? val.substring(0, 55) + '...' : val}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      render: val => val
        ? <span className="text-emerald-600 cursor-pointer font-mono text-xs" onClick={e => { e.stopPropagation(); navigate('/orders'); }}>{val}</span>
        : <span className="text-slate-300">—</span>,
    },
    {
      title: 'Received',
      dataIndex: 'receivedAt',
      render: val => <span className="text-xs text-slate-500">{formatDate(val)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: val => <Tag color={statusColors[val] || 'default'}>{val?.toUpperCase()}</Tag>,
    },
    {
      title: 'Response Time',
      render: (_, record) => {
        const hrs = dayjs().diff(dayjs(record.receivedAt), 'hour');
        const isLate = record.platform === 'amazon' && hrs > 20 && record.status !== 'replied';
        return (
          <span className={isLate ? 'text-red-500 font-bold' : 'text-slate-500 text-xs'}>
            {hrs}h {isLate && '⚠️'}
          </span>
        );
      },
    },
    {
      title: 'Actions',
      width: 90,
      render: (_, record) => (
        <Button
          size="small"
          type="primary"
          className="bg-emerald-600 border-emerald-600 text-xs"
          onClick={e => { e.stopPropagation(); handleOpenThread(record); }}
        >
          Reply
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Messages & Queries</h1>
          <p className="text-sm text-slate-500 mt-1">Manage customer messages from Fifozone, Amazon & Flipkart</p>
        </div>
        <Button onClick={() => setTemplateModalOpen(true)}>Manage Templates</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Unread', value: unreadCount, border: 'border-l-red-500', color: 'text-red-500' },
          { label: 'Replied Today', value: repliedToday, border: 'border-l-emerald-500', color: 'text-emerald-600' },
          { label: 'Pending Reply', value: pendingReply, border: 'border-l-orange-500', color: 'text-orange-600' },
          { label: 'Avg Response Time', value: '3.2 hrs', border: 'border-l-blue-500', color: 'text-slate-800' },
        ].map(s => (
          <div key={s.label} className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 ${s.border}`}>
            <p className="text-slate-500 text-sm font-medium">{s.label}</p>
            <h3 className={`text-3xl font-bold mt-2 ${s.color}`}>{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-wrap gap-3">
          <Input
            className="w-56"
            placeholder="Search customer, subject, order..."
            prefix={<Search size={14} className="text-slate-400" />}
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
          <Select value={filters.platform} onChange={v => setFilters(f => ({ ...f, platform: v }))} className="w-40">
            <Option value="All">All Platforms</Option>
            <Option value="fifozone">Fifozone</Option>
            <Option value="amazon">Amazon</Option>
            <Option value="flipkart">Flipkart</Option>
          </Select>
          <Select value={filters.status} onChange={v => setFilters(f => ({ ...f, status: v }))} className="w-36">
            <Option value="All">All Status</Option>
            <Option value="unread">Unread</Option>
            <Option value="read">Read</Option>
            <Option value="replied">Replied</Option>
            <Option value="pending">Pending</Option>
          </Select>
          <Button onClick={() => setFilters({ platform: 'All', status: 'All', type: 'All', search: '' })}>Clear</Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <Table
          columns={columns}
          dataSource={filteredMessages}
          rowKey="_id"
          loading={loading}
          onRow={record => ({
            onClick: () => handleOpenThread(record),
            className: `cursor-pointer hover:bg-slate-50 transition-colors ${record.status === 'unread' ? 'bg-blue-50/40' : ''}`,
          })}
          pagination={{ pageSize: 15, showSizeChanger: false }}
          scroll={{ x: 900 }}
        />
      </div>

      {/* Thread Modal */}
      <Modal
        open={threadModalOpen}
        onCancel={() => { setThreadModalOpen(false); setReplyText(''); }}
        width={780}
        footer={null}
        title={null}
        styles={{ body: { padding: 0 } }}
      >
        {selectedMessage && (
          <div className="flex flex-col" style={{ height: '82vh' }}>
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 mb-1">
                <Tag color={platformColors[selectedMessage.platform]}>{selectedMessage.platform?.toUpperCase()}</Tag>
                <span className="font-bold text-lg text-slate-800">{selectedMessage.customerName}</span>
              </div>
              <p className="text-slate-500 text-sm">{selectedMessage.subject}</p>
              {selectedMessage.orderNumber && (
                <p className="text-xs text-emerald-600 mt-0.5">Order: {selectedMessage.orderNumber}</p>
              )}
            </div>

            {/* Amazon SLA Warning */}
            {selectedMessage.platform === 'amazon' && dayjs().diff(dayjs(selectedMessage.receivedAt), 'hour') > 20 && selectedMessage.status !== 'replied' && (
              <div className="p-3 bg-orange-50 border-b border-orange-200">
                <Alert
                  type="warning"
                  showIcon
                  message={`Amazon 24-Hour SLA: ${dayjs().diff(dayjs(selectedMessage.receivedAt), 'hour')} hours elapsed — Reply immediately to avoid penalty.`}
                  banner
                />
              </div>
            )}

            {/* Chat thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {(selectedMessage.threadMessages || []).map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'seller' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 ${msg.sender === 'seller' ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'}`}>
                    <p className="text-[11px] font-semibold mb-1 opacity-70">{msg.senderName}</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                    <p className={`text-[10px] mt-1.5 text-right ${msg.sender === 'seller' ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {formatDate(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              {(!selectedMessage.threadMessages || selectedMessage.threadMessages.length === 0) && (
                <p className="text-center text-slate-400 text-sm mt-10">No messages in thread yet.</p>
              )}
            </div>

            {/* Reply Box */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="flex gap-2 mb-2">
                <Select
                  placeholder="Use a template..."
                  className="w-64"
                  allowClear
                  onChange={v => {
                    const t = templates.find(x => x._id === v);
                    if (t) setReplyText(t.body);
                  }}
                >
                  {templates.map(t => <Option key={t._id} value={t._id}>{t.title}</Option>)}
                </Select>
              </div>
              <TextArea
                rows={4}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Type your reply here..."
                className="mb-2"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">{replyText.length} chars</span>
                <Button
                  type="primary"
                  className="bg-emerald-600 border-emerald-600"
                  icon={<Send size={14} />}
                  loading={sendingReply}
                  onClick={handleSendReply}
                  disabled={!replyText.trim()}
                >
                  Send Reply
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Templates Modal */}
      <Modal
        title="Manage Reply Templates"
        open={templateModalOpen}
        onCancel={() => setTemplateModalOpen(false)}
        footer={null}
        width={600}
      >
        <div className="space-y-4 mt-2">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="font-semibold mb-3 text-slate-700">Add New Template</h4>
            <Input
              placeholder="Template title"
              className="mb-2"
              value={newTemplate.title}
              onChange={e => setNewTemplate(t => ({ ...t, title: e.target.value }))}
            />
            <TextArea
              rows={3}
              placeholder="Template message body..."
              className="mb-2"
              value={newTemplate.body}
              onChange={e => setNewTemplate(t => ({ ...t, body: e.target.value }))}
            />
            <Button
              type="primary"
              className="bg-emerald-600 w-full"
              onClick={async () => {
                if (!newTemplate.title || !newTemplate.body) return;
                try {
                  await createTemplateApi(newTemplate);
                  toast.success('Template saved!');
                  fetchTemplates();
                  setNewTemplate({ title: '', body: '', platforms: ['all'] });
                } catch {
                  // Optimistic add
                  setTemplates(prev => [...prev, { _id: Date.now().toString(), ...newTemplate }]);
                  setNewTemplate({ title: '', body: '', platforms: ['all'] });
                  toast.success('Template saved locally!');
                }
              }}
            >
              Save Template
            </Button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {templates.map(t => (
              <div key={t._id} className="p-3 bg-white border border-slate-100 rounded-xl flex justify-between items-start shadow-sm hover:border-slate-300 transition-colors">
                <div className="flex-1 mr-3">
                  <p className="font-semibold text-sm text-slate-800">{t.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MessagesPage;
