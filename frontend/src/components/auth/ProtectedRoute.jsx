// ─────────────────────────────────────────────────────────────
// RepairTrack — Protected Route Guard (Phase 5.1 Real Auth)
//
// Redirects unauthenticated users to the appropriate login page.
// Displays clean loading spinner while verifying token on startup.
// ─────────────────────────────────────────────────────────────

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../constants';

/**
 * Wraps a route element and enforces authentication.
 *
 * @param {React.ReactNode} children
 * @param {string}          loginPath — Login route to redirect to
 */
export default function ProtectedRoute({
  children,
  loginPath = ROUTES.LOGIN,
}) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={loginPath}
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
}
