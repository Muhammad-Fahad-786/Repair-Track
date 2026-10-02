// ─────────────────────────────────────────────────────────────
// RepairTrack — Shop Owner Dashboard Page (Phase 5.5)
// Route: /shop-owner/dashboard
// ─────────────────────────────────────────────────────────────

import { useSearchParams, Link } from 'react-router-dom';
import {
  Package, Wrench, Users, Star, CheckCircle2, Clock,
  ChevronRight, MapPin, Check, X, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { StatCard } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { MOCK_CUSTOMERS, MOCK_SHOP_OWNER } from '../constants/mockData';
import { ROUTES, REPAIR_STATUS_LABELS, PICKUP_STATUS_LABELS } from '../constants';
import { getShopOwnerPickups, acceptPickup, rejectPickup } from '../services/pickupService';
import { getShopOwnerRepairs } from '../services/repairService';

// ─── Status badge maps ────────────────────────────────────────
const REPAIR_BADGE = { RECEIVED: 'info', DIAGNOSING: 'warning', REPAIRING: 'warning', READY: 'success', COMPLETED: 'success', CANCELLED: 'danger' };
const PICKUP_BADGE = { PENDING: 'warning', ACCEPTED: 'info', REJECTED: 'danger', SCHEDULED: 'info', PICKED_UP: 'primary', RECEIVED: 'success' };

// ─── Pickup Requests Section ──────────────────────────────────
function PickupsSection({ pickups, compact = false, onAccept, onDecline, actionLoading }) {
  const displayed = compact ? pickups.slice(0, 3) : pickups;

  return (
    <div className="flex flex-col gap-2">
      {displayed.length === 0 && (
        <div className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
          No pickup requests yet.
        </div>
      )}
      {displayed.map((p) => {
        const isAction = actionLoading === p.id;
        return (
          <div key={p.id} className="bg-surface-50 dark:bg-slate-800/60 border border-surface-200 dark:border-slate-700 rounded-xl px-5 py-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xs font-bold text-slate-400 dark:text-slate-500">
                    {p.displayId || `#PICK-${p.id}`}
                  </span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {p.fullDeviceName || p.device}
                  </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {p.problemDescription || p.issue}
                </p>
              </div>
              <Badge variant={PICKUP_BADGE[p.status] || 'default'} size="sm" className="shrink-0">
                {PICKUP_STATUS_LABELS[p.status] || p.status}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-400 mb-3">
              <span className="flex items-center gap-1">
                <MapPin size={11} /> {p.pickupAddress || p.address}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {p.customerName || 'Customer'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-400">
                  {p.customerPhone || ''}
                </p>
              </div>
              {p.status === 'PENDING' ? (
                <div className="flex gap-2">
                  <Button
                    size="xs"
                    variant="success"
                    leftIcon={isAction ? <RefreshCw size={12} className="animate-spin" /> : <Check size={13} />}
                    onClick={() => onAccept && onAccept(p.id)}
                    disabled={isAction}
                  >
                    Accept
                  </Button>
                  <Button
                    size="xs"
                    variant="danger"
                    leftIcon={<X size={13} />}
                    onClick={() => onDecline && onDecline(p.id)}
                    disabled={isAction}
                  >
                    Decline
                  </Button>
                </div>
              ) : (
                <Link
                  to={`${ROUTES.SHOP_OWNER_PICKUPS}?id=${p.id}`}
                  className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-0.5"
                >
                  Manage <ChevronRight size={12} />
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Repairs Section ──────────────────────────────────────────
function RepairsSection({ repairs, compact = false }) {
  const displayed = compact ? repairs.slice(0, 3) : repairs;

  return (
    <div className="flex flex-col gap-2">
      {displayed.length === 0 && (
        <div className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">No active repairs.</div>
      )}
      {displayed.map((r) => (
        <Link
          key={r.id || r.repairId}
          to={`${ROUTES.SHOP_OWNER_REPAIRS}?id=${encodeURIComponent(r.repairId)}`}
          className="bg-surface-50 dark:bg-slate-800/60 hover:bg-surface-100 dark:hover:bg-slate-800 border border-surface-200 dark:border-slate-700 rounded-xl px-5 py-3.5 flex items-start justify-between gap-3 transition-colors block"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{r.fullDeviceName || r.device}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{r.customerName || 'Customer'}</p>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 font-mono">{r.repairId}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant={REPAIR_BADGE[r.status] || 'default'} size="sm">
              {REPAIR_STATUS_LABELS[r.status] || r.status}
            </Badge>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{r.cost}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Customers Section ────────────────────────────────────────
function CustomersSection() {
  return (
    <div className="flex flex-col gap-2">
      {MOCK_CUSTOMERS.map((c) => (
        <div key={c.id} className="bg-surface-50 dark:bg-slate-800/60 border border-surface-200 dark:border-slate-700 rounded-xl px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-950/60 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-xs shrink-0">
              {c.avatar}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{c.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.phone}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">{c.repairs} repairs</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Shop Profile Section ─────────────────────────────────────
function ShopProfileSection() {
  const s = MOCK_SHOP_OWNER;
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-surface-50 dark:bg-slate-800/60 border border-surface-200 dark:border-slate-700 rounded-xl p-5">
        <div className="flex items-start gap-4 mb-5">
          <div className="h-14 w-14 rounded-2xl bg-primary-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {s.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{s.shopName}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.category} · {s.location}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Star size={13} className="text-warning-500 fill-warning-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{s.rating}</span>
              <span className="text-xs text-slate-400 dark:text-slate-400">({s.reviewCount} reviews)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-slate-400 dark:text-slate-400">Status</span>
            <div className="mt-0.5">
              <Badge variant="success" size="sm">{s.status}</Badge>
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-400 dark:text-slate-400">Pickup Available</span>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{s.pickupAvailable ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400 dark:text-slate-400">Service Areas</span>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{s.serviceAreas.join(', ')}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400 dark:text-slate-400">Member Since</span>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{s.joinedDate}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-surface-200 dark:border-slate-700">
          <span className="text-xs text-slate-400 dark:text-slate-400">Description</span>
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{s.description}</p>
        </div>
      </div>

      <div className="bg-info-50 dark:bg-sky-950/30 border border-info-200 dark:border-sky-900/50 rounded-xl px-4 py-3.5">
        <p className="text-xs text-info-700 dark:text-sky-300 leading-relaxed">
          <span className="font-semibold">Need to update your shop details?</span>
          {' '}Profile editing will be available in a future release. Contact support to request changes.
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function ShopOwnerDashboardPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section') || 'overview';

  const [pickups, setPickups] = useState([]);
  const [loadingPickups, setLoadingPickups] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const [repairs, setRepairs] = useState([]);
  const [loadingRepairs, setLoadingRepairs] = useState(true);

  const fetchPickups = useCallback(async () => {
    setLoadingPickups(true);
    try {
      const data = await getShopOwnerPickups();
      setPickups(data);
    } catch (err) {
      console.error('Failed to load shop pickups on dashboard:', err);
    } finally {
      setLoadingPickups(false);
    }
  }, []);

  const fetchRepairs = useCallback(async () => {
    setLoadingRepairs(true);
    try {
      const data = await getShopOwnerRepairs();
      setRepairs(data);
    } catch (err) {
      console.error('Failed to load shop repairs on dashboard:', err);
    } finally {
      setLoadingRepairs(false);
    }
  }, []);

  useEffect(() => {
    fetchPickups();
    fetchRepairs();
  }, [fetchPickups, fetchRepairs]);

  const handleAccept = async (id) => {
    setActionLoading(id);
    try {
      const updated = await acceptPickup(id);
      setPickups((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      console.error('Failed to accept pickup:', err);
      fetchPickups();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (id) => {
    setActionLoading(id);
    try {
      const updated = await rejectPickup(id);
      setPickups((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      console.error('Failed to reject pickup:', err);
      fetchPickups();
    } finally {
      setActionLoading(null);
    }
  };

  const pendingPickups = pickups.filter((p) => p.status === 'PENDING');
  const activeRepairs  = repairs.filter((r) => !['COMPLETED', 'CANCELLED'].includes(r.status));

  const shopDisplayName = pickups[0]?.shopName || user?.shopName || MOCK_SHOP_OWNER.shopName;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ───────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {shopDisplayName}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage pickup requests, repairs, and your shop profile.
        </p>
      </div>

      {section === 'overview' && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Pending Pickups"
              value={pendingPickups.length}
              icon={<Package size={20} />}
              accent="warning"
              description="Awaiting response"
            />
            <StatCard
              title="Active Repairs"
              value={activeRepairs.length}
              icon={<Wrench size={20} />}
              accent="info"
              description="In progress"
            />
            <StatCard
              title="Total Customers"
              value={MOCK_CUSTOMERS.length}
              icon={<Users size={20} />}
              accent="primary"
              description="Served by your shop"
            />
            <StatCard
              title="Rating"
              value={MOCK_SHOP_OWNER.rating}
              icon={<Star size={20} />}
              accent="success"
              description={`${MOCK_SHOP_OWNER.reviewCount} reviews`}
            />
          </div>

          {/* Pending pickups alert */}
          {pendingPickups.length > 0 && (
            <div className="flex items-center justify-between bg-warning-50 dark:bg-amber-950/30 border border-warning-200 dark:border-amber-800/50 rounded-xl px-5 py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle size={16} className="text-warning-600 dark:text-amber-400 shrink-0" />
                <p className="text-sm font-semibold text-warning-700 dark:text-amber-300">
                  {pendingPickups.length} pickup request{pendingPickups.length > 1 ? 's' : ''} awaiting your response
                </p>
              </div>
              <Link
                to={ROUTES.SHOP_OWNER_PICKUPS}
                className="text-xs font-semibold text-warning-700 dark:text-amber-300 hover:text-warning-800 dark:hover:text-amber-200 flex items-center gap-1 transition-colors"
              >
                Review <ChevronRight size={13} />
              </Link>
            </div>
          )}

          {/* Two-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Pickups */}
            <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-warning-600 dark:text-amber-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Pickup Requests</h2>
                </div>
                <Link
                  to={ROUTES.SHOP_OWNER_PICKUPS}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1 transition-colors"
                >
                  All <ChevronRight size={13} />
                </Link>
              </div>
              <div className="p-4">
                <PickupsSection
                  pickups={pickups}
                  compact
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  actionLoading={actionLoading}
                />
              </div>
            </div>

            {/* Repairs */}
            <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Wrench size={16} className="text-primary-600 dark:text-primary-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Active Repairs</h2>
                </div>
                <Link
                  to={`${ROUTES.SHOP_OWNER_DASHBOARD}?section=repairs`}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1 transition-colors"
                >
                  All <ChevronRight size={13} />
                </Link>
              </div>
              <div className="p-4">
                <RepairsSection repairs={activeRepairs} compact />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Section views ─────────────────────────────── */}
      {section === 'pickups' && (
        <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Package size={16} className="text-warning-600 dark:text-amber-400" /> All Pickup Requests
            </h2>
            <Link
              to={ROUTES.SHOP_OWNER_PICKUPS}
              className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
            >
              Full Pickup Management <ChevronRight size={13} />
            </Link>
          </div>
          <PickupsSection
            pickups={pickups}
            onAccept={handleAccept}
            onDecline={handleDecline}
            actionLoading={actionLoading}
          />
        </div>
      )}
      {section === 'repairs' && (
        <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Wrench size={16} className="text-primary-600 dark:text-primary-400" /> All Repairs
          </h2>
          <RepairsSection repairs={repairs} />
        </div>
      )}
      {section === 'customers' && (
        <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Users size={16} className="text-info-600 dark:text-sky-400" /> Customers
          </h2>
          <CustomersSection />
        </div>
      )}
      {section === 'profile' && (
        <ShopProfileSection />
      )}
    </div>
  );
}
