// ─────────────────────────────────────────────────────────────
// RepairTrack — Admin Shop Details View
// Route: /admin/shops/:shopId
// Shop-centric inspection page displaying:
//   - Overview (details, location, services, availability, metrics)
//   - Shop Owner (name, contact, account status)
//   - Customers (associated ONLY with this shop)
//   - Pickup Requests (belonging ONLY to this shop)
//   - Repairs (belonging ONLY to this shop)
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Store, User, Users, Package, Wrench, ArrowLeft,
  MapPin, Phone, Mail, Calendar, CheckCircle2, XCircle,
  AlertCircle, RefreshCw, Loader2, ShieldCheck, Tag,
  Clock, Check, X, FileText
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  getAdminShopOverview,
  getAdminShopCustomers,
  getAdminShopPickups,
  getAdminShopRepairs,
} from '../../services/adminService';
import {
  ROUTES,
  REPAIR_STATUS_LABELS,
  PICKUP_STATUS_LABELS,
} from '../../constants';

const REPAIR_BADGE = {
  RECEIVED:   'info',
  DIAGNOSING: 'warning',
  REPAIRING:  'warning',
  READY:      'success',
  COMPLETED:  'success',
  CANCELLED:  'danger',
};

const PICKUP_BADGE = {
  PENDING:   'warning',
  ACCEPTED:  'info',
  REJECTED:  'danger',
  SCHEDULED: 'info',
  PICKED_UP: 'info',
  RECEIVED:  'success',
};

