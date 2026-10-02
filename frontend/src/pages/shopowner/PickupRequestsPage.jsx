// ─────────────────────────────────────────────────────────────
// RepairTrack — Shop Owner Pickup Requests Page (Phase 5.5)
// Route: /shop-owner/pickups
// Real integration with:
//   GET   /api/v1/shop-owner/pickups
//   GET   /api/v1/shop-owner/pickups/{pickup_id}
//   POST  /api/v1/shop-owner/pickups/{pickup_id}/accept
//   POST  /api/v1/shop-owner/pickups/{pickup_id}/reject
//   PATCH /api/v1/shop-owner/pickups/{pickup_id}/status
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Package, Check, X, MapPin, Calendar, Phone, Mail,
  Clock, AlertCircle, RefreshCw, ChevronRight, Store,
  CheckCircle2, Search, Truck, ShieldAlert, Wrench,
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { PICKUP_STATUS, PICKUP_STATUS_LABELS } from '../../constants';
import {
  getShopOwnerPickups,
  getShopOwnerPickupById,
  acceptPickup,
  rejectPickup,
  updatePickupStatus,
} from '../../services/pickupService';
import { createRepair } from '../../services/repairService';

const PICKUP_BADGE = {
  PENDING:   'warning',
  ACCEPTED:  'info',
  REJECTED:  'danger',
  SCHEDULED: 'info',
  PICKED_UP: 'primary',
  RECEIVED:  'success',
};

const STATUS_DESCRIPTIONS = {
  PENDING:   'Customer submitted request. Accept to start pickup or decline if unable to service.',
  ACCEPTED:  'Request accepted. Next step: Schedule pickup date/time with courier or customer.',
  SCHEDULED: 'Pickup scheduled. Next step: Mark picked up once device is collected.',
  PICKED_UP: 'Device collected from customer. Next step: Mark received upon arrival at shop.',
  RECEIVED:  'Device safely received at workshop. Pickup workflow complete.',
  REJECTED:  'Request was declined. No further pickup actions available.',
};

