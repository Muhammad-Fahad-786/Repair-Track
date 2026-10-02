// ─────────────────────────────────────────────────────────────
// RepairTrack — Shop Application Status Page (Phase 5.3)
// Route: /application-status
// Real backend integration: GET /api/v1/shop-applications/my
// Authoritative status and role transition for authenticated user.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle2, XCircle, Home, LogIn, Mail, Store,
  AlertCircle, ArrowRight, RefreshCw, MapPin, Truck, Check, LayoutDashboard
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ROUTES, ROLES } from '../constants';
import { useAuth } from '../context/AuthContext';
import { getMyShopApplications } from '../services/shopApplicationService';

// ─── Status configurations ────────────────────────────────────
const STATUS_CONFIG = {
  PENDING: {
    icon:        <Clock size={32} strokeWidth={2} />,
    iconBg:      'bg-warning-50 dark:bg-amber-950/50 text-warning-600 dark:text-amber-400 border border-warning-200 dark:border-amber-800/50',
    badgeBg:     'bg-warning-50 dark:bg-amber-950/50 border-warning-200 dark:border-amber-800/60 text-warning-700 dark:text-amber-300',
    dotColor:    'bg-warning-500',
    badgeLabel:  'Pending Review',
    title:       'Application is Under Review',
    description:
      'Our administrative team is verifying your workshop details and credentials. You will be notified once reviewed.',
    nextSteps: [
      'Shop applications are typically verified within 1–2 business days.',
      'Our team may reach out via phone or email if additional documentation is needed.',
      'Once approved, your account is automatically upgraded to Shop Owner.',
    ],
  },
  APPROVED: {
    icon:        <CheckCircle2 size={32} strokeWidth={2} />,
    iconBg:      'bg-success-50 dark:bg-emerald-950/50 text-success-600 dark:text-emerald-400 border border-success-200 dark:border-emerald-800/50',
    badgeBg:     'bg-success-50 dark:bg-emerald-950/50 border-success-200 dark:border-emerald-800/60 text-success-700 dark:text-emerald-300',
    dotColor:    'bg-success-500',
    badgeLabel:  'Approved & Verified',
    title:       'Congratulations! Your Shop is Approved 🎉',
    description:
      'Your repair shop has been approved and activated. Your account has been upgraded to Shop Owner.',
    nextSteps: [
      'Your shop profile is now live and searchable by nearby customers in the public directory.',
      'You can receive doorstep pickup requests in your designated service areas.',
      'Access your Shop Owner dashboard to review shop hours, set up technicians, and manage job cards.',
    ],
  },
  REJECTED: {
    icon:        <XCircle size={32} strokeWidth={2} />,
    iconBg:      'bg-danger-50 dark:bg-red-950/50 text-danger-600 dark:text-red-400 border border-danger-200 dark:border-red-800/50',
    badgeBg:     'bg-danger-50 dark:bg-red-950/50 border-danger-200 dark:border-red-800/60 text-danger-700 dark:text-red-300',
    dotColor:    'bg-danger-500',
    badgeLabel:  'Application Rejected',
    title:       'Application Could Not Be Approved',
    description:
      'Unfortunately, your shop registration could not be verified with the provided details. Please review the explanation below.',
    nextSteps: null,
  },
};

