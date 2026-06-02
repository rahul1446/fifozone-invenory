import React, { useState, useEffect, useCallback } from 'react';
import { Table, Input, Select, Button, Tag, Modal, Tooltip, Rate, Badge, Empty, Spin } from 'antd';
import { Search, Star, MessageCircle, AlertTriangle, Flag, Eye, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { getReviewsApi, replyToReviewApi, flagReviewApi, markReviewReadApi } from '../../api/reviewApi';
import { formatDate } from '../../utils/formatters';

const { Option } = Select;
const { TextArea } = Input;

const platformColor = { fifozone: 'green', amazon: 'orange', flipkart: 'blue' };
const ratingColor   = (r) => r >= 4 ? '#10b981' : r === 3 ? '#f59e0b' : '#ef4444';

const StarRow = ({ rating }) => (
  <div className="flex items-center gap-1">
    {[1,2,3,4,5].map(i => (
      <Star key={i} size={13} fill={i <= rating ? '#f59e0b' : 'none'}
        stroke={i <= rating ? '#f59e0b' : '#cbd5e1'} />
    ))}
    <span className="text-xs text-slate-500 ml-1">{rating}/5</span>
  </div>
);

const ReviewsPage = () => {
  const [reviews,       setReviews]       = useState([]);
  const [total,         setTotal]         = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [page,          setPage]          = useState(1);
  const [filters,       setFilters]       = useState({ platform: '', rating: '', search: '' });
  const [pendingSearch, setPendingSearch] = useState('');

  const [selected,   setSelected]   = useState(null);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [replyText,  setReplyText]  = useState('');
  const [replying,   setReplying]   = useState(false);

  // ── Stats (computed from loaded data) ──────────────────────────────────────
  const fiveStar  = reviews.filter(r => r.rating === 5).length;
  const lowStar   = reviews.filter(r => r.rating <= 2).length;
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchReviews = useCallback(async (pg = 1, f = filters) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: 15 };
      if (f.platform) params.platform = f.platform;
      if (f.rating)   params.rating   = f.rating;
      if (f.search)   params.search   = f.search;

      const res = await getReviewsApi(params);

      // API wraps: { statusCode, data: { reviews, total }, message }
      const payload = res?.data?.data || res?.data || {};
      const list    = payload.reviews ?? payload ?? [];
      const cnt     = payload.total   ?? (Array.isArray(list) ? list.length : 0);

      setReviews(Array.isArray(list) ? list : []);
      setTotal(cnt);
      setPage(pg);
    } catch (err) {
      console.error('Reviews fetch error:', err);
      toast.error('Failed to load reviews');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchReviews(1, filters); }, []); // eslint-disable-line

  const applyFilters = () => {
    const f = { ...filters, search: pendingSearch };
    setFilters(f);
    fetchReviews(1, f);
  };

  const clearFilters = () => {
    const f = { platform: '', rating: '', search: '' };
    setPendingSearch('');
    setFilters(f);
    fetchReviews(1, f);
  };

  // ── Reply ──────────────────────────────────────────────────────────────────
  const handleReply = async () => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await replyToReviewApi(selected._id, { reply: replyText });
      toast.success('Reply posted successfully!');
      setModalOpen(false);
      fetchReviews(page, filters);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to post reply');
    } finally {
      setReplying(false);
    }
  };

  // ── Flag ───────────────────────────────────────────────────────────────────
  const handleFlag = async (record) => {
    try {
      await flagReviewApi(record._id);
      toast.success(record.isFlagged ? 'Review unflagged' : 'Review flagged');
      fetchReviews(page, filters);
    } catch { toast.error('Action failed'); }
  };

  // ── Mark read on open ──────────────────────────────────────────────────────
  const openReview = async (record) => {
    setSelected(record);
    setReplyText(record.reply || '');
    setModalOpen(true);
    if (!record.isRead) {
      try { await markReviewReadApi(record._id); } catch {}
    }
  };

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Platform', dataIndex: 'platform', width: 100,
      render: v => <Tag color={platformColor[v?.toLowerCase()] || 'default'}>{(v || '').toUpperCase()}</Tag>,
    },
    {
      title: 'Product', dataIndex: 'productName', ellipsis: true,
      render: v => <span className="font-medium text-slate-700 text-sm">{v || '—'}</span>,
    },
    {
      title: 'Customer', dataIndex: 'customerName', width: 130,
      render: v => <span className="text-sm text-slate-600">{v || 'Anonymous'}</span>,
    },
    {
      title: 'Rating', dataIndex: 'rating', width: 150,
      render: v => <StarRow rating={v} />,
      sorter: (a, b) => a.rating - b.rating,
    },
    {
      title: 'Review', width: 260,
      render: (_, r) => (
        <Tooltip title={r.body}>
          <div>
            <p className="font-semibold text-xs text-slate-700 truncate">{r.title || '(no title)'}</p>
            <p className="text-xs text-slate-400 truncate max-w-[220px]">{r.body}</p>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Date', dataIndex: 'postedAt', width: 110,
      render: v => <span className="text-xs text-slate-500">{formatDate(v) || '—'}</span>,
      sorter: (a, b) => new Date(a.postedAt) - new Date(b.postedAt),
    },
    {
      title: 'Status', width: 100,
      render: (_, r) => {
        if (r.isFlagged) return <Tag color="red">Flagged</Tag>;
        if (r.status === 'replied') return <Tag color="green">Replied</Tag>;
        if (!r.isRead)  return <Badge dot><Tag color="blue">New</Tag></Badge>;
        return <Tag>Read</Tag>;
      },
    },
    {
      title: 'Verified', dataIndex: 'isVerifiedPurchase', width: 90,
      render: v => v ? <Tag color="green">✓ Verified</Tag> : <Tag color="default">Unverified</Tag>,
    },
    {
      title: 'Actions', width: 130,
      render: (_, r) => (
        <div className="flex items-center gap-2">
          <Button size="small" type="primary" ghost
            icon={<Eye size={12} />}
            onClick={() => openReview(r)}
          >View</Button>
          <Button size="small" danger={r.isFlagged}
            icon={<Flag size={12} />}
            onClick={() => handleFlag(r)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 pb-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reviews & Ratings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Monitor and respond to customer feedback across all platforms</p>
        </div>
        <Button icon={<RefreshCw size={14} />} onClick={() => fetchReviews(1, filters)} loading={loading}>
          Refresh
        </Button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Rating',    value: avgRating, icon: <Star size={18} className="text-amber-400" />, accent: 'border-amber-400' },
          { label: 'Total Loaded',  value: total,     icon: <MessageCircle size={18} className="text-blue-500" />, accent: 'border-blue-400' },
          { label: '5-Star',        value: fiveStar,  icon: <Star size={18} className="text-emerald-500" />, accent: 'border-emerald-400' },
          { label: '1–2 Star',      value: lowStar,   icon: <AlertTriangle size={18} className="text-red-500" />, accent: 'border-red-400' },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-2xl shadow-sm border border-slate-100 border-l-4 ${s.accent} p-5 flex items-center gap-4`}>
            <div className="bg-slate-50 rounded-xl p-2">{s.icon}</div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            placeholder="Search product name, customer, review text..."
            prefix={<Search size={14} className="text-slate-400" />}
            value={pendingSearch}
            onChange={e => setPendingSearch(e.target.value)}
            onPressEnter={applyFilters}
            className="w-72"
          />
          <Select
            value={filters.platform || 'all'}
            onChange={v => setFilters(prev => ({ ...prev, platform: v === 'all' ? '' : v }))}
            style={{ width: 160 }}
          >
            <Option value="all">All Platforms</Option>
            <Option value="fifozone">Fifozone</Option>
            <Option value="amazon">Amazon</Option>
            <Option value="flipkart">Flipkart</Option>
          </Select>
          <Select
            value={filters.rating || 'all'}
            onChange={v => setFilters(prev => ({ ...prev, rating: v === 'all' ? '' : v }))}
            style={{ width: 140 }}
          >
            <Option value="all">All Ratings</Option>
            <Option value="5">⭐⭐⭐⭐⭐ 5 Stars</Option>
            <Option value="4">⭐⭐⭐⭐ 4 Stars</Option>
            <Option value="3">⭐⭐⭐ 3 Stars</Option>
            <Option value="2">⭐⭐ 2 Stars</Option>
            <Option value="1">⭐ 1 Star</Option>
          </Select>
          <Button type="primary" onClick={applyFilters} icon={<Search size={14} />}>Search</Button>
          <Button onClick={clearFilters}>Clear</Button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading && reviews.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <Spin size="large" tip="Loading reviews..." />
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-16">
            <Empty description="No reviews found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={reviews}
            rowKey="_id"
            loading={loading}
            size="middle"
            scroll={{ x: 1100 }}
            rowClassName={r => !r.isRead ? 'bg-blue-50/30' : ''}
            pagination={{
              current: page,
              pageSize: 15,
              total,
              showSizeChanger: false,
              showTotal: (t) => `${t} reviews`,
              onChange: (p) => fetchReviews(p, filters),
            }}
          />
        )}
      </div>

      {/* ── Review Detail Modal ── */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={620}
        title={null}
        className="rounded-xl"
      >
        {selected && (
          <div className="space-y-4 pt-2">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <Tag color={platformColor[selected.platform?.toLowerCase()] || 'default'}>
                  {(selected.platform || '').toUpperCase()}
                </Tag>
                {selected.isVerifiedPurchase && (
                  <Tag color="green" className="ml-1">✓ Verified Purchase</Tag>
                )}
                <h3 className="text-lg font-bold text-slate-800 mt-2">{selected.productName}</h3>
                <p className="text-xs text-slate-400">by {selected.customerName || 'Anonymous'} · {formatDate(selected.postedAt)}</p>
              </div>
              <div className="text-right">
                <StarRow rating={selected.rating} />
                <span className="text-2xl font-bold mt-1 block" style={{ color: ratingColor(selected.rating) }}>
                  {selected.rating}/5
                </span>
              </div>
            </div>

            {/* Review body */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <h4 className="font-bold text-slate-800 mb-1">{selected.title || '(No title)'}</h4>
              <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">{selected.body}</p>
            </div>

            {/* Existing reply */}
            {selected.reply && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-emerald-700 mb-1">✅ Your Reply</p>
                <p className="text-sm text-emerald-800 whitespace-pre-wrap">{selected.reply}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDate(selected.repliedAt)}</p>
              </div>
            )}

            {/* Reply section — only Fifozone supports API replies */}
            {selected.platform?.toLowerCase() === 'fifozone' ? (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-slate-700">
                  <MessageCircle size={15} /> {selected.reply ? 'Edit Reply' : 'Reply to Customer'}
                </h4>
                <TextArea
                  rows={4}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Write your public response here..."
                  maxLength={1000}
                  showCount
                />
                <Button
                  type="primary"
                  className="w-full"
                  onClick={handleReply}
                  loading={replying}
                  disabled={!replyText.trim()}
                >
                  Post Public Reply
                </Button>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <AlertTriangle size={22} className="mx-auto text-amber-500 mb-2" />
                <p className="text-sm font-semibold text-amber-700">
                  {selected.platform === 'amazon' ? 'Amazon' : 'Flipkart'} does not allow sellers to reply to reviews via API.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Log into {selected.platform === 'amazon' ? 'Amazon Seller Central' : 'Flipkart Seller Hub'} to reply manually.
                </p>
              </div>
            )}

            {/* Flag action */}
            <div className="flex justify-end pt-1">
              <Button
                size="small"
                danger={!selected.isFlagged}
                icon={<Flag size={12} />}
                onClick={() => { handleFlag(selected); setModalOpen(false); }}
              >
                {selected.isFlagged ? 'Remove Flag' : 'Flag Review'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReviewsPage;
