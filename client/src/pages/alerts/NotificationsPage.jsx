import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Button, Select, Empty, Spin, Pagination, Tag } from 'antd';
import {
  Bell, BellOff, CheckCheck, Package, ShoppingBag, AlertTriangle,
  RefreshCw, TrendingDown, RotateCcw, Zap, Info
} from 'lucide-react';
import { getNotificationsApi, markAsReadApi, markAllAsReadApi } from '../../api/notificationApi';
import { formatRelativeTime } from '../../utils/formatters';
import toast from 'react-hot-toast';

const typeConfig = {
  low_stock:          { icon: <AlertTriangle size={14} />, color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Low Stock' },
  out_of_stock:       { icon: <Package size={14} />,       color: 'bg-red-100 text-red-700 border-red-200',       dot: 'bg-red-500',   label: 'Out of Stock' },
  new_order:          { icon: <ShoppingBag size={14} />,   color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'New Order' },
  order_cancelled:    { icon: <RotateCcw size={14} />,     color: 'bg-rose-100 text-rose-700 border-rose-200',    dot: 'bg-rose-500',  label: 'Cancelled' },
  return_request:     { icon: <RotateCcw size={14} />,     color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500', label: 'Return' },
  sync_failed:        { icon: <Zap size={14} />,           color: 'bg-red-100 text-red-700 border-red-200',       dot: 'bg-red-500',   label: 'Sync Error' },
  sync_success:       { icon: <Zap size={14} />,           color: 'bg-blue-100 text-blue-700 border-blue-200',    dot: 'bg-blue-500',  label: 'Sync OK' },
  dead_product_flagged: { icon: <TrendingDown size={14} />, color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-500', label: 'Dead Product' },
  daily_report:       { icon: <Info size={14} />,          color: 'bg-blue-100 text-blue-700 border-blue-200',    dot: 'bg-blue-500',  label: 'Report' },
  manual:             { icon: <Info size={14} />,          color: 'bg-blue-100 text-blue-700 border-blue-200',    dot: 'bg-blue-500',  label: 'Manual' },
  price_drop:         { icon: <TrendingDown size={14} />,  color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500', label: 'Price Drop' },
};

const FILTERS = [
  { label: 'All', value: 'All' },
  { label: 'Unread', value: 'Unread' },
  { label: 'Low Stock', value: 'Low Stock' },
  { label: 'Orders', value: 'Orders' },
  { label: 'Alerts', value: 'Alerts' },
];

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const limit = 20;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotificationsApi({ type: filter, page, limit });
      const data = res.data || res;
      setNotifications(data.notifications || []);
      setTotal(data.pagination?.total || 0);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkOne = async (id) => {
    try {
      await markAsReadApi(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, _read: true } : n)
      );
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await markAllAsReadApi();
      toast.success('All notifications marked as read');
      fetchNotifications();
    } catch (err) {
      toast.error('Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const severityBorder = (severity) => {
    const map = {
      error: 'border-l-red-500',
      warning: 'border-l-amber-500',
      success: 'border-l-emerald-500',
      info: 'border-l-blue-500',
    };
    return map[severity] || 'border-l-slate-300';
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Bell size={22} className="text-emerald-600" />
              Notifications
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              System alerts, order updates, and stock warnings
            </p>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                {unreadCount} unread
              </span>
            )}
            <Button
              icon={<CheckCheck size={15} />}
              onClick={handleMarkAll}
              loading={markingAll}
              disabled={unreadCount === 0}
              className="!flex !items-center !gap-1.5 !text-sm"
            >
              Mark All as Read
            </Button>
            <Button
              icon={<RefreshCw size={15} />}
              onClick={fetchNotifications}
              loading={loading}
              className="!flex !items-center !gap-1.5 !text-sm"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white px-5 py-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter === f.value
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-800'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{total} total</span>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spin size="large" />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            image={<BellOff size={48} className="mx-auto text-slate-300" />}
            description={
              <div className="text-center">
                <p className="text-slate-500 font-medium">No notifications</p>
                <p className="text-slate-400 text-sm mt-1">
                  {filter !== 'All' ? `No ${filter.toLowerCase()} notifications found` : 'You are all caught up!'}
                </p>
              </div>
            }
            className="py-16"
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notif) => {
              const cfg = typeConfig[notif.type] || typeConfig.manual;
              const isUnread = !notif._read && !(notif.readBy?.length > 0);

              return (
                <div
                  key={notif._id}
                  onClick={() => !notif._read && handleMarkOne(notif._id)}
                  className={`flex gap-4 px-6 py-4 border-l-4 transition-all cursor-pointer hover:bg-slate-50/70 ${severityBorder(notif.severity)} ${
                    isUnread ? 'bg-emerald-50/30' : 'bg-white'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${cfg.color}`}>
                    {cfg.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          {notif.platform && (
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">
                              {notif.platform}
                            </span>
                          )}
                          {isUnread && (
                            <span className={`w-2 h-2 rounded-full ${cfg.dot} inline-block`} />
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-slate-800 leading-tight mt-1">
                          {notif.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0 mt-0.5">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex justify-center py-5 border-t border-slate-100">
            <Pagination
              current={page}
              pageSize={limit}
              total={total}
              onChange={(p) => setPage(p)}
              showSizeChanger={false}
              showTotal={(t, range) => (
                <span className="text-xs text-slate-500">
                  Showing {range[0]}–{range[1]} of {t}
                </span>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
