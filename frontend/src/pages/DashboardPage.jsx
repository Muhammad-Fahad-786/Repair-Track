// ─────────────────────────────────────────────────────────────
// RepairTrack — Customer Dashboard Page
// Route: /dashboard
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Wrench, Package, Clock, CheckCircle2, PlusCircle,
  ArrowRight, MapPin, Star, ChevronRight,
} from 'lucide-react';
import { StatCard } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { ROUTES, REPAIR_STATUS_LABELS, PICKUP_STATUS_LABELS } from '../constants';
import { getMyPickups } from '../services/pickupService';
import { getMyRepairs } from '../services/repairService';

// ─── Status → badge variant map ──────────────────────────────
const REPAIR_BADGE = {
  RECEIVED:   'info',
  DIAGNOSING: 'warning',
  REPAIRING:  'warning',
  READY:      'success',
  COMPLETED:  'success',
  CANCELLED:  'danger',
};
const PICKUP_BADGE = {
  PENDING:   'warning',
  ACCEPTED:  'info',
  REJECTED:  'danger',
  SCHEDULED: 'info',
  PICKED_UP: 'info',
  RECEIVED:  'success',
};

// ─── Section Components ───────────────────────────────────────
function RepairRow({ repair }) {
  return (
    <Link
      to={`${ROUTES.DASHBOARD_REPAIRS}?id=${encodeURIComponent(repair.repairId)}`}
      className="flex items-start justify-between gap-3 py-3.5 border-b border-surface-100 dark:border-slate-800 last:border-0 hover:bg-surface-50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors block"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{repair.fullDeviceName || repair.device}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{repair.problemDescription || repair.issue}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{repair.repairId}</span>
          <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">{repair.shopName}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <Badge variant={REPAIR_BADGE[repair.status] || 'default'} size="sm">
          {REPAIR_STATUS_LABELS[repair.status] || repair.status}
        </Badge>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{repair.cost}</span>
      </div>
    </Link>
  );
}

function PickupRow({ pickup }) {
  return (
    <div className="flex items-start justify-between gap-3 py-3.5 border-b border-surface-100 dark:border-slate-800 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{pickup.device}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{pickup.issue}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <MapPin size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="text-xs text-slate-400 dark:text-slate-500">{pickup.shopName}</span>
        </div>
      </div>
      <Badge variant={PICKUP_BADGE[pickup.status] || 'default'} size="sm" className="shrink-0">
        {PICKUP_STATUS_LABELS[pickup.status] || pickup.status}
      </Badge>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section');

  const [myPickups, setMyPickups] = useState([]);
  const [myRepairs, setMyRepairs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([getMyPickups(), getMyRepairs()])
      .then(([pickupsData, repairsData]) => {
        if (mounted) {
          setMyPickups(pickupsData || []);
          setMyRepairs(repairsData || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  const activeRepairs    = myRepairs.filter((r) => !['COMPLETED', 'CANCELLED'].includes(r.status));
  const pendingPickups   = myPickups.filter((p) => ['PENDING', 'SCHEDULED', 'ACCEPTED'].includes(p.status));
  const completedRepairs = myRepairs.filter((r) => r.status === 'COMPLETED');

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Hi, {user?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Here's your repair status overview.
          </p>
        </div>
        <Button
          as={Link}
          to={ROUTES.DASHBOARD_PICKUPS_NEW}
          size="sm"
          leftIcon={<PlusCircle size={16} />}
        >
          Request Pickup
        </Button>
      </div>

      {/* ── Stat Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Repairs"
          value={activeRepairs.length}
          icon={<Wrench size={20} />}
          accent="info"
          description="In progress"
        />
        <StatCard
          title="Pending Pickups"
          value={pendingPickups.length}
          icon={<Package size={20} />}
          accent="warning"
          description="Awaiting pickup"
        />
        <StatCard
          title="Total Repairs"
          value={myRepairs.length}
          icon={<Clock size={20} />}
          accent="primary"
          description="All time"
        />
        <StatCard
          title="Completed"
          value={completedRepairs.length}
          icon={<CheckCircle2 size={20} />}
          accent="success"
          description="Successfully repaired"
        />
      </div>

      {/* ── Content grid ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Repairs */}
        <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-primary-600 dark:text-primary-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">My Repairs</h2>
            </div>
            <Link
              to={ROUTES.DASHBOARD_REPAIRS}
              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="px-5 divide-y divide-surface-100 dark:divide-slate-800">
            {myRepairs.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                No repairs yet.
              </div>
            ) : (
              myRepairs.slice(0, 3).map((r) => <RepairRow key={r.id} repair={r} />)
            )}
          </div>
        </div>

        {/* Pickups */}
        <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-warning-600 dark:text-amber-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Pickup Requests</h2>
            </div>
            <Link
              to={ROUTES.DASHBOARD_PICKUPS}
              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="px-5 divide-y divide-surface-100 dark:divide-slate-800">
            {myPickups.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                No pickup requests yet.
              </div>
            ) : (
              myPickups.slice(0, 3).map((p) => <PickupRow key={p.id} pickup={p} />)
            )}
          </div>
        </div>
      </div>

      {/* ── Track CTA ───────────────────────────────────── */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl px-6 py-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold mb-1">Track a Repair</h3>
          <p className="text-sm text-primary-100 leading-snug">
            Enter your tracking code to see real-time status, notes, and estimated completion.
          </p>
        </div>
        <Button
          as={Link}
          to={ROUTES.DASHBOARD_TRACK}
          variant="secondary"
          size="md"
          rightIcon={<ArrowRight size={15} />}
          className="shrink-0 bg-white text-primary-700 hover:bg-primary-50"
        >
          Track Repair
        </Button>
      </div>

    </div>
  );
}
