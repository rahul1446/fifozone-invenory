import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { getSyncStatusApi, triggerManualSyncApi } from '../api/platformApi';
import { getNotificationsApi, markAllAsReadApi, markAsReadApi } from '../api/notificationApi';
import { formatRelativeTime } from '../utils/formatters';
import { getMessagesApi } from '../api/messageApi';
import { getSettingsApi } from '../api/settingsApi';
import { useDispatch, useSelector } from 'react-redux';
import { setSettingsSuccess } from '../store/settingsSlice';
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
  BookOpen,
  Scale,
  FileSpreadsheet,
  Stethoscope,
} from 'lucide-react';
import { Drawer, Badge, Dropdown, Button, Input, Spin, notification } from 'antd';
import toast from 'react-hot-toast';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const socket = useSocket(); // connects socket in background
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { generalSettings } = useSelector(state => state.settings || {});

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
      const data = response?.data || {};
      setNotificationsList(data.notifications || data.data || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      setNotificationsList([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    fetchNotifications();

    const fetchGlobalSettings = async () => {
      try {
        const res = await getSettingsApi();
        if (res.data?.data) {
          dispatch(setSettingsSuccess(res.data.data));
        }
      } catch (err) {}
    };
    fetchGlobalSettings();

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
      label: 'Orders',
      children: [
        { label: 'All orders',       path: '/orders',            icon: <ShoppingBag size={18} /> },
        { label: 'Pending',          path: '/orders/pending',    icon: <Clock size={18} /> },
        { label: 'Shipped',          path: '/orders/shipped',    icon: <Truck size={18} /> },
        { label: 'Delivered',        path: '/orders/delivered',  icon: <CheckCircle size={18} /> },
        { label: 'Returns & RTO',    path: '/orders/returns',    icon: <RotateCcw size={18} /> },
        { label: 'COD orders',       path: '/orders/cod',        icon: <Banknote size={18} /> },
        { label: 'Cancelled orders', path: '/orders/cancelled',  icon: <XCircle size={18} /> },
        { label: 'Manual orders',    path: '/orders/manual',     icon: <FilePlus size={18} /> },
        { label: 'Shipments',        path: '/orders/shipments',  icon: <Truck size={18} /> },
      ]
    },
    {
      type: 'group',
      label: 'Products',
      children: [
        { label: 'All products',    path: '/products',                 icon: <Package size={18} /> },
        { label: 'Add product',     path: '/products/add',             icon: <Layers size={18} /> },
        { label: 'Channel listing', path: '/products/channel-listing', icon: <Globe size={18} /> },
        { label: 'Pricing control', path: '/products/pricing',         icon: <Tag size={18} /> },
        { label: 'Discounts',       path: '/products/discounts',       icon: <Tag size={18} /> },
        { label: 'Performance',     path: '/products/performance',     icon: <BarChart3 size={18} /> },
      ]
    },
    {
      type: 'group',
      label: 'Inventory',
      children: [
        { label: 'Overview',     path: '/inventory',              icon: <Layers size={18} /> },
        { label: 'Adjustment',   path: '/inventory/adjustments',  icon: <SlidersHorizontal size={18} /> },
        { label: 'Low stock',    path: '/inventory/low-stock',    icon: <AlertTriangle size={18} /> },
        { label: 'Activity log', path: '/inventory/activity-log', icon: <FileText size={18} /> },
        { label: 'Suppliers',    path: '/inventory/suppliers',    icon: <Users size={18} /> },
        { label: 'Purchases',    path: '/inventory/purchases',    icon: <ShoppingCart size={18} /> },
      ]
    },
    {
      type: 'group',
      label: 'POS & billing',
      children: [
        { label: 'POS counter',         path: '/billing/pos',               icon: <ShoppingCart size={18} /> },
        { label: 'Sales invoices',      path: '/billing/invoices',          icon: <Receipt size={18} /> },
        { label: 'Voucher entry',       path: '/billing/vouchers',          icon: <BookOpen size={18} /> },
        { label: 'Dispatch tracking',   path: '/billing/dispatch',          icon: <Truck size={18} /> },
        { label: 'Prescriber reports',  path: '/billing/doctor-commissions', icon: <Stethoscope size={18} /> },
        { label: 'Stock issue (challan)', path: '/billing/stock-issue',     icon: <FileText size={18} /> },
        { label: 'Stock inward',        path: '/billing/stock-receive',     icon: <FilePlus size={18} /> },
        { label: 'Returns & credit notes', path: '/billing/returns',        icon: <RotateCcw size={18} /> },
        { label: 'Purchase inward',     path: '/billing/purchases',         icon: <FilePlus size={18} /> },
        { label: 'Batch & expiry',      path: '/billing/batches',           icon: <Layers size={18} /> },
        { label: 'Party ledgers',       path: '/billing/ledgers',           icon: <BookOpen size={18} /> },
        { label: 'PDC cheque register', path: '/billing/cheques',           icon: <CreditCard size={18} /> },
        { label: 'Daily cash register', path: '/billing/register',          icon: <Banknote size={18} /> },
        { label: 'Financial reports',   path: '/billing/reports',           icon: <Scale size={18} /> },
      ]
    },
    {
      type: 'group',
      label: 'Payments',
      children: [
        { label: 'Transactions',      path: '/payments',              icon: <CreditCard size={18} /> },
        { label: 'Settlements',       path: '/payments/settlements',  icon: <Wallet size={18} /> },
        { label: 'Invoice generator', path: '/payments/invoices',     icon: <Receipt size={18} /> },
        { label: 'Refunds',           path: '/payments/refunds',      icon: <RotateCcw size={18} /> },
      ]
    },
    {
      type: 'group',
      label: 'Apps',
      children: [
        { label: 'Amazon',      path: '/apps/amazon',   icon: <ShoppingBag size={18} /> },
        { label: 'Flipkart',    path: '/apps/flipkart', icon: <ShoppingBag size={18} /> },
        { label: 'Meesho',      path: '/apps/meesho',   icon: <ShoppingBag size={18} /> },
        { label: 'Fifozone',    path: '/apps/fifozone', icon: <Globe size={18} /> },
        { label: 'Add app',     path: '/apps/add',      icon: <PlusCircle size={18} /> },
      ]
    },
    { type: 'item', label: 'Reports',      path: '/reports',       icon: <BarChart3 size={18} /> },
    { type: 'item', label: 'Best sellers', path: '/best-sellers',  icon: <Star size={18} /> },
    { type: 'item', label: 'Users',        path: '/users',         icon: <UserCheck size={18} /> },
    {
      type: 'group',
      label: 'System',
      children: [
        { label: 'General settings', path: '/settings/general',   icon: <Settings size={18} /> },
        { label: 'Platform sync',    path: '/settings/platforms', icon: <Globe size={18} /> },
        { label: 'My profile',       path: '/settings/profile',   icon: <User size={18} /> },
      ]
    },
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
        className={`flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors duration-150 hover:bg-slate-800 hover:text-slate-100 ${
          isActive ? 'bg-slate-800 text-white font-medium border-l-2 border-emerald-500' : 'text-slate-400'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-4 flex justify-center text-slate-400 shrink-0">{item.icon}</span>
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge > 0 && (
          <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono px-1.5 py-0.2 rounded text-center">
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
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span>{group.label}</span>
          <ChevronRight size={13} className={`transition-transform duration-150 text-slate-500 ${isExpanded ? 'rotate-90' : ''}`} />
        </button>
        {isExpanded && (
          <div className="mt-0.5 space-y-0.5 pl-1">
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
        label: <Link to="/settings">My Profile</Link>,
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
    if (!statusObj) return 'bg-slate-400'; // Offline / Draft
    if (statusObj.status === 'synced') return 'bg-emerald-500';
    if (statusObj.status === 'syncing') return 'bg-amber-400';
    return 'bg-rose-500'; // Sync error
  };

  // Get color by notification severity
  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'error': return 'bg-rose-50 border-rose-200 text-rose-800';
      case 'warning': return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'success': return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      default: return 'bg-slate-100 border-slate-200 text-slate-800';
    }
  };

  const filteredNotifications = notificationsList.filter(n => {
    if (notifFilter === 'Unread') return !(n.readBy || []).includes(user?._id);
    if (notifFilter === 'Low Stock') return n.type === 'low_stock' || n.type === 'out_of_stock';
    if (notifFilter === 'Orders') return n.type === 'new_order' || n.type === 'order_cancelled';
    return true;
  });

  return (
    <div className="min-h-screen flex bg-slate-50 overflow-hidden font-sans">
      {/* 1. LEFT SIDEBAR (Desktop) */}
      <aside className="hidden md:flex flex-col w-[240px] bg-slate-900 border-r border-slate-800 shrink-0 text-slate-300">
        {/* Top brand header */}
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-slate-800">
          {generalSettings?.logoUrl ? (
            <img src={generalSettings.logoUrl} alt="Logo" className="h-7 w-auto object-contain" />
          ) : (
            <div className="w-7 h-7 rounded bg-emerald-700 flex items-center justify-center text-white font-medium text-sm">
              {(generalSettings?.companyName || 'F').charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-medium text-sm text-slate-100 truncate">
            {generalSettings?.companyName || 'Fifozone'}
          </span>
        </div>

        {/* Profile Card */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2.5 bg-slate-950/30">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 font-medium flex items-center justify-center text-xs border border-slate-700">
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-slate-200 truncate text-xs">{user?.name}</span>
            <span className="text-[11px] text-slate-400 capitalize">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-800">
          {navStructure.map(item => item.type === 'group' ? renderNavGroup(item) : renderNavItem(item))}
        </nav>

        {/* Bottom Platform status trigger */}
        <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/20">
          <button
            onClick={handleManualSync}
            disabled={syncLoading}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-slate-200 font-medium py-2 px-3 rounded-md text-xs transition-colors duration-150"
          >
            <RefreshCw size={14} className={syncLoading ? 'animate-spin' : ''} />
            <span>{syncLoading ? 'Syncing...' : 'Sync channels'}</span>
          </button>
          <div className="text-center text-[11px] text-slate-400">
            Last synced: {lastSyncText}
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
          {/* Hamburger button (Mobile) */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <Menu size={20} />
          </button>

          {/* Search bar */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 w-[320px] focus-within:border-slate-400 focus-within:bg-white transition-colors duration-150">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search products or orders (Enter)"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={handleSearchSubmit}
              className="bg-transparent border-none outline-none text-xs w-full text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Right actions controls */}
          <div className="flex items-center gap-4">
            {/* Platform indicators */}
            <div className="hidden lg:flex items-center gap-2.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 text-xs font-mono text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${getPlatformStatusColor('fifozone')}`} />
                <span>Store</span>
              </div>
              {getPlatformStatusColor('amazon') !== 'bg-slate-400' && (
                <>
                  <div className="h-3 w-px bg-slate-200" />
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${getPlatformStatusColor('amazon')}`} />
                    <span>Amazon</span>
                  </div>
                </>
              )}
              {getPlatformStatusColor('flipkart') !== 'bg-slate-400' && (
                <>
                  <div className="h-3 w-px bg-slate-200" />
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${getPlatformStatusColor('flipkart')}`} />
                    <span>Flipkart</span>
                  </div>
                </>
              )}
              {getPlatformStatusColor('meesho') !== 'bg-slate-400' && (
                <>
                  <div className="h-3 w-px bg-slate-200" />
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${getPlatformStatusColor('meesho')}`} />
                    <span>Meesho</span>
                  </div>
                </>
              )}
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setNotifOpen(true)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-md relative transition-colors duration-150"
            >
              <Badge count={unreadCount} size="small" offset={[2, -2]}>
                <Bell size={18} />
              </Badge>
            </button>

            {/* Profile Dropdown */}
            <Dropdown menu={profileMenu} trigger={['click']} placement="bottomRight">
              <button className="flex items-center gap-1.5 p-1 hover:bg-slate-100 rounded-md transition-colors duration-150">
                <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-200 font-medium flex items-center justify-center text-xs">
                  {user?.name?.slice(0, 2).toUpperCase()}
                </div>
                <ChevronDown size={14} className="text-slate-400" />
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
              const isUnread = !(notif.readBy || []).includes(user?._id);
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
