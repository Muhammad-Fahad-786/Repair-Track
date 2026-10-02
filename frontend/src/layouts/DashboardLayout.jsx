// ─────────────────────────────────────────────────────────────
// RepairTrack — Dashboard Layout
// Role-aware sidebar + header shell for all dashboard views.
// Detects role from AuthContext and renders the appropriate nav.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Wrench, LayoutDashboard, Package, Users, User, Store,
  FileText, Menu, X, LogOut, ShieldCheck, MapPin,
} from 'lucide-react';
import { cn } from '../utils';
import { ROUTES } from '../constants';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/common/ThemeToggle';

// ─── Sidebar link definitions per role (path-based) ──────────
const ADMIN_LINKS = [
  { label: 'Overview',        href: ROUTES.ADMIN,               icon: LayoutDashboard },
  { label: 'Shop Requests',   href: ROUTES.ADMIN_SHOP_REQUESTS, icon: FileText        },
  { label: 'Shops',           href: ROUTES.ADMIN_SHOPS,         icon: Store           },
  { label: 'Shop Owners',     href: ROUTES.ADMIN_SHOP_OWNERS,   icon: Users           },
  { label: 'Customers',       href: ROUTES.ADMIN_CUSTOMERS,     icon: User            },
  { label: 'Repairs',         href: ROUTES.ADMIN_REPAIRS,       icon: Wrench          },
  { label: 'Pickup Requests', href: ROUTES.ADMIN_PICKUPS,       icon: Package         },
];

const SHOP_OWNER_LINKS = [
  { label: 'Overview',        href: ROUTES.SHOP_OWNER_DASHBOARD, icon: LayoutDashboard },
  { label: 'Pickup Requests', href: ROUTES.SHOP_OWNER_PICKUPS,   icon: Package         },
  { label: 'Active Repairs',  href: ROUTES.SHOP_OWNER_REPAIRS,   icon: Wrench          },
  { label: 'Customers',       href: ROUTES.SHOP_OWNER_CUSTOMERS, icon: Users           },
  { label: 'My Shop',         href: ROUTES.SHOP_OWNER_SHOP,      icon: Store           },
];

const CUSTOMER_LINKS = [
  { label: 'Overview',    href: ROUTES.DASHBOARD,             icon: LayoutDashboard },
  { label: 'My Repairs',  href: ROUTES.DASHBOARD_REPAIRS,     icon: Wrench          },
  { label: 'My Pickups',  href: ROUTES.DASHBOARD_PICKUPS,     icon: Package         },
  { label: 'Track Repair',href: ROUTES.DASHBOARD_TRACK,       icon: MapPin          },
  { label: 'My Profile',  href: ROUTES.DASHBOARD_PROFILE,     icon: User            },
];

