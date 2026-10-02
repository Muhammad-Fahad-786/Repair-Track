// ─────────────────────────────────────────────────────────────
// RepairTrack — Customer My Repairs Page (Phase 5.6)
// Route: /dashboard/repairs and /dashboard/repairs/:repairId
// Real integration with FastAPI endpoints:
//   GET  /api/v1/repairs/my
//   GET  /api/v1/repairs/{repair_id}
//   POST /api/v1/repairs/{repair_id}/approve-estimate
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Wrench, PlusCircle, MapPin, Calendar, DollarSign,
  FileText, CheckCircle2, Clock, Store, Check, RefreshCw,
  AlertCircle, ShieldCheck, Copy, X, ChevronRight,
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { ROUTES, REPAIR_STATUS_LABELS } from '../../constants';
import {
  getMyRepairs,
  getMyRepairById,
  approveRepairEstimate,
} from '../../services/repairService';

const REPAIR_BADGE = {
  RECEIVED:   'info',
  DIAGNOSING: 'warning',
  REPAIRING:  'warning',
  READY:      'success',
  COMPLETED:  'success',
  CANCELLED:  'danger',
};

// ─── Customer Repair Detail Modal ─────────────────────────────
function CustomerRepairDetailModal({ repairId, onClose, onRefreshList }) {
  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Approval state
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState(null);

  const fetchDetail = useCallback(async () => {
    if (!repairId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMyRepairById(repairId);
      setRepair(data);
    } catch (err) {
      if (err.status === 404) {
        setError('Repair record not found.');
      } else if (err.status === 403) {
        setError('You do not have permission to view this repair.');
      } else {
        setError(err.message || 'Unable to load repair details.');
      }
    } finally {
      setLoading(false);
    }
  }, [repairId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleCopyId = () => {
    if (!repair?.repairId) return;
    navigator.clipboard.writeText(repair.repairId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApproveEstimate = async () => {
    if (!repair?.repairId) return;
    setApproving(true);
    setApprovalError(null);
    try {
      await approveRepairEstimate(repair.repairId);
      await fetchDetail();
      if (onRefreshList) onRefreshList();
    } catch (err) {
      setApprovalError(err.message || 'Failed to approve estimate.');
    } finally {
      setApproving(false);
    }
  };

  const canApprove =
    repair &&
    repair.estimatedCost !== null &&
    !repair.customerApproved &&
    !['COMPLETED', 'CANCELLED'].includes(repair.status);

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-modal border border-surface-200 dark:border-slate-800 z-10 max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-surface-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Repair Details
              </h2>
              {repair && (
                <div className="flex items-center gap-1.5 bg-surface-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-surface-200 dark:border-slate-700">
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                    {repair.repairId}
                  </span>
                  <button
                    onClick={handleCopyId}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    title="Copy Repair ID"
                  >
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              )}
            </div>
            {repair && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {repair.fullDeviceName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-surface-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="py-12">
            <PageLoader label="Loading repair job..." />
          </div>
        )}

        {error && !loading && (
          <div className="p-4 bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-900/60 rounded-xl text-center space-y-2">
            <AlertCircle size={20} className="mx-auto text-danger-600 dark:text-danger-400" />
            <p className="text-xs text-danger-700 dark:text-danger-300 font-medium">{error}</p>
            <Button size="xs" variant="outline" onClick={fetchDetail}>
              Retry
            </Button>
          </div>
        )}

        {/* Content */}
        {repair && !loading && (
          <div className="space-y-4">
            {/* Status & Shop banner */}
            <div className="p-4 rounded-xl bg-surface-50 dark:bg-slate-800/50 border border-surface-200/70 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1">
                  Status
                </span>
                <Badge variant={REPAIR_BADGE[repair.status] || 'default'} size="md">
                  {REPAIR_STATUS_LABELS[repair.status] || repair.status}
                </Badge>
              </div>

              {repair.shop && (
                <div className="text-right">
                  <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">
                    Repair Shop
                  </span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-end gap-1">
                    <Store size={13} className="text-primary-600 dark:text-primary-400" />
                    <span>{repair.shopName}</span>
                  </p>
                  {repair.shopPhone && (
                    <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {repair.shopPhone}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Estimate & Approval Card */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">
                    Estimated Cost
                  </span>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {repair.cost}
                  </p>
                </div>
                <div>
                  {repair.estimatedCost !== null ? (
                    repair.customerApproved ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        <CheckCircle2 size={13} /> Estimate Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                        <Clock size={13} /> Awaiting Your Approval
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-slate-400">Diagnosis in progress</span>
                  )}
                </div>
              </div>

              {approvalError && (
                <div className="p-2.5 rounded-lg bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-900/60 text-xs text-danger-700 dark:text-danger-300">
                  {approvalError}
                </div>
              )}

              {canApprove && (
                <div className="pt-2 border-t border-surface-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Please review and approve the estimated cost to proceed with repair.
                  </p>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={handleApproveEstimate}
                    disabled={approving}
                    leftIcon={approving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                  >
                    {approving ? 'Approving...' : 'Approve Estimate'}
                  </Button>
                </div>
              )}
            </div>

            {/* Reported Problem */}
            <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-slate-800/40 border border-surface-200/70 dark:border-slate-800 text-xs">
              <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1">
                Reported Problem
              </span>
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {repair.problemDescription || 'No description provided.'}
              </p>
            </div>

            {/* Repair Progress Timeline */}
            <div className="space-y-3 pt-2 border-t border-surface-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" />
                Progress Timeline ({repair.history?.length || 0})
              </span>

              {repair.history && repair.history.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-200 dark:before:bg-slate-800">
                  {repair.history.map((h, idx) => (
                    <div key={h.id || idx} className="relative">
                      <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-primary-600 shadow-xs" />
                      <div className="bg-surface-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-surface-200/60 dark:border-slate-800">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {REPAIR_STATUS_LABELS[h.status] || h.status}
                          </span>
                          <span className="text-2xs text-slate-400">
                            {h.createdAt ? new Date(h.createdAt).toLocaleString() : ''}
                          </span>
                        </div>
                        {h.note && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {h.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2 text-center">No timeline updates recorded yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-surface-100 dark:border-slate-800">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Customer Repair Card Component ───────────────────────────
function CustomerRepairCard({ repair, onOpenDetails, onApproveEstimate, isApproving }) {
  const canApprove =
    repair.estimatedCost !== null &&
    !repair.customerApproved &&
    !['COMPLETED', 'CANCELLED'].includes(repair.status);

  return (
    <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-card transition-shadow shadow-xs flex flex-col justify-between">
      <div className="p-5">
        {/* Header row: Device, Badge, Repair ID */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="min-w-0 flex-1">
            <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400 block mb-0.5">
              {repair.repairId}
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {repair.fullDeviceName}
            </h3>
          </div>
          <Badge variant={REPAIR_BADGE[repair.status] || 'default'} size="sm" className="shrink-0">
            {REPAIR_STATUS_LABELS[repair.status] || repair.status}
          </Badge>
        </div>

        {/* Problem summary */}
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {repair.problemDescription || 'No description provided.'}
        </p>

        {/* Shop info & Cost */}
        <div className="space-y-1.5 pt-2 border-t border-surface-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Store size={12} className="text-primary-600 dark:text-primary-400 shrink-0" />
              <span className="truncate">{repair.shopName}</span>
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{repair.cost}</span>
          </div>

          {repair.estimatedCost !== null && (
            <div className="flex items-center justify-between text-2xs">
              <span>Approval Status:</span>
              <span className={repair.customerApproved ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-600 dark:text-amber-400 font-medium'}>
                {repair.customerApproved ? 'Approved' : 'Pending Approval'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-5 py-3 bg-surface-50/50 dark:bg-slate-800/40 border-t border-surface-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <span className="text-2xs text-slate-400">
          {repair.createdAt ? new Date(repair.createdAt).toLocaleDateString() : ''}
        </span>
        <div className="flex items-center gap-2">
          {canApprove && (
            <Button
              size="xs"
              variant="success"
              onClick={() => onApproveEstimate(repair.repairId)}
              disabled={isApproving}
              leftIcon={isApproving ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
            >
              Approve
            </Button>
          )}
          <Button
            size="xs"
            variant="outline"
            onClick={() => onOpenDetails(repair.repairId)}
            rightIcon={<ChevronRight size={13} />}
          >
            Details
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Customer RepairsPage Component ──────────────────────
export default function RepairsPage() {
  const { repairId: routeRepairId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRepairId, setSelectedRepairId] = useState(() => routeRepairId || searchParams.get('id') || null);
  const [actionApprovingId, setActionApprovingId] = useState(null);

  const fetchRepairs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyRepairs();
      setRepairs(data);
    } catch (err) {
      console.error('Failed to load customer repairs:', err);
      setError(err.message || 'Unable to load your repair records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepairs();
  }, [fetchRepairs]);

  // Sync route param or query param
  useEffect(() => {
    const id = routeRepairId || searchParams.get('id');
    if (id) {
      setSelectedRepairId(id);
    }
  }, [routeRepairId, searchParams]);

  const handleOpenDetails = (id) => {
    setSelectedRepairId(id);
    setSearchParams({ id: String(id) });
  };

  const handleCloseDetails = () => {
    setSelectedRepairId(null);
    setSearchParams({});
  };

  const handleInlineApprove = async (repairId) => {
    setActionApprovingId(repairId);
    try {
      await approveRepairEstimate(repairId);
      await fetchRepairs();
    } catch (err) {
      console.error('Failed to approve estimate:', err);
    } finally {
      setActionApprovingId(null);
    }
  };

  const active    = repairs.filter((r) => !['COMPLETED', 'CANCELLED'].includes(r.status));
  const completed = repairs.filter((r) => r.status === 'COMPLETED');
  const cancelled = repairs.filter((r) => r.status === 'CANCELLED');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wrench size={22} className="text-primary-600 dark:text-primary-400" /> My Repairs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track your device repair diagnostics, approve cost estimates, and follow progress updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={fetchRepairs}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            as={Link}
            to={ROUTES.DASHBOARD_PICKUPS_NEW}
            size="sm"
            leftIcon={<PlusCircle size={16} />}
          >
            Request Pickup
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-16">
          <PageLoader label="Loading your repairs..." />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-danger-200 dark:border-danger-900/60 shadow-xs text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-danger-50 dark:bg-danger-950/60 border border-danger-200 dark:border-danger-800 flex items-center justify-center text-danger-600 dark:text-danger-400">
              <AlertCircle size={24} />
            </div>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Failed to load repairs
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {error}
          </p>
          <Button size="sm" onClick={fetchRepairs} leftIcon={<RefreshCw size={14} />}>
            Retry
          </Button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Active Repairs */}
          {active.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Active Repairs ({active.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {active.map((r) => (
                  <CustomerRepairCard
                    key={r.id || r.repairId}
                    repair={r}
                    onOpenDetails={handleOpenDetails}
                    onApproveEstimate={handleInlineApprove}
                    isApproving={actionApprovingId === r.repairId}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed Repairs */}
          {completed.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Completed Repairs ({completed.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {completed.map((r) => (
                  <CustomerRepairCard
                    key={r.id || r.repairId}
                    repair={r}
                    onOpenDetails={handleOpenDetails}
                    onApproveEstimate={handleInlineApprove}
                    isApproving={actionApprovingId === r.repairId}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Cancelled Repairs */}
          {cancelled.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Cancelled ({cancelled.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {cancelled.map((r) => (
                  <CustomerRepairCard
                    key={r.id || r.repairId}
                    repair={r}
                    onOpenDetails={handleOpenDetails}
                    onApproveEstimate={handleInlineApprove}
                    isApproving={actionApprovingId === r.repairId}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {repairs.length === 0 && (
            <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <Wrench size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                No repairs yet
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Request a doorstep pickup for your damaged device to get started with professional repairs.
              </p>
              <div className="mt-4">
                <Button
                  as={Link}
                  to={ROUTES.DASHBOARD_PICKUPS_NEW}
                  size="sm"
                  leftIcon={<PlusCircle size={15} />}
                >
                  Request Pickup
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedRepairId && (
        <CustomerRepairDetailModal
          repairId={selectedRepairId}
          onClose={handleCloseDetails}
          onRefreshList={fetchRepairs}
        />
      )}
    </div>
  );
}
