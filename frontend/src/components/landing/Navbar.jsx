// ─────────────────────────────────────────────────────────────
// RepairTrack — Public Navbar
// Authentication-aware navigation header with role-specific
// tracking and dashboard entry points.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Wrench, Menu, X, ChevronRight, LogOut, LayoutDashboard, User } from 'lucide-react';
import { cn } from '../../utils';
import { ROUTES } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import ThemeToggle from '../common/ThemeToggle';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const [activeAnchor, setActiveAnchor] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isCustomer, isShopOwner, isAdmin, getRedirectPath, getLogoDestination, logout } = useAuth();
  const logoDestination = getLogoDestination ? getLogoDestination() : ROUTES.HOME;

  // Dynamic Navigation Links based on authentication status
  const navLinks = useMemo(() => {
    const links = [
      { label: 'Home',         href: ROUTES.HOME, exact: true },
      { label: 'Find Shops',   href: ROUTES.SHOPS },
      { label: 'How It Works', href: '/#how-it-works' },
    ];

    // Customer / Guest: Track Repair link
    if (!isShopOwner && !isAdmin) {
      links.push({
        label: 'Track Repair',
        href: isCustomer ? ROUTES.DASHBOARD_TRACK : ROUTES.TRACK,
      });
    }

    // Always include Register Your Shop in main nav
    links.push({
      label: 'Register Your Shop',
      href: ROUTES.REGISTER_SHOP,
    });

    return links;
  }, [isCustomer, isShopOwner, isAdmin]);

  // Subtle shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Sync activeAnchor with location.hash or pathname
  useEffect(() => {
    if (location.pathname === '/') {
      setActiveAnchor(location.hash);
    } else {
      setActiveAnchor('');
    }
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  // Observer to track visible section on homepage
  useEffect(() => {
    if (location.pathname !== '/') return;

    const el = document.getElementById('how-it-works');
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActiveAnchor('#how-it-works');
        } else {
          const rect = el.getBoundingClientRect();
          if (rect.top > 150) {
            setActiveAnchor('');
          }
        }
      },
      { rootMargin: '-15% 0px -40% 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [location.pathname]);

  const isActive = useCallback((link) => {
    if (link.exact) {
      return location.pathname === link.href && !activeAnchor;
    }
    if (link.href.startsWith('/#')) {
      const targetHash = link.href.replace('/', '');
      return location.pathname === '/' && activeAnchor === targetHash;
    }
    if (link.href === ROUTES.SHOPS) {
      return location.pathname.startsWith('/shops');
    }
    return location.pathname === link.href;
  }, [location.pathname, activeAnchor]);

  const handleNavClick = (e, href) => {
    e.preventDefault();
    setMobileOpen(false);

    const isPrefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollBehavior = isPrefersReduced ? 'auto' : 'smooth';

    if (href.startsWith('/#')) {
      const targetId = href.replace('/#', '');
      setActiveAnchor(`#${targetId}`);

      if (location.pathname === '/') {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
        }
        navigate({ pathname: '/', hash: `#${targetId}` }, { replace: true, state: { scrolledByClick: true } });
      } else {
        navigate({ pathname: '/', hash: `#${targetId}` }, { state: { scrollTo: targetId } });
      }
    } else if (href === ROUTES.HOME) {
      setActiveAnchor('');

      if (location.pathname === '/') {
        window.scrollTo({ top: 0, behavior: scrollBehavior });
        navigate(ROUTES.HOME, { replace: true, state: { scrolledByClick: true } });
      } else {
        navigate(ROUTES.HOME);
      }
    } else {
      navigate(href);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate(ROUTES.HOME);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-header bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm transition-all duration-200',
        scrolled ? 'shadow-sm border-b border-surface-200 dark:border-slate-800 py-0' : 'border-b border-surface-200/80 dark:border-slate-800/80 py-0'
      )}
    >
      <div className="page-container">
        <nav className="flex items-center justify-between h-16" aria-label="Main navigation">
          {/* ── Brand ─────────────────────────────────────── */}
          <Link
            to={logoDestination}
            onClick={(e) => {
              e.preventDefault();
              setMobileOpen(false);
              navigate(logoDestination);
            }}
            className="flex items-center gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg group"
            aria-label="RepairTrack home"
          >
            <span className="flex-center h-9 w-9 rounded-xl bg-primary-600 text-white shadow-xs group-hover:bg-primary-700 transition-colors duration-200 ease-in-out">
              <Wrench size={18} strokeWidth={2.4} />
            </span>
            <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
              Repair<span className="text-primary-600">Track</span>
            </span>
          </Link>

          {/* ── Desktop Nav Links ──────────────────────── */}
          <ul className="hidden lg:flex items-center gap-1" role="list">
            {navLinks.map((link) => {
              const active = isActive(link);
              return (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ease-in-out select-none',
                      active
                        ? 'text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100/70 dark:hover:bg-primary-900/60'
                        : 'text-slate-600 dark:text-slate-300 bg-transparent hover:text-slate-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-slate-800'
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>

          {/* ── Desktop CTA (Auth-Aware) ────────────────── */}
          <div className="hidden lg:flex items-center gap-2">
            <ThemeToggle />

            <div className="h-4 w-px bg-surface-200 dark:bg-slate-800 mx-1" />

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to={getRedirectPath()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/60 transition-colors"
                >
                  <LayoutDashboard size={15} />
                  <span>Dashboard</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950/40 transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  to={ROUTES.LOGIN}
                  className={cn(
                    'px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ease-in-out select-none',
                    location.pathname === ROUTES.LOGIN
                      ? 'text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100/70 dark:hover:bg-primary-900/60'
                      : 'text-slate-600 dark:text-slate-300 bg-transparent hover:text-slate-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-slate-800'
                  )}
                >
                  Log in
                </Link>
                <Button
                  as={Link}
                  to={ROUTES.LOGIN}
                  size="sm"
                  rightIcon={<ChevronRight size={14} />}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* ── Mobile hamburger ──────────────────────── */}
          <button
            type="button"
            className="lg:hidden flex-center h-10 w-10 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-surface-100 dark:hover:bg-slate-800 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>
      </div>

      {/* ── Mobile Menu Dropdown (Absolute overlay to prevent layout shift) ── */}
      <div
        id="mobile-menu"
        className={cn(
          'lg:hidden absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border-b border-surface-200 dark:border-slate-800 shadow-xl transition-all duration-200 ease-smooth overflow-hidden',
          mobileOpen
            ? 'max-h-[36rem] opacity-100 py-3 visible pointer-events-auto'
            : 'max-h-0 opacity-0 py-0 invisible pointer-events-none'
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="page-container space-y-1">
          {navLinks.map((link) => {
            const active = isActive(link);
            return (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ease-in-out select-none',
                  active
                    ? 'text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60'
                    : 'text-slate-700 dark:text-slate-300 bg-transparent hover:bg-surface-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:bg-surface-200 dark:active:bg-slate-700'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span>{link.label}</span>
                <ChevronRight
                  size={14}
                  className={cn(
                    'transition-colors duration-200',
                    active ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'
                  )}
                />
              </a>
            );
          })}

          {/* Theme toggle on mobile */}
          <div className="pt-2">
            <ThemeToggle showLabel />
          </div>

          {/* Divider & Auth buttons */}
          <div className="pt-3 mt-2 border-t border-surface-200 dark:border-slate-800 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to={getRedirectPath()}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                >
                  <LayoutDashboard size={16} />
                  <span>Go to Dashboard</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950/40 transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to={ROUTES.LOGIN}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ease-in-out',
                    location.pathname === ROUTES.LOGIN
                      ? 'text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 bg-surface-100 dark:bg-slate-800 hover:bg-surface-200 dark:hover:bg-slate-700'
                  )}
                >
                  Log in
                </Link>
                <Link
                  to={ROUTES.LOGIN}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 hover:text-white active:bg-primary-800 active:text-white shadow-sm transition-colors duration-200 ease-in-out"
                >
                  <span>Get Started</span>
                  <ChevronRight size={14} className="text-current" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
