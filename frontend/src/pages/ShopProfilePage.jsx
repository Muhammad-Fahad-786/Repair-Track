// ─────────────────────────────────────────────────────────────
// RepairTrack — Public Shop Profile Page
// Polished public shop view powered by mock data.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Store, Star, MapPin, Clock, Phone, Mail,
  ShieldCheck, Truck, Wrench, CheckCircle2, ChevronRight,
  Laptop, Smartphone, WashingMachine, Monitor, AlertCircle, Ban,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { ROUTES, ROLES } from '../constants';
import { useAuth } from '../context/AuthContext';
import { getShopBySlug } from '../services/shopService';
import { PageLoader } from '../components/ui/Spinner';
import { cn } from '../utils';

// ─── Category icon mapping ────────────────────────────────────
const CATEGORY_ICONS = {
  laptop:            { icon: Laptop,         bg: 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800' },
  smartphone:        { icon: Smartphone,     bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  'washing-machine': { icon: WashingMachine, bg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800' },
  monitor:           { icon: Monitor,        bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
};

const DEFAULT_ICON = { icon: Store, bg: 'bg-surface-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-surface-200 dark:border-slate-700' };

export default function ShopProfilePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const isCustomer = isAuthenticated && user?.role === ROLES.CUSTOMER;

  const [shop, setShop] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  // Fetch real shop details from API
  const fetchShop = async () => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getShopBySlug(slug);
      setShop(data);
    } catch (err) {
      if (err.response?.status === 404 || err.normalizedMessage?.toLowerCase().includes('not found')) {
        setNotFound(true);
      } else {
        setError('Unable to load shop details right now. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShop();
  }, [slug]);

  const isInactive = shop?.status === 'INACTIVE' || !shop?.isOpen;

  // Destination & state for Request Pickup
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

  // Guarantee scroll position is at the very top (window.scrollY = 0) on mount and slug change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [slug]);

  // Navigation back to dedicated /shops discovery page
  const handleBackToShops = (e) => {
    e?.preventDefault();
    navigate(ROUTES.SHOPS);
  };

  // ─── Loading State ──────────────────────────────────────────
  if (isLoading) {
    return <PageLoader label="Loading shop profile…" />;
  }

  // ─── Error State ────────────────────────────────────────────
  if (error) {
    return (
      <div className="page-container py-16 md:py-24 text-center">
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-sm">
          <div className="flex-center h-16 w-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto mb-5 border border-rose-100 dark:border-rose-800/50">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Error Loading Shop</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
            {error}
          </p>
          <div className="space-y-3">
            <Button
              onClick={fetchShop}
              className="w-full"
            >
              Try Again
            </Button>
            <Button
              onClick={handleBackToShops}
              variant="outline"
              leftIcon={<ArrowLeft size={16} />}
              className="w-full"
            >
              Back to All Shops
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 404 / Shop Not Found State ─────────────────────────────
  if (notFound || !shop) {
    return (
      <div className="page-container py-16 md:py-24 text-center">
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-sm dark:shadow-none">
          <div className="flex-center h-16 w-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto mb-5 border border-amber-100 dark:border-amber-800/50">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Shop Not Found</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
            The repair shop you are looking for does not exist or may have been removed.
          </p>
          <Button
            onClick={handleBackToShops}
            leftIcon={<ArrowLeft size={16} />}
            className="w-full"
          >
            Back to All Shops
          </Button>
        </div>
      </div>
    );
  }

  const iconConfig = CATEGORY_ICONS[shop.categoryIcon] || DEFAULT_ICON;
  const CategoryIcon = iconConfig.icon;

  return (
    <div className="bg-surface-50 dark:bg-slate-950 min-h-screen pb-16 transition-colors duration-200">
      {/* ── Shop Inactive Warning Banner ──────────────────────── */}
      {isInactive && (
        <div className="bg-amber-500 text-white px-4 py-3 border-b border-amber-600 shadow-xs">
          <div className="page-container flex items-center justify-between gap-3 text-sm font-medium">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="shrink-0" />
              <span>
                <strong>Shop Currently Unavailable:</strong> This repair shop is currently inactive on the platform and cannot accept new repair or pickup orders.
              </span>
            </div>
            <Link
              to={ROUTES.SHOPS}
              className="hidden sm:inline-flex items-center gap-1 text-xs font-bold underline hover:text-amber-100 shrink-0"
            >
              Browse active shops &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* ── Breadcrumb & Back Button Bar ──────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border-b border-surface-200 dark:border-slate-800 transition-colors duration-200">
        <div className="page-container py-3.5">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <button
              onClick={handleBackToShops}
              className="inline-flex items-center gap-1.5 font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded px-1 -ml-1"
            >
              <ArrowLeft size={16} />
              <span>Back to Shops</span>
            </button>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="text-slate-700 dark:text-slate-200 font-medium truncate">{shop.name}</span>
          </div>
        </div>
      </div>

      {/* ── Top Shop Header Card ─────────────────────────────── */}
      <section className="bg-white dark:bg-slate-900/70 border-b border-surface-200 dark:border-slate-800 transition-colors duration-200">
        <div className="page-container py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">

            {/* Left: Icon, Name, Meta */}
            <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
              {/* Shop category badge icon */}
              <div className={cn('flex-center h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border shrink-0 shadow-xs', iconConfig.bg)}>
                <CategoryIcon size={34} />
              </div>

              {/* Title & Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    {shop.name}
                  </h1>
                  {shop.isVerified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800/50">
                      <ShieldCheck size={14} className="text-primary-600 dark:text-primary-400" />
                      Verified Shop
                    </span>
                  )}
                  {isInactive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                      <Ban size={12} className="text-rose-500" />
                      Temporarily Inactive
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Open Today
                    </span>
                  )}
                </div>

                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                  {shop.category}
                </p>

                {/* Rating + Location + Turnaround Strip */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center text-amber-400">
                      <Star size={15} className="fill-amber-400" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{shop.rating?.toFixed(1) || '4.8'}</span>
                    <span className="text-slate-400 dark:text-slate-500">({shop.reviewCount || 0} reviews)</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <MapPin size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>{shop.location || shop.city}</span>
                  </div>
                  <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <Clock size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Avg. {shop.turnaround || '24-48 hours'}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-4 max-w-3xl">
                  {shop.description}
                </p>
              </div>
            </div>

            {/* Right: Prominent Request Pickup CTA */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 pt-2 md:pt-0">
              {isInactive ? (
                <Button
                  disabled
                  size="lg"
                  leftIcon={<Ban size={18} />}
                  className="w-full sm:w-auto md:w-56 font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 cursor-not-allowed hover:bg-slate-200 hover:text-slate-500 shadow-none"
                >
                  Shop Inactive
                </Button>
              ) : (
                <Button
                  as={Link}
                  to={pickupDestination}
                  state={pickupState}
                  size="lg"
                  leftIcon={<Truck size={18} />}
                  className="w-full sm:w-auto md:w-56 font-bold shadow-sm"
                >
                  Request Pickup
                </Button>
              )}
              <a
                href={`tel:${shop.phone}`}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg border border-surface-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-surface-50 dark:hover:bg-slate-700 text-sm font-semibold transition-colors w-full sm:w-auto md:w-56"
              >
                <Phone size={15} />
                <span>Call Shop</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Profile Body (2-Column Grid) ────────────────── */}
      <div className="page-container py-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left 2 Columns: Services & Features ──────────── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Section: Offered Services */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 p-6 md:p-7 shadow-xs transition-colors duration-200">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                    Repair Services &amp; Pricing
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Estimated repair cost and turnaround time for common issues.
                  </p>
                </div>
                <div className="flex-center h-10 w-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">
                  <Wrench size={20} />
                </div>
              </div>

              {/* Service Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {shop.services?.map((svc) => (
                  <div
                    key={svc.name}
                    className="p-4 rounded-xl border border-surface-200 dark:border-slate-700/80 bg-surface-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-primary-200 dark:hover:border-primary-800/60 hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                        {svc.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                        {svc.desc}
                      </p>
                    </div>
                    <div className="pt-2.5 border-t border-surface-200/60 dark:border-slate-700/60 flex items-center justify-between text-2xs">
                      <span className="font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/40 px-2 py-0.5 rounded border border-primary-100 dark:border-primary-800/40">
                        {svc.estTime}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {svc.estCost}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section: Features & Guarantees */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 p-6 md:p-7 shadow-xs transition-colors duration-200">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                Shop Guarantees &amp; Standards
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-5">
                Every repair completed by {shop.name} follows strict quality standards.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {shop.features?.map((feat) => (
                  <div key={feat} className="flex items-start gap-3 p-3 rounded-xl bg-surface-50 dark:bg-slate-800/60 border border-surface-100 dark:border-slate-700/60">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section: How Pickup Works With This Shop */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 p-6 md:p-7 shadow-xs transition-colors duration-200">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                How Pickup Works for This Shop
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mb-6">
                Simple 3-step doorstep pickup and real-time tracking through RepairTrack.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-surface-50 dark:bg-slate-800/60 border border-surface-100 dark:border-slate-700/60 text-center">
                  <span className="flex-center h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 text-xs font-bold mx-auto mb-3 border border-primary-200 dark:border-primary-800/50">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Submit Request</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Provide your address and device problem.</p>
                </div>
                <div className="p-4 rounded-xl bg-surface-50 dark:bg-slate-800/60 border border-surface-100 dark:border-slate-700/60 text-center">
                  <span className="flex-center h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 text-xs font-bold mx-auto mb-3 border border-primary-200 dark:border-primary-800/50">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Device Collected</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Shop driver picks up device from your door.</p>
                </div>
                <div className="p-4 rounded-xl bg-surface-50 dark:bg-slate-800/60 border border-surface-100 dark:border-slate-700/60 text-center">
                  <span className="flex-center h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 text-xs font-bold mx-auto mb-3 border border-primary-200 dark:border-primary-800/50">
                    3
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Track Live</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Receive status updates and Repair ID.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column: Shop Contact & Details Sidebar ──── */}
          <aside className="space-y-6">

            {/* Quick Request Box */}
            {isInactive ? (
              <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl p-6 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={20} className="text-amber-600 shrink-0" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Pickups Paused</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                  {shop.name} is currently inactive and cannot accept new repair or pickup orders. Discover other verified repair shops in your area.
                </p>
                <Button
                  as={Link}
                  to={ROUTES.SHOPS}
                  variant="outline"
                  size="md"
                  fullWidth
                  rightIcon={<ChevronRight size={16} />}
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold shadow-xs"
                >
                  Find Available Shops
                </Button>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-6 text-white shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Truck size={20} className="text-primary-200" />
                  <h3 className="text-base font-bold text-white">Doorstep Pickup Available</h3>
                </div>
                <p className="text-xs text-primary-100 mb-5 leading-relaxed">
                  Save the trip. Request a pickup from {shop.name} directly through RepairTrack and follow every step online.
                </p>
                <Button
                  as={Link}
                  to={pickupDestination}
                  state={pickupState}
                  variant="secondary"
                  size="md"
                  fullWidth
                  rightIcon={<ChevronRight size={16} />}
                  className="bg-white text-primary-700 hover:bg-primary-50 font-bold border-0 shadow-sm"
                >
                  Request Pickup Now
                </Button>
              </div>
            )}

            {/* Contact & Location Details */}
            <Card padding="lg">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 pb-3 border-b border-surface-100 dark:border-slate-800">
                Shop Information
              </h3>

              <div className="space-y-4 text-sm">
                {/* Address */}
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase">Address</p>
                    <p className="text-slate-700 dark:text-slate-200 leading-snug mt-0.5">{shop.address}</p>
                  </div>
                </div>

                {/* Working Hours */}
                <div className="flex items-start gap-3">
                  <Clock size={18} className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase">Working Hours</p>
                    <p className="text-slate-700 dark:text-slate-200 leading-snug mt-0.5">{shop.hours}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3">
                  <Phone size={18} className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase">Phone Number</p>
                    <a href={`tel:${shop.phone}`} className="text-primary-600 dark:text-primary-400 font-medium hover:underline mt-0.5 block">
                      {shop.phone}
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3">
                  <Mail size={18} className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase">Email</p>
                    <a href={`mailto:${shop.email}`} className="text-primary-600 dark:text-primary-400 font-medium hover:underline mt-0.5 block truncate max-w-[200px]">
                      {shop.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="mt-6 pt-4 border-t border-surface-100 dark:border-slate-800">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase mb-2">Repair Specialties</p>
                <div className="flex flex-wrap gap-1.5">
                  {(shop.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-md text-2xs font-medium bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-surface-200 dark:border-slate-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Card>

            {/* Back Button Secondary link */}
            <div className="text-center pt-2">
              <button
                onClick={handleBackToShops}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Browse other repair shops</span>
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
