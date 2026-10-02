// ─────────────────────────────────────────────────────────────
// RepairTrack — Admin Overview Dashboard (Phase 5.7)
// Route: /admin
// Real platform management console with live KPI stat cards,
// real recent activity feeds, and quick navigation actions.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Store, Users, Package, Wrench, CheckCircle2,
  XCircle, ArrowRight, ShieldCheck, AlertCircle, FileText,
  Check, X, RefreshCw, Loader2
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import {
  getAdminDashboardOverview,
  approveShopApplication,
  rejectShopApplication
} from '../services/adminService';
import { ROUTES, REPAIR_STATUS_LABELS, PICKUP_STATUS_LABELS } from '../constants';

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

const REQUEST_BADGE = {
  PENDING:  'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

export default function AdminPage() {
  const [data, setData] = useState({
    metrics: {
      totalShops: 0,
      activeShops: 0,
      inactiveShops: 0,
      pendingRequests: 0,
      totalShopOwners: 0,
      totalCustomers: 0,
      totalPickups: 0,
      pendingPickups: 0,
      totalRepairs: 0,
      activeRepairs: 0,
      completedRepairs: 0,
    },
    raw: {
      shops: [],
      applications: [],
      pickups: [],
      repairs: [],
    },
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  const loadDashboard = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const overview = await getAdminDashboardOverview();
      setData(overview);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to load platform data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleApprove = async (appId) => {
    setActionLoading((prev) => ({ ...prev, [appId]: 'approve' }));
    setToastMessage(null);
    try {
      await approveShopApplication(appId);
      setToastMessage({ type: 'success', text: `Application #${appId} approved successfully.` });
      await loadDashboard(true);
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err?.response?.data?.detail || err.message || 'Failed to approve application.',
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [appId]: null }));
    }
  };

  const handleReject = async (appId) => {
    setActionLoading((prev) => ({ ...prev, [appId]: 'reject' }));
    setToastMessage(null);
    try {
      await rejectShopApplication(appId, 'Application declined by administrator after review.');
      setToastMessage({ type: 'success', text: `Application #${appId} rejected.` });
      await loadDashboard(true);
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err?.response?.data?.detail || err.message || 'Failed to reject application.',
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [appId]: null }));
    }
  };

  const { metrics, raw } = data;
  const { shops, applications, pickups, repairs } = raw;
  const pendingRequests = applications.filter((a) => a.status === 'PENDING');

  const stats = [
    { label: 'Total Shops',           val: metrics.totalShops,       icon: Store,        color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-950/50', link: ROUTES.ADMIN_SHOPS },
    { label: 'Pending Shop Requests', val: metrics.pendingRequests,   icon: FileText,     color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/50',    link: ROUTES.ADMIN_SHOP_REQUESTS, highlight: metrics.pendingRequests > 0 },
    { label: 'Active Shops',          val: metrics.activeShops,       icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50', link: ROUTES.ADMIN_SHOPS },
    { label: 'Inactive Shops',        val: metrics.inactiveShops,     icon: XCircle,      color: 'text-slate-500 dark:text-slate-400',   bg: 'bg-slate-100 dark:bg-slate-800',   link: ROUTES.ADMIN_SHOPS },
    { label: 'Shop Owners',           val: metrics.totalShopOwners,   icon: Users,        color: 'text-indigo-600 dark:text-indigo-400',  bg: 'bg-indigo-50 dark:bg-indigo-950/50',  link: ROUTES.ADMIN_SHOP_OWNERS },
    { label: 'Active Customers',      val: metrics.totalCustomers,    icon: Users,        color: 'text-sky-600 dark:text-sky-400',       bg: 'bg-sky-50 dark:bg-sky-950/50',     link: ROUTES.ADMIN_CUSTOMERS },
    { label: 'Active Repairs',        val: metrics.activeRepairs,     icon: Wrench,       color: 'text-blue-600 dark:text-blue-400',      bg: 'bg-blue-50 dark:bg-blue-950/50',    link: ROUTES.ADMIN_REPAIRS },
    { label: 'Pending Pickups',       val: metrics.pendingPickups,    icon: Package,      color: 'text-orange-600 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-950/50',  link: ROUTES.ADMIN_PICKUPS },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600 dark:text-primary-400 mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Loading Platform Overview...</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Connecting to live FastAPI administration services.</p>
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
              Platform Administration
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 dark:bg-primary-950/50 text-primary-800 dark:text-primary-300 border border-primary-200 dark:border-primary-800/50">
              Live Console
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor platform health, verify onboarding requests, and supervise operations.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
            onClick={() => loadDashboard(true)}
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
            {metrics.pendingRequests > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-white/30 text-white text-xs font-bold">
                {metrics.pendingRequests}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ── Feedback Notification Toast ────────────────────── */}
      {toastMessage && (
        <div className={`p-4 rounded-xl text-xs font-medium border flex items-center justify-between gap-3 ${
          toastMessage.type === 'error'
            ? 'bg-danger-50 dark:bg-red-950/40 text-danger-800 dark:text-red-300 border-danger-200 dark:border-red-800/60'
            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Error Banner ────────────────────────────────────── */}
      {error && (
        <div className="bg-danger-50 dark:bg-red-950/40 border border-danger-200 dark:border-red-800/60 p-4 rounded-2xl flex items-center justify-between text-xs text-danger-700 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <Button size="xs" variant="outline" onClick={() => loadDashboard(true)}>
            Try Again
          </Button>
        </div>
      )}

      {/* ── 8 Stat Cards Grid ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              to={s.link}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:shadow-card hover:-translate-y-0.5 ${
                s.highlight ? 'border-amber-300 dark:border-amber-700/60 ring-2 ring-amber-400/20' : 'border-surface-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-tight leading-tight">
                  {s.label}
                </span>
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${s.bg} ${s.color}`}>
                  <Icon size={16} />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {s.val}
                </span>
                <span className="text-xs font-medium text-primary-600 dark:text-primary-400 flex items-center gap-0.5">
                  Manage <ArrowRight size={11} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Main Activity Feed ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1 & 2: Recent Shop Requests & Recent Repairs */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Recent Applications */}
          <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-surface-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Recent Shop Applications</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Shops requesting access to RepairTrack</p>
              </div>
              <Link
                to={ROUTES.ADMIN_SHOP_REQUESTS}
                className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
              >
                View all ({applications.length}) <ArrowRight size={13} />
              </Link>
            </div>

            {applications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                <FileText size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-slate-600 dark:text-slate-400">No shop applications received yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-100 dark:divide-slate-800">
                {applications.slice(0, 4).map((app) => (
                  <div key={app.id} className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{app.shop_name}</p>
                        <Badge variant={REQUEST_BADGE[app.status] || 'default'} size="sm">
                          {app.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {app.applicant_name} · {app.city || app.address || 'Local'} · <span className="font-mono text-slate-400 dark:text-slate-500">{app.applicant_email}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {app.status === 'PENDING' ? (
                        <>
                          <Button
                            size="xs"
                            leftIcon={<Check size={12} />}
                            disabled={actionLoading[app.id] != null}
                            onClick={() => handleApprove(app.id)}
                          >
                            {actionLoading[app.id] === 'approve' ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            leftIcon={<X size={12} />}
                            disabled={actionLoading[app.id] != null}
                            onClick={() => handleReject(app.id)}
                          >
                            {actionLoading[app.id] === 'reject' ? 'Rejecting...' : 'Reject'}
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Decision Recorded</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Repairs Table */}
          <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-surface-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Recent Repair Jobs</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Platform-wide active repairs monitoring</p>
              </div>
              <Link
                to={ROUTES.ADMIN_REPAIRS}
                className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
              >
                View all ({repairs.length}) <ArrowRight size={13} />
              </Link>
            </div>

            {repairs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                <Wrench size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-slate-600 dark:text-slate-400">No repair jobs recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-50 dark:bg-slate-800/60 text-slate-400 uppercase font-bold text-[11px] tracking-wider border-b border-surface-200 dark:border-slate-800">
                    <tr>
                      <th className="px-5 py-3">Repair ID</th>
                      <th className="px-5 py-3">Device / Customer</th>
                      <th className="px-5 py-3">Shop</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-slate-800">
                    {repairs.slice(0, 5).map((r) => (
                      <tr key={r.id} className="hover:bg-surface-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-semibold text-primary-700 dark:text-primary-400">
                          {r.repairId}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{r.device}</p>
                          <p className="text-slate-400 dark:text-slate-400 text-[11px]">{r.customerName}</p>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                          {r.shopName}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={REPAIR_BADGE[r.status] || 'default'} size="sm">
                            {REPAIR_STATUS_LABELS[r.status] || r.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Recent Pickup Requests */}
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-surface-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Recent Pickups</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Doorstep pickup activity</p>
              </div>
              <Link
                to={ROUTES.ADMIN_PICKUPS}
                className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
              >
                View all ({pickups.length}) <ArrowRight size={13} />
              </Link>
            </div>

            {pickups.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                <Package size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-slate-600 dark:text-slate-400">No pickup requests logged yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-100 dark:divide-slate-800">
                {pickups.slice(0, 5).map((p) => (
                  <div key={p.id} className="p-4 hover:bg-surface-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{p.device}</p>
                      <Badge variant={PICKUP_BADGE[p.status] || 'default'} size="sm">
                        {PICKUP_STATUS_LABELS[p.status] || p.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">{p.customerName} · {p.city || 'NCR'}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-400 pt-1 border-t border-surface-100 dark:border-slate-800">
                      <span>Shop: {p.shopName}</span>
                      <span>{p.requestedDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Support / Safety Banner */}
          <div className="bg-gradient-to-br from-primary-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary-400" />
              <h3 className="text-sm font-bold text-white">Platform Governance</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Administrators have authority to approve shop registrations, monitor warranty complaints, and supervise workshops across the platform.
            </p>
            <div className="pt-1">
              <Link
                to={ROUTES.ADMIN_SHOPS}
                className="text-xs font-semibold text-primary-300 hover:text-white inline-flex items-center gap-1 transition-colors"
              >
                Inspect Registered Shops <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
