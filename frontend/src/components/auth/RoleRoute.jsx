// ─────────────────────────────────────────────────────────────
// RepairTrack — Role-Based Route Guard (Phase 5.1 Real Auth)
//
// Enforces both authentication AND the required role.
// ─────────────────────────────────────────────────────────────

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES, ROUTES } from '../../constants';

// Map each role to its correct dashboard when the user lands on
// the wrong role's route.
const ROLE_HOME = {
  [ROLES.CUSTOMER]:   ROUTES.DASHBOARD,
  [ROLES.SHOP_OWNER]: ROUTES.SHOP_OWNER_DASHBOARD,
  [ROLES.ADMIN]:      ROUTES.ADMIN,
};

/**
 * Enforces both authentication AND the correct role.
 *
 * - Loading             → render loading spinner
 * - Not authenticated   → redirect to `loginPath`
 * - Wrong role          → redirect to that role's own dashboard
 * - Correct role        → render `children`
 *
 * @param {React.ReactNode}    children
 * @param {'CUSTOMER'|'SHOP_OWNER'|'ADMIN'} requiredRole
 * @param {string}             loginPath
 */
export default function RoleRoute({
  children,
  requiredRole,
  loginPath = ROUTES.LOGIN,
}) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (requiredRole && role !== requiredRole) {
    // Authenticated but wrong role — redirect to their correct dashboard
    const correctPath = ROLE_HOME[role] || ROUTES.HOME;
    return <Navigate to={correctPath} replace />;
  }

  return children;
}
