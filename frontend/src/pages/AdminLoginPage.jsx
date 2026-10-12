// ─────────────────────────────────────────────────────────────
// RepairTrack — Admin Login Page (Phase 5.1 Real Auth)
// Route: /admin/login
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth, ROLE_REDIRECT } from '../context/AuthContext';
import { ROUTES, ROLES } from '../constants';
import { isValidEmail } from '../utils';

export default function AdminLoginPage() {
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

      // Verify admin role
      if (user.role !== ROLES.ADMIN) {
        const targetPath = ROLE_REDIRECT[user.role] || ROUTES.DASHBOARD;
        setApiError('Access denied. This account does not have administrator privileges. Redirecting to your portal...');
        setTimeout(() => {
          navigate(targetPath, { replace: true });
        }, 1200);
        return;
      }

      navigate(ROUTES.ADMIN, { replace: true });
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
            <ShieldCheck size={22} />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/40 text-xs font-semibold mb-2.5">
          <ShieldCheck size={12} className="text-primary-600 dark:text-primary-400" />
          Administrator Portal
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Admin Portal</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          Sign in to manage RepairTrack shops, approvals, and platform governance.
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
          label="Administrator Email"
          name="email"
          type="email"
          placeholder="admin@repairtrack.com"
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
          Admin Sign In
        </Button>
      </form>

      {/* Security note */}
      <div className="mt-6 pt-4 border-t border-surface-200 dark:border-slate-800 text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck size={13} className="text-primary-600 dark:text-primary-400 shrink-0" />
          <span>
            <strong className="font-semibold text-slate-700 dark:text-slate-300">Restricted Access:</strong> Platform administrators only.
          </span>
        </div>
        <div>
          <Link
            to={ROUTES.LOGIN}
            className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
          >
            ← Return to customer login
          </Link>
        </div>
      </div>
    </Card>
  );
}
