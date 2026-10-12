// ─────────────────────────────────────────────────────────────
// RepairTrack — Admin Dashboard
// Route: /admin
// Shop-centric console featuring:
//   - High-level KPIs: Active Shops, Pending Applications
//   - All Registered Shops grid with metrics & "View Shop" action
//   - Quick navigation to Shop Requests
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Store, FileText, Users, Package, Wrench, MapPin, User,
  ArrowRight, CheckCircle2, XCircle, RefreshCw, Loader2,
  AlertCircle, Search, ShieldCheck, ChevronRight
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import {
  getAdminShops,
  getAdminShopApplications
} from '../services/adminService';
import { ROUTES } from '../constants';

export default function AdminPage() {
  const [shops, setShops] = useState([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  const loadDashboardData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [shopsData, appsData] = await Promise.all([
        getAdminShops(),
        getAdminShopApplications({ status: 'PENDING' }),
      ]);

      setShops(Array.isArray(shopsData) ? shopsData : []);
      const pending = Array.isArray(appsData)
        ? appsData.filter((a) => a.status === 'PENDING').length
        : 0;
      setPendingRequestsCount(pending);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to load platform data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const activeShopsCount = useMemo(() => {
    return shops.filter((s) => s.is_active).length;
  }, [shops]);

  const filteredShops = useMemo(() => {
    return shops.filter((shop) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && shop.is_active) ||
        (statusFilter === 'INACTIVE' && !shop.is_active);

      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        (shop.name && shop.name.toLowerCase().includes(q)) ||
        (shop.city && shop.city.toLowerCase().includes(q)) ||
        (shop.address && shop.address.toLowerCase().includes(q)) ||
        (shop.owner?.name && shop.owner.name.toLowerCase().includes(q)) ||
        (shop.owner?.email && shop.owner.email.toLowerCase().includes(q));

      return matchesStatus && matchesQuery;
    });
  }, [shops, statusFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600 dark:text-primary-400 mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Loading Admin Dashboard...</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Connecting to live administration services.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* ── Console Header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Admin Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 dark:bg-primary-950/50 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-800/50">
              Shop Management
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Supervise registered workshops, monitor shop performance, and process applications.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Syncing...' : 'Refresh'}
          </Button>

          <Button
            as={Link}
            to={ROUTES.ADMIN_SHOP_REQUESTS}
            size="sm"
            leftIcon={<FileText size={15} />}
          >
            Review Shop Requests
            {pendingRequestsCount > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full bg-white/30 text-white text-xs font-bold">
                {pendingRequestsCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────── */}
      {error && (
        <div className="bg-danger-50 dark:bg-red-950/40 border border-danger-200 dark:border-red-800/60 p-4 rounded-2xl flex items-center justify-between text-xs text-danger-700 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <Button size="xs" variant="outline" onClick={() => loadDashboardData(true)}>
            Try Again
          </Button>
        </div>
      )}

      {/* ── High-Level Statistics (Active Shops & Pending Applications) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Active Shops KPI */}
        <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Shops
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {activeShopsCount}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                of {shops.length} total
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Approved workshops currently operational on RepairTrack
            </p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center shrink-0">
            <Store size={28} />
          </div>
        </div>

        {/* Pending Shop Applications KPI */}
        <Link
          to={ROUTES.ADMIN_SHOP_REQUESTS}
          className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 shadow-xs flex items-center justify-between transition-all duration-200 hover:shadow-card hover:-translate-y-0.5 ${
            pendingRequestsCount > 0
              ? 'border-amber-300 dark:border-amber-700/60 ring-2 ring-amber-400/20'
              : 'border-surface-200 dark:border-slate-800'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Pending Shop Applications
              </span>
              {pendingRequestsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  Needs Review
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {pendingRequestsCount}
              </span>
              <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 inline-flex items-center gap-0.5">
                Review <ArrowRight size={12} />
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Awaiting administrator verification and onboarding
            </p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center shrink-0">
            <FileText size={28} />
          </div>
        </Link>
      </div>

      {/* ── ALL SHOPS SECTION ───────────────────────────────── */}
      <div className="space-y-4">
        {/* Section Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Store size={20} className="text-primary-600 dark:text-primary-400" />
              All Registered Shops
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Inspect shop performance, customer volume, and active tickets.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Filter Tabs */}
            <div className="inline-flex rounded-xl p-1 bg-surface-100 dark:bg-slate-800 border border-surface-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All ({shops.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Active ({activeShopsCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('INACTIVE')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === 'INACTIVE'
                    ? 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Inactive ({shops.length - activeShopsCount})
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-md">
          <Input
            placeholder="Search shops by name, city, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={16} className="text-slate-400" />}
          />
        </div>

        {/* Shop Cards Grid */}
        {filteredShops.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-12 text-center">
            <Store size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No workshops match your criteria</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Try adjusting your search query or status filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredShops.map((shop) => {
              const isActive = Boolean(shop.is_active);
              const stats = shop.stats || {};
              const owner = shop.owner;

              return (
                <div
                  key={shop.id}
                  className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-card transition-all flex flex-col justify-between"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
                          isActive
                            ? 'bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/50'
                            : 'bg-surface-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          {shop.name ? shop.name.charAt(0) : 'S'}
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                            {shop.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <MapPin size={13} className="text-primary-500 shrink-0" />
                            <span className="truncate">{shop.city ? `${shop.city}, ${shop.state || 'India'}` : shop.address || 'Local'}</span>
                          </div>
                        </div>
                      </div>

                      <Badge variant={isActive ? 'success' : 'default'} size="sm">
                        {isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    {/* Shop Owner Info */}
                    <div className="bg-surface-50 dark:bg-slate-800/40 rounded-xl p-3 border border-surface-100 dark:border-slate-800 mb-4 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <User size={14} className="text-indigo-500 shrink-0" />
                        <span className="text-slate-500 dark:text-slate-400">Owner:</span>
                        <strong className="text-slate-800 dark:text-slate-200 font-semibold truncate">
                          {owner ? owner.name : 'Unassigned'}
                        </strong>
                      </div>
                      {owner?.email && (
                        <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 truncate ml-2">
                          {owner.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Metrics & CTA */}
                  <div>
                    {/* 3 Metrics: Customer Count, Pickup Count, Repair Count */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-t border-surface-100 dark:border-slate-800 mb-4 text-center">
                      <div className="p-2 rounded-lg bg-surface-50 dark:bg-slate-800/30">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Customers
                        </span>
                        <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 block">
                          {stats.customer_count ?? 0}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-surface-50 dark:bg-slate-800/30">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Pickups
                        </span>
                        <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 block">
                          {stats.pickup_count ?? 0}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-surface-50 dark:bg-slate-800/30">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Repairs
                        </span>
                        <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 block">
                          {stats.repair_count ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* View Shop CTA */}
                    <Button
                      as={Link}
                      to={ROUTES.ADMIN_SHOP_DETAIL(shop.id)}
                      fullWidth
                      size="sm"
                      rightIcon={<ChevronRight size={15} />}
                    >
                      View Shop
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
