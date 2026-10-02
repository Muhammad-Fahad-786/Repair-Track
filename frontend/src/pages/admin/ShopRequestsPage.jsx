// ─────────────────────────────────────────────────────────────
// RepairTrack — Admin Shop Requests Page (Phase 5.3)
// Route: /admin/shop-requests
// Real backend integration:
// GET  /api/v1/admin/shop-applications/
// POST /api/v1/admin/shop-applications/{id}/approve
// POST /api/v1/admin/shop-applications/{id}/reject
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText, Check, X, Search, Eye, Filter, CheckCircle2,
  XCircle, Clock, Store, MapPin, Mail, Phone, Calendar,
  AlertTriangle, RefreshCw, AlertCircle
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import {
  getAdminShopApplications,
  approveShopApplication,
  rejectShopApplication
} from '../../services/shopApplicationService';

const STATUS_BADGE = {
  PENDING:  'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

export default function ShopRequestsPage() {
  const [applications, setApplications]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [error, setError]                 = useState('');

  const [activeTab, setActiveTab]         = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [searchQuery, setSearchQuery]     = useState('');
  const [selectedApp, setSelectedApp]     = useState(null); // for View Details modal
  const [rejectingApp, setRejectingApp]   = useState(null); // for Rejection confirmation modal
  const [rejectReason, setRejectReason]   = useState('');
  const [rejectError, setRejectError]     = useState('');

  // Per-application loading states: { [appId]: 'approve' | 'reject' }
  const [actionLoading, setActionLoading] = useState({});
  const [toastMessage, setToastMessage]   = useState(null);

  // ─── Fetch real applications from backend ─────────────────────
  const loadApplications = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const data = await getAdminShopApplications();
      setApplications(data);
    } catch (err) {
      setError(err.message || 'Failed to load shop applications from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // ─── Filter & Search ──────────────────────────────────────────
  const filtered = useMemo(() => {
    return (applications || []).filter((app) => {
      const matchesTab = activeTab === 'ALL' || app.status === activeTab;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        (app.shop_name && app.shop_name.toLowerCase().includes(q)) ||
        (app.applicant_name && app.applicant_name.toLowerCase().includes(q)) ||
        (app.applicant_email && app.applicant_email.toLowerCase().includes(q)) ||
        (app.city && app.city.toLowerCase().includes(q)) ||
        String(app.id).includes(q);

      return matchesTab && matchesQuery;
    });
  }, [applications, activeTab, searchQuery]);

  // ─── Approve Action ───────────────────────────────────────────
  const handleApprove = async (app) => {
    if (!app || actionLoading[app.id]) return;
    setActionLoading((prev) => ({ ...prev, [app.id]: 'approve' }));
    setToastMessage(null);

    try {
      const updated = await approveShopApplication(app.id);
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, ...updated, status: 'APPROVED' } : a))
      );
      if (selectedApp && selectedApp.id === app.id) {
        setSelectedApp((prev) => (prev ? { ...prev, ...updated, status: 'APPROVED' } : null));
      }
      setToastMessage({
        type: 'success',
        text: `Shop "${app.shop_name}" approved successfully. Shop is now live and applicant promoted to Shop Owner.`,
      });
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to approve application.',
      });
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[app.id];
        return next;
      });
    }
  };

  // ─── Reject Action ────────────────────────────────────────────
  const handleOpenReject = (app) => {
    setRejectingApp(app);
    setRejectReason('Insufficient workshop documentation or invalid location provided.');
    setRejectError('');
  };

  const handleConfirmReject = async () => {
    if (!rejectingApp) return;
    const reason = (rejectReason || '').trim();
    if (!reason) {
      setRejectError('A rejection reason is required.');
      return;
    }

    const appId = rejectingApp.id;
    setActionLoading((prev) => ({ ...prev, [appId]: 'reject' }));
    setToastMessage(null);
    setRejectError('');

    try {
      const updated = await rejectShopApplication(appId, reason);
      setApplications((prev) =>
        prev.map((a) =>
          a.id === appId ? { ...a, ...updated, status: 'REJECTED', rejection_reason: reason } : a
        )
      );
      if (selectedApp && selectedApp.id === appId) {
        setSelectedApp((prev) =>
          prev ? { ...prev, ...updated, status: 'REJECTED', rejection_reason: reason } : null
        );
      }
      setToastMessage({
        type: 'success',
        text: `Application for "${rejectingApp.shop_name}" has been rejected.`,
      });
      setRejectingApp(null);
      setRejectReason('');
    } catch (err) {
      setRejectError(err.message || 'Failed to reject application.');
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[appId];
        return next;
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText size={22} className="text-primary-600 dark:text-primary-400" /> Shop Registration Requests
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Review, verify, and approve or reject real shop partner applications.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadApplications(true)}
          loading={refreshing}
          leftIcon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
        >
          Refresh Applications
        </Button>
      </div>

      {/* Notification Toast Banner */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs shadow-xs transition-colors ${
            toastMessage.type === 'success'
              ? 'bg-success-50 dark:bg-emerald-950/40 border-success-200 dark:border-emerald-800/60 text-success-800 dark:text-emerald-300'
              : 'bg-danger-50 dark:bg-red-950/40 border-danger-200 dark:border-red-800/60 text-danger-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 size={16} className="text-success-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-danger-600 dark:text-red-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="hover:opacity-75 transition-opacity"
            aria-label="Dismiss message"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: 'ALL',      label: 'All Applications', count: applications.length },
            { key: 'PENDING',  label: 'Pending',          count: applications.filter((a) => a.status === 'PENDING').length },
            { key: 'APPROVED', label: 'Approved',         count: applications.filter((a) => a.status === 'APPROVED').length },
            { key: 'REJECTED', label: 'Rejected',         count: applications.filter((a) => a.status === 'REJECTED').length },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === tab.key
                    ? 'bg-white/20 text-white'
                    : tab.key === 'PENDING' && tab.count > 0
                    ? 'bg-warning-100 dark:bg-amber-950/60 text-warning-800 dark:text-amber-300'
                    : 'bg-surface-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full md:w-72">
          <Input
            placeholder="Search shop, applicant, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={15} />}
            className="w-full"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading applications from server...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center px-4">
            <AlertCircle size={36} className="mx-auto text-danger-500 mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Failed to load requests</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">{error}</p>
            <Button size="sm" variant="outline" onClick={() => loadApplications()} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-bold text-[11px] tracking-wider border-b border-surface-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Shop Name</th>
                  <th className="px-5 py-3.5">Applicant</th>
                  <th className="px-5 py-3.5">Registered Email</th>
                  <th className="px-5 py-3.5">Location</th>
                  <th className="px-5 py-3.5">Submitted</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-slate-800">
                {filtered.map((req) => {
                  const dateStr = req.submitted_at
                    ? new Date(req.submitted_at).toLocaleDateString('en-IN')
                    : '—';
                  const isAppActionBusy = Boolean(actionLoading[req.id]);

                  return (
                    <tr key={req.id} className="hover:bg-surface-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Shop Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {req.shop_name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{req.shop_name}</p>
                            <p className="text-slate-400 dark:text-slate-500 text-[11px]">
                              {req.pickup_available ? 'Pickup Available' : 'In-store repair'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Applicant */}
                      <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-200">
                        {req.applicant_name || `Applicant #${req.applicant_id}`}
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4 font-mono text-slate-600 dark:text-slate-400">
                        {req.applicant_email || '—'}
                      </td>

                      {/* Location */}
                      <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                        {req.city || req.address || '—'}
                      </td>

                      {/* Submitted */}
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                        {dateStr}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <Badge variant={STATUS_BADGE[req.status] || 'default'} size="sm">
                          {req.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setSelectedApp(req)}
                            leftIcon={<Eye size={13} />}
                          >
                            View
                          </Button>

                          {req.status === 'PENDING' && (
                            <>
                              <Button
                                size="xs"
                                variant="secondary"
                                onClick={() => handleApprove(req)}
                                loading={actionLoading[req.id] === 'approve'}
                                disabled={isAppActionBusy}
                                leftIcon={<Check size={12} className="text-success-600 dark:text-emerald-400" />}
                              >
                                Approve
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleOpenReject(req)}
                                disabled={isAppActionBusy}
                                leftIcon={<X size={12} className="text-danger-600 dark:text-red-400" />}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16 px-4">
            <FileText size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-semibold text-sm">No applications found</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              Try switching status tabs or adjusting your search criteria.
            </p>
          </div>
        )}
      </div>

      {/* ── Modal: View Details ─────────────────────────────── */}
      {selectedApp && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setSelectedApp(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-modal border border-surface-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-surface-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedApp.shop_name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Application #{selectedApp.id} · Verification Review</p>
              </div>
              <Badge variant={STATUS_BADGE[selectedApp.status] || 'default'}>
                {selectedApp.status}
              </Badge>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Applicant Name</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    {selectedApp.applicant_name || `Applicant #${selectedApp.applicant_id}`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Contact Phone</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                    {selectedApp.applicant_phone || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Email</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedApp.applicant_email || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">City / Location</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {selectedApp.city || '—'}
                  </span>
                </div>
              </div>

              {selectedApp.address && (
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Street Address</span>
                  <p className="text-slate-700 dark:text-slate-300 bg-surface-50 dark:bg-slate-800/60 p-2 rounded-lg border border-surface-200 dark:border-slate-700">
                    {selectedApp.address}
                  </p>
                </div>
              )}

              {selectedApp.description && (
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Shop Description</span>
                  <p className="text-slate-700 dark:text-slate-300 bg-surface-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-surface-200 dark:border-slate-700 leading-relaxed">
                    {selectedApp.description}
                  </p>
                </div>
              )}

              {selectedApp.services && (
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-1">Offered Services</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedApp.services.split(',').map((s) => s.trim()).filter(Boolean).map((s) => (
                      <span key={s} className="bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 font-medium px-2 py-0.5 rounded-md border border-primary-100 dark:border-primary-800/50 text-[11px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Doorstep Pickup</span>
                <p className="text-slate-700 dark:text-slate-300 font-medium">
                  {selectedApp.pickup_available ? 'Offered' : 'Not offered'}
                </p>
              </div>

              {selectedApp.rejection_reason && (
                <div className="bg-danger-50 dark:bg-red-950/30 border border-danger-200 dark:border-red-900/50 rounded-xl p-3">
                  <span className="text-danger-800 dark:text-red-300 font-bold block mb-0.5">Rejection Reason:</span>
                  <p className="text-danger-700 dark:text-red-400">{selectedApp.rejection_reason}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-surface-100 dark:border-slate-800">
              {selectedApp.status === 'PENDING' && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={actionLoading[selectedApp.id] === 'approve'}
                    disabled={Boolean(actionLoading[selectedApp.id])}
                    onClick={() => handleApprove(selectedApp)}
                    leftIcon={<Check size={14} className="text-success-600 dark:text-emerald-400" />}
                  >
                    Approve Application
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(actionLoading[selectedApp.id])}
                    onClick={() => {
                      const app = selectedApp;
                      setSelectedApp(null);
                      handleOpenReject(app);
                    }}
                    leftIcon={<X size={14} className="text-danger-600 dark:text-red-400" />}
                  >
                    Reject Application
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelectedApp(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Reject Confirmation with Reason ──────────── */}
      {rejectingApp && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setRejectingApp(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-modal border border-surface-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4 text-danger-600 dark:text-red-400">
              <div className="h-10 w-10 rounded-xl bg-danger-100 dark:bg-red-950/50 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Reject Shop Application</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{rejectingApp.shop_name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
              Are you sure you want to reject this application? The applicant will see this status and reason when checking their application.
            </p>

            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Rejection Reason (Required) <span className="text-danger-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectError) setRejectError('');
                }}
                className={`w-full rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs p-3 focus:outline-none focus:ring-2 ${
                  rejectError
                    ? 'border-danger-500 focus:ring-danger-500/20'
                    : 'border-surface-300 dark:border-slate-700 focus:ring-danger-500/20'
                }`}
                placeholder="Provide clear feedback on why the application was not approved..."
              />
              {rejectError && <p className="text-xs text-danger-600 dark:text-danger-400 mt-1">{rejectError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <Button size="sm" variant="ghost" onClick={() => setRejectingApp(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-danger-600 hover:bg-danger-700 text-white"
                loading={actionLoading[rejectingApp.id] === 'reject'}
                disabled={Boolean(actionLoading[rejectingApp.id]) || !rejectReason.trim()}
                onClick={handleConfirmReject}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
