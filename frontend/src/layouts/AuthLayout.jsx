// ─────────────────────────────────────────────────────────────
// RepairTrack — Auth Layout
// Shared layout for all authentication pages.
// Auto-detects context (customer / shop-owner / admin) from URL.
// ─────────────────────────────────────────────────────────────

import { Outlet, Link, useLocation } from 'react-router-dom';
import { Wrench, ShieldCheck, Store } from 'lucide-react';
import { ROUTES } from '../constants';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/common/ThemeToggle';

/**
 * Centered authentication layout with:
 * - Auto-detected visual variant based on URL prefix
 * - RepairTrack branding in top bar
 * - Responsive centered card container
 * - ThemeToggle & convenient home navigation
 */
export default function AuthLayout() {
  const { pathname } = useLocation();
  const { getLogoDestination } = useAuth();
  const logoDestination = getLogoDestination ? getLogoDestination() : ROUTES.HOME;

  const isAdmin     = pathname.startsWith('/admin');
  const isShopOwner = pathname.startsWith('/shop-owner') || pathname === '/register-shop' || pathname === '/application-status';
  const isWide      = pathname === '/register-shop';
  const isMedium    = pathname === '/application-status';

  // ── Visual configuration per context ──────────────────────
  const config = isAdmin
    ? {
        logoIcon:   <ShieldCheck size={18} strokeWidth={2.4} />,
        tagline:    'Admin Portal',
      }
    : isShopOwner
    ? {
        logoIcon:   <Store size={18} strokeWidth={2.4} />,
        tagline:    'Shop Portal',
      }
    : {
        logoIcon:   <Wrench size={18} strokeWidth={2.4} />,
        tagline:    null,
      };

  return (
    <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">

      {/* ── Top Bar ──────────────────────────────────────── */}
      <header className="bg-white dark:bg-slate-900 border-b border-surface-200 dark:border-slate-800 shrink-0 sticky top-0 z-30 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-4">
          {/* Brand */}
          <Link
            to={logoDestination}
            className="inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg group"
            aria-label="RepairTrack home"
          >
            <span
              className="flex items-center justify-center h-8 w-8 rounded-xl bg-primary-600 text-white shrink-0 shadow-xs group-hover:bg-primary-700 transition-colors"
            >
              {config.logoIcon}
            </span>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
              Repair<span className="text-primary-600 dark:text-primary-400">Track</span>
            </span>
            {config.tagline && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/60 ml-1 hidden sm:inline-flex items-center">
                {config.tagline}
              </span>
            )}
          </Link>

          {/* Right side — Theme toggle & link back to public site */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="h-4 w-px bg-surface-200 dark:bg-slate-800 hidden xs:block" />
            <Link
              to={ROUTES.HOME}
              className="text-xs font-medium text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 transition-colors inline-flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-surface-100 dark:hover:bg-slate-800/60"
            >
              <span aria-hidden="true">←</span>
              <span className="hidden sm:inline">Back to site</span>
              <span className="sm:hidden">Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Centered Content Area ─────────────────────────── */}
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-8 sm:py-12">
        <div className={`w-full ${isWide ? 'max-w-2xl' : isMedium ? 'max-w-xl' : 'max-w-md'} transition-all duration-200`}>
          <Outlet />
        </div>
      </main>

      {/* ── Footer Strip ──────────────────────────────────── */}
      <footer className="py-4 text-center border-t bg-white dark:bg-slate-900 border-surface-200 dark:border-slate-800 transition-colors duration-200">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} RepairTrack. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
