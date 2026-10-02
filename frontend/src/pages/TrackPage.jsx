// ─────────────────────────────────────────────────────────────
// RepairTrack — Public Repair Tracking Page (Phase 5.6)
// Route: /track
// Allows anyone to enter a Repair ID and view real-time status.
// Real integration with:
//   GET /api/v1/track/{repair_id}
// Does NOT require authentication.
// Exposes ONLY safe public data (NO customer PII, phone, address, etc.).
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, MapPin, CheckCircle2, Clock, Wrench, Package,
  AlertCircle, ShieldCheck, Store, Calendar, DollarSign,
  RefreshCw, Check, Copy,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { PageLoader } from '../components/ui/Spinner';
import { REPAIR_STATUS_LABELS } from '../constants';
import { trackRepair } from '../services/repairService';

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

export default function TrackPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [copied, setCopied] = useState(false);

  const performTrack = async (targetId) => {
    const q = (targetId || '').trim();
    if (!q) return;

    setLoading(true);
    setNotFound(false);
    setErrorMessage(null);
    setSearchedQuery(q);

    try {
      const data = await trackRepair(q);
      setResult(data);
      setNotFound(false);
      setSearchParams({ id: q });
    } catch (err) {
      setResult(null);
      if (err.status === 404) {
        setNotFound(true);
      } else {
        setErrorMessage(err.message || 'An error occurred while tracking the repair.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Check URL params on initial load
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

  const handleSelectSample = (sampleCode) => {
    setQuery(sampleCode);
    performTrack(sampleCode);
  };

  const handleCopyId = () => {
    if (!result?.repairId) return;
    navigator.clipboard.writeText(result.repairId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentStep = result ? getStatusStepIndex(result.status) : 0;

  return (
    <div className="page-container py-12 md:py-16 max-w-2xl mx-auto">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary-600 text-white shadow-md">
            <MapPin size={26} />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Track Your Repair
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm sm:text-base max-w-md mx-auto">
          Enter your unique Repair ID to see real-time status, diagnostics, and cost updates.
        </p>
      </div>

      {/* ── Search Input Card ───────────────────────────────── */}
      <Card padding="lg" className="shadow-sm mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="e.g. RT-SH001-X7K92"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (notFound) setNotFound(false);
                if (errorMessage) setErrorMessage(null);
              }}
              leftIcon={<Search size={16} />}
              className="w-full text-base font-mono uppercase"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={!query.trim() || loading}
            leftIcon={loading ? <RefreshCw size={16} className="animate-spin" /> : undefined}
            className="sm:w-auto shrink-0"
          >
            {loading ? 'Searching...' : 'Track Repair'}
          </Button>
        </form>

        {/* Demo suggestions */}
        <div className="mt-4 pt-3 border-t border-surface-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-400 dark:text-slate-500">Example format:</span>
          <span className="px-2.5 py-1 rounded-md bg-surface-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-medium">
            RT-SH001-X7K92
          </span>
        </div>
      </Card>

      {/* ── Loading Spinner ─────────────────────────────────── */}
      {loading && (
        <div className="py-12">
          <PageLoader label="Querying live repair status..." />
        </div>
      )}

      {/* ── Not Found Alert ─────────────────────────────────── */}
      {notFound && !loading && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5 mb-6 text-left flex items-start gap-3.5 shadow-xs transition-colors duration-200">
          <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1">Repair not found</h3>
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              We couldn't find an active repair matching <strong>"{searchedQuery}"</strong>. Please verify the ID on your receipt or service slip and try again.
            </p>
          </div>
        </div>
      )}

      {/* ── Error Alert ─────────────────────────────────────── */}
      {errorMessage && !loading && (
        <div className="bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-900/50 rounded-2xl p-5 mb-6 text-left flex items-start gap-3.5 shadow-xs">
          <AlertCircle size={20} className="text-danger-600 dark:text-danger-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-danger-900 dark:text-danger-200 mb-1">Unable to track repair</h3>
            <p className="text-xs text-danger-700 dark:text-danger-300 leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* ── Repair Details Result Card ──────────────────────── */}
      {result && !loading && (
        <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-card transition-colors duration-200">
          {/* Card Header */}
          <div className="px-6 py-5 border-b border-surface-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-50/50 dark:bg-slate-800/40">
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
                {result.receivedAt && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    Received: {new Date(result.receivedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{result.fullDeviceName}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Store size={13} className="text-primary-600 dark:text-primary-400" />
                <span>{result.shopName}</span>
              </p>
            </div>
            <div className="shrink-0">
              <Badge variant={REPAIR_BADGE[result.status] || 'default'} size="md">
                {REPAIR_STATUS_LABELS[result.status] || result.status}
              </Badge>
            </div>
          </div>

          {/* Customer-facing status progress bar */}
          {result.status !== 'CANCELLED' && (
            <div className="px-6 py-6 border-b border-surface-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
                Repair Progress
              </p>
              <div className="relative">
                {/* Connecting bar */}
                <div className="absolute top-4 left-4 right-4 h-0.5 bg-surface-200 dark:bg-slate-700 -z-0" />
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
                          className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors duration-200 ${
                            isDone
                              ? 'bg-primary-600 text-white shadow-xs'
                              : 'bg-surface-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-surface-200 dark:border-slate-700'
                          } ${isCurrent ? 'ring-4 ring-primary-100 dark:ring-primary-950/80' : ''}`}
                        >
                          <Icon size={14} />
                        </div>
                        <span
                          className={`text-xs font-medium mt-2 leading-tight ${
                            isDone ? 'text-primary-700 dark:text-primary-300 font-semibold' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Key Details Grid (SAFE: NO customer PII) */}
          <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-4 border-b border-surface-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Estimated Cost</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{result.cost}</span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Customer Approval</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                {result.customerApproved ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                    <Check size={13} /> Approved
                  </span>
                ) : (
                  <span className="text-slate-500">Pending</span>
                )}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Workshop</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 text-sm truncate block">{result.shopName}</span>
            </div>
          </div>

          {/* Problem & History */}
          <div className="px-6 py-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Reported Issue
              </h3>
              <p className="text-sm text-slate-800 dark:text-slate-200 bg-surface-50 dark:bg-slate-800/60 p-3 rounded-xl border border-surface-200 dark:border-slate-700 leading-relaxed whitespace-pre-line">
                {result.problemDescription || 'No description provided.'}
              </p>
            </div>

            {/* Public Timeline Updates */}
            {result.history && result.history.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Service Updates
                </h3>
                <div className="space-y-2">
                  {result.history.map((h, i) => (
                    <div key={i} className="p-3 rounded-xl bg-surface-50 dark:bg-slate-800/50 border border-surface-200/70 dark:border-slate-800 flex items-start justify-between gap-3">
                      <div>
                        <Badge variant={REPAIR_BADGE[h.status] || 'default'} size="xs">
                          {REPAIR_STATUS_LABELS[h.status] || h.status}
                        </Badge>
                        {h.note && (
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
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
    </div>
  );
}
