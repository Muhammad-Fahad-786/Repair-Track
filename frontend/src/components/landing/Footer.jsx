// ─────────────────────────────────────────────────────────────
// RepairTrack — Public Footer
// ─────────────────────────────────────────────────────────────

import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Wrench, MapPin, Mail } from 'lucide-react';
import { ROUTES } from '../../constants';
import { useAuth } from '../../context/AuthContext';

const FOOTER_NAV = [
  { label: 'Home',         href: ROUTES.HOME },
  { label: 'Find Shops',   href: ROUTES.SHOPS },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Track Repair', href: ROUTES.TRACK },
];

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Contact Support', href: '#' },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const navigate = useNavigate();
  const location = useLocation();
  const { getLogoDestination } = useAuth();
  const logoDestination = getLogoDestination ? getLogoDestination() : ROUTES.HOME;

  const handleLinkClick = (e, href) => {
    const isPrefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollBehavior = isPrefersReduced ? 'auto' : 'smooth';

    if (href.startsWith('/#')) {
      e.preventDefault();
      const targetId = href.replace('/#', '');
      if (location.pathname === '/') {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
        }
        navigate({ pathname: '/', hash: `#${targetId}` }, { replace: true, state: { scrolledByClick: true } });
      } else {
        navigate({ pathname: '/', hash: `#${targetId}` }, { state: { scrollTo: targetId } });
      }
    } else if (href === ROUTES.HOME && location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: scrollBehavior });
      navigate(ROUTES.HOME, { replace: true, state: { scrolledByClick: true } });
    } else if (!href.startsWith('#')) {
      e.preventDefault();
      navigate(href);
    }
  };

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-slate-300 border-t border-slate-800 dark:border-slate-800/80 transition-colors duration-200">
      <div className="page-container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

          {/* ── Brand & Description Column (5 cols) ───────── */}
          <div className="md:col-span-5 space-y-4">
            <Link
              to={logoDestination}
              onClick={(e) => {
                if (logoDestination !== ROUTES.HOME) {
                  e.preventDefault();
                  navigate(logoDestination);
                } else {
                  handleLinkClick(e, ROUTES.HOME);
                }
              }}
              className="inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded-lg group"
              aria-label="RepairTrack home"
            >
              <span className="flex-center h-9 w-9 rounded-xl bg-primary-600 text-white shrink-0 group-hover:bg-primary-500 transition-colors">
                <Wrench size={18} strokeWidth={2.4} />
              </span>
              <span className="font-extrabold text-xl text-white tracking-tight">
                Repair<span className="text-primary-400">Track</span>
              </span>
            </Link>

            <p className="text-sm leading-relaxed text-slate-400 max-w-sm">
              AI-powered repair shop discovery, doorstep pickup management, and real-time
              repair lifecycle tracking — designed for modern local repair businesses.
            </p>

            <div className="flex flex-col gap-2 pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-500 shrink-0" />
                Connecting repair shops and customers nationwide
              </span>
              <span className="flex items-center gap-2">
                <Mail size={14} className="text-slate-500 shrink-0" />
                support@repairtrack.pk
              </span>
            </div>
          </div>

          {/* ── Platform Links (2 cols) ───────────────────── */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Platform
            </h3>
            <ul className="space-y-2.5">
              {FOOTER_NAV.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => handleLinkClick(e, link.href)}
                    className="text-sm text-slate-400 hover:text-white transition-colors duration-150 inline-block py-0.5"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* ── For Repair Shops (2 cols) ──────────────────── */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              For Repair Shops
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link
                  to={ROUTES.REGISTER_SHOP}
                  className="text-sm text-slate-400 hover:text-white transition-colors duration-150 inline-block py-0.5"
                >
                  Register Your Shop
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.SHOP_OWNER_LOGIN}
                  className="text-sm text-slate-400 hover:text-white transition-colors duration-150 inline-block py-0.5"
                >
                  Shop Owner Login
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.APPLICATION_STATUS}
                  className="text-sm text-slate-400 hover:text-white transition-colors duration-150 inline-block py-0.5"
                >
                  Application Status
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Legal & Support Links (3 cols) ────────────── */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Legal &amp; Support
            </h3>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors duration-150 inline-block py-0.5"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* ── Bottom Copyright Bar ────────────────────────── */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            © {year} RepairTrack. All rights reserved.
          </p>
          <p className="text-slate-500">
            A production-grade repair lifecycle &amp; discovery platform.
          </p>
        </div>
      </div>
    </footer>
  );
}
