// ─────────────────────────────────────────────────────────────
// RepairTrack — Shop Card (public discovery)
// ─────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom';
import {
  Laptop, Smartphone, WashingMachine, Monitor, Star,
  MapPin, Clock, ArrowRight, Truck, CheckCircle2, ShieldCheck,
} from 'lucide-react';
import { cn } from '../../utils';
import Button from '../ui/Button';
import { ROUTES, ROLES } from '../../constants';
import { useAuth } from '../../context/AuthContext';

// ─── Category icon mapping ────────────────────────────────────
const CATEGORY_ICONS = {
  laptop:            { icon: Laptop,         bg: 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800/40' },
  smartphone:        { icon: Smartphone,     bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40' },
  'washing-machine': { icon: WashingMachine, bg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/40' },
  monitor:           { icon: Monitor,        bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40' },
};

const DEFAULT_ICON = { icon: Laptop, bg: 'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-surface-200 dark:border-slate-700' };

// ─── Star Rating ─────────────────────────────────────────────
function StarRating({ rating = 4.8, reviewCount = 0 }) {
  const safeRating = typeof rating === 'number' && !isNaN(rating) ? rating : 4.8;
  const safeCount = typeof reviewCount === 'number' ? reviewCount : 0;
  return (
    <div className="flex items-center gap-1.5" aria-label={`Rated ${safeRating.toFixed(1)} out of 5 stars from ${safeCount} reviews`}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={13}
            className={n <= Math.round(safeRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700 fill-slate-200 dark:fill-slate-700'}
            aria-hidden="true"
          />
        ))}
      </div>
      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{safeRating.toFixed(1)}</span>
      <span className="text-xs text-slate-400 dark:text-slate-500">({safeCount})</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function ShopCard({ shop }) {
  const { isAuthenticated, user } = useAuth();
  const iconConfig = CATEGORY_ICONS[shop.categoryIcon] || DEFAULT_ICON;
  const IconComponent = iconConfig.icon;

  let pickupDestination = ROUTES.LOGIN;
  let pickupState = null;

  if (!isAuthenticated) {
    pickupDestination = ROUTES.LOGIN;
    pickupState = shop?.id ? { from: `${ROUTES.DASHBOARD_PICKUPS_NEW}?shop=${shop.id}` } : null;
  } else if (user?.role === ROLES.CUSTOMER) {
    pickupDestination = shop?.id ? `${ROUTES.DASHBOARD_PICKUPS_NEW}?shop=${shop.id}` : ROUTES.DASHBOARD_PICKUPS_NEW;
  } else if (user?.role === ROLES.SHOP_OWNER) {
    pickupDestination = ROUTES.SHOP_OWNER_DASHBOARD;
  } else if (user?.role === ROLES.ADMIN) {
    pickupDestination = ROUTES.ADMIN;
  }

  return (
    <article className="group bg-white dark:bg-slate-900 rounded-xl border border-surface-200 dark:border-slate-800 shadow-sm hover:shadow-card hover:border-primary-200 dark:hover:border-primary-800/60 transition-all duration-200 flex flex-col h-full overflow-hidden">
      {/* ── Top accent bar ────────────────────────────── */}
      <div className="h-1 bg-surface-100 dark:bg-slate-800 group-hover:bg-primary-500 transition-colors duration-200" />

      <div className="p-5 sm:p-6 flex flex-col flex-1">
        {/* ── Header: Icon + Name + Category ──────────── */}
        <div className="flex items-start gap-3.5 mb-3.5">
          <div className={cn('flex-center h-12 w-12 rounded-xl border shrink-0 transition-transform duration-200 group-hover:scale-105', iconConfig.bg)}>
            <IconComponent size={24} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                {shop.name}
              </h3>
              {shop.isVerified && (
                <span title="Verified Shop" className="inline-flex shrink-0">
                  <ShieldCheck size={16} className="text-primary-600 dark:text-primary-400" />
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
              {shop.category}
            </p>
          </div>
        </div>

        {/* ── Rating & Status ──────────────────────────── */}
        <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-surface-100 dark:border-slate-800">
          <StarRating rating={shop.rating} reviewCount={shop.reviewCount} />
          <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Open
          </span>
        </div>

        {/* ── Description (standard height) ───────────── */}
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 min-h-[2.75rem] mb-4">
          {shop.description}
        </p>

        {/* ── Meta: Location, Service Areas & Turnaround ── */}
        <div className="space-y-1.5 mb-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 truncate">
            <MapPin size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="truncate">{shop.location}</span>
          </div>
          {shop.serviceAreas && shop.serviceAreas.length > 0 && (
            <div className="flex items-center gap-1.5 text-2xs text-slate-500 dark:text-slate-400 truncate pl-0.5">
              <span className="text-slate-400 dark:text-slate-500 font-medium">Serving:</span>
              <span className="font-semibold text-primary-700 dark:text-primary-400 truncate">{shop.serviceAreas.join(', ')}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span>Turnaround: <strong className="font-semibold text-slate-700 dark:text-slate-200">{shop.turnaround}</strong></span>
          </div>
        </div>

        {/* ── Tags ─────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {(shop.tags || []).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md text-2xs font-medium bg-surface-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border border-surface-200 dark:border-slate-700"
            >
              {tag}
            </span>
          ))}
          {shop.pickupAvailable && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-medium bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800/50">
              <Truck size={10} />
              Pickup
            </span>
          )}
        </div>

        {/* ── Actions pinned to bottom ────────────────── */}
        <div className="mt-auto pt-3 border-t border-surface-100 dark:border-slate-800 flex items-center gap-2">
          <Button
            as={Link}
            to={ROUTES.SHOP_DETAIL(shop.slug)}
            variant="secondary"
            size="sm"
            rightIcon={<ArrowRight size={13} />}
            className="flex-1 text-xs sm:text-sm font-semibold"
          >
            View Shop
          </Button>
          <Button
            as={Link}
            to={pickupDestination}
            state={pickupState}
            size="sm"
            leftIcon={<Truck size={13} />}
            className="flex-1 text-xs sm:text-sm font-semibold"
          >
            Request Pickup
          </Button>
        </div>
      </div>
    </article>
  );
}
