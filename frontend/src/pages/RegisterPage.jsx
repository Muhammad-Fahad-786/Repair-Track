// ─────────────────────────────────────────────────────────────
// RepairTrack — Customer Registration Page (Phase 5.1 Real Auth)
// Route: /register
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Eye, EyeOff, UserPlus, ArrowRight, AlertCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants';
import { isValidEmail, isValidPassword } from '../utils';

const INIT = { name: '', email: '', phone: '', password: '', confirmPassword: '' };

export default function RegisterPage() {
  const navigate      = useNavigate();
  const { register }  = useAuth();

  const [form,     setForm]     = useState(INIT);
  const [errors,   setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [showCPw,  setShowCPw]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim())              e.name    = 'Full name is required';
    if (!form.email.trim())             e.email   = 'Email is required';
    else if (!isValidEmail(form.email)) e.email   = 'Enter a valid email address';
    if (!form.phone.trim())             e.phone   = 'Phone number is required';
    if (!form.password)                 e.password = 'Password is required';
    else if (!isValidPassword(form.password)) e.password = 'Password must be at least 8 characters';
    if (!form.confirmPassword)          e.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
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
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
      });
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      setApiError(err.message || 'Registration failed. Please check your details and try again.');
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
            <UserPlus size={22} />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/40 text-xs font-semibold mb-2.5">
          <UserPlus size={12} className="text-primary-600 dark:text-primary-400" />
          Customer Account
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Create your account</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          Get started with doorstep pickup and live repair tracking.
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
          label="Full Name"
          name="name"
          type="text"
          placeholder="John Doe"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          leftIcon={<User size={16} />}
          required
          autoComplete="name"
        />

        <Input
          label="Email address"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          leftIcon={<Mail size={16} />}
          required
          autoComplete="email"
        />

        <Input
          label="Phone number"
          name="phone"
          type="tel"
          placeholder="+91 98XXX XXXXX"
          value={form.phone}
          onChange={handleChange}
          error={errors.phone}
          leftIcon={<Phone size={16} />}
          required
          autoComplete="tel"
        />

        <Input
          label="Password"
          name="password"
          type={showPw ? 'text' : 'password'}
          placeholder="Minimum 8 characters"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          hint={!errors.password ? 'Use at least 8 characters' : undefined}
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
          autoComplete="new-password"
        />

        <Input
          label="Confirm Password"
          name="confirmPassword"
          type={showCPw ? 'text' : 'password'}
          placeholder="Re-enter your password"
          value={form.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          leftIcon={<Lock size={16} />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowCPw((v) => !v)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors pointer-events-auto p-0.5 focus:outline-none"
              aria-label={showCPw ? 'Hide password' : 'Show password'}
            >
              {showCPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          required
          autoComplete="new-password"
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={loading}
          className="mt-1"
          rightIcon={!loading ? <ArrowRight size={16} /> : null}
        >
          Create Account
        </Button>
      </form>

      {/* Sign in link */}
      <div className="mt-6 pt-4 border-t border-surface-200 dark:border-slate-800 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link
            to={ROUTES.LOGIN}
            className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            Sign in →
          </Link>
        </p>
      </div>
    </Card>
  );
}
