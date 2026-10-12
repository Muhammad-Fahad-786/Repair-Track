// ─────────────────────────────────────────────────────────────
// RepairTrack — Shop Owner Active Repairs Management (Phase 5.8)
// Route: /shop-owner/repairs and /shop-owner/repairs/:repairId
// Real integration with:
//   GET   /api/v1/shop-owner/repairs
//   GET   /api/v1/shop-owner/repairs/{repair_id}
//   PATCH /api/v1/shop-owner/repairs/{repair_id}/status
//   POST  /api/v1/shop-owner/repairs/{repair_id}/history
//   PATCH /api/v1/shop-owner/repairs/{repair_id}/estimate
//   POST  /api/v1/shop-owner/repairs/analyze  (Phase 5.8 -- AI)
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Wrench, CheckCircle2, Clock, AlertCircle, RefreshCw,
  Search, X, Copy, Check, ChevronRight, User, Phone, Mail,
  Calendar, DollarSign, FileText, ArrowRight, ShieldCheck,
  ShieldAlert, Tag, Package, Send, Sparkles, AlertTriangle,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { StatCard } from '../../components/ui/Card';
import {
  REPAIR_STATUS_LABELS,
  ROUTES,
} from '../../constants';
import {
  getShopOwnerRepairs,
  getShopOwnerRepairById,
  updateRepairStatus,
  addRepairHistory,
  updateRepairEstimate,
  analyzeRepairProblem,
  VALID_REPAIR_TRANSITIONS,
} from '../../services/repairService';

const REPAIR_BADGE = {
  RECEIVED:   'info',
  DIAGNOSING: 'warning',
  REPAIRING:  'warning',
  READY:      'success',
  COMPLETED:  'success',
  CANCELLED:  'danger',
};

// ─── Status Update Descriptions ──────────────────────────────
const STATUS_DESCRIPTIONS = {
  RECEIVED:   'Device received at workshop. Ready for diagnosis.',
  DIAGNOSING: 'Inspecting device components and diagnosing issues.',
  REPAIRING:  'Active repair work in progress.',
  READY:      'Repair completed and device tested. Ready for customer pickup.',
  COMPLETED:  'Device returned to customer. Job finalized.',
  CANCELLED:  'Repair cancelled.',
};

