// ─────────────────────────────────────────────────────────────
// RepairTrack — Customer Track Repair Page (Dashboard) (Phase 5.6)
// Route: /dashboard/track
// Authenticated version of repair tracking for customers.
// Uses real APIs:
//   GET /api/v1/repairs/my
//   GET /api/v1/repairs/{repair_id}
//   POST /api/v1/repairs/{repair_id}/approve-estimate
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  MapPin, Search, CheckCircle2, Clock, Wrench, Package,
  AlertCircle, ArrowRight, Store, ShieldCheck, Check,
  RefreshCw, Copy, DollarSign,
} from 'lucide-react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
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

const STATUS_STEPS = [
  { key: 'RECEIVED',   label: 'Received',   icon: Package },
  { key: 'DIAGNOSING', label: 'Diagnosing', icon: Search },
  { key: 'REPAIRING',  label: 'Repairing',  icon: Wrench },
  { key: 'READY',      label: 'Ready',      icon: CheckCircle2 },
  { key: 'COMPLETED',  label: 'Completed',  icon: ShieldCheck },
];

function getStatusStepIndex(status) {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

export default function TrackDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [myRepairs, setMyRepairs] = useState([]);
  const [loadingMyRepairs, setLoadingMyRepairs] = useState(true);
  const [approving, setApproving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load customer's own repairs on mount
  const fetchMyRepairs = useCallback(async () => {
    setLoadingMyRepairs(true);
    try {
      const data = await getMyRepairs();
      setMyRepairs(data);
    } catch (err) {
      console.error('Failed to load customer repairs:', err);
    } finally {
      setLoadingMyRepairs(false);
    }
  }, []);

  useEffect(() => {
    fetchMyRepairs();
  }, [fetchMyRepairs]);

  const performTrack = async (targetId) => {
    const q = (targetId || '').trim();
    if (!q) return;

    setLoading(true);
    setNotFound(false);
    setErrorMessage(null);
    setSearchedQuery(q);

    try {
      const data = await getMyRepairById(q);
      setResult(data);
      setNotFound(false);
      setSearchParams({ id: q });
    } catch (err) {
      setResult(null);
      if (err.status === 404 || err.status === 403) {
        setNotFound(true);
      } else {
        setErrorMessage(err.message || 'Failed to retrieve repair details.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Check URL search params on mount
  useEffect(() => {
    const idParam = searchParams.get('id') || searchParams.get('code');
    if (idParam) {
      setQuery(idParam);
      performTrack(idParam);
    }
  }, []);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    performTrack(query);
  };

  const handleSelectRepair = (repairId) => {
    setQuery(repairId);
    performTrack(repairId);
  };

  const handleCopyId = () => {
    if (!result?.repairId) return;
    navigator.clipboard.writeText(result.repairId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApproveEstimate = async () => {
    if (!result?.repairId) return;
    setApproving(true);
    try {
      const updated = await approveRepairEstimate(result.repairId);
      setResult(updated);
      await fetchMyRepairs();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to approve estimate.');
    } finally {
      setApproving(false);
    }
  };

  const currentStep = result ? getStatusStepIndex(result.status) : 0;
  const canApprove =
    result &&
    result.estimatedCost !== null &&
    !result.customerApproved &&
    !['COMPLETED', 'CANCELLED'].includes(result.status);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MapPin size={22} className="text-primary-600 dark:text-primary-400" /> Track a Repair
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Enter your repair tracking ID or choose from your registered repairs below.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="e.g. RT-SH001-X7K92"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (notFound) setNotFound(false);
              if (errorMessage) setErrorMessage(null);
            }}
            leftIcon={<Search size={15} />}
            className="font-mono uppercase text-sm"
          />
        </div>
        <Button
          type="submit"
          size="md"
          disabled={!query.trim() || loading}
          leftIcon={loading ? <RefreshCw size={14} className="animate-spin" /> : undefined}
        >
          {loading ? 'Tracking...' : 'Track'}
        </Button>
      </form>

      {/* Loading Spinner */}
      {loading && (
        <div className="py-8">
          <PageLoader label="Fetching repair progress..." />
        </div>
      )}

      {/* Not found alert */}
      {notFound && !loading && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <p className="font-bold mb-0.5">Repair not found</p>
            <p>
              No active repair belonging to your account was found matching <strong>"{searchedQuery}"</strong>.
              Please check the ID or select from your registered repairs.
            </p>
          </div>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && !loading && (
        <div className="bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-danger-600 dark:text-danger-400 shrink-0 mt-0.5" />
          <div className="text-xs text-danger-800 dark:text-danger-300">
            <p className="font-bold mb-0.5">Error</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Result Card */}
      {result && !loading && (
        <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-card">
          <div className="px-5 py-4 border-b border-surface-100 dark:border-slate-800 flex items-center justify-between bg-surface-50/50 dark:bg-slate-800/40">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-surface-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  {result.repairId}
                  <button
                    onClick={handleCopyId}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    title="Copy Repair ID"
                  >
                    {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  </button>
                </span>
              </div>
              <p className="font-bold text-slate-900 dark:text-white">{result.fullDeviceName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <Store size={12} className="text-primary-600 dark:text-primary-400" />
                <span>{result.shopName}</span>
              </p>
            </div>
            <Badge variant={REPAIR_BADGE[result.status] || 'default'}>
              {REPAIR_STATUS_LABELS[result.status] || result.status}
            </Badge>
          </div>

          {/* Progress timeline */}
          {result.status !== 'CANCELLED' && (
            <div className="px-5 py-5 border-b border-surface-100 dark:border-slate-800">
              <div className="relative">
                <div className="absolute top-4 left-4 right-4 h-0.5 bg-surface-200 dark:bg-slate-800 -z-0" />
                <div
                  className="absolute top-4 left-4 h-0.5 bg-primary-600 transition-all duration-300 -z-0"
                  style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                />

                <div className="flex items-start justify-between relative z-10">
                  {STATUS_STEPS.map((step, i) => {
                    const isDone = i <= currentStep;
                    const isCurrent = i === currentStep;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="flex flex-col items-center text-center">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                            isDone ? 'bg-primary-600 text-white' : 'bg-surface-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-surface-200 dark:border-slate-700'
                          } ${isCurrent ? 'ring-4 ring-primary-100 dark:ring-primary-950' : ''}`}
                        >
                          <Icon size={14} />
                        </div>
                        <span className={`text-xs font-medium mt-1.5 leading-tight ${isDone ? 'text-primary-700 dark:text-primary-300 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs border-b border-surface-100 dark:border-slate-800">
            <div>
              <span className="text-slate-400 dark:text-slate-500">Estimated Cost</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{result.cost}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Estimate Approval</span>
              <p className="mt-0.5">
                {result.customerApproved ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Check size={12} /> Approved
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Pending Approval</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Received Date</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {result.receivedAt ? new Date(result.receivedAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>

          {/* Estimate Approval Action if needed */}
          {canApprove && (
            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Cost Estimate Ready for Review ({result.cost})
                </p>
                <p className="text-2xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  The repair shop has calculated an estimate. Approve to proceed with repairs.
                </p>
              </div>
              <Button
                size="xs"
                variant="success"
                onClick={handleApproveEstimate}
                disabled={approving}
                leftIcon={approving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
              >
                {approving ? 'Approving...' : 'Approve'}
              </Button>
            </div>
          )}

          {/* Problem & History */}
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">Issue Reported</p>
              <p className="text-xs text-slate-800 dark:text-slate-200 bg-surface-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-surface-200 dark:border-slate-700 whitespace-pre-line leading-relaxed">
                {result.problemDescription || 'No description provided.'}
              </p>
            </div>

            {result.history && result.history.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2">Technician Updates</p>
                <div className="space-y-2">
                  {result.history.map((h, idx) => (
                    <div
                      key={h.id || idx}
                      className="p-2.5 rounded-lg bg-surface-50 dark:bg-slate-800/40 border border-surface-200/60 dark:border-slate-800 flex items-start justify-between gap-2"
                    >
                      <div>
                        <Badge variant={REPAIR_BADGE[h.status] || 'default'} size="xs">
                          {REPAIR_STATUS_LABELS[h.status] || h.status}
                        </Badge>
                        {h.note && (
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                            {h.note}
                          </p>
                        )}
                      </div>
                      <span className="text-2xs text-slate-400 shrink-0">
                        {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Access from Customer's Real Repairs */}
      {!loadingMyRepairs && myRepairs.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-surface-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">My Registered Repairs</h2>
            <Link to={ROUTES.DASHBOARD_REPAIRS} className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-0.5 transition-colors font-medium">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-surface-100 dark:divide-slate-800">
            {myRepairs.map((r) => (
              <button
                key={r.id || r.repairId}
                onClick={() => handleSelectRepair(r.repairId)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-50 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{r.fullDeviceName}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{r.repairId} · {r.shopName}</p>
                </div>
                <Badge variant={REPAIR_BADGE[r.status] || 'default'} size="sm">
                  {REPAIR_STATUS_LABELS[r.status] || r.status}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
