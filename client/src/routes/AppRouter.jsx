import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import RoleRoute from './RoleRoute';
import DashboardLayout from '../layouts/DashboardLayout';

// Auth
import LoginPage from '../pages/auth/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';

// Dashboard
import DashboardPage from '../pages/dashboard/DashboardPage';

// Orders
import OrdersPage from '../pages/orders/OrdersPage';
import OrderDetailPage from '../pages/orders/OrderDetailPage';
import ReturnsPage from '../pages/orders/ReturnsPage';
import PendingOrdersPage from '../pages/orders/PendingOrdersPage';
import ShippedOrdersPage from '../pages/orders/ShippedOrdersPage';
import DeliveredOrdersPage from '../pages/orders/DeliveredOrdersPage';
import CodOrdersPage from '../pages/orders/CodOrdersPage';
import CancelledOrdersPage from '../pages/orders/CancelledOrdersPage';
import ManualOrderPage from '../pages/orders/ManualOrderPage';

// Products
import ProductsPage from '../pages/inventory/ProductsPage';
import AddProductPage from '../pages/inventory/AddProductPage';
import EditProductPage from '../pages/inventory/EditProductPage';
import ChannelListingPage from '../pages/products/ChannelListingPage';
import PricingControlPage from '../pages/products/PricingControlPage';
import ProductPerformancePage from '../pages/products/ProductPerformancePage';

// Inventory
import InventoryLedgerPage from '../pages/inventory/InventoryLedgerPage';
import StockAdjustmentPage from '../pages/inventory/StockAdjustmentPage';
import LowStockPage from '../pages/inventory/LowStockPage';
import ActivityLogPage from '../pages/inventory/ActivityLogPage';
import SuppliersPage from '../pages/inventory/SuppliersPage';
import PurchasesPage from '../pages/inventory/PurchasesPage';

// Payments
import PaymentsPage from '../pages/payments/PaymentsPage';
import SettlementsPage from '../pages/payments/SettlementsPage';
import InvoiceGeneratorPage from '../pages/payments/InvoiceGeneratorPage';
import RefundManagementPage from '../pages/payments/RefundManagementPage';

// Apps
import AmazonAppPage from '../pages/apps/AmazonAppPage';
import FlipkartAppPage from '../pages/apps/FlipkartAppPage';
import MeeshoAppPage from '../pages/apps/MeeshoAppPage';
import FifozoneAppPage from '../pages/apps/FifozoneAppPage';
import AddNewAppPage from '../pages/apps/AddNewAppPage';

// Reports & Best Sellers
import ReportsPage from '../pages/reports/ReportsPage';
import BestSellersPage from '../pages/bestSellers/BestSellersPage';

// Users & Settings
import UserManagementPage from '../pages/settings/UserManagementPage';
import ProfilePage from '../pages/settings/ProfilePage';
import PlatformSettingsPage from '../pages/settings/PlatformSettingsPage';
import GeneralSettingsPage from '../pages/settings/GeneralSettingsPage';

const AppRouter = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* All authenticated routes */}
      <Route
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        {/* Dashboard */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Orders */}
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/pending" element={<PendingOrdersPage />} />
        <Route path="/orders/shipped" element={<ShippedOrdersPage />} />
        <Route path="/orders/delivered" element={<DeliveredOrdersPage />} />
        <Route path="/orders/returns" element={<ReturnsPage />} />
        <Route path="/orders/cod" element={<CodOrdersPage />} />
        <Route path="/orders/cancelled" element={<CancelledOrdersPage />} />
        <Route path="/orders/manual" element={<ManualOrderPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />

        {/* Products — both /products and /inventory/products paths work */}
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/add" element={<AddProductPage />} />
        <Route path="/products/:id/edit" element={<EditProductPage />} />
        <Route path="/products/channel-listing" element={<ChannelListingPage />} />
        <Route path="/products/pricing" element={<PricingControlPage />} />
        <Route path="/products/performance" element={<ProductPerformancePage />} />
        {/* Aliases under /inventory/products (used by sidebar & dashboard links) */}
        <Route path="/inventory/products" element={<ProductsPage />} />
        <Route path="/inventory/products/add" element={<AddProductPage />} />
        <Route path="/inventory/products/:id/edit" element={<EditProductPage />} />

        {/* Inventory */}
        <Route path="/inventory" element={<InventoryLedgerPage />} />
        <Route path="/inventory/adjustments" element={<StockAdjustmentPage />} />
        <Route path="/inventory/low-stock" element={<LowStockPage />} />
        <Route path="/inventory/activity-log" element={<ActivityLogPage />} />
        <Route path="/inventory/suppliers" element={<SuppliersPage />} />
        <Route path="/inventory/purchases" element={<PurchasesPage />} />

        {/* Payments */}
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/payments/settlements" element={<SettlementsPage />} />
        <Route path="/payments/invoices" element={<InvoiceGeneratorPage />} />
        <Route path="/payments/refunds" element={<RefundManagementPage />} />

        {/* Apps */}
        <Route path="/apps/amazon" element={<AmazonAppPage />} />
        <Route path="/apps/flipkart" element={<FlipkartAppPage />} />
        <Route path="/apps/meesho" element={<MeeshoAppPage />} />
        <Route path="/apps/fifozone" element={<FifozoneAppPage />} />
        <Route path="/apps/add" element={<AddNewAppPage />} />

        {/* Reports & Best Sellers */}
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/best-sellers" element={<BestSellersPage />} />

        {/* Users & Settings */}
        <Route path="/users" element={<UserManagementPage />} />
        <Route path="/settings" element={<GeneralSettingsPage />} />
        <Route path="/settings/general" element={<GeneralSettingsPage />} />
        <Route path="/settings/profile" element={<ProfilePage />} />
        <Route path="/settings/platforms" element={<PlatformSettingsPage />} />
        <Route path="/settings/users" element={<UserManagementPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRouter;