export default function ApplicationStatusPage() {
  const navigate = useNavigate();
  const { user, role, refreshUser } = useAuth();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState('');
  const [navigating, setNavigating]     = useState(false);

  // ─── Fetch real applications from backend ─────────────────────
  const loadApplications = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const data = await getMyShopApplications();
      setApplications(data);

      // If an approved application is found, refresh user session from backend
      // so AuthContext receives the authoritative SHOP_OWNER role.
      const hasApproved = data.some((a) => a.status === 'APPROVED');
      if (hasApproved && refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve application status. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // Navigate to Shop Owner dashboard with authoritative role confirmation
  const handleGoToDashboard = async () => {
    setNavigating(true);
    try {
      if (role !== ROLES.SHOP_OWNER && refreshUser) {
        await refreshUser();
      }
      navigate(ROUTES.SHOP_OWNER_DASHBOARD);
    } catch {
      navigate(ROUTES.SHOP_OWNER_DASHBOARD);
    } finally {
      setNavigating(false);
    }
  };

  // ─── Loading State ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full max-w-xl mx-auto py-8">
        <Card padding="lg" className="shadow-modal border border-surface-200 dark:border-slate-800 rounded-2xl text-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Checking your application status...</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Connecting to RepairTrack servers</p>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────
  if (error) {
    return (
      <div className="w-full max-w-xl mx-auto py-8">
        <Card padding="lg" className="shadow-modal border border-danger-200 dark:border-red-900/50 rounded-2xl text-center">
          <div className="flex justify-center mb-3">
            <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-danger-50 dark:bg-red-950/50 text-danger-600 dark:text-red-400 border border-danger-200 dark:border-red-800/50 shadow-xs">
              <AlertCircle size={28} />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Failed to Load Status</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={() => loadApplications(true)}
              variant="outline"
              leftIcon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
            >
              Retry
            </Button>
            <Button as={Link} to={ROUTES.HOME} variant="secondary">
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ─── No Applications State ────────────────────────────────────
  if (applications.length === 0) {
    return (
      <div className="w-full max-w-xl mx-auto py-8">
        <Card padding="lg" className="shadow-modal border border-surface-200 dark:border-slate-800 rounded-2xl text-center">
          <div className="flex justify-center mb-3">
            <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 shadow-xs">
              <Store size={28} />
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">No Application Found</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
            No shop registration application has been submitted for <strong className="text-slate-700 dark:text-slate-300">{user?.email}</strong>. Register your repair workshop today to join our verified partner network.
          </p>

          <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
            <Button
              as={Link}
              to={ROUTES.REGISTER_SHOP}
              fullWidth
              size="lg"
              leftIcon={<Store size={16} />}
            >
              Register Your Shop
            </Button>
            <Button
              as={Link}
              to={ROUTES.HOME}
              variant="outline"
              fullWidth
              size="md"
              leftIcon={<Home size={14} />}
            >
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Active Application View (Latest) ─────────────────────────
  const activeApp = applications[0];
  const cfg = STATUS_CONFIG[activeApp.status] || STATUS_CONFIG.PENDING;
  const formattedDate = activeApp.submitted_at
    ? new Date(activeApp.submitted_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="w-full max-w-xl mx-auto py-2 sm:py-4">
      <Card padding="lg" className="shadow-modal border border-surface-200 dark:border-slate-800 rounded-2xl">
        {/* Header icon & title */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className={`flex items-center justify-center h-14 w-14 rounded-2xl ${cfg.iconBg} shadow-xs ring-4 ring-surface-100 dark:ring-slate-800`}>
              {cfg.icon}
            </div>
          </div>

          {/* Status badge */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-2.5 ${cfg.badgeBg}`}
          >
            <span className={`h-2 w-2 rounded-full ${cfg.dotColor}`} />
            {cfg.badgeLabel}
          </div>

          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{cfg.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-md mx-auto">
            {cfg.description}
          </p>
        </div>

        {/* Application Details Summary */}
        <div className="bg-surface-50 dark:bg-slate-800/60 border border-surface-200 dark:border-slate-700/80 rounded-2xl p-5 mb-5 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-surface-200 dark:border-slate-700/80">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Application ID</span>
            <span className="text-xs font-mono font-bold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-0.5 rounded-lg border border-primary-200 dark:border-primary-800/50">
              #{activeApp.id}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Shop Name</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activeApp.shop_name}</span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Registered Account</span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{user?.email || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Location</span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{activeApp.city || activeApp.address || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Submitted Date</span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{formattedDate}</span>
            </div>
          </div>

          {activeApp.services && (
            <div className="pt-2 border-t border-surface-100 dark:border-slate-700/60">
              <span className="text-slate-400 dark:text-slate-500 block text-xs mb-1">Services Offered</span>
              <p className="text-xs text-slate-700 dark:text-slate-300">{activeApp.services}</p>
            </div>
          )}

          <div className="pt-2 border-t border-surface-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-400 dark:text-slate-500">Doorstep Pickup</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {activeApp.pickup_available ? 'Available' : 'Not Offered'}
            </span>
          </div>
        </div>

        {/* Rejection Reason (if REJECTED) */}
        {activeApp.status === 'REJECTED' && (
          <div className="bg-danger-50/70 dark:bg-red-950/40 border border-danger-200 dark:border-red-900/50 rounded-xl p-4 mb-5 text-left">
            <p className="text-xs font-bold text-danger-800 dark:text-red-300 mb-1">Reason for Decision:</p>
            <p className="text-sm text-danger-700 dark:text-red-400 leading-relaxed">
              {activeApp.rejection_reason || 'Application did not meet verification criteria.'}
            </p>
          </div>
        )}

        {/* Next Steps (if available) */}
        {cfg.nextSteps && (
          <div className="bg-surface-50 dark:bg-slate-800/50 border border-surface-200 dark:border-slate-700/80 rounded-xl p-4 mb-5 text-left">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-200 mb-2">Next Steps</p>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
              {cfg.nextSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary-600 dark:text-primary-400 mt-0.5">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Role actions */}
        <div className="flex flex-col gap-2.5">
          {activeApp.status === 'APPROVED' ? (
            <Button
              onClick={handleGoToDashboard}
              loading={navigating}
              fullWidth
              size="lg"
              leftIcon={<LayoutDashboard size={16} />}
              rightIcon={<ArrowRight size={16} />}
            >
              Go to Shop Owner Dashboard
            </Button>
          ) : activeApp.status === 'REJECTED' ? (
            <Button
              as={Link}
              to={ROUTES.REGISTER_SHOP}
              fullWidth
              size="lg"
              leftIcon={<Store size={16} />}
            >
              Submit New Shop Registration
            </Button>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => loadApplications(true)}
              loading={refreshing}
              fullWidth
              size="md"
              leftIcon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
            >
              Refresh Status
            </Button>
            <Button
              as={Link}
              to={ROUTES.HOME}
              variant="secondary"
              fullWidth
              size="md"
              leftIcon={<Home size={14} />}
            >
              Back to Home
            </Button>
          </div>
        </div>

        {/* Previous Applications History if multiple */}
        {applications.length > 1 && (
          <div className="mt-6 pt-4 border-t border-surface-200 dark:border-slate-800 text-left">
            <p className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Previous Applications ({applications.length})
            </p>
            <div className="space-y-2">
              {applications.slice(1).map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-surface-50 dark:bg-slate-800/40 border border-surface-200 dark:border-slate-800 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{app.shop_name}</span>
                    <span className="text-slate-400 dark:text-slate-500 ml-2">#{app.id}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                      app.status === 'APPROVED'
                        ? 'bg-success-50 dark:bg-emerald-950/60 text-success-700 dark:text-emerald-300'
                        : app.status === 'REJECTED'
                        ? 'bg-danger-50 dark:bg-red-950/60 text-danger-700 dark:text-red-300'
                        : 'bg-warning-50 dark:bg-amber-950/60 text-warning-700 dark:text-amber-300'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