// ─── Rejection Modal Component ────────────────────────────────
function RejectPickupModal({ pickup, isOpen, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  if (!isOpen || !pickup) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={loading ? undefined : onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-modal border border-surface-200 dark:border-slate-800 z-10">
        <div className="flex items-start justify-between pb-3 border-b border-surface-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Decline Pickup Request
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {pickup.displayId || `#PICK-${pickup.id}`} · {pickup.fullDeviceName || pickup.device}
            </p>
          </div>
          <button
            onClick={loading ? undefined : onClose}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-surface-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="py-4 space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Are you sure you want to decline this pickup request from <strong className="text-slate-900 dark:text-white">{pickup.customerName || 'the customer'}</strong>?
            This action cannot be undone.
          </p>

          <div>
            <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Reason for decline (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              placeholder="e.g. Device outside our service area, specialized components currently unavailable..."
              rows={3}
              maxLength={500}
              className="w-full text-xs rounded-xl border border-surface-200 dark:border-slate-700 bg-surface-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-2xs text-slate-400 text-right mt-1">
              {reason.length}/500
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100 dark:border-slate-800">
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => onConfirm(pickup.id, reason)}
            disabled={loading}
            leftIcon={loading ? <RefreshCw size={13} className="animate-spin" /> : <X size={13} />}
          >
            {loading ? 'Declining...' : 'Decline Request'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Repair Modal Component ────────────────────────────
function CreateRepairModal({ pickup, isOpen, onClose, onSuccess }) {
  const [estimatedCost, setEstimatedCost] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && pickup) {
      setEstimatedCost('');
      setProblemDescription(pickup.problemDescription || pickup.issue || '');
      setError(null);
    }
  }, [isOpen, pickup]);

  if (!isOpen || !pickup) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const created = await createRepair({
        pickup_id: pickup.id,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
        problem_description: problemDescription.trim() || null,
      });
      onSuccess(created);
    } catch (err) {
      setError(err.message || 'Failed to create repair job.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={loading ? undefined : onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-modal border border-surface-200 dark:border-slate-800 z-10 space-y-4">
        <div className="flex items-start justify-between pb-3 border-b border-surface-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Wrench size={16} className="text-primary-600 dark:text-primary-400" />
              Create Repair Job
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              From Received Pickup {pickup.displayId || `#PICK-${pickup.id}`}
            </p>
          </div>
          <button
            onClick={loading ? undefined : onClose}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-surface-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-900/60 text-xs text-danger-700 dark:text-danger-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-slate-800/50 border border-surface-200/60 dark:border-slate-800 text-xs space-y-1">
            <p className="font-semibold text-slate-900 dark:text-white">
              {pickup.fullDeviceName || pickup.device}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-2xs">
              Customer: <span className="text-slate-700 dark:text-slate-300 font-medium">{pickup.customerName || 'Customer'}</span>
            </p>
          </div>

          <div>
            <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Initial Estimated Cost ($ USD) <span className="text-slate-400 lowercase font-normal">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="e.g. 150.00"
                disabled={loading}
                className="w-full text-xs rounded-xl border border-surface-200 dark:border-slate-700 bg-surface-50 dark:bg-slate-800 pl-7 pr-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-2xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Diagnostic Notes / Problem Description
            </label>
            <textarea
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              disabled={loading}
              rows={3}
              maxLength={2000}
              placeholder="Initial diagnostic findings or customer problem summary..."
              className="w-full text-xs rounded-xl border border-surface-200 dark:border-slate-700 bg-surface-50 dark:bg-slate-800 p-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <p className="text-2xs text-slate-400 dark:text-slate-500">
            A unique Repair ID (e.g. RT-SH001-X7K92) will be automatically generated by the server.
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100 dark:border-slate-800">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={loading}
              leftIcon={loading ? <RefreshCw size={13} className="animate-spin" /> : <Wrench size={13} />}
            >
              {loading ? 'Creating Repair...' : 'Create Repair Job'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Pickup Detail Modal ──────────────────────────────────────
function ShopOwnerPickupDetailModal({
  pickupId,
  onClose,
  onAccept,
  onOpenReject,
  onUpdateStatus,
  onOpenCreateRepair,
  actionLoading,
}) {
  const [pickup, setPickup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetail = useCallback(async () => {
    if (!pickupId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getShopOwnerPickupById(pickupId);
      setPickup(data);
    } catch (err) {
      if (err.status === 404) {
        setError({ type: 'not_found', message: 'Pickup request not found.' });
      } else if (err.status === 403) {
        setError({ type: 'forbidden', message: 'You do not have permission to access this pickup request.' });
      } else {
        setError({ type: 'error', message: err.message || 'Unable to load pickup details.' });
      }
    } finally {
      setLoading(false);
    }
  }, [pickupId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const isCurrentAction = actionLoading === pickupId;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />
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
              {pickup ? (pickup.fullDeviceName || pickup.device) : 'Pickup Request Details'}
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

        {/* Loading */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Loading details...</p>
          </div>
        )}

        {/* Error */}
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

        {/* Body Content */}
        {!loading && !error && pickup && (
          <div className="py-4 space-y-4 text-xs">
            {/* Status Guide Banner */}
            <div className="p-3 rounded-xl bg-surface-50 dark:bg-slate-800/60 border border-surface-200/70 dark:border-slate-800 flex items-start gap-2.5">
              <Clock size={16} className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Current Status: {PICKUP_STATUS_LABELS[pickup.status] || pickup.status}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-2xs mt-0.5">
                  {STATUS_DESCRIPTIONS[pickup.status] || 'Manage pickup workflow below.'}
                </p>
              </div>
            </div>

            {/* Customer Contact */}
            <div className="bg-surface-50 dark:bg-slate-800/40 rounded-xl p-3.5 border border-surface-200/70 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                Customer Information
              </h3>
              <div className="space-y-1 text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {pickup.customerName || 'Valued Customer'}
                </p>
                {pickup.customerPhone && (
                  <p className="flex items-center gap-1.5">
                    <Phone size={12} className="text-slate-400 shrink-0" />
                    <span>{pickup.customerPhone}</span>
                  </p>
                )}
                {pickup.customerEmail && (
                  <p className="flex items-center gap-1.5">
                    <Mail size={12} className="text-slate-400 shrink-0" />
                    <span>{pickup.customerEmail}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Device & Preferred Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-surface-50 dark:bg-slate-800/40 border border-surface-200/70 dark:border-slate-800">
                <span className="text-slate-400 dark:text-slate-500 block text-2xs font-semibold uppercase mb-1">
                  Device Details
                </span>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                  {pickup.fullDeviceName || pickup.device}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-2xs mt-0.5">
                  Type: {pickup.deviceType}
                </p>
                {(pickup.deviceBrand || pickup.deviceModel) && (
                  <p className="text-slate-500 dark:text-slate-400 text-2xs">
                    Model: {[pickup.deviceBrand, pickup.deviceModel].filter(Boolean).join(' ')}
                  </p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-surface-50 dark:bg-slate-800/40 border border-surface-200/70 dark:border-slate-800">
                <span className="text-slate-400 dark:text-slate-500 block text-2xs font-semibold uppercase mb-1">
                  Requested Schedule
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

            {/* Reported Problem */}
            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-2xs font-semibold uppercase mb-1">
                Reported Problem
              </span>
              <p className="text-slate-800 dark:text-slate-200 bg-surface-50 dark:bg-slate-800/40 p-3 rounded-xl border border-surface-200/70 dark:border-slate-800 whitespace-pre-line leading-relaxed">
                {pickup.problemDescription || 'No description provided.'}
              </p>
            </div>

            {/* Pickup Address */}
            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-2xs font-semibold uppercase mb-1">
                Doorstep Pickup Address
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

        {/* Modal Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-surface-100 dark:border-slate-800">
          <Button size="sm" variant="ghost" onClick={onClose} disabled={isCurrentAction}>
            Close
          </Button>

          {pickup && (
            <div className="flex flex-wrap items-center gap-2">
              {pickup.status === 'PENDING' && (
                <>
                  <Button
                    size="sm"
                    variant="danger"
                    leftIcon={<X size={14} />}
                    onClick={() => {
                      onClose();
                      onOpenReject(pickup);
                    }}
                    disabled={isCurrentAction}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    variant="success"
                    leftIcon={isCurrentAction ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                    onClick={async () => {
                      await onAccept(pickup.id);
                      fetchDetail();
                    }}
                    disabled={isCurrentAction}
                  >
                    {isCurrentAction ? 'Accepting...' : 'Accept Pickup'}
                  </Button>
                </>
              )}

              {pickup.status === 'ACCEPTED' && (
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={isCurrentAction ? <RefreshCw size={14} className="animate-spin" /> : <Calendar size={14} />}
                  onClick={async () => {
                    await onUpdateStatus(pickup.id, 'SCHEDULED');
                    fetchDetail();
                  }}
                  disabled={isCurrentAction}
                >
                  {isCurrentAction ? 'Scheduling...' : 'Mark as Scheduled'}
                </Button>
              )}

              {pickup.status === 'SCHEDULED' && (
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={isCurrentAction ? <RefreshCw size={14} className="animate-spin" /> : <Truck size={14} />}
                  onClick={async () => {
                    await onUpdateStatus(pickup.id, 'PICKED_UP');
                    fetchDetail();
                  }}
                  disabled={isCurrentAction}
                >
                  {isCurrentAction ? 'Updating...' : 'Mark as Picked Up'}
                </Button>
              )}

              {pickup.status === 'PICKED_UP' && (
                <Button
                  size="sm"
                  variant="success"
                  leftIcon={isCurrentAction ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  onClick={async () => {
                    await onUpdateStatus(pickup.id, 'RECEIVED');
                    fetchDetail();
                  }}
                  disabled={isCurrentAction}
                >
                  {isCurrentAction ? 'Receiving...' : 'Mark as Received'}
                </Button>
              )}

              {pickup.status === 'RECEIVED' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Received
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Wrench size={14} />}
                    onClick={() => {
                      onClose();
                      if (onOpenCreateRepair) onOpenCreateRepair(pickup);
                    }}
                  >
                    Create Repair
                  </Button>
                </div>
              )}

              {pickup.status === 'REJECTED' && (
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <X size={14} /> Declined
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pickup Card Component ────────────────────────────────────
function PickupCard({
  pickup,
  onOpenDetails,
  onAccept,
  onOpenReject,
  onUpdateStatus,
  onOpenCreateRepair,
  actionLoading,
}) {
  const isCurrentAction = actionLoading === pickup.id;

  return (
    <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-card transition-all shadow-xs flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-surface-100 dark:border-slate-800/60">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xs font-bold text-slate-400 dark:text-slate-500">
                {pickup.displayId || `#PICK-${pickup.id}`}
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {pickup.fullDeviceName || pickup.device}
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {pickup.problemDescription || pickup.issue}
            </p>
          </div>
          <Badge variant={PICKUP_BADGE[pickup.status] || 'default'} size="sm" className="shrink-0">
            {PICKUP_STATUS_LABELS[pickup.status] || pickup.status}
          </Badge>
        </div>

        {/* Card Details */}
        <div className="px-5 py-3.5 space-y-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-start gap-1.5">
            <MapPin size={13} className="shrink-0 text-slate-400 dark:text-slate-500 mt-0.5" />
            <span className="line-clamp-2">{pickup.pickupAddress || pickup.address}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
            <span className="flex items-center gap-1">
              <Calendar size={13} className="text-slate-400 dark:text-slate-500" />
              Requested: <strong className="text-slate-700 dark:text-slate-300 ml-0.5">{pickup.requestedDate}</strong>
            </span>
            {pickup.preferredTime && (
              <span className="flex items-center gap-1">
                <Clock size={13} className="text-slate-400 dark:text-slate-500" />
                {pickup.preferredTime}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-surface-100 dark:border-slate-800/40">
            <p className="font-medium text-slate-700 dark:text-slate-300">
              Customer: <span className="font-semibold">{pickup.customerName || 'N/A'}</span>
            </p>
            {pickup.customerPhone && (
              <a
                href={`tel:${pickup.customerPhone}`}
                className="flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline"
              >
                <Phone size={11} /> {pickup.customerPhone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="px-5 py-3.5 bg-surface-50/70 dark:bg-slate-800/40 border-t border-surface-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => onOpenDetails(pickup.id)}
          className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1 transition-colors"
        >
          View Details <ChevronRight size={13} />
        </button>

        <div className="flex items-center gap-2">
          {/* PENDING: Accept & Reject */}
          {pickup.status === 'PENDING' && (
            <>
              <Button
                size="xs"
                variant="outline"
                leftIcon={<X size={12} />}
                onClick={() => onOpenReject(pickup)}
                disabled={isCurrentAction}
              >
                Decline
              </Button>
              <Button
                size="xs"
                variant="success"
                leftIcon={isCurrentAction ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                onClick={() => onAccept(pickup.id)}
                disabled={isCurrentAction}
              >
                {isCurrentAction ? 'Accepting...' : 'Accept'}
              </Button>
            </>
          )}

          {/* ACCEPTED: Mark Scheduled */}
          {pickup.status === 'ACCEPTED' && (
            <Button
              size="xs"
              variant="primary"
              leftIcon={isCurrentAction ? <RefreshCw size={12} className="animate-spin" /> : <Calendar size={12} />}
              onClick={() => onUpdateStatus(pickup.id, 'SCHEDULED')}
              disabled={isCurrentAction}
            >
              {isCurrentAction ? 'Saving...' : 'Mark Scheduled'}
            </Button>
          )}

          {/* SCHEDULED: Mark Picked Up */}
          {pickup.status === 'SCHEDULED' && (
            <Button
              size="xs"
              variant="primary"
              leftIcon={isCurrentAction ? <RefreshCw size={12} className="animate-spin" /> : <Truck size={12} />}
              onClick={() => onUpdateStatus(pickup.id, 'PICKED_UP')}
              disabled={isCurrentAction}
            >
              {isCurrentAction ? 'Saving...' : 'Mark Picked Up'}
            </Button>
          )}

          {/* PICKED_UP: Mark Received */}
          {pickup.status === 'PICKED_UP' && (
            <Button
              size="xs"
              variant="success"
              leftIcon={isCurrentAction ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              onClick={() => onUpdateStatus(pickup.id, 'RECEIVED')}
              disabled={isCurrentAction}
            >
              {isCurrentAction ? 'Saving...' : 'Mark Received'}
            </Button>
          )}

          {/* Terminal states */}
          {pickup.status === 'RECEIVED' && (
            <div className="flex items-center gap-2">
              <span className="text-2xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={12} /> Received
              </span>
              <Button
                size="xs"
                variant="primary"
                leftIcon={<Wrench size={11} />}
                onClick={() => onOpenCreateRepair && onOpenCreateRepair(pickup)}
              >
                Create Repair
              </Button>
            </div>
          )}

          {pickup.status === 'REJECTED' && (
            <span className="text-2xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <X size={12} /> Declined
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main PickupRequestsPage Component ────────────────────────
export default function PickupRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Active Filter Tab
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  // Detail Modal, Reject Modal, & Create Repair Modal State
  const [selectedPickupId, setSelectedPickupId] = useState(() => searchParams.get('id') || null);
  const [rejectingPickup, setRejectingPickup] = useState(null);
  const [creatingRepairPickup, setCreatingRepairPickup] = useState(null);

  // In-flight Action tracking
  const [actionLoading, setActionLoading] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  // Fetch shop pickups from backend
  const fetchPickups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getShopOwnerPickups();
      setPickups(data);
    } catch (err) {
      console.error('Failed to load shop owner pickups:', err);
      setError(err.message || 'Unable to load pickup requests for your shop.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPickups();
  }, [fetchPickups]);

  // Sync selected pickup ID from query parameters
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

  // Actions
  const handleAccept = async (id) => {
    setActionLoading(id);
    setActionNotice(null);
    try {
      const updated = await acceptPickup(id);
      setPickups((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setActionNotice({
        type: 'success',
        message: `Pickup #${String(id).padStart(4, '0')} has been accepted! You can now schedule it.`,
      });
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Failed to accept pickup request.',
      });
      fetchPickups();
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async (id, reason) => {
    setActionLoading(id);
    setActionNotice(null);
    try {
      const updated = await rejectPickup(id, reason || null);
      setPickups((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setRejectingPickup(null);
      setActionNotice({
        type: 'info',
        message: `Pickup #${String(id).padStart(4, '0')} was declined.`,
      });
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Failed to decline pickup request.',
      });
      fetchPickups();
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    setActionLoading(id);
    setActionNotice(null);
    try {
      const updated = await updatePickupStatus(id, newStatus);
      setPickups((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setActionNotice({
        type: 'success',
        message: `Pickup status updated to ${PICKUP_STATUS_LABELS[newStatus] || newStatus}.`,
      });
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: err.message || `Failed to update status to ${newStatus}.`,
      });
      fetchPickups();
    } finally {
      setActionLoading(null);
    }
  };

  // Status counts
  const pendingCount   = useMemo(() => pickups.filter((p) => p.status === 'PENDING').length, [pickups]);
  const acceptedCount  = useMemo(() => pickups.filter((p) => p.status === 'ACCEPTED').length, [pickups]);
  const scheduledCount = useMemo(() => pickups.filter((p) => p.status === 'SCHEDULED').length, [pickups]);
  const pickedUpCount  = useMemo(() => pickups.filter((p) => p.status === 'PICKED_UP').length, [pickups]);
  const receivedCount  = useMemo(() => pickups.filter((p) => p.status === 'RECEIVED').length, [pickups]);
  const rejectedCount  = useMemo(() => pickups.filter((p) => p.status === 'REJECTED').length, [pickups]);

  // Filtered pickups by activeTab and searchTerm
  const filteredPickups = useMemo(() => {
    return pickups.filter((p) => {
      // Tab filter
      if (activeTab === 'PENDING' && p.status !== 'PENDING') return false;
      if (activeTab === 'ACCEPTED' && p.status !== 'ACCEPTED') return false;
      if (activeTab === 'SCHEDULED' && p.status !== 'SCHEDULED') return false;
      if (activeTab === 'PICKED_UP' && p.status !== 'PICKED_UP') return false;
      if (activeTab === 'RECEIVED' && p.status !== 'RECEIVED') return false;
      if (activeTab === 'REJECTED' && p.status !== 'REJECTED') return false;

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = (p.customerName || '').toLowerCase().includes(query);
        const matchesPhone = (p.customerPhone || '').toLowerCase().includes(query);
        const matchesDevice = (p.fullDeviceName || p.device || '').toLowerCase().includes(query);
        const matchesIssue = (p.problemDescription || p.issue || '').toLowerCase().includes(query);
        const matchesAddress = (p.pickupAddress || p.address || '').toLowerCase().includes(query);
        const matchesId = String(p.id).includes(query) || (p.displayId || '').toLowerCase().includes(query);

        return matchesName || matchesPhone || matchesDevice || matchesIssue || matchesAddress || matchesId;
      }

      return true;
    });
  }, [pickups, activeTab, searchTerm]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package size={22} className="text-warning-600 dark:text-amber-400" /> Pickup Requests
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Accept incoming customer requests, schedule couriers, and track devices to your workshop.
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
        </div>
      </div>

      {/* ── Action Notification Banner ─────────────────────── */}
      {actionNotice && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-medium animate-in fade-in duration-200 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : actionNotice.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : 'bg-info-50 dark:bg-sky-950/40 border-info-200 dark:border-sky-800 text-info-800 dark:text-sky-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : actionNotice.type === 'error' ? (
              <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <Clock size={16} className="text-sky-600 dark:text-sky-400 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="p-1 hover:opacity-75 transition-opacity"
            aria-label="Dismiss notice"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Filters & Search ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'ALL'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-surface-200 dark:hover:bg-slate-700'
            }`}
          >
            All ({pickups.length})
          </button>
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'PENDING'
                ? 'bg-warning-500 text-white shadow-xs'
                : 'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-surface-200 dark:hover:bg-slate-700'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('ACCEPTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'ACCEPTED'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-surface-200 dark:hover:bg-slate-700'
            }`}
          >
            Accepted ({acceptedCount})
          </button>
          <button
            onClick={() => setActiveTab('SCHEDULED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'SCHEDULED'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-surface-200 dark:hover:bg-slate-700'
            }`}
          >
            Scheduled ({scheduledCount})
          </button>
          <button
            onClick={() => setActiveTab('PICKED_UP')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'PICKED_UP'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-surface-200 dark:hover:bg-slate-700'
            }`}
          >
            Picked Up ({pickedUpCount})
          </button>
          <button
            onClick={() => setActiveTab('RECEIVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'RECEIVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-surface-200 dark:hover:bg-slate-700'
            }`}
          >
            Received ({receivedCount})
          </button>
          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-surface-200 dark:hover:bg-slate-700'
            }`}
          >
            Declined ({rejectedCount})
          </button>
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search pickups..."
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

      {/* ── Loading State ──────────────────────────────────── */}
      {loading && (
        <div className="py-16">
          <PageLoader label="Loading shop pickup requests..." />
        </div>
      )}

      {/* ── Error State ────────────────────────────────────── */}
      {error && !loading && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-danger-200 dark:border-danger-900/60 shadow-xs text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-danger-50 dark:bg-danger-950/60 border border-danger-200 dark:border-danger-800 flex items-center justify-center text-danger-600 dark:text-danger-400">
              <AlertCircle size={24} />
            </div>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Failed to load pickup requests
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {error}
          </p>
          <Button size="sm" onClick={fetchPickups} leftIcon={<RefreshCw size={14} />}>
            Retry
          </Button>
        </div>
      )}

      {/* ── Pickups Grid ───────────────────────────────────── */}
      {!loading && !error && (
        <>
          {filteredPickups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPickups.map((p) => (
                <PickupCard
                  key={p.id}
                  pickup={p}
                  onOpenDetails={handleOpenDetails}
                  onAccept={handleAccept}
                  onOpenReject={setRejectingPickup}
                  onUpdateStatus={handleUpdateStatus}
                  onOpenCreateRepair={setCreatingRepairPickup}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <Package size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {searchTerm || activeTab !== 'ALL'
                  ? 'No matching pickup requests'
                  : 'No pickup requests yet'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {searchTerm || activeTab !== 'ALL'
                  ? 'Try selecting a different filter or clearing your search term.'
                  : 'When customers book a doorstep pickup for your repair shop, their requests will appear here.'}
              </p>
              {(searchTerm || activeTab !== 'ALL') && (
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
              )}
            </div>
          )}
        </>
      )}

      {/* ── Pickup Detail Modal ────────────────────────────── */}
      {selectedPickupId && (
        <ShopOwnerPickupDetailModal
          pickupId={selectedPickupId}
          onClose={handleCloseDetails}
          onAccept={handleAccept}
          onOpenReject={setRejectingPickup}
          onUpdateStatus={handleUpdateStatus}
          onOpenCreateRepair={setCreatingRepairPickup}
          actionLoading={actionLoading}
        />
      )}

      {/* ── Reject Modal ───────────────────────────────────── */}
      <RejectPickupModal
        pickup={rejectingPickup}
        isOpen={Boolean(rejectingPickup)}
        onClose={() => setRejectingPickup(null)}
        onConfirm={handleConfirmReject}
        loading={actionLoading === rejectingPickup?.id}
      />

      {/* ── Create Repair Modal ────────────────────────────── */}
      <CreateRepairModal
        pickup={creatingRepairPickup}
        isOpen={Boolean(creatingRepairPickup)}
        onClose={() => setCreatingRepairPickup(null)}
        onSuccess={(createdRepair) => {
          setCreatingRepairPickup(null);
          setActionNotice({
            type: 'success',
            message: `Repair ${createdRepair.repairId} created successfully! Redirecting...`,
          });
          setTimeout(() => {
            navigate(`/shop-owner/repairs?id=${encodeURIComponent(createdRepair.repairId)}`);
          }, 1200);
        }}
      />
    </div>
  );
}
