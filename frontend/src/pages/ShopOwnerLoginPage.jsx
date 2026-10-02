// ─────────────────────────────────────────────────────────────
// RepairTrack — Shop Owner Login Page (Phase 5.1 Real Auth)
// Route: /shop-owner/login
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Store, ArrowRight, Info, AlertCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth, ROLE_REDIRECT } from '../context/AuthContext';
import { ROUTES, ROLES } from '../constants';
import { isValidEmail } from '../utils';

export default function ShopOwnerLoginPage() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [form,     setForm]     = useState({ email: '', password: '' });
  const [errors,   setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email.trim())             e.email    = 'Email is required';
    else if (!isValidEmail(form.email)) e.email    = 'Enter a valid email address';
    if (!form.password)                 e.password = 'Password is required';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');
    try {
      const user = await login(form.email, form.password);

      // Verify role
      if (user.role !== ROLES.SHOP_OWNER) {
        const portalLabel = user.role === ROLES.ADMIN ? 'Administrator' : 'Customer';
        const targetPath = ROLE_REDIRECT[user.role] || ROUTES.DASHBOARD;
        setApiError(`This account is registered as ${portalLabel}. Redirecting to your portal...`);
        setTimeout(() => {
          navigate(targetPath, { replace: true });
        }, 1200);
        return;
      }

      navigate(ROUTES.SHOP_OWNER_DASHBOARD, { replace: true });
    } catch (err) {
      setApiError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="lg" className="shadow-modal border border-surface-200 dark:border-slate-800 rounded-2xl">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary-600 text-white shadow-sm ring-4 ring-primary-50 dark:ring-primary-950/60">
            <Store size={22} />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/40 text-xs font-semibold mb-2.5">
          <Store size={12} className="text-primary-600 dark:text-primary-400" />
          Shop Owner Portal
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Shop Owner Login</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          Manage your workshop, pickup requests, and customer job cards.
        </p>
      </div>

      {/* Backend API Error Banner */}
      {apiError && (
        <div className="mb-4 p-3 rounded-xl bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-800/40 text-danger-700 dark:text-danger-400 text-xs font-medium flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Shop Email Address"
          name="email"
          type="email"
          placeholder="shop@example.com"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          leftIcon={<Mail size={16} />}
          required
          autoComplete="email"
        />

        <Input
          label="Password"
          name="password"
          type={showPw ? 'text' : 'password'}
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
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
          loading={loading}
          className="mt-1"
          rightIcon={!loading ? <ArrowRight size={16} /> : null}
        >
          Sign In to Shop
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-surface-200 dark:bg-slate-800" />
        <span className="text-2xs uppercase tracking-wider font-medium text-slate-400 dark:text-slate-500">don't have an account?</span>
        <div className="flex-1 h-px bg-surface-200 dark:bg-slate-800" />
      </div>

      {/* Register CTA */}
      <Button
        as={Link}
        to={ROUTES.REGISTER_SHOP}
        variant="outline"
        fullWidth
        size="md"
      >
        Register Your Shop
      </Button>

      {/* Info notice box */}
      <div className="mt-5 flex items-start gap-2.5 bg-surface-50 dark:bg-slate-800/50 border border-surface-200 dark:border-slate-800 rounded-xl p-3.5 text-xs text-slate-600 dark:text-slate-400 transition-colors">
        <Info size={15} className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-200">Waiting for application approval?</p>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
            All shop applications are reviewed by admin within 1–2 business days.
          </p>
          <Link
            to={ROUTES.APPLICATION_STATUS}
            className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors inline-flex items-center gap-1 pt-0.5"
          >
            Check your application status →
          </Link>
        </div>
      </div>

      {/* Customer login link */}
      <div className="mt-5 pt-4 border-t border-surface-200 dark:border-slate-800 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Looking for customer login?{' '}
          <Link
            to={ROUTES.LOGIN}
            className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            Sign in as customer →
          </Link>
        </p>
      </div>
    </Card>
  );
}
