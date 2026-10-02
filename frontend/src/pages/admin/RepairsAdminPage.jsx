// ─────────────────────────────────────────────────────────────
// RepairTrack — Admin Platform Repairs Page (Phase 5.7)
// Route: /admin/repairs
// Real backend integration:
// GET /api/v1/admin/repairs
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wrench, Search, Eye, Filter, Calendar, Store, User,
  DollarSign, CheckCircle2, Clock, ShieldCheck, RefreshCw,
  Loader2, AlertCircle, Copy, Check
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { getAdminRepairs } from '../../services/adminService';
import { REPAIR_STATUS_LABELS } from '../../constants';

const REPAIR_BADGE = {
  RECEIVED:   'info',
  DIAGNOSING: 'warning',
  REPAIRING:  'warning',
  READY:      'success',
  COMPLETED:  'success',
  CANCELLED:  'danger',
};

export default function RepairsAdminPage() {
  const [repairs, setRepairs]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [error, setError]                   = useState('');
  const [searchQuery, setSearchQuery]       = useState('');
  const [statusFilter, setStatusFilter]     = useState('ALL');
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [copiedId, setCopiedId]             = useState(false);

  const loadRepairs = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const data = await getAdminRepairs();
      setRepairs(data);
    } catch (err) {
      console.error('Failed to load admin repairs:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to load repair records from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRepairs();
  }, [loadRepairs]);

  const filtered = useMemo(() => {
    return (repairs || []).filter((r) => {
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        (r.repairId && r.repairId.toLowerCase().includes(q)) ||
        (r.trackingCode && r.trackingCode.toLowerCase().includes(q)) ||
        (r.customerName && r.customerName.toLowerCase().includes(q)) ||
        (r.shopName && r.shopName.toLowerCase().includes(q)) ||
        (r.device && r.device.toLowerCase().includes(q)) ||
        (r.issue && r.issue.toLowerCase().includes(q));

      return matchesStatus && matchesQuery;
    });
  }, [repairs, statusFilter, searchQuery]);

  const handleCopyId = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench size={22} className="text-primary-600 dark:text-primary-400" /> Platform Repairs Directory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Supervise job cards, turnaround times, and status progression across all partner workshops.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
            onClick={() => loadRepairs(true)}
            disabled={refreshing || loading}
          >
            {refreshing ? 'Syncing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-danger-50 dark:bg-red-950/40 border border-danger-200 dark:border-red-800/60 p-4 rounded-2xl flex items-center justify-between text-xs text-danger-700 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <Button size="xs" variant="outline" onClick={() => loadRepairs(true)}>
            Try Again
          </Button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-xs">
        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-surface-300 dark:border-slate-700 text-xs px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="ALL" className="bg-white dark:bg-slate-900">All Statuses ({repairs.length})</option>
            <option value="RECEIVED" className="bg-white dark:bg-slate-900">Received</option>
            <option value="DIAGNOSING" className="bg-white dark:bg-slate-900">Diagnosing</option>
            <option value="REPAIRING" className="bg-white dark:bg-slate-900">Repairing</option>
            <option value="READY" className="bg-white dark:bg-slate-900">Ready for Pickup</option>
            <option value="COMPLETED" className="bg-white dark:bg-slate-900">Completed</option>
            <option value="CANCELLED" className="bg-white dark:bg-slate-900">Cancelled</option>
          </select>
        </div>

        {/* Search */}
        <div className="w-full md:w-80">
          <Input
            placeholder="Search code (e.g. RT-SH001), customer, device..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={15} />}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400 mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Fetching platform repair jobs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold text-[11px] tracking-wider border-b border-surface-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Repair ID</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Workshop</th>
                  <th className="px-5 py-3.5">Device &amp; Issue</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Estimate &amp; Approval</th>
                  <th className="px-5 py-3.5">Created Date</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-slate-800">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Code */}
                    <td className="px-5 py-4 font-mono font-bold text-primary-700 dark:text-primary-400 text-sm">
                      {r.repairId}
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                      {r.customerName}
                    </td>

                    {/* Shop */}
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-medium">
                      {r.shopName}
                    </td>

                    {/* Device & Issue */}
                    <td className="px-5 py-4 max-w-xs">
                      <p className="font-bold text-slate-900 dark:text-white">{r.device}</p>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px] truncate">{r.issue}</p>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <Badge variant={REPAIR_BADGE[r.status] || 'default'} size="sm">
                        {REPAIR_STATUS_LABELS[r.status] || r.status}
                      </Badge>
                    </td>

                    {/* Cost & Approval */}
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{r.cost}</p>
                      {r.estimatedCost != null && (
                        <span className={`text-[10px] font-semibold ${
                          r.isEstimateApproved
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {r.isEstimateApproved ? 'Approved by Customer' : 'Pending Approval'}
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                      {r.startDate}
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setSelectedRepair(r)}
                        leftIcon={<Eye size={12} />}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 px-4">
            <Wrench size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-300 font-semibold text-sm">No repair jobs found</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              {searchQuery ? 'Try changing your search terms or filters.' : 'Active repair jobs will appear here as workshops create them.'}
            </p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedRepair && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs" onClick={() => setSelectedRepair(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-modal border border-surface-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-surface-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-primary-700 dark:text-primary-300 text-xs bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded border border-primary-200 dark:border-primary-800/60">
                    {selectedRepair.repairId}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyId(selectedRepair.repairId)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                    title="Copy Repair ID"
                  >
                    {copiedId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{selectedRepair.device}</h3>
              </div>
              <Badge variant={REPAIR_BADGE[selectedRepair.status] || 'default'}>
                {REPAIR_STATUS_LABELS[selectedRepair.status] || selectedRepair.status}
              </Badge>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Assigned Workshop</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{selectedRepair.shopName}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Customer Name</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{selectedRepair.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Estimated Cost</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{selectedRepair.cost}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Customer Approval</span>
                  <span className={`font-semibold ${
                    selectedRepair.isEstimateApproved ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {selectedRepair.isEstimateApproved ? 'Approved' : 'Pending Approval'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Reported Issue</span>
                <p className="text-slate-800 dark:text-slate-200 bg-surface-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-surface-200 dark:border-slate-700">
                  {selectedRepair.issue}
                </p>
              </div>

              {/* Chronological Audit Log / History */}
              {Array.isArray(selectedRepair.history) && selectedRepair.history.length > 0 && (
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-1.5 font-bold">Progress Timeline</span>
                  <div className="space-y-2 border-l-2 border-primary-200 dark:border-primary-900/60 ml-2 pl-3">
                    {selectedRepair.history.map((h, idx) => (
                      <div key={h.id || idx} className="relative">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{h.status}</span>
                          <span className="text-[10px] text-slate-400">{h.created_at ? h.created_at.split('T')[0] : ''}</span>
                        </div>
                        {h.note && <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">{h.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between pt-2 border-t border-surface-100 dark:border-slate-800">
                <span>Created: {selectedRepair.startDate}</span>
                <span>Supervision Only</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-surface-100 dark:border-slate-800">
              <Button size="sm" variant="ghost" onClick={() => setSelectedRepair(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