// ─── Repair Detail Modal ──────────────────────────────────────
function ShopRepairDetailModal({ repairId, onClose, onRefreshList }) {
  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Status update state
  const [selectedNextStatus, setSelectedNextStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState(null);

  // Estimate state
  const [estimateInput, setEstimateInput] = useState('');
  const [updatingEstimate, setUpdatingEstimate] = useState(false);
  const [estimateError, setEstimateError] = useState(null);

  // Add history note state
  const [historyNote, setHistoryNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [noteError, setNoteError] = useState(null);

  // AI analysis state (Phase 5.8)
  const [aiResult, setAiResult] = useState(null);      // { success, category?, priority?, summary?, message? }
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const inFlightAiRef = useRef(false);

  const fetchDetail = useCallback(async () => {
    if (!repairId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getShopOwnerRepairById(repairId);
      setRepair(data);
      if (data.estimatedCost !== null && data.estimatedCost !== undefined) {
        setEstimateInput(String(data.estimatedCost));
      } else {
        setEstimateInput('');
      }
      // Reset transition selection
      const allowed = VALID_REPAIR_TRANSITIONS[data.status] || [];
      setSelectedNextStatus(allowed[0] || '');
      setStatusNote('');
    } catch (err) {
      if (err.status === 404) {
        setError('Repair record not found.');
      } else if (err.status === 403) {
        setError('You do not have permission to access this repair.');
      } else {
        setError(err.message || 'Failed to load repair details.');
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

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedNextStatus) return;
    setUpdatingStatus(true);
    setStatusError(null);
    try {
      await updateRepairStatus(repair.repairId, {
        status: selectedNextStatus,
        note: statusNote.trim() || undefined,
      });
      await fetchDetail();
      if (onRefreshList) onRefreshList();
    } catch (err) {
      setStatusError(err.message || 'Failed to update repair status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleEstimateSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(estimateInput);
    if (isNaN(val) || val < 0) {
      setEstimateError('Please enter a valid non-negative cost.');
      return;
    }
    setUpdatingEstimate(true);
    setEstimateError(null);
    try {
      await updateRepairEstimate(repair.repairId, val);
      await fetchDetail();
      if (onRefreshList) onRefreshList();
    } catch (err) {
      setEstimateError(err.message || 'Failed to update estimate.');
    } finally {
      setUpdatingEstimate(false);
    }
  };

  const handleAddNoteSubmit = async (e) => {
    e.preventDefault();
    const trimmed = historyNote.trim();
    if (!trimmed) return;
    setAddingNote(true);
    setNoteError(null);
    try {
      await addRepairHistory(repair.repairId, { note: trimmed });
      setHistoryNote('');
      await fetchDetail();
      if (onRefreshList) onRefreshList();
    } catch (err) {
      setNoteError(err.message || 'Failed to add progress note.');
    } finally {
      setAddingNote(false);
    }
  };

  // AI analysis handler (Phase 5.8)
  const handleAiAnalyze = async () => {
    const desc = repair?.problemDescription?.trim();
    if (!desc || desc.length < 20 || analyzingAi || inFlightAiRef.current) return;
    inFlightAiRef.current = true;
    setAnalyzingAi(true);
    setAiResult(null);
    setAiPanelOpen(true);
    try {
      const result = await analyzeRepairProblem(desc);
      setAiResult(result);
    } catch (err) {
      const rawMsg = err.message || '';
      const safeMsg = rawMsg.toLowerCase().includes('timeout')
        ? 'AI analysis timed out. You can retry or continue manually.'
        : rawMsg || 'AI analysis failed.';
      setAiResult({ success: false, message: safeMsg });
    } finally {
      inFlightAiRef.current = false;
      setAnalyzingAi(false);
    }
  };

  const allowedTransitions = useMemo(() => {
    if (!repair) return [];
    return VALID_REPAIR_TRANSITIONS[repair.status] || [];
  }, [repair]);

  const isTerminal = repair?.status === 'COMPLETED' || repair?.status === 'CANCELLED';

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-modal border border-surface-200 dark:border-slate-800 z-10 max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-surface-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Repair Job
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
                {repair.fullDeviceName} · Created {repair.createdAt ? new Date(repair.createdAt).toLocaleDateString() : 'N/A'}
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

        {/* Loading / Error States */}
        {loading && (
          <div className="py-12">
            <PageLoader label="Loading repair details..." />
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

        {/* Detail Body */}
        {repair && !loading && (
          <div className="space-y-5">
            {/* Status & Highlights */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-surface-50 dark:bg-slate-800/50 border border-surface-200/70 dark:border-slate-800">
              <div>
                <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1">
                  Current Status
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={REPAIR_BADGE[repair.status] || 'default'} size="md">
                    {REPAIR_STATUS_LABELS[repair.status] || repair.status}
                  </Badge>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {STATUS_DESCRIPTIONS[repair.status]}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">
                  Estimated Cost
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {repair.cost}
                </span>
                {repair.estimatedCost !== null && (
                  <p className="text-2xs mt-0.5">
                    {repair.customerApproved ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-1">
                        <Check size={11} /> Customer Approved
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        Awaiting Approval
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Device & Customer Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Device Card */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800">
                <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1.5 flex items-center gap-1">
                  <Wrench size={11} /> Device Information
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {repair.fullDeviceName}
                </p>
                <div className="mt-1 space-y-0.5 text-2xs text-slate-500 dark:text-slate-400">
                  <p>Type: <span className="font-medium text-slate-700 dark:text-slate-300">{repair.deviceType}</span></p>
                  {(repair.deviceBrand || repair.deviceModel) && (
                    <p>Model: <span className="font-medium text-slate-700 dark:text-slate-300">{[repair.deviceBrand, repair.deviceModel].filter(Boolean).join(' ')}</span></p>
                  )}
                  {repair.pickupRequestId && (
                    <p>Pickup Ref: <span className="font-mono text-slate-700 dark:text-slate-300">#PICK-{repair.pickupRequestId}</span></p>
                  )}
                </div>
              </div>

              {/* Customer Card */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800">
                <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1.5 flex items-center gap-1">
                  <User size={11} /> Customer Details
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {repair.customer?.name || repair.customerName || `Customer #${repair.customerId}`}
                </p>
                <div className="mt-1 space-y-0.5 text-2xs text-slate-500 dark:text-slate-400">
                  {repair.customer?.phone && (
                    <p className="flex items-center gap-1">
                      <Phone size={10} className="text-slate-400" />
                      <span>{repair.customer.phone}</span>
                    </p>
                  )}
                  {repair.customer?.email && (
                    <p className="flex items-center gap-1">
                      <Mail size={10} className="text-slate-400" />
                      <span>{repair.customer.email}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Problem Description */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800">
              <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1">
                Reported Problem / Work Needed
              </span>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {repair.problemDescription || 'No description provided.'}
              </p>
            </div>

            {/* ─── AI Repair Assistance Panel (Phase 5.8) ─── */}
            {repair.problemDescription && repair.problemDescription.trim().length >= 20 && (
              <div className="rounded-xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/60 dark:bg-violet-950/30">
                {/* AI Panel Header / Toggle */}
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-violet-100 dark:bg-violet-900/60 flex items-center justify-center">
                      <Sparkles size={13} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-violet-900 dark:text-violet-100">AI Repair Assistance</span>
                      <span className="ml-2 text-2xs text-violet-500 dark:text-violet-400 font-normal">Beta · Suggestions only</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!analyzingAi && !aiResult && (
                      <button
                        onClick={handleAiAnalyze}
                        disabled={analyzingAi}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-2xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-60"
                      >
                        <Sparkles size={11} />
                        Analyze with AI
                      </button>
                    )}
                    {(aiResult || analyzingAi) && (
                      <button
                        onClick={() => setAiPanelOpen(o => !o)}
                        className="p-1 rounded-lg text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                        title={aiPanelOpen ? 'Collapse' : 'Expand'}
                      >
                        {aiPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* AI Results */}
                {aiPanelOpen && (
                  <div className="px-3.5 pb-3.5 space-y-2.5">
                    {analyzingAi && (
                      <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-violet-200 dark:border-violet-800/60">
                        <RefreshCw size={13} className="animate-spin text-violet-500" />
                        <span className="text-xs text-violet-600 dark:text-violet-300">Analyzing problem description...</span>
                      </div>
                    )}

                    {aiResult && !analyzingAi && (
                      <>
                        {aiResult.success ? (
                          <div className="space-y-2">
                            {/* Disclaimer banner */}
                            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                              <AlertTriangle size={11} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                              <p className="text-2xs text-amber-700 dark:text-amber-300">
                                AI suggestion only — verify before applying. The Shop Owner makes all final decisions.
                              </p>
                            </div>

                            {/* Category & Priority */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-violet-200 dark:border-violet-800/50">
                                <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">Category</span>
                                <span className="text-xs font-bold text-slate-900 dark:text-white">{aiResult.category}</span>
                              </div>
                              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-violet-200 dark:border-violet-800/50">
                                <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">Suggested Priority</span>
                                <span className={`text-xs font-bold ${
                                  aiResult.priority === 'HIGH' ? 'text-red-600 dark:text-red-400' :
                                  aiResult.priority === 'MEDIUM' ? 'text-amber-600 dark:text-amber-400' :
                                  'text-emerald-600 dark:text-emerald-400'
                                }`}>{aiResult.priority}</span>
                              </div>
                            </div>

                            {/* Summary */}
                            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-violet-200 dark:border-violet-800/50">
                              <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1">AI Summary</span>
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                {aiResult.summary}
                              </p>
                            </div>

                            {/* Re-analyze button */}
                            <button
                              onClick={handleAiAnalyze}
                              disabled={analyzingAi}
                              className="text-2xs text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 underline underline-offset-2 transition-colors disabled:opacity-50"
                            >
                              Re-analyze
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                            <AlertTriangle size={13} className="text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">AI analysis unavailable</p>
                              <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {aiResult.message || 'Please continue with your manual assessment.'}
                              </p>
                              <button
                                onClick={handleAiAnalyze}
                                disabled={analyzingAi}
                                className="text-2xs text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 underline underline-offset-2 mt-1 transition-colors disabled:opacity-50"
                              >
                                Try again
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Actions: Status Transition & Estimate */}
            {!isTerminal && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-surface-100 dark:border-slate-800">
                {/* Status Transition Card */}
                <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-slate-800/40 border border-surface-200 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <RefreshCw size={13} className="text-primary-600 dark:text-primary-400" />
                      Advance Status
                    </span>
                    <span className="text-2xs text-slate-400">Backend validated</span>
                  </div>

                  {statusError && (
                    <div className="p-2 rounded-lg bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-900/60 text-2xs text-danger-700 dark:text-danger-300">
                      {statusError}
                    </div>
                  )}

                  {allowedTransitions.length > 0 ? (
                    <form onSubmit={handleStatusSubmit} className="space-y-2">
                      <div>
                        <label className="block text-2xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Next Allowed Status
                        </label>
                        <select
                          value={selectedNextStatus}
                          onChange={(e) => setSelectedNextStatus(e.target.value)}
                          className="w-full text-xs rounded-xl border border-surface-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {allowedTransitions.map((st) => (
                            <option key={st} value={st}>
                              {REPAIR_STATUS_LABELS[st] || st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Optional status change note..."
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          maxLength={500}
                          className="w-full text-xs rounded-xl border border-surface-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <Button
                        type="submit"
                        size="xs"
                        variant="primary"
                        className="w-full"
                        disabled={updatingStatus || !selectedNextStatus}
                        leftIcon={updatingStatus ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                      >
                        {updatingStatus ? 'Updating Status...' : 'Apply Transition'}
                      </Button>
                    </form>
                  ) : (
                    <p className="text-2xs text-slate-400">No further transitions available.</p>
                  )}
                </div>

                {/* Estimate Cost Card */}
                <div className="p-3.5 rounded-xl bg-surface-50 dark:bg-slate-800/40 border border-surface-200 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <DollarSign size={13} className="text-emerald-600 dark:text-emerald-400" />
                      Set Estimated Cost
                    </span>
                    <span className="text-2xs text-slate-400">Requires approval</span>
                  </div>

                  {estimateError && (
                    <div className="p-2 rounded-lg bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-900/60 text-2xs text-danger-700 dark:text-danger-300">
                      {estimateError}
                    </div>
                  )}

                  <form onSubmit={handleEstimateSubmit} className="space-y-2">
                    <div>
                      <label className="block text-2xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Amount ($ USD)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g. 150.00"
                          value={estimateInput}
                          onChange={(e) => setEstimateInput(e.target.value)}
                          className="w-full text-xs rounded-xl border border-surface-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-7 pr-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="xs"
                      variant="outline"
                      className="w-full"
                      disabled={updatingEstimate || !estimateInput}
                      leftIcon={updatingEstimate ? <RefreshCw size={12} className="animate-spin" /> : <DollarSign size={12} />}
                    >
                      {updatingEstimate ? 'Saving...' : 'Update Estimate'}
                    </Button>
                  </form>
                </div>
              </div>
            )}

            {/* Add Progress Note */}
            {!isTerminal && (
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText size={13} className="text-primary-600 dark:text-primary-400" />
                  Add Progress Note
                </span>

                {noteError && (
                  <div className="p-2 rounded-lg bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-900/60 text-2xs text-danger-700 dark:text-danger-300">
                    {noteError}
                  </div>
                )}

                <form onSubmit={handleAddNoteSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add manual progress update for customer tracking..."
                    value={historyNote}
                    onChange={(e) => setHistoryNote(e.target.value)}
                    maxLength={1000}
                    className="flex-1 text-xs rounded-xl border border-surface-200 dark:border-slate-700 bg-surface-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <Button
                    type="submit"
                    size="xs"
                    variant="primary"
                    disabled={addingNote || !historyNote.trim()}
                    leftIcon={addingNote ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                  >
                    Post Note
                  </Button>
                </form>
              </div>
            )}

            {/* Audit History Timeline */}
            <div className="space-y-3 pt-2 border-t border-surface-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" />
                Repair Progress History ({repair.history?.length || 0})
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
                <p className="text-xs text-slate-400 py-3 text-center">No history entries recorded yet.</p>
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

// ─── Main ShopRepairsPage ─────────────────────────────────────
export default function ShopRepairsPage() {
  const { repairId: routeRepairId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedRepairId, setSelectedRepairId] = useState(() => routeRepairId || searchParams.get('id') || null);

  const fetchRepairs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getShopOwnerRepairs();
      setRepairs(data);
    } catch (err) {
      console.error('Failed to load shop repairs:', err);
      setError(err.message || 'Unable to load repairs for your shop.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepairs();
  }, [fetchRepairs]);

  // Sync route param or search query param
  useEffect(() => {
    const id = routeRepairId || searchParams.get('id');
    if (id) {
      setSelectedRepairId(id);
    }
  }, [routeRepairId, searchParams]);

  const handleOpenDetail = (id) => {
    setSelectedRepairId(id);
    setSearchParams({ id: String(id) });
  };

  const handleCloseDetail = () => {
    setSelectedRepairId(null);
    setSearchParams({});
  };

  // Filter logic
  const filteredRepairs = useMemo(() => {
    return repairs.filter((r) => {
      // Status tab filter
      if (activeTab === 'ACTIVE' && ['COMPLETED', 'CANCELLED'].includes(r.status)) {
        return false;
      }
      if (activeTab !== 'ALL' && activeTab !== 'ACTIVE' && r.status !== activeTab) {
        return false;
      }

      // Search term filter
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        r.repairId.toLowerCase().includes(term) ||
        r.device.toLowerCase().includes(term) ||
        r.problemDescription.toLowerCase().includes(term) ||
        (r.customerName && r.customerName.toLowerCase().includes(term))
      );
    });
  }, [repairs, activeTab, searchTerm]);

  // Status counts for tabs
  const activeCount    = repairs.filter((r) => !['COMPLETED', 'CANCELLED'].includes(r.status)).length;
  const readyCount     = repairs.filter((r) => r.status === 'READY').length;
  const completedCount = repairs.filter((r) => r.status === 'COMPLETED').length;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench size={22} className="text-primary-600 dark:text-primary-400" /> Shop Repairs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage repair diagnostics, cost estimates, history updates, and job completion.
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
            to={ROUTES.SHOP_OWNER_PICKUPS}
            size="sm"
            variant="primary"
            leftIcon={<Package size={14} />}
          >
            View Pickups
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Repairs"
          value={repairs.length}
          icon={<Wrench size={20} />}
          accent="primary"
          description="All shop repair records"
        />
        <StatCard
          title="In Progress"
          value={activeCount}
          icon={<Clock size={20} />}
          accent="warning"
          description="Active repair jobs"
        />
        <StatCard
          title="Ready for Pickup"
          value={readyCount}
          icon={<CheckCircle2 size={20} />}
          accent="info"
          description="Awaiting collection"
        />
        <StatCard
          title="Completed"
          value={completedCount}
          icon={<ShieldCheck size={20} />}
          accent="success"
          description="Finalized repairs"
        />
      </div>

      {/* ── Filter Bar & Search ──────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: `All (${repairs.length})` },
            { id: 'ACTIVE', label: `Active (${activeCount})` },
            { id: 'RECEIVED', label: 'Received' },
            { id: 'DIAGNOSING', label: 'Diagnosing' },
            { id: 'REPAIRING', label: 'Repairing' },
            { id: 'READY', label: `Ready (${readyCount})` },
            { id: 'COMPLETED', label: `Completed (${completedCount})` },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-surface-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Repair ID, device, customer..."
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-surface-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Loading State ───────────────────────────────────── */}
      {loading && (
        <div className="py-16">
          <PageLoader label="Loading shop repair jobs..." />
        </div>
      )}

      {/* ── Error State ─────────────────────────────────────── */}
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

      {/* ── Repairs Grid ────────────────────────────────────── */}
      {!loading && !error && (
        <>
          {filteredRepairs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredRepairs.map((r) => (
                <div
                  key={r.id || r.repairId}
                  className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-card transition-shadow shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Repair ID & Badge */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div>
                        <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400 block">
                          {r.repairId}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 line-clamp-1">
                          {r.fullDeviceName}
                        </h3>
                      </div>
                      <Badge variant={REPAIR_BADGE[r.status] || 'default'} size="sm">
                        {REPAIR_STATUS_LABELS[r.status] || r.status}
                      </Badge>
                    </div>

                    {/* Problem snippet */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                      {r.problemDescription || 'No description provided.'}
                    </p>

                    {/* Customer & Cost meta */}
                    <div className="space-y-1 pt-2 border-t border-surface-100 dark:border-slate-800 text-2xs text-slate-500 dark:text-slate-400">
                      {r.customerName && (
                        <div className="flex items-center justify-between">
                          <span>Customer:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{r.customerName}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span>Estimate:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{r.cost}</span>
                      </div>
                      {r.estimatedCost !== null && (
                        <div className="flex items-center justify-between">
                          <span>Approval:</span>
                          <span className={r.customerApproved ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-600 dark:text-amber-400'}>
                            {r.customerApproved ? 'Approved' : 'Pending'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div className="mt-4 pt-3 border-t border-surface-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-2xs text-slate-400">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
                    </span>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => handleOpenDetail(r.repairId)}
                      rightIcon={<ChevronRight size={13} />}
                    >
                      Manage Job
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <Wrench size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {searchTerm || activeTab !== 'ALL'
                  ? 'No matching repair jobs'
                  : 'No repair jobs created yet'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {searchTerm || activeTab !== 'ALL'
                  ? 'Try selecting a different filter or clearing your search term.'
                  : 'Repair jobs are created from customer pickups that reach the Received status.'}
              </p>
              {searchTerm || activeTab !== 'ALL' ? (
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setActiveTab('ALL');
                      setSearchTerm('');
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              ) : (
                <div className="mt-4">
                  <Button as={Link} to={ROUTES.SHOP_OWNER_PICKUPS} size="sm">
                    Go to Received Pickups
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Detail Modal ────────────────────────────────────── */}
      {selectedRepairId && (
        <ShopRepairDetailModal
          repairId={selectedRepairId}
          onClose={handleCloseDetail}
          onRefreshList={fetchRepairs}
        />
      )}
    </div>
  );
}
