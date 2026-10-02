// ─────────────────────────────────────────────────────────────
// RepairTrack — Customer My Pickups Page (Phase 5.4)
// Route: /dashboard/pickups
// Real integration with:
//   GET /api/v1/pickups/my
//   GET /api/v1/pickups/{pickup_id}
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Package, PlusCircle, MapPin, Calendar, Phone, Store,
  AlertCircle, RefreshCw, X, ChevronRight, Clock, Mail,
  Smartphone, FileText, CheckCircle2, ShieldAlert,
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { ROUTES, PICKUP_STATUS_LABELS } from '../../constants';
import { getMyPickups, getPickupById } from '../../services/pickupService';

const PICKUP_BADGE = {
  PENDING:   'warning',
  ACCEPTED:  'info',
  REJECTED:  'danger',
  SCHEDULED: 'info',
  PICKED_UP: 'primary',
  RECEIVED:  'success',
};

const STATUS_DESCRIPTIONS = {
  PENDING:   'Your request is awaiting review by the repair shop.',
  ACCEPTED:  'The shop owner accepted your request and is preparing for pickup.',
  SCHEDULED: 'Pickup has been scheduled with the shop courier.',
  PICKED_UP: 'Your device was collected and is on its way to the repair workshop.',
  RECEIVED:  'The shop has safely received your device for diagnosis and repair.',
  REJECTED:  'The repair shop was unable to accept this pickup request.',
};

function PickupCard({ pickup, onViewDetails }) {
  return (
    <div
      onClick={() => onViewDetails(pickup.id)}
      className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl px-5 py-4 hover:shadow-card hover:border-primary-200 dark:hover:border-primary-800/60 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xs font-bold text-slate-400 dark:text-slate-500">
              {pickup.displayId || `#PICK-${pickup.id}`}
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {pickup.fullDeviceName || pickup.device}
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
            {pickup.issue}
          </p>
        </div>
        <Badge variant={PICKUP_BADGE[pickup.status] || 'default'} size="sm" className="shrink-0">
          {PICKUP_STATUS_LABELS[pickup.status] || pickup.status}
        </Badge>
      </div>

      <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-surface-100 dark:border-slate-800/60">
        <div className="flex items-center gap-1.5">
          <MapPin size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="truncate">{pickup.address}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1">
            <Calendar size={12} className="text-slate-400 dark:text-slate-500" />
            Requested: <strong className="text-slate-700 dark:text-slate-300 ml-0.5">{pickup.requestedDate}</strong>
          </span>
          {pickup.scheduledDate && (
            <span className="flex items-center gap-1">
              Scheduled: <strong className="text-slate-700 dark:text-slate-300 ml-0.5">{pickup.scheduledDate}</strong>
            </span>
          )}
          <span className="flex items-center gap-1">
            <Store size={12} className="text-slate-400 dark:text-slate-500" />
            Shop: <strong className="text-slate-700 dark:text-slate-300 ml-0.5">{pickup.shopName}</strong>
          </span>
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-surface-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-primary-600 dark:text-primary-400">
        <span>View full details</span>
        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
      </div>
    </div>
  );
}

