// ─────────────────────────────────────────────────────────────
// RepairTrack — Admin Platform Pickup Requests Page (Phase 5.7)
// Route: /admin/pickups
// Real backend integration:
// GET /api/v1/admin/pickups
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package, Search, Eye, Filter, Calendar, Store, User,
  MapPin, Phone, Mail, CheckCircle2, Clock, RefreshCw,
  Loader2, AlertCircle
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { getAdminPickups } from '../../services/adminService';
import { PICKUP_STATUS_LABELS } from '../../constants';

const PICKUP_BADGE = {
  PENDING:   'warning',
  ACCEPTED:  'info',
  REJECTED:  'danger',
  SCHEDULED: 'info',
  PICKED_UP: 'info',
  RECEIVED:  'success',
};

export default function PickupsAdminPage() {
  const [pickups, setPickups]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [error, setError]                   = useState('');
  const [searchQuery, setSearchQuery]       = useState('');
  const [statusFilter, setStatusFilter]     = useState('ALL');
  const [selectedPickup, setSelectedPickup] = useState(null);

  const loadPickups = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const data = await getAdminPickups();
      setPickups(data);
    } catch (err) {
      console.error('Failed to load admin pickups:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to load pickup requests from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPickups();
  }, [loadPickups]);

  const filtered = useMemo(() => {
    return (pickups || []).filter((p) => {
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        (p.id && String(p.id).toLowerCase().includes(q)) ||
        (p.displayId && p.displayId.toLowerCase().includes(q)) ||
        (p.customerName && p.customerName.toLowerCase().includes(q)) ||
        (p.shopName && p.shopName.toLowerCase().includes(q)) ||
        (p.device && p.device.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q));

      return matchesStatus && matchesQuery;
    });
  }, [pickups, statusFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package size={22} className="text-primary-600 dark:text-primary-400" /> Platform Pickup Requests
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Supervise doorstep device collection and transit status between customers and workshops.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
            onClick={() => loadPickups(true)}
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
          <Button size="xs" variant="outline" onClick={() => loadPickups(true)}>
            Try Again
          </Button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-surface-300 dark:border-slate-700 text-xs px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="ALL" className="bg-white dark:bg-slate-900">All Pickup Statuses ({pickups.length})</option>
            <option value="PENDING" className="bg-white dark:bg-slate-900">Pending</option>
            <option value="ACCEPTED" className="bg-white dark:bg-slate-900">Accepted</option>
            <option value="SCHEDULED" className="bg-white dark:bg-slate-900">Scheduled</option>
            <option value="PICKED_UP" className="bg-white dark:bg-slate-900">Picked Up</option>
            <option value="RECEIVED" className="bg-white dark:bg-slate-900">Received at Shop</option>
            <option value="REJECTED" className="bg-white dark:bg-slate-900">Declined / Rejected</option>
          </select>
        </div>

        <div className="w-full md:w-80">
          <Input
            placeholder="Search customer, shop, device, city..."
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
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Fetching platform pickup requests...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold text-[11px] tracking-wider border-b border-surface-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Pickup ID</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Assigned Shop</th>
                  <th className="px-5 py-3.5">Device</th>
                  <th className="px-5 py-3.5">Location / City</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Requested Date</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-slate-800">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    {/* ID */}
                    <td className="px-5 py-4 font-mono font-bold text-primary-700 dark:text-primary-400">
                      {p.displayId || `#PICK-${p.id}`}
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900 dark:text-white">{p.customerName}</p>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px]">{p.customerPhone || 'N/A'}</p>
                    </td>

                    {/* Shop */}
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-medium">
                      {p.shopName}
                    </td>

                    {/* Device */}
                    <td className="px-5 py-4 font-medium text-slate-900 dark:text-slate-100">
                      {p.device}
                    </td>

                    {/* Location */}
                    <td className="px-5 py-4 max-w-xs text-slate-600 dark:text-slate-400 truncate">
                      <div className="flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{p.city || p.pickupAddress}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <Badge variant={PICKUP_BADGE[p.status] || 'default'} size="sm">
                        {PICKUP_STATUS_LABELS[p.status] || p.status}
                      </Badge>
                    </td>

                    {/* Requested Date */}
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-medium">
                      {p.requestedDate}
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setSelectedPickup(p)}
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
            <Package size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-300 font-semibold text-sm">No pickup requests found</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              {searchQuery ? 'Try adjusting your search criteria.' : 'Customer pickup requests will appear here in real-time.'}
            </p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedPickup && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs" onClick={() => setSelectedPickup(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-modal border border-surface-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-surface-100 dark:border-slate-800">
              <div>
                <span className="font-mono font-bold text-primary-700 dark:text-primary-300 text-xs bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded border border-primary-200 dark:border-primary-800/60">
                  {selectedPickup.displayId || `#PICK-${selectedPickup.id}`}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">{selectedPickup.device}</h3>
              </div>
              <Badge variant={PICKUP_BADGE[selectedPickup.status] || 'default'}>
                {PICKUP_STATUS_LABELS[selectedPickup.status] || selectedPickup.status}
              </Badge>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Customer Name</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">{selectedPickup.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Contact Phone</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{selectedPickup.customerPhone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Assigned Workshop</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedPickup.shopName}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Requested Date</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedPickup.requestedDate}</span>
                </div>
              </div>

              {selectedPickup.customerEmail && (
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Customer Email</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{selectedPickup.customerEmail}</span>
                </div>
              )}

              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Pickup Address</span>
                <p className="text-slate-800 dark:text-slate-200 bg-surface-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-surface-200 dark:border-slate-700">
                  {selectedPickup.pickupAddress || selectedPickup.address}
                </p>
              </div>

              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Reported Problem Description</span>
                <p className="text-slate-800 dark:text-slate-200 bg-surface-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-surface-200 dark:border-slate-700">
                  {selectedPickup.problemDescription || selectedPickup.issue}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-surface-100 dark:border-slate-800">
                <span>Created: {selectedPickup.createdAt ? selectedPickup.createdAt.split('T')[0] : 'N/A'}</span>
                <span>Supervision Only</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-surface-100 dark:border-slate-800">
              <Button size="sm" variant="ghost" onClick={() => setSelectedPickup(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