// ─── Component ────────────────────────────────────────────────
export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, role, logout, isAdmin, isShopOwner, getLogoDestination } = useAuth();
  const logoDestination = getLogoDestination ? getLogoDestination() : ROUTES.HOME;

  const links     = isAdmin ? ADMIN_LINKS : isShopOwner ? SHOP_OWNER_LINKS : CUSTOMER_LINKS;
  const roleLabel = isAdmin ? 'Admin' : isShopOwner ? 'Shop Owner' : 'Customer';
  const roleIcon  = isAdmin
    ? <ShieldCheck size={14} className="text-primary-400" />
    : isShopOwner
    ? <Store size={14} className="text-primary-400" />
    : <User size={14} className="text-primary-400" />;

  // Path-based active link — exact match, or prefix match for non-root routes
  const isActive = (href) => {
    if (href === ROUTES.ADMIN || href === ROUTES.DASHBOARD || href === ROUTES.SHOP_OWNER_DASHBOARD) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
  };

  // ── Sidebar content (shared between desktop + mobile) ──────
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`px-5 py-5 border-b ${isAdmin ? 'border-slate-700' : 'border-surface-200 dark:border-slate-800'}`}>
        <Link
          to={logoDestination}
          className="inline-flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
        >
          <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-primary-600 text-white shrink-0">
            <Wrench size={16} strokeWidth={2.4} />
          </span>
          <span className={`font-bold text-sm tracking-tight ${isAdmin ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
            Repair<span className="text-primary-500">Track</span>
          </span>
        </Link>
      </div>

      {/* Role badge + user name */}
      <div className={`px-5 py-3 ${isAdmin ? 'border-b border-slate-700' : 'border-b border-surface-200 dark:border-slate-800'}`}>
        <div className="flex items-center gap-1.5">
          {roleIcon}
          <span className={`text-xs font-semibold uppercase tracking-wider ${isAdmin ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {roleLabel}
          </span>
        </div>
        {user && (
          <p className={`text-xs mt-0.5 truncate ${isAdmin ? 'text-slate-300' : 'text-slate-700 dark:text-slate-300'} font-medium`}>
            {user.name}
          </p>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Dashboard navigation">
        {links.map((link) => {
          const active = isActive(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 select-none group',
                isAdmin
                  ? active
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  : active
                  ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                size={16}
                className={cn(
                  'shrink-0 transition-colors',
                  isAdmin
                    ? active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    : active ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                )}
              />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className={`px-3 py-4 border-t ${isAdmin ? 'border-slate-700' : 'border-surface-200 dark:border-slate-800'}`}>
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 select-none',
            isAdmin
              ? 'text-slate-400 hover:bg-slate-700 hover:text-white'
              : 'text-slate-500 dark:text-slate-400 hover:bg-danger-50 dark:hover:bg-danger-950/40 hover:text-danger-700 dark:hover:text-danger-400'
          )}
        >
          <LogOut size={16} className="shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* ── Desktop Sidebar ───────────────────────────────── */}
      <aside
        className={cn(
          'hidden lg:flex flex-col w-64 shrink-0 border-r',
          isAdmin ? 'bg-slate-900 border-slate-700' : 'bg-white dark:bg-slate-900 border-surface-200 dark:border-slate-800'
        )}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile Sidebar Overlay ────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-sidebar lg:hidden"
          aria-modal="true"
          role="dialog"
          aria-label="Sidebar navigation"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Panel */}
          <aside
            className={cn(
              'absolute left-0 top-0 bottom-0 w-72 flex flex-col shadow-modal',
              isAdmin ? 'bg-slate-900' : 'bg-white dark:bg-slate-900'
            )}
          >
            <button
              className={cn(
                'absolute top-4 right-4 flex items-center justify-center h-8 w-8 rounded-lg transition-colors',
                isAdmin
                  ? 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-surface-100 dark:hover:bg-slate-800'
              )}
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main Content Area ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface-50 dark:bg-slate-950">
        {/* Top Header */}
        <header className={cn(
          'h-14 shrink-0 flex items-center justify-between px-4 sm:px-6 border-b z-header',
          isAdmin ? 'bg-slate-800 border-slate-700' : 'bg-white dark:bg-slate-900 border-surface-200 dark:border-slate-800 shadow-xs'
        )}>
          {/* Mobile hamburger */}
          <button
            className={cn(
              'lg:hidden flex items-center justify-center h-9 w-9 rounded-lg transition-colors mr-3',
              isAdmin
                ? 'text-slate-400 hover:bg-slate-700 hover:text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-slate-800'
            )}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          {/* Dashboard label */}
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn(
              'font-semibold text-sm hidden sm:block',
              isAdmin ? 'text-white' : 'text-slate-900 dark:text-white'
            )}>
              {isAdmin ? 'Admin Dashboard' : isShopOwner ? 'Shop Dashboard' : 'My Dashboard'}
            </span>
          </div>

          {/* Right side — user info + theme toggle + logout */}
          <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
            <ThemeToggle />

            {user && (
              <div className="hidden sm:flex items-center gap-2">
                <div className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold',
                  isAdmin ? 'bg-primary-600 text-white' : 'bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300'
                )}>
                  {user.avatar || user.name?.charAt(0) || '?'}
                </div>
                <span className={cn(
                  'text-xs font-medium',
                  isAdmin ? 'text-slate-300' : 'text-slate-700 dark:text-slate-300'
                )}>
                  {user.name}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className={cn(
                'flex items-center justify-center h-8 w-8 rounded-lg transition-colors',
                isAdmin
                  ? 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  : 'text-slate-400 hover:bg-surface-100 dark:hover:bg-slate-800 hover:text-danger-600 dark:hover:text-danger-400'
              )}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="page-container py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