// ─── Modal Details View ─────────────────────────────────────────
function PickupDetailModal({ pickupId, onClose }) {
  const [pickup, setPickup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    getPickupById(pickupId)
      .then((data) => {
        if (mounted) setPickup(data);
      })
      .catch((err) => {
        if (!mounted) return;
        if (err.status === 404) {
          setError({ type: 'not_found', message: 'Pickup request not found.' });
        } else if (err.status === 403) {
          setError({ type: 'forbidden', message: 'You do not have permission to access this pickup request.' });
        } else {
          setError({ type: 'error', message: err.message || 'Unable to load pickup details.' });
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [pickupId]);

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-modal border border-surface-200 dark:border-slate-800 z-10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-surface-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs bg-surface-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-surface-200 dark:border-slate-700">
                {pickup?.displayId || `#PICK-${pickupId}`}
              </span>
              {pickup?.status && (
                <Badge variant={PICKUP_BADGE[pickup.status] || 'default'} size="sm">
                  {PICKUP_STATUS_LABELS[pickup.status] || pickup.status}
                </Badge>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
              {pickup ? (pickup.fullDeviceName || pickup.device) : 'Pickup Details'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-surface-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Loading pickup details...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="py-8 text-center space-y-3">
            <div className="flex justify-center">
              {error.type === 'forbidden' ? (
                <div className="h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600">
                  <ShieldAlert size={24} />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600">
                  <AlertCircle size={24} />
                </div>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {error.type === 'not_found' ? 'Pickup Not Found' : error.type === 'forbidden' ? 'Access Denied' : 'Error'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              {error.message}
            </p>
            <Button size="sm" variant="outline" onClick={onClose} className="mt-2">
              Close
            </Button>
          </div>
        )}

        {/* Details Content */}
        {!loading && !error && pickup && (
          <div className="py-4 space-y-4 text-xs">
            {/* Status explanation banner */}
            <div className="p-3 rounded-xl bg-surface-50 dark:bg-slate-800/60 border border-surface-200/70 dark:border-slate-800 flex items-start gap-2.5">
              <Clock size={16} className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Status: {PICKUP_STATUS_LABELS[pickup.status] || pickup.status}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-2xs mt-0.5">
                  {STATUS_DESCRIPTIONS[pickup.status] || 'Processing request.'}
                </p>
              </div>
            </div>

            {/* Shop Information */}
            <div className="bg-surface-50 dark:bg-slate-800/40 rounded-xl p-3.5 border border-surface-200/70 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2.5">
                <Store size={14} className="text-primary-600 dark:text-primary-400" />
                Selected Repair Workshop
              </h3>
              <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {pickup.shopName}
                </p>
                {pickup.shopAddress && (
                  <p className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-slate-400 shrink-0" />
                    <span>{pickup.shopAddress}</span>
                  </p>
                )}
                {pickup.shopPhone && (
                  <p className="flex items-center gap-1.5">
                    <Phone size={12} className="text-slate-400 shrink-0" />
                    <span>{pickup.shopPhone}</span>
                  </p>
                )}
                {pickup.shopEmail && (
                  <p className="flex items-center gap-1.5">
                    <Mail size={12} className="text-slate-400 shrink-0" />
                    <span>{pickup.shopEmail}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Device & Issue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-surface-50 dark:bg-slate-800/40 border border-surface-200/70 dark:border-slate-800">
                <span className="text-slate-400 dark:text-slate-500 block text-2xs font-semibold uppercase mb-1">
                  Device Information
                </span>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                  {pickup.fullDeviceName}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-2xs mt-0.5">
                  Type: {pickup.deviceType}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-surface-50 dark:bg-slate-800/40 border border-surface-200/70 dark:border-slate-800">
                <span className="text-slate-400 dark:text-slate-500 block text-2xs font-semibold uppercase mb-1">
                  Pickup Schedule
                </span>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                  {pickup.preferredDate || 'Earliest available'}
                </p>
                {pickup.preferredTime && (
                  <p className="text-slate-500 dark:text-slate-400 text-2xs mt-0.5">
                    Time: {pickup.preferredTime}
                  </p>
                )}
              </div>
            </div>

            {/* Problem Description */}
            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-2xs font-semibold uppercase mb-1">
                Reported Issue
              </span>
              <p className="text-slate-800 dark:text-slate-200 bg-surface-50 dark:bg-slate-800/40 p-3 rounded-xl border border-surface-200/70 dark:border-slate-800 whitespace-pre-line leading-relaxed">
                {pickup.problemDescription || 'No description provided.'}
              </p>
            </div>

            {/* Pickup Address */}
            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-2xs font-semibold uppercase mb-1">
                Pickup Address
              </span>
              <p className="text-slate-800 dark:text-slate-200 bg-surface-50 dark:bg-slate-800/40 p-3 rounded-xl border border-surface-200/70 dark:border-slate-800 leading-relaxed flex items-start gap-2">
                <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                <span>{pickup.pickupAddress}</span>
              </p>
            </div>

            {/* Timestamps */}
            <div className="pt-2 text-2xs text-slate-400 dark:text-slate-500 flex flex-wrap items-center justify-between gap-2 border-t border-surface-100 dark:border-slate-800">
              <span>Submitted: {pickup.createdAt ? new Date(pickup.createdAt).toLocaleString() : 'N/A'}</span>
              <span>Updated: {pickup.updatedAt ? new Date(pickup.updatedAt).toLocaleString() : 'N/A'}</span>
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

// ─── Main PickupsPage Component ─────────────────────────────────
export default function PickupsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal detail view
  const [selectedPickupId, setSelectedPickupId] = useState(() => searchParams.get('id') || null);

  const fetchPickups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyPickups();
      setPickups(data);
    } catch (err) {
      console.error('Failed to load pickups:', err);
      setError(err.message || 'Unable to load your pickup requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPickups();
  }, [fetchPickups]);

  // Sync modal when query parameter changes
  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam) {
      setSelectedPickupId(idParam);
    }
  }, [searchParams]);

  const handleOpenDetails = (id) => {
    setSelectedPickupId(id);
    setSearchParams({ id: String(id) });
  };

  const handleCloseDetails = () => {
    setSelectedPickupId(null);
    setSearchParams({});
  };

  const active    = pickups.filter((p) => ['PENDING', 'ACCEPTED', 'SCHEDULED', 'PICKED_UP'].includes(p.status));
  const completed = pickups.filter((p) => p.status === 'RECEIVED');
  const rejected  = pickups.filter((p) => p.status === 'REJECTED');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Package size={22} className="text-warning-600 dark:text-amber-400" /> My Pickups
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            View and manage all your pickup requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPickups}
            leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button as={Link} to={ROUTES.DASHBOARD_PICKUPS_NEW} size="sm" leftIcon={<PlusCircle size={16} />}>
            New Pickup
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && !pickups.length && (
        <div className="py-16">
          <PageLoader label="Loading your pickups..." />
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
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Failed to load pickup requests</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {error}
          </p>
          <Button size="sm" onClick={fetchPickups} leftIcon={<RefreshCw size={14} />}>
            Retry
          </Button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Active Pickups */}
          {active.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Active Requests ({active.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {active.map((p) => (
                  <PickupCard key={p.id} pickup={p} onViewDetails={handleOpenDetails} />
                ))}
              </div>
            </section>
          )}

          {/* Received by Shop */}
          {completed.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Received by Shop ({completed.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completed.map((p) => (
                  <PickupCard key={p.id} pickup={p} onViewDetails={handleOpenDetails} />
                ))}
              </div>
            </section>
          )}

          {/* Rejected Requests */}
          {rejected.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Declined Requests ({rejected.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rejected.map((p) => (
                  <PickupCard key={p.id} pickup={p} onViewDetails={handleOpenDetails} />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {pickups.length === 0 && (
            <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <Package size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No pickup requests yet</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Request a doorstep pickup to get your phone, laptop, or home appliance repaired by certified workshops.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                <Button as={Link} to={ROUTES.DASHBOARD_PICKUPS_NEW} size="sm" leftIcon={<PlusCircle size={15} />}>
                  New Pickup Request
                </Button>
                <Button as={Link} to={ROUTES.SHOPS} variant="outline" size="sm" leftIcon={<Store size={15} />}>
                  Browse Repair Shops
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Details Modal */}
      {selectedPickupId && (
        <PickupDetailModal
          pickupId={selectedPickupId}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
}
