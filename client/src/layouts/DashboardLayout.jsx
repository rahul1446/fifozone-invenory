import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { getSyncStatusApi, triggerManualSyncApi } from '../api/platformApi';
import { getNotificationsApi, markAllAsReadApi, markAsReadApi } from '../api/notificationApi';
import { formatRelativeTime } from '../utils/formatters';
import { getMessagesApi } from '../api/messageApi';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  RotateCcw,
  BarChart3,
  Bell,
  Settings,
  ShieldCheck,
  UserCheck,
  User,
  LogOut,
  RefreshCw,
  Search,
  ChevronDown,
  Menu,
  X,
  FileText,
  AlertTriangle,
  MessageSquare,
  Star,
  Tag,
  Truck,
  CreditCard,
  Megaphone,
  Users,
  ChevronRight,
  Clock,
  CheckCircle,
  Banknote,
  XCircle,
  FilePlus,
  Globe,
  SlidersHorizontal,
  ShoppingCart,
  Wallet,
  Receipt,
  PlusCircle,
} from 'lucide-react';
import { Drawer, Badge, Dropdown, Button, Input, Spin, notification } from 'antd';
import toast from 'react-hot-toast';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const socket = useSocket(); // connects socket in background
  const location = useLocation();
  const navigate = useNavigate();

  // Sidebar responsive drawer for mobile viewports
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  // Platforms sync states
  const [platformStatus, setPlatformStatus] = useState([]);
  const [lastSyncText, setLastSyncText] = useState('Just now');

  // Notifications states
  const [notificationsList, setNotificationsList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifFilter, setNotifFilter] = useState('All');

  const [expandedGroups, setExpandedGroups] = useState({});
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  const fetchSyncStatus = async () => {
    try {
      const response = await getSyncStatusApi();
      setPlatformStatus(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await getNotificationsApi({ limit: 15 });
      setNotificationsList(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    fetchNotifications();

    const fetchUnreadMsgs = async () => {
      try {
        const res = await getMessagesApi({ status: 'unread' });
        setUnreadMsgCount(res.data?.length || res.data?.messages?.length || 0);
      } catch (err) {}
    };
    fetchUnreadMsgs();

    const interval = setInterval(() => {
      fetchSyncStatus();
      setLastSyncText('2 mins ago');
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Listen to background socket updates dynamically
  useEffect(() => {
    if (socket) {
      const handleNewNotification = () => {
        fetchNotifications();
        fetchSyncStatus();
      };
      socket.on('new_notification', handleNewNotification);
      return () => socket.off('new_notification', handleNewNotification);
    }
  }, [socket]);

  const handleManualSync = async () => {
    setSyncLoading(true);
    toast.promise(triggerManualSyncApi(), {
      loading: 'Pushing sync request to e-commerce engines...',
      success: () => {
        setSyncLoading(false);
        fetchSyncStatus();
        return 'Synchronization triggered in background!';
      },
      error: (err) => {
        setSyncLoading(false);
        return err.response?.data?.message || 'Sync trigger failed.';
      }
    });
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsReadApi();
      fetchNotifications();
      toast.success('All notifications marked as read.');
    } catch (err) {
      toast.error('Operation failed.');
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await markAsReadApi(id);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchVal.trim()) {
      navigate(`/inventory/products?search=${encodeURIComponent(searchVal)}`);
      setSearchVal('');
    }
  };

  const navStructure = [
    { type: 'item', label: 'Overview', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    {
      type: 'group',
      label: 'ORDERS',
      children: [
        { label: 'All Orders',       path: '/orders',            icon: <ShoppingBag size={18} /> },
        { label: 'Pending',          path: '/orders/pending',    icon: <Clock size={18} /> },
        { label: 'Shipped',          path: '/orders/shipped',    icon: <Truck size={18} /> },
        { label: 'Delivered',        path: '/orders/delivered',  icon: <CheckCircle size={18} /> },
        { label: 'Returns & RTO',    path: '/orders/returns',    icon: <RotateCcw size={18} /> },
        { label: 'COD Orders',       path: '/orders/cod',        icon: <Banknote size={18} /> },
        { label: 'Cancelled Orders', path: '/orders/cancelled',  icon: <XCircle size={18} /> },
        { label: 'Manual Orders',    path: '/orders/manual',     icon: <FilePlus size={18} /> },
      ]
    },
    {
      type: 'group',
      label: 'PRODUCTS',
      children: [
        { label: 'All Products',    path: '/products',                 icon: <Package size={18} /> },
        { label: 'Add Product',     path: '/products/add',             icon: <Layers size={18} /> },
        { label: 'Channel Listing', path: '/products/channel-listing', icon: <Globe size={18} /> },
        { label: 'Pricing Control', path: '/products/pricing',         icon: <Tag size={18} /> },
        { label: 'Performance',     path: '/products/performance',     icon: <BarChart3 size={18} /> },
      ]
    },
    {
      type: 'group',
      label: 'INVENTORY',
      children: [
        { label: 'Overview',     path: '/inventory',              icon: <Layers size={18} /> },
        { label: 'Adjustment',   path: '/inventory/adjustments',  icon: <SlidersHorizontal size={18} /> },
        { label: 'Low Stock',    path: '/inventory/low-stock',    icon: <AlertTriangle size={18} /> },
        { label: 'Activity Log', path: '/inventory/activity-log', icon: <FileText size={18} /> },
        { label: 'Suppliers',    path: '/inventory/suppliers',    icon: <Users size={18} /> },
        { label: 'Purchases',    path: '/inventory/purchases',    icon: <ShoppingCart size={18} /> },
      ]
    },
    {
      type: 'group',
      label: 'PAYMENTS',
      children: [
        { label: 'Transactions',       path: '/payments',              icon: <CreditCard size={18} /> },
        { label: 'Settlements',        path: '/payments/settlements',  icon: <Wallet size={18} /> },
        { label: 'Invoice Generator',  path: '/payments/invoices',     icon: <Receipt size={18} /> },
        { label: 'Refund Management',  path: '/payments/refunds',      icon: <RotateCcw size={18} /> },
      ]
    },
    {
      type: 'group',
      label: 'APPS',
      children: [
        { label: 'Amazon',      path: '/apps/amazon',   icon: <ShoppingBag size={18} /> },
        { label: 'Flipkart',    path: '/apps/flipkart', icon: <ShoppingBag size={18} /> },
        { label: 'Meesho',      path: '/apps/meesho',   icon: <ShoppingBag size={18} /> },
        { label: 'Fifozone',    path: '/apps/fifozone', icon: <Globe size={18} /> },
        { label: 'Add New App', path: '/apps/add',      icon: <PlusCircle size={18} /> },
      ]
    },
    { type: 'item', label: 'Reports',      path: '/reports',       icon: <BarChart3 size={18} /> },
    { type: 'item', label: 'Best Sellers', path: '/best-sellers',  icon: <Star size={18} /> },
    { type: 'item', label: 'Users',        path: '/users',         icon: <UserCheck size={18} /> },
    { type: 'item', label: 'Settings',     path: '/settings',      icon: <Settings size={18} /> },
  ];


  // Auto-expand groups based on active route
  useEffect(() => {
    const newExpanded = { ...expandedGroups };
    let changed = false;
    navStructure.forEach(item => {
      if (item.type === 'group') {
        const hasActiveChild = item.children.some(child => 
          location.pathname === child.path || (child.path !== '/dashboard' && location.pathname.startsWith(child.path))
        );
        if (hasActiveChild && !newExpanded[item.label]) {
          newExpanded[item.label] = true;
          changed = true;
        }
      }
    });
    if (changed) setExpandedGroups(newExpanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleGroup = (label) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const renderNavItem = (item, isMobile = false) => {
    const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
    return (
      <Link
        key={item.label}
        to={item.path}
        onClick={() => isMobile && setMobileOpen(false)}
        className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-all duration-200 hover:bg-slate-850 hover:text-white ${
          isActive ? 'bg-emerald-900/60 text-white border-l-4 border-emerald-500 font-medium' : 'text-slate-400'
        }`}
      >
        <div className="flex items-center gap-3">
          {item.icon}
          <span>{item.label}</span>
        </div>
        {item.badge > 0 && (
          <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  const renderNavGroup = (group, isMobile = false) => {
    const isExpanded = expandedGroups[group.label];
    return (
      <div key={group.label} className="mb-2">
        <button
          onClick={() => toggleGroup(group.label)}
          className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
        >
          <span>{group.label}</span>
          <ChevronRight size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
        </button>
        {isExpanded && (
          <div className="mt-1 space-y-1">
            {group.children.map(child => renderNavItem(child, isMobile))}
          </div>
        )}
      </div>
    );
  };

  // Profile avatar dropdown items
  const profileMenu = {
    items: [
      {
        key: 'profile',
        label: <Link to="/settings/profile">My Profile</Link>,
        icon: <User size={16} />
      },
      {
        key: 'logout',
        danger: true,
        label: <span onClick={logout}>Sign Out</span>,
        icon: <LogOut size={16} />
      }
    ]
  };

  const getPlatformStatusColor = (platformName) => {
    const statusObj = platformStatus.find(p => p.platform === platformName.toLowerCase());
    if (!statusObj) return 'bg-gray-400'; // Offline / Draft
    if (statusObj.status === 'synced') return 'bg-emerald-500';
    if (statusObj.status === 'syncing') return 'bg-amber-400 animate-pulse';
    return 'bg-rose-500'; // Sync error
  };

  // Get color by notification severity
  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'error': return 'bg-rose-50 border-rose-200 text-rose-800';
      case 'warning': return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'success': return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const filteredNotifications = notificationsList.filter(n => {
    if (notifFilter === 'Unread') return !n.readBy.includes(user?._id);
    if (notifFilter === 'Low Stock') return n.type === 'low_stock' || n.type === 'out_of_stock';
    if (notifFilter === 'Orders') return n.type === 'new_order' || n.type === 'order_cancelled';
    return true;
  });

  return (
    <div className="min-h-screen flex bg-slate-50 overflow-hidden font-sans">
      {/* 1. LEFT SIDEBAR (Desktop) */}
      <aside className="hidden md:flex flex-col w-[260px] bg-slate-900 border-r border-slate-800 shrink-0 text-slate-300">
        {/* Top brand header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-emerald-950/20">
            F
          </div>
          <span className="font-semibold text-lg text-white font-sans tracking-wide">Fifozone</span>
        </div>

        {/* Profile Card */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3 bg-slate-950/40">
          <div className="w-10 h-10 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-sm ring-2 ring-emerald-900">
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-medium text-white truncate text-sm">{user?.name}</span>
            <span className="text-xs text-slate-400 capitalize bg-slate-800/80 px-2 py-0.5 rounded-full w-max mt-1">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          {navStructure.map(item => item.type === 'group' ? renderNavGroup(item) : renderNavItem(item))}
        </nav>

        {/* Bottom Platform status trigger */}
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/25">
          <button
            onClick={handleManualSync}
            disabled={syncLoading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-lg text-sm shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98]"
          >
            <RefreshCw size={16} className={syncLoading ? 'animate-spin' : ''} />
            <span>{syncLoading ? 'Syncing...' : 'Sync Now'}</span>
          </button>
          <div className="text-center text-[11px] text-slate-500">
            Last synced: {lastSyncText}
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
          {/* Hamburger button (Mobile) */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <Menu size={22} />
          </button>

          {/* Search bar */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 w-[340px] focus-within:border-emerald-500 focus-within:bg-white transition-all">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search products or orders (Enter)..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={handleSearchSubmit}
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder-slate-400"
            />
          </div>

          {/* Right actions controls */}
          <div className="flex items-center gap-6">
            {/* Platform indicators */}
            <div className="hidden lg:flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${getPlatformStatusColor('fifozone')}`} />
                <span>Fifozone</span>
              </div>
              {getPlatformStatusColor('amazon') !== 'bg-gray-400' && (
                <>
                  <div className="h-3 w-px bg-slate-200" />
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${getPlatformStatusColor('amazon')}`} />
                    <span>Amazon</span>
                  </div>
                </>
              )}
              {getPlatformStatusColor('flipkart') !== 'bg-gray-400' && (
                <>
                  <div className="h-3 w-px bg-slate-200" />
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${getPlatformStatusColor('flipkart')}`} />
                    <span>Flipkart</span>
                  </div>
                </>
              )}
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setNotifOpen(true)}
              className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-full relative transition-all"
            >
              <Badge count={unreadCount} size="small" offset={[2, -2]}>
                <Bell size={20} />
              </Badge>
            </button>

            {/* Profile Dropdown */}
            <Dropdown menu={profileMenu} trigger={['click']} placement="bottomRight">
              <button className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg transition-all">
                <div className="w-8 h-8 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-xs">
                  {user?.name?.slice(0, 2).toUpperCase()}
                </div>
                <ChevronDown size={16} className="text-slate-500" />
              </button>
            </Dropdown>
          </div>
        </header>

        {/* CONTAINER OUTLET VIEWPORT */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <Outlet />
        </main>
      </div>

      {/* 3. REAL-TIME NOTIFICATION DRAWER */}
      <Drawer
        title={
          <div className="flex items-center justify-between">
            <span className="text-slate-800 font-semibold font-sans">System Alerts & Notifications</span>
            <Button size="small" type="link" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
              Mark all as read
            </Button>
          </div>
        }
        placement="right"
        width={400}
        onClose={() => setNotifOpen(false)}
        open={notifOpen}
        bodyStyle={{ padding: 0 }}
      >
        {/* Filters tab row */}
        <div className="flex gap-2 p-4 bg-slate-50 border-b border-slate-100">
          {['All', 'Unread', 'Low Stock', 'Orders'].map(tab => (
            <button
              key={tab}
              onClick={() => setNotifFilter(tab)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                notifFilter === tab
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Dynamic notifications cards list */}
        <div className="divide-y divide-slate-100 overflow-y-auto max-h-[calc(100vh-140px)]">
          {filteredNotifications.length === 0 ? (
            <div className="py-20 text-center text-slate-400 flex flex-col gap-2 items-center justify-center">
              <Bell size={40} className="stroke-[1.5]" />
              <span className="text-sm font-medium">No alerts matching filter.</span>
            </div>
          ) : (
            filteredNotifications.map(notif => {
              const isUnread = !notif.readBy.includes(user?._id);
              return (
                <div
                  key={notif._id}
                  onClick={() => handleMarkOneRead(notif._id)}
                  className={`p-4 transition-all hover:bg-slate-50/80 cursor-pointer border-l-4 ${
                    isUnread ? 'border-l-emerald-500 bg-emerald-50/20' : 'border-l-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {notif.type.replace('_', ' ')}
                      </span>
                      <h4 className="font-semibold text-slate-800 text-sm leading-tight">
                        {notif.title}
                      </h4>
                      <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-2 block">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Drawer>

      {/* 4. MOBILE SIDEBAR DRAWER */}
      <Drawer
        placement="left"
        width={260}
        onClose={() => setMobileOpen(false)}
        open={mobileOpen}
        bodyStyle={{ padding: 0, backgroundColor: '#0f172a' }}
        headerStyle={{ display: 'none' }}
      >
        <div className="h-full flex flex-col text-slate-300">
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
            <span className="font-semibold text-lg text-white">Fifozone Mobile</span>
            <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navStructure.map(item => item.type === 'group' ? renderNavGroup(item, true) : renderNavItem(item, true))}
          </nav>
        </div>
      </Drawer>
    </div>
  );
};

export default DashboardLayout;