export default function AdminShopDetailsPage() {
  const { shopId } = useParams();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'owner' | 'customers' | 'pickups' | 'repairs'
  const [overviewData, setOverviewData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [repairs, setRepairs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadShopDetails = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [overviewRes, customersRes, pickupsRes, repairsRes] = await Promise.all([
        getAdminShopOverview(shopId),
        getAdminShopCustomers(shopId),
        getAdminShopPickups(shopId),
        getAdminShopRepairs(shopId),
      ]);

      setOverviewData(overviewRes);
      setCustomers(customersRes || []);
      setPickups(pickupsRes || []);
      setRepairs(repairsRes || []);
    } catch (err) {
      console.error('Failed to load admin shop details:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to load shop details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shopId]);

  useEffect(() => {
    loadShopDetails();
  }, [loadShopDetails]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600 dark:text-primary-400 mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Loading Workshop Records...</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Retrieving shop-centric metrics, customer associations, and repair logs.
        </p>
      </div>
    );
  }

  if (error || !overviewData) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Link
          to={ROUTES.ADMIN_SHOPS}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Back to Shops
        </Link>
        <div className="bg-danger-50 dark:bg-red-950/40 border border-danger-200 dark:border-red-800/60 p-6 rounded-2xl flex flex-col items-center text-center">
          <AlertCircle size={32} className="text-danger-600 dark:text-red-400 mb-2" />
          <h2 className="text-base font-bold text-danger-800 dark:text-red-300">Shop Details Error</h2>
          <p className="text-xs text-danger-700 dark:text-red-300 mt-1 mb-4">{error || 'Workshop not found.'}</p>
          <Button size="sm" variant="outline" onClick={() => loadShopDetails(true)}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const { shop, owner, stats } = overviewData;
  const isActive = Boolean(shop.is_active);
  const serviceList = shop.services
    ? shop.services.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* ── Top Navigation Breadcrumb ───────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            to={ROUTES.ADMIN_SHOPS}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Shops
          </Link>
          <span className="text-slate-300 dark:text-slate-700 text-xs">/</span>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-xs">
            {shop.name}
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          leftIcon={<RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />}
          onClick={() => loadShopDetails(true)}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* ── Shop Header Banner ──────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0 ${
              isActive
                ? 'bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/50'
                : 'bg-surface-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-surface-200 dark:border-slate-700'
            }`}>
              {shop.name ? shop.name.charAt(0) : 'S'}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {shop.name}
                </h1>
                <Badge variant={isActive ? 'success' : 'default'} size="sm">
                  {isActive ? 'Active Workshop' : 'Inactive'}
                </Badge>
                {shop.category && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-surface-200 dark:border-slate-700">
                    {shop.category}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-primary-500 shrink-0" />
                  {shop.city ? `${shop.city}, ${shop.state || 'India'}` : shop.address || 'Local'}
                </span>
                {owner && (
                  <span className="flex items-center gap-1">
                    <User size={13} className="text-indigo-500 shrink-0" />
                    Owner: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{owner.name}</strong>
                  </span>
                )}
                {shop.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={13} className="text-slate-400 shrink-0" />
                    {shop.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              ID #{shop.id} · slug: {shop.slug}
            </span>
          </div>
        </div>

        {/* Quick KPI stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-surface-100 dark:border-slate-800">
          <div className="bg-surface-50 dark:bg-slate-800/50 rounded-xl p-3 border border-surface-200 dark:border-slate-800/80">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Shop Customers</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{stats.customer_count}</p>
          </div>
          <div className="bg-surface-50 dark:bg-slate-800/50 rounded-xl p-3 border border-surface-200 dark:border-slate-800/80">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Pickups</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{stats.pickup_count}</span>
              {stats.pending_pickups > 0 && (
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">({stats.pending_pickups} pending)</span>
              )}
            </div>
          </div>
          <div className="bg-surface-50 dark:bg-slate-800/50 rounded-xl p-3 border border-surface-200 dark:border-slate-800/80">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Repairs</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{stats.repair_count}</span>
              {stats.active_repairs > 0 && (
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">({stats.active_repairs} active)</span>
              )}
            </div>
          </div>
          <div className="bg-surface-50 dark:bg-slate-800/50 rounded-xl p-3 border border-surface-200 dark:border-slate-800/80">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pickup Logistics</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
              {shop.pickup_available ? 'Doorstep Enabled' : 'Walk-in Only'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ─────────────────────────────────── */}
      <div className="flex border-b border-surface-200 dark:border-slate-800 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Store size={14} /> Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('owner')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'owner'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <User size={14} /> Shop Owner
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'customers'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users size={14} /> Customers
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-surface-200 dark:bg-slate-800 text-[10px] font-bold">
            {customers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pickups')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'pickups'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Package size={14} /> Pickup Requests
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-surface-200 dark:bg-slate-800 text-[10px] font-bold">
            {pickups.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('repairs')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'repairs'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Wrench size={14} /> Repairs
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-surface-200 dark:bg-slate-800 text-[10px] font-bold">
            {repairs.length}
          </span>
        </button>
      </div>

      {/* ── Tab Content ─────────────────────────────────────── */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">Workshop Description</h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {shop.description || 'Verified workshop providing professional hardware and software repair services.'}
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">Services & Capabilities</h2>
              {serviceList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {serviceList.map((srv, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-50 dark:bg-primary-950/40 text-primary-800 dark:text-primary-300 border border-primary-200/80 dark:border-primary-800/40 flex items-center gap-1.5"
                    >
                      <Tag size={11} /> {srv}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500">No specific services itemised.</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-surface-100 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Physical Address</p>
                <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">
                  {shop.address || 'Address not listed'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {shop.city || 'Delhi'}, {shop.state || 'India'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Doorstep Pickup</p>
                <div className="flex items-center gap-2 mt-1">
                  {shop.pickup_available ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 size={15} /> Enabled across service area
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <XCircle size={15} /> Walk-in customers only
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Side Info Cards */}
          <div className="flex flex-col gap-6">
            {/* Quick Owner Card */}
            {owner && (
              <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={14} className="text-indigo-500" /> Assigned Shop Owner
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('owner')}
                    className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    View Details
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{owner.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                    <Mail size={12} /> {owner.email}
                  </p>
                  {owner.phone && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Phone size={12} /> {owner.phone}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Performance Statistics */}
            <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
                Operational Breakdown
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-surface-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Active Repair Jobs</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-semibold">{stats.active_repairs}</strong>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-surface-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Completed Repairs</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{stats.completed_repairs}</strong>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-surface-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Pending Pickups</span>
                  <strong className="text-amber-600 dark:text-amber-400 font-semibold">{stats.pending_pickups}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Unique Customers</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-semibold">{stats.customer_count}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SHOP OWNER TAB */}
      {activeTab === 'owner' && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-100 dark:border-slate-800">
            <div className="h-12 w-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-lg">
              {owner ? owner.name.charAt(0) : 'U'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {owner ? owner.name : 'No Owner Assigned'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Primary credentials and access status for this workshop
              </p>
            </div>
          </div>

          {owner ? (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-surface-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Owner Full Name</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{owner.name}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-surface-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Email Address</span>
                <a href={`mailto:${owner.email}`} className="font-mono text-primary-600 dark:text-primary-400 hover:underline">
                  {owner.email}
                </a>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-surface-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Contact Phone</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{owner.phone || 'Not recorded'}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-surface-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Platform Role</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  {owner.role}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-surface-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Account Status</span>
                <Badge variant={owner.is_active ? 'success' : 'danger'} size="sm">
                  {owner.is_active ? 'Active' : 'Disabled'}
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">User ID</span>
                <span className="font-mono text-slate-400 dark:text-slate-500 text-xs">#{owner.id}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500">No owner record attached to this shop.</p>
          )}
        </div>
      )}

      {/* 3. CUSTOMERS TAB */}
      {activeTab === 'customers' && (
        <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-surface-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Customers Associated with {shop.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Customers who have submitted pickups or repair jobs to this specific workshop
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {customers.length} total
            </span>
          </div>

          {customers.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500">
              <Users size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-600 dark:text-slate-400">No customer records for this shop yet.</p>
              <p className="text-slate-400 dark:text-slate-500 mt-1">
                Customers who book repairs or request doorstep pickups will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-bold text-[11px] tracking-wider border-b border-surface-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Phone</th>
                    <th className="px-5 py-3.5">Pickups Here</th>
                    <th className="px-5 py-3.5">Repairs Here</th>
                    <th className="px-5 py-3.5">Latest Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-slate-800">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{c.name}</p>
                        <span className="font-mono text-slate-400 dark:text-slate-500 text-[10px]">ID #{c.id}</span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                        {c.email}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                        {c.phone || 'N/A'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{c.pickup_count}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{c.repair_count}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                        {c.latest_activity ? c.latest_activity.split('T')[0] : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. PICKUP REQUESTS TAB */}
      {activeTab === 'pickups' && (
        <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-surface-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Pickup Requests for {shop.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Doorstep collection requests routed strictly to this shop
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {pickups.length} total
            </span>
          </div>

          {pickups.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500">
              <Package size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-600 dark:text-slate-400">No pickup requests for this workshop.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-bold text-[11px] tracking-wider border-b border-surface-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Pickup ID</th>
                    <th className="px-5 py-3.5">Device</th>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Pickup Address</th>
                    <th className="px-5 py-3.5">Requested Slot</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-slate-800">
                  {pickups.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-semibold text-primary-700 dark:text-primary-400">
                        {p.displayId || `#PICK-${p.id}`}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{p.fullDevice || p.deviceType}</p>
                        <p className="text-slate-400 dark:text-slate-500 text-[11px] truncate max-w-xs">{p.issue}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{p.customerName}</p>
                        <p className="text-slate-400 dark:text-slate-500 text-[11px]">{p.customerPhone || p.customerEmail}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {p.pickupAddress}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                        {p.requestedDate} {p.preferredTime ? `· ${p.preferredTime}` : ''}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={PICKUP_BADGE[p.status] || 'default'} size="sm">
                          {PICKUP_STATUS_LABELS[p.status] || p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. REPAIRS TAB */}
      {activeTab === 'repairs' && (
        <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-surface-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Repairs Managed by {shop.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Active and completed device repair tickets strictly assigned to this shop
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {repairs.length} total
            </span>
          </div>

          {repairs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500">
              <Wrench size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-600 dark:text-slate-400">No repair jobs recorded for this workshop.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-bold text-[11px] tracking-wider border-b border-surface-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Repair ID</th>
                    <th className="px-5 py-3.5">Device</th>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Estimated Cost</th>
                    <th className="px-5 py-3.5">Estimate Approved</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Started Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-slate-800">
                  {repairs.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-semibold text-primary-700 dark:text-primary-400">
                        {r.repairId}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{r.fullDevice || r.deviceType}</p>
                        <p className="text-slate-400 dark:text-slate-500 text-[11px] truncate max-w-xs">{r.issue}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{r.customerName}</p>
                        <p className="text-slate-400 dark:text-slate-500 text-[11px]">{r.customerPhone || r.customerEmail}</p>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                        {r.cost}
                      </td>
                      <td className="px-5 py-3.5">
                        {r.customerApproved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <Check size={12} /> Approved
                          </span>
                        ) : r.estimatedCost ? (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Pending approval</span>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">Under diagnosis</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={REPAIR_BADGE[r.status] || 'default'} size="sm">
                          {REPAIR_STATUS_LABELS[r.status] || r.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                        {r.startDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
