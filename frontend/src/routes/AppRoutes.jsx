// ─────────────────────────────────────────────────────────────
// RepairTrack — Application Route Definitions (Phase 3.1)
//
// Architecture:
//   / (public)                    → PublicLayout
//   /login, /register             → AuthLayout (customer)
//   /shop-owner/login             → AuthLayout (shop owner)
//   /register-shop                → AuthLayout (shop registration)
//   /application-status           → AuthLayout (post-submission)
//   /admin/login                  → AuthLayout (admin)
//   /admin/**                     → DashboardLayout (ADMIN only)
//   /shop-owner/**                → DashboardLayout (SHOP_OWNER only)
//   /dashboard/**                 → DashboardLayout (CUSTOMER only)
// ─────────────────────────────────────────────────────────────

import { Routes, Route, Navigate } from 'react-router-dom';

// ── Layouts ───────────────────────────────────────────────────
import PublicLayout    from '../layouts/PublicLayout';
import AuthLayout      from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';

// ── Route Guards ──────────────────────────────────────────────
import ProtectedRoute  from '../components/auth/ProtectedRoute';
import RoleRoute       from '../components/auth/RoleRoute';

// ── Public Pages ──────────────────────────────────────────────
import HomePage        from '../pages/HomePage';
import ShopsPage       from '../pages/ShopsPage';
import TrackPage       from '../pages/TrackPage';
import ShopProfilePage from '../pages/ShopProfilePage';
import NotFoundPage    from '../pages/NotFoundPage';

// ── Auth Pages ────────────────────────────────────────────────
import LoginPage              from '../pages/LoginPage';
import RegisterPage           from '../pages/RegisterPage';
import ShopOwnerLoginPage     from '../pages/ShopOwnerLoginPage';
import RegisterShopPage       from '../pages/RegisterShopPage';
import ApplicationStatusPage  from '../pages/ApplicationStatusPage';
import AdminLoginPage         from '../pages/AdminLoginPage';

// ── Customer Dashboard Pages ──────────────────────────────────
import DashboardPage          from '../pages/DashboardPage';
import RepairsPage            from '../pages/customer/RepairsPage';
import PickupsPage            from '../pages/customer/PickupsPage';
import NewPickupPage          from '../pages/customer/NewPickupPage';
import TrackDashboardPage     from '../pages/customer/TrackDashboardPage';
import ProfilePage            from '../pages/customer/ProfilePage';

// ── Shop Owner Dashboard Pages ────────────────────────────────
import ShopOwnerDashboardPage from '../pages/ShopOwnerDashboardPage';
import PickupRequestsPage     from '../pages/shopowner/PickupRequestsPage';
import ShopRepairsPage        from '../pages/shopowner/ShopRepairsPage';
import ShopCustomersPage      from '../pages/shopowner/ShopCustomersPage';
import MyShopPage             from '../pages/shopowner/MyShopPage';

// ── Admin Dashboard Pages ─────────────────────────────────────
import AdminPage              from '../pages/AdminPage';
import ShopRequestsPage       from '../pages/admin/ShopRequestsPage';
import ShopsAdminPage         from '../pages/admin/ShopsAdminPage';
import ShopOwnersPage         from '../pages/admin/ShopOwnersPage';
import CustomersAdminPage     from '../pages/admin/CustomersAdminPage';
import RepairsAdminPage       from '../pages/admin/RepairsAdminPage';
import PickupsAdminPage       from '../pages/admin/PickupsAdminPage';

// ── Constants ─────────────────────────────────────────────────
import { ROUTES, ROLES } from '../constants';

