import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Clock, CheckCircle2, XCircle, Home, LogIn, Mail, Lock, Eye, EyeOff, Store,
  AlertCircle, ArrowRight, RefreshCw, LayoutDashboard, Search
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { ROUTES, ROLES } from '../constants';
import { useAuth } from '../context/AuthContext';
import {
  getMyShopApplications,
  getShopApplicationStatus,
  checkShopApplicationStatus,
} from '../services/shopApplicationService';
import { isValidEmail } from '../utils';

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
      'Once approved, your Shop Owner account will be activated immediately.',
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
      'Your repair shop has been approved and activated. You can now sign in with your Shop Owner account.',
    nextSteps: [
      'Your shop profile is now live and searchable in the public repair directory.',
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
  const [searchParams] = useSearchParams();
  const { user, role, refreshUser } = useAuth();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState('');
  const [navigating, setNavigating]     = useState(false);

  // Manual lookup state (when no token in storage and not logged in)
  const [lookupMode, setLookupMode]     = useState(false);
  const [lookupForm, setLookupForm]     = useState({ email: '', password: '' });
  const [lookupErrors, setLookupErrors] = useState({});
  const [lookupError, setLookupError]   = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showPw, setShowPw]             = useState(false);

  // ─── Fetch real applications from backend ─────────────────────
  const loadApplications = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    const queryToken = searchParams.get('token');
    const storedToken = queryToken || localStorage.getItem('repairtrack_applicant_token');

    try {
      if (storedToken) {
        // Fetch via application token
        const data = await getShopApplicationStatus(storedToken);
        setApplications([data]);
        setLookupMode(false);

        if (data.status === 'APPROVED' && user && refreshUser) {
          await refreshUser();
        }
      } else if (user) {
        // Authenticated user session fallback
        const data = await getMyShopApplications();
        setApplications(data);
        setLookupMode(false);

        const hasApproved = data.some((a) => a.status === 'APPROVED');
        if (hasApproved && refreshUser) {
          await refreshUser();
        }
      } else {
        // No token and no user: show credential lookup form
        setApplications([]);
        setLookupMode(true);
      }
    } catch (err) {
      // If token is invalid or expired, fallback to lookup mode
      if (storedToken) {
        localStorage.removeItem('repairtrack_applicant_token');
        setLookupMode(true);
        setError('Your previous session expired. Please enter your email and password to check status.');
      } else {
        setError(err.message || 'Failed to retrieve application status. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchParams, user, refreshUser]);

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

  // Handle credential lookup submission
  const handleLookupSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!lookupForm.email.trim()) errs.email = 'Email is required';
    else if (!isValidEmail(lookupForm.email)) errs.email = 'Enter a valid email address';
    if (!lookupForm.password) errs.password = 'Password is required';

    if (Object.keys(errs).length) {
      setLookupErrors(errs);
      return;
    }

    setLookupLoading(true);
    setLookupError('');
    try {
      const result = await checkShopApplicationStatus({
        email: lookupForm.email,
        password: lookupForm.password,
      });

      if (result.application_token) {
        localStorage.setItem('repairtrack_applicant_token', result.application_token);
      }
      setApplications([result]);
      setLookupMode(false);
      setError('');
    } catch (err) {
      setLookupError(err.message || 'No matching shop application found for these credentials.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleClearAndLookupAnother = () => {
    localStorage.removeItem('repairtrack_applicant_token');
    setApplications([]);
    setLookupMode(true);
    setError('');
    setLookupError('');
    setLookupForm({ email: '', password: '' });
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

  // ─── Credential Lookup Form (When not logged in and no token) ──
  if (lookupMode) {
    return (
      <div className="w-full max-w-md mx-auto py-4">
        <Card padding="lg" className="shadow-modal border border-surface-200 dark:border-slate-800 rounded-2xl">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary-600 text-white shadow-sm ring-4 ring-primary-50 dark:ring-primary-950/60">
                <Search size={22} />
              </div>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Check Application Status
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              Enter the credentials you provided when registering your repair shop.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {lookupError && (
            <div className="mb-4 p-3 rounded-xl bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-800/40 text-danger-700 dark:text-danger-400 text-xs font-medium flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{lookupError}</span>
            </div>
          )}

          <form onSubmit={handleLookupSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Applicant Email Address"
              name="email"
              type="email"
              placeholder="applicant@example.com"
              value={lookupForm.email}
              onChange={(e) => {
                setLookupForm((p) => ({ ...p, email: e.target.value }));
                if (lookupErrors.email) setLookupErrors((p) => ({ ...p, email: '' }));
                if (lookupError) setLookupError('');
              }}
              error={lookupErrors.email}
              leftIcon={<Mail size={16} />}
              required
              autoComplete="email"
            />

            <Input
              label="Application Password"
              name="password"
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={lookupForm.password}
              onChange={(e) => {
                setLookupForm((p) => ({ ...p, password: e.target.value }));
                if (lookupErrors.password) setLookupErrors((p) => ({ ...p, password: '' }));
                if (lookupError) setLookupError('');
              }}
              error={lookupErrors.password}
              leftIcon={<Lock size={16} />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors pointer-events-auto p-0.5 focus:outline-none"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={lookupLoading}
              className="mt-1"
              leftIcon={<Search size={16} />}
            >
              Find Application
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-surface-200 dark:bg-slate-800" />
            <span className="text-2xs uppercase tracking-wider font-medium text-slate-400 dark:text-slate-500">or</span>
            <div className="flex-1 h-px bg-surface-200 dark:bg-slate-800" />
          </div>

          <div className="flex flex-col gap-2">
            <Button
              as={Link}
              to={ROUTES.REGISTER_SHOP}
              variant="outline"
              fullWidth
              size="md"
              leftIcon={<Store size={15} />}
            >
              Register a New Shop
            </Button>
            <Button
              as={Link}
              to={ROUTES.SHOP_OWNER_LOGIN}
              variant="ghost"
              fullWidth
              size="sm"
            >
              Already Approved? Sign In Here →
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────
  if (error && applications.length === 0) {
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
            <Button
              onClick={handleClearAndLookupAnother}
              variant="secondary"
              leftIcon={<Search size={14} />}
            >
              Check by Email & Password
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
            No active shop registration application was found. Register your repair workshop today to join our verified partner network.
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
              onClick={handleClearAndLookupAnother}
              variant="outline"
              fullWidth
              size="md"
              leftIcon={<Search size={14} />}
            >
              Search by Email & Password
            </Button>
            <Button
              as={Link}
              to={ROUTES.HOME}
              variant="ghost"
              fullWidth
              size="sm"
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

  const applicantEmail = activeApp.applicant_email || user?.email || '—';
  const applicantName = activeApp.applicant_name || user?.name || null;

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
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Applicant Email</span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{applicantEmail}</span>
            </div>
            {applicantName && (
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Applicant Name</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{applicantName}</span>
              </div>
            )}
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
            role === ROLES.SHOP_OWNER ? (
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
            ) : (
              <Button
                as={Link}
                to={ROUTES.SHOP_OWNER_LOGIN}
                fullWidth
                size="lg"
                leftIcon={<LogIn size={16} />}
                rightIcon={<ArrowRight size={16} />}
              >
                Sign In to Shop Owner Portal
              </Button>
            )
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
              variant="outline"
              onClick={handleClearAndLookupAnother}
              fullWidth
              size="md"
              leftIcon={<Search size={14} />}
            >
              Check Other
            </Button>
            <Button
              as={Link}
              to={ROUTES.HOME}
              variant="secondary"
              fullWidth
              size="md"
              leftIcon={<Home size={14} />}
            >
              Home
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
