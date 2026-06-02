import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import RoleRoute from './RoleRoute';
import DashboardLayout from '../layouts/DashboardLayout';

// Page imports
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import ProductsPage from '../pages/inventory/ProductsPage';
import AddProductPage from '../pages/inventory/AddProductPage';
import EditProductPage from '../pages/inventory/EditProductPage';
import DeadProductsPage from '../pages/inventory/DeadProductsPage';
import OrdersPage from '../pages/orders/OrdersPage';
import OrderDetailPage from '../pages/orders/OrderDetailPage';
import ReturnsPage from '../pages/orders/ReturnsPage';
import AnalyticsPage from '../pages/analytics/AnalyticsPage';
import InventoryLogsPage from '../pages/alerts/InventoryLogsPage';
import NotificationsPage from '../pages/alerts/NotificationsPage';
import AlertRulesPage from '../pages/alerts/AlertRulesPage';
import PlatformSettingsPage from '../pages/settings/PlatformSettingsPage';
import UserManagementPage from '../pages/settings/UserManagementPage';
import ProfilePage from '../pages/settings/ProfilePage';
import NotFoundPage from '../pages/NotFoundPage';
import ShippingSettingsPage from '../pages/settings/ShippingSettingsPage';

// New Pages
import MessagesPage from '../pages/messages/MessagesPage';
import ReviewsPage from '../pages/reviews/ReviewsPage';
import PromotionsPage from '../pages/promotions/PromotionsPage';
import ShippingQueuePage from '../pages/orders/ShippingQueuePage';
import PaymentsPage from '../pages/payments/PaymentsPage';
import AccountHealthPage from '../pages/accountHealth/AccountHealthPage';
import AdvertisingPage from '../pages/advertising/AdvertisingPage';
import CustomersPage from '../pages/customers/CustomersPage';
import CustomerProfilePage from '../pages/customers/CustomerProfilePage';


const AppRouter = () => {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* All authenticated dashboard routes */}
      <Route
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Inventory */}
        <Route path="/inventory/products" element={<ProductsPage />} />
        <Route path="/inventory/products/add" element={<AddProductPage />} />
        <Route path="/inventory/products/:id/edit" element={<EditProductPage />} />
        <Route path="/inventory/dead-products" element={<DeadProductsPage />} />

        {/* Orders — specific sub-routes BEFORE :id to prevent conflict */}
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/returns" element={<ReturnsPage />} />
        <Route path="/orders/shipping-queue" element={<ShippingQueuePage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />

        {/* Standalone New Features */}
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/promotions" element={<PromotionsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/account-health" element={<AccountHealthPage />} />
        <Route path="/advertising" element={<AdvertisingPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerProfilePage />} />

        {/* Analytics */}
        <Route path="/analytics" element={<AnalyticsPage />} />

        {/* Alerts */}
        <Route path="/alerts/notifications" element={<NotificationsPage />} />
        <Route path="/alerts/inventory-logs" element={<InventoryLogsPage />} />
        <Route path="/alerts/rules" element={<AlertRulesPage />} />

        {/* Settings */}
        <Route path="/settings/profile" element={<ProfilePage />} />
        <Route path="/settings/shipping" element={<ShippingSettingsPage />} />
        <Route
          path="/settings/platforms"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <PlatformSettingsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/settings/users"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <UserManagementPage />
            </RoleRoute>
          }
        />
      </Route>

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRouter;