export default function AppRoutes() {
  return (
    <Routes>

      {/* ── Public Routes ──────────────────────────────────── */}
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path={ROUTES.SHOPS}  element={<ShopsPage />} />
        <Route path={ROUTES.TRACK}  element={<TrackPage />} />
        <Route path="/shops/:slug"  element={<ShopProfilePage />} />
      </Route>

      {/* ── Customer Auth ───────────────────────────────────── */}
      <Route element={<AuthLayout />}>
        <Route path={ROUTES.LOGIN}    element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      </Route>

      {/* ── Shop Owner Auth ─────────────────────────────────── */}
      <Route element={<AuthLayout />}>
        <Route path={ROUTES.SHOP_OWNER_LOGIN}   element={<ShopOwnerLoginPage />} />
        <Route
          path={ROUTES.REGISTER_SHOP}
          element={
            <RoleRoute requiredRole={ROLES.CUSTOMER} loginPath={ROUTES.LOGIN}>
              <RegisterShopPage />
            </RoleRoute>
          }
        />
        <Route
          path={ROUTES.APPLICATION_STATUS}
          element={
            <ProtectedRoute loginPath={ROUTES.LOGIN}>
              <ApplicationStatusPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* ── Admin Auth ──────────────────────────────────────── */}
      <Route element={<AuthLayout />}>
        <Route path={ROUTES.ADMIN_LOGIN} element={<AdminLoginPage />} />
      </Route>

      {/* ── Admin Dashboard (ADMIN role only) ──────────────── */}
      <Route
        path="/admin"
        element={
          <RoleRoute requiredRole={ROLES.ADMIN} loginPath={ROUTES.ADMIN_LOGIN}>
            <DashboardLayout />
          </RoleRoute>
        }
      >
        {/* /admin — overview */}
        <Route index element={<AdminPage />} />
        {/* /admin/shop-requests */}
        <Route path="shop-requests" element={<ShopRequestsPage />} />
        {/* /admin/shops */}
        <Route path="shops" element={<ShopsAdminPage />} />
        {/* /admin/shop-owners */}
        <Route path="shop-owners" element={<ShopOwnersPage />} />
        {/* /admin/customers */}
        <Route path="customers" element={<CustomersAdminPage />} />
        {/* /admin/repairs */}
        <Route path="repairs" element={<RepairsAdminPage />} />
        {/* /admin/pickups */}
        <Route path="pickups" element={<PickupsAdminPage />} />
      </Route>

      {/* ── Shop Owner Dashboard (SHOP_OWNER role only) ─────── */}
      <Route
        path="/shop-owner"
        element={
          <RoleRoute requiredRole={ROLES.SHOP_OWNER} loginPath={ROUTES.SHOP_OWNER_LOGIN}>
            <DashboardLayout />
          </RoleRoute>
        }
      >
        {/* /shop-owner → redirect to /shop-owner/dashboard */}
        <Route index element={<Navigate to={ROUTES.SHOP_OWNER_DASHBOARD} replace />} />
        {/* /shop-owner/dashboard */}
        <Route path="dashboard"  element={<ShopOwnerDashboardPage />} />
        {/* /shop-owner/pickups */}
        <Route path="pickups"    element={<PickupRequestsPage />} />
        {/* /shop-owner/repairs */}
        <Route path="repairs"             element={<ShopRepairsPage />} />
        <Route path="repairs/:repairId"   element={<ShopRepairsPage />} />
        {/* /shop-owner/customers */}
        <Route path="customers"  element={<ShopCustomersPage />} />
        {/* /shop-owner/shop */}
        <Route path="shop"       element={<MyShopPage />} />
      </Route>

      {/* ── Customer Dashboard (CUSTOMER role only) ──────────── */}
      <Route
        path="/dashboard"
        element={
          <RoleRoute requiredRole={ROLES.CUSTOMER} loginPath={ROUTES.LOGIN}>
            <DashboardLayout />
          </RoleRoute>
        }
      >
        {/* /dashboard — overview */}
        <Route index element={<DashboardPage />} />
        {/* /dashboard/repairs */}
        <Route path="repairs"             element={<RepairsPage />} />
        <Route path="repairs/:repairId"   element={<RepairsPage />} />
        {/* /dashboard/pickups */}
        <Route path="pickups"  element={<PickupsPage />} />
        {/* /dashboard/pickups/new */}
        <Route path="pickups/new" element={<NewPickupPage />} />
        {/* /dashboard/track */}
        <Route path="track"    element={<TrackDashboardPage />} />
        {/* /dashboard/profile */}
        <Route path="profile"  element={<ProfilePage />} />
      </Route>

      {/* ── Legacy /portal → /dashboard ─────────────────────── */}
      <Route path="/portal/*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

      {/* ── 404 Catch-all ────────────────────────────────────── */}
      <Route path="*" element={<NotFoundPage />} />

    </Routes>
  );
}
