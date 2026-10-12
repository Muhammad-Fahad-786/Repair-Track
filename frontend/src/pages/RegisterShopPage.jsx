// ─────────────────────────────────────────────────────────────
// RepairTrack — Shop Owner Registration Page (Phase 5.3)
// Route: /register-shop
// Multi-section form: Owner → Shop → Services → Pickup → Submit
// Real backend integration: POST /api/v1/shop-applications/
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, Store, MapPin, CheckSquare, Truck,
  CheckCircle2, ArrowRight, Home, FileText, ChevronDown,
  Plus, X, Clock, AlertCircle, Info, Lock, Eye, EyeOff
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input, { Textarea } from '../components/ui/Input';
import { ROUTES } from '../constants';
import { useAuth } from '../context/AuthContext';
import { submitShopApplication, getMyShopApplications } from '../services/shopApplicationService';
import { isValidEmail } from '../utils';

// ─── Options ──────────────────────────────────────────────────
const CATEGORIES = [
  'Mobile & Tablet',
  'Laptop & Computer',
  'TV & Display',
  'Home Appliances',
  'Electronics',
  'Other',
];

const SERVICES = [
  'Screen Replacement',
  'Battery Replacement',
  'Charging Repair',
  'Software Issues',
  'Hardware Repair',
  'Diagnostics',
  'General Repair',
];

const POPULAR_CITIES = [
  'Indore', 'Delhi', 'Noida', 'Gurugram', 'Mumbai', 'Bengaluru',
  'Hyderabad', 'Pune', 'Kolkata', 'Chennai', 'Ahmedabad', 'Jaipur',
  'Patna', 'Bhagalpur', 'Bhopal', 'Lucknow', 'Chandigarh'
];

// ─── Section Heading ──────────────────────────────────────────
function SectionHeading({ step, title, desc }) {
  return (
    <div className="flex items-start gap-3 mb-4 pb-3 border-b border-surface-100 dark:border-slate-800/80">
      <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-primary-600 text-white text-xs font-bold shrink-0 mt-0.5 shadow-2xs">
        {step}
      </div>
      <div>
        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        {desc && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>}
      </div>
    </div>
  );
}

// ─── Checkbox pill ────────────────────────────────────────────
function CheckPill({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-all duration-150 select-none ${
        checked
          ? 'bg-primary-600 text-white border-primary-600 shadow-2xs'
          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-surface-200 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-600 hover:text-primary-600 dark:hover:text-primary-400'
      }`}
    >
      <CheckSquare size={14} className={checked ? 'text-white' : 'text-slate-400 dark:text-slate-500'} />
      {label}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function RegisterShopPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [submitted, setSubmitted] = useState(false);
  const [createdApp, setCreatedApp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [existingPendingApp, setExistingPendingApp] = useState(null);

  // Custom service area text input
  const [customAreaInput, setCustomAreaInput] = useState('');

  // Form state
  const [form, setForm] = useState({
    // Section A (Applicant Account Information)
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    phone: user?.phone || '',
    // Section B (Shop Details)
    shopName: '',
    category: '',
    description: '',
    address: '',
    city: '',
    // Section C (Services)
    selectedServices: [],
    // Section D (Pickup)
    pickupAvailable: null, // null | true | false
    serviceAreas: [],
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Sync user info into form state when user loads (optional prefill)
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  // Check if user already has a pending application
  useEffect(() => {
    let isMounted = true;
    async function checkExisting() {
      if (!user) return;
      try {
        const apps = await getMyShopApplications();
        if (isMounted && Array.isArray(apps)) {
          const pending = apps.find((a) => a.status === 'PENDING');
          if (pending) {
            setExistingPendingApp(pending);
          }
        }
      } catch {
        // Non-blocking background check
      }
    }
    checkExisting();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // ── Field change ─────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (submitError) setSubmitError('');
  };

  // ── Service toggle ───────────────────────────────────────
  const toggleService = (service) => {
    setForm((prev) => {
      const list = prev.selectedServices.includes(service)
        ? prev.selectedServices.filter((s) => s !== service)
        : [...prev.selectedServices, service];
      return { ...prev, selectedServices: list };
    });
    if (errors.selectedServices) setErrors((prev) => ({ ...prev, selectedServices: '' }));
  };

  // ── Service area handlers (arbitrary locations) ──────────
  const addServiceArea = (areaToAdd) => {
    const trimmed = (areaToAdd || customAreaInput).trim();
    if (!trimmed) return;

    if (!form.serviceAreas.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
      setForm((prev) => ({
        ...prev,
        serviceAreas: [...prev.serviceAreas, trimmed],
      }));
    }
    setCustomAreaInput('');
    if (errors.serviceAreas) setErrors((prev) => ({ ...prev, serviceAreas: '' }));
  };

  const removeServiceArea = (areaToRemove) => {
    setForm((prev) => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter((a) => a !== areaToRemove),
    }));
  };

  const handleCustomAreaKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addServiceArea();
    }
  };

  // ── Validation ───────────────────────────────────────────
  const validate = () => {
    const e = {};
    // Section A (Account)
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email address is required';
    else if (!isValidEmail(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (!form.confirmPassword) e.confirmPassword = 'Confirm your password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (form.phone && form.phone.trim().length > 20) e.phone = 'Phone number is too long';

    // Section B (Shop)
    if (!form.shopName.trim())                   e.shopName     = 'Shop name is required';
    if (!form.category)                          e.category     = 'Please select a category';
    if (!form.address.trim())                    e.address      = 'Shop address is required';
    if (!form.city.trim())                       e.city         = 'City is required';

    // Section C (Services)
    if (form.selectedServices.length === 0)      e.selectedServices = 'Select at least one service';

    // Section D (Pickup)
    if (form.pickupAvailable === null)           e.pickupAvailable = 'Please select pickup availability';
    if (form.pickupAvailable === true && form.serviceAreas.length === 0) {
      e.serviceAreas = 'Add at least one service area / locality for pickup';
    }
    return e;
  };

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      const firstErrKey = Object.keys(errs)[0];
      const el = document.getElementById(firstErrKey) || document.querySelector(`[name="${firstErrKey}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true);
    setSubmitError('');

    try {
      const result = await submitShopApplication({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        shopName: form.shopName,
        description: form.description,
        address: form.address,
        city: form.city,
        services: form.selectedServices,
        pickupAvailable: form.pickupAvailable,
      });

      if (result.application_token) {
        localStorage.setItem('repairtrack_applicant_token', result.application_token);
        localStorage.setItem('repairtrack_applicant_email', result.applicant_email || form.email);
        localStorage.setItem('repairtrack_applicant_app_id', String(result.id));
      }

      setCreatedApp(result);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      let msg = 'Failed to submit application. Please try again.';
      if (err.status === 409) {
        msg = err.message || 'An application or account with this email already exists.';
      } else if (err.status === 403) {
        msg = err.message || 'You do not have permission to submit a shop application.';
      } else if (err.status === 422) {
        msg = err.message || 'Please check that all required fields are filled correctly.';
      } else if (err.message) {
        msg = err.message;
      }
      setSubmitError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  // ── Success State ────────────────────────────────────────
  if (submitted && createdApp) {
    const formattedDate = createdApp.submitted_at
      ? new Date(createdApp.submitted_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

    return (
      <Card padding="lg" className="shadow-modal border border-surface-200 dark:border-slate-800 rounded-2xl text-center max-w-xl mx-auto">
        {/* Success Icon */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-success-50 dark:bg-success-950/60 text-success-600 dark:text-success-400 border border-success-200 dark:border-success-800/40 shadow-xs">
            <CheckCircle2 size={36} strokeWidth={2} />
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-1">
          Registration Submitted!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-md mx-auto mb-6">
          Thank you for applying. Your shop registration has been received and queued for administrative review.
        </p>

        {/* Application Credentials Box */}
        <div className="bg-surface-50 dark:bg-slate-800/60 border border-surface-200 dark:border-slate-700/80 rounded-2xl p-5 mb-6 text-left space-y-3.5 shadow-xs transition-colors duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-slate-700/80">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Application ID</span>
            <span className="text-sm font-mono font-bold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-lg border border-primary-200 dark:border-primary-800/50">
              #{createdApp.id}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Shop Name</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{createdApp.shop_name}</span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Registered Email</span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{user?.email || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Submitted Date</span>
              <span className="text-sm text-slate-700 dark:text-slate-300">{formattedDate}</span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Status</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-warning-700 dark:text-amber-300 bg-warning-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-full border border-warning-200 dark:border-amber-800/50">
                <Clock size={12} /> Pending Review
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            as={Link}
            to={ROUTES.APPLICATION_STATUS}
            fullWidth
            size="lg"
            rightIcon={<ArrowRight size={16} />}
          >
            Check Application Status
          </Button>
          <Button
            as={Link}
            to={ROUTES.HOME}
            variant="outline"
            fullWidth
            size="lg"
            leftIcon={<Home size={16} />}
          >
            Back to Home
          </Button>
        </div>
      </Card>
    );
  }

  // ── Form View ────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 pb-6 max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="text-center mb-2">
        <div className="flex justify-center mb-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary-600 text-white shadow-sm ring-4 ring-primary-50 dark:ring-primary-950/60">
            <Store size={22} />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/40 text-xs font-semibold mb-2.5">
          <Store size={12} className="text-primary-600 dark:text-primary-400" />
          Shop Onboarding
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Register Your Repair Shop</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Join RepairTrack's network to manage pickups, job cards, and reach customers anywhere.
        </p>
      </div>

      {/* Existing Pending Application Banner if user already applied */}
      {existingPendingApp && (
        <div className="bg-warning-50/90 dark:bg-amber-950/40 border border-warning-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3 shadow-xs">
          <Clock size={18} className="text-warning-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs flex-1">
            <p className="font-bold text-warning-900 dark:text-amber-200 mb-0.5">
              Application Already Under Review
            </p>
            <p className="text-warning-800 dark:text-amber-300/90 leading-relaxed">
              You already have a pending shop application for <strong>{existingPendingApp.shop_name}</strong> (App #{existingPendingApp.id}).
            </p>
            <Link
              to={ROUTES.APPLICATION_STATUS}
              className="inline-flex items-center gap-1 font-semibold text-primary-700 dark:text-primary-400 hover:underline mt-2"
            >
              View Application Status <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* Submission Error Banner */}
      {submitError && (
        <div className="bg-danger-50 dark:bg-red-950/40 border border-danger-200 dark:border-red-900/50 rounded-xl p-4 flex items-start gap-3 text-danger-700 dark:text-red-300 shadow-xs">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-danger-600 dark:text-red-400" />
          <div className="text-xs flex-1">
            <p className="font-bold text-danger-900 dark:text-red-200 mb-0.5">Submission Notice</p>
            <p className="leading-relaxed">{submitError}</p>
            {submitError.includes('already have') && (
              <Link
                to={ROUTES.APPLICATION_STATUS}
                className="inline-flex items-center gap-1 font-semibold text-danger-800 dark:text-red-200 underline mt-1.5"
              >
                View Existing Application Status →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Onboarding Workflow Strip */}
      <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-2 text-left">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 text-xs font-bold shrink-0">
              1
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Submit Details</p>
              <p className="text-2xs text-slate-400 dark:text-slate-500">Shop & workshop info</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold shrink-0">
              2
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Admin Review</p>
              <p className="text-2xs text-slate-400 dark:text-slate-500">1–2 business days</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold shrink-0">
              3
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Shop Activation</p>
              <p className="text-2xs text-slate-400 dark:text-slate-500">Shop Owner dashboard</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

        {/* ─── SECTION A: Account Information ────────────────── */}
        <Card padding="lg" className="border border-surface-200 dark:border-slate-800 rounded-2xl shadow-card dark:shadow-none">
          <SectionHeading
            step="A"
            title="Account Information"
            desc="Create the credentials you will use to log in to your Shop Owner dashboard once approved"
          />
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="name"
                label="Full Name"
                name="name"
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={form.name}
                onChange={handleChange}
                error={errors.name}
                leftIcon={<User size={16} />}
                required
              />
              <Input
                id="email"
                label="Email Address"
                name="email"
                type="email"
                placeholder="owner@example.com"
                value={form.email}
                onChange={handleChange}
                error={errors.email}
                leftIcon={<Mail size={16} />}
                hint="This will be your Shop Owner login email."
                required
                autoComplete="email"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="password"
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                error={errors.password}
                leftIcon={<Lock size={16} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors pointer-events-auto p-0.5 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                hint="Minimum 8 characters."
                required
                autoComplete="new-password"
              />

              <Input
                id="confirmPassword"
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                leftIcon={<Lock size={16} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors pointer-events-auto p-0.5 focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                required
                autoComplete="new-password"
              />
            </div>

            <Input
              id="phone"
              label="Contact Phone Number"
              name="phone"
              type="tel"
              placeholder="+91 98XXX XXXXX"
              value={form.phone}
              onChange={handleChange}
              error={errors.phone}
              leftIcon={<Phone size={16} />}
              hint="Primary contact number for administrative verification and customer inquiries."
            />

            <div className="flex items-center gap-2 bg-surface-50 dark:bg-slate-800/40 border border-surface-200 dark:border-slate-700/60 rounded-xl p-3 text-xs text-slate-500 dark:text-slate-400">
              <Info size={15} className="text-primary-600 dark:text-primary-400 shrink-0" />
              <span>
                No customer account is required. Upon admin approval, this account will automatically become an active <strong>Shop Owner</strong>.
              </span>
            </div>
          </div>
        </Card>

        {/* ─── SECTION B: Shop Details ─────────────────────── */}
        <Card padding="lg" className="border border-surface-200 dark:border-slate-800 rounded-2xl shadow-card dark:shadow-none">
          <SectionHeading step="B" title="Shop Details" desc="Tell customers and administrators about your workshop" />
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="shopName"
                label="Shop Name"
                name="shopName"
                type="text"
                placeholder="e.g. QuickFix Electronics"
                value={form.shopName}
                onChange={handleChange}
                error={errors.shopName}
                leftIcon={<Store size={16} />}
                required
              />

              {/* Category select */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="category" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Primary Category <span className="ml-1 text-danger-500" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <select
                    id="category"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className={`w-full rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm pl-3.5 pr-9 py-2.5 appearance-none transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                      errors.category
                        ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20'
                        : 'border-surface-300 dark:border-slate-700 focus:border-primary-500 focus:ring-primary-500/20 hover:border-slate-400 dark:hover:border-slate-600'
                    }`}
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{c}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-slate-500">
                    <ChevronDown size={16} />
                  </span>
                </div>
                {errors.category && (
                  <p className="text-xs text-danger-600 dark:text-danger-400">{errors.category}</p>
                )}
              </div>
            </div>

            <Textarea
              label="Shop Description"
              name="description"
              placeholder="Describe your shop, specializations, and years of experience..."
              value={form.description}
              onChange={handleChange}
              rows={3}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="address"
                label="Shop Street Address"
                name="address"
                type="text"
                placeholder="Shop number, market, road"
                value={form.address}
                onChange={handleChange}
                error={errors.address}
                leftIcon={<MapPin size={16} />}
                required
              />

              {/* City / Primary Location */}
              <div className="flex flex-col gap-1.5">
                <Input
                  id="city"
                  label="City / Primary Location"
                  name="city"
                  type="text"
                  placeholder="e.g. Indore, Delhi, Patna..."
                  value={form.city}
                  onChange={handleChange}
                  error={errors.city}
                  leftIcon={<MapPin size={16} />}
                  list="popular-city-list"
                  hint="Supports any city or town nationwide."
                  required
                />
                <datalist id="popular-city-list">
                  {POPULAR_CITIES.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>
        </Card>

        {/* ─── SECTION C: Services ────────────────────────── */}
        <Card padding="lg" className="border border-surface-200 dark:border-slate-800 rounded-2xl shadow-card dark:shadow-none">
          <SectionHeading step="C" title="Services Offered" desc="Select all services your workshop provides" />
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((service) => (
              <CheckPill
                key={service}
                label={service}
                checked={form.selectedServices.includes(service)}
                onChange={() => toggleService(service)}
              />
            ))}
          </div>
          {errors.selectedServices && (
            <p className="text-xs text-danger-600 dark:text-danger-400 mt-3">{errors.selectedServices}</p>
          )}
        </Card>

        {/* ─── SECTION D: Pickup Availability ─────────────── */}
        <Card padding="lg" className="border border-surface-200 dark:border-slate-800 rounded-2xl shadow-card dark:shadow-none">
          <SectionHeading step="D" title="Pickup Availability" desc="Do you offer doorstep device pickup?" />

          {/* Pickup toggle */}
          <div className="flex flex-col gap-1.5 mb-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Pickup Service Option <span className="ml-1 text-danger-500" aria-hidden="true">*</span>
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { value: true,  label: 'Yes, we offer pickup' },
                { value: false, label: 'No pickup service' },
              ].map(({ value, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      pickupAvailable: value,
                      serviceAreas: value && prev.serviceAreas.length === 0 && prev.city ? [prev.city] : prev.serviceAreas,
                    }));
                    if (errors.pickupAvailable) setErrors((prev) => ({ ...prev, pickupAvailable: '' }));
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
                    form.pickupAvailable === value
                      ? 'bg-primary-600 text-white border-primary-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-surface-200 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-600 hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                >
                  <Truck size={15} className={form.pickupAvailable === value ? 'text-white' : 'text-slate-400 dark:text-slate-500'} />
                  {label}
                </button>
              ))}
            </div>
            {errors.pickupAvailable && (
              <p className="text-xs text-danger-600 dark:text-danger-400">{errors.pickupAvailable}</p>
            )}
          </div>

          {/* Dynamic Service Areas */}
          {form.pickupAvailable === true && (
            <div className="space-y-3 pt-3 border-t border-surface-100 dark:border-slate-800">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Service Areas / Localities <span className="ml-1 text-danger-500" aria-hidden="true">*</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5">
                  Add all cities, towns, or neighborhoods where your team can collect devices.
                </p>
              </div>

              {/* Tag Input Field */}
              <div className="flex gap-2">
                <Input
                  placeholder="Type an area (e.g. South Extension, Koramangala, Palasia) and press Add"
                  value={customAreaInput}
                  onChange={(e) => setCustomAreaInput(e.target.value)}
                  onKeyDown={handleCustomAreaKeyDown}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addServiceArea()}
                  disabled={!customAreaInput.trim()}
                  leftIcon={<Plus size={15} />}
                >
                  Add
                </Button>
              </div>

              {/* Quick suggestions */}
              {form.city && !form.serviceAreas.includes(form.city) && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Quick add:</span>
                  <button
                    type="button"
                    onClick={() => addServiceArea(form.city)}
                    className="text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    + {form.city}
                  </button>
                </div>
              )}

              {/* Selected Area Tags */}
              <div className="flex flex-wrap gap-2 pt-1 min-h-8">
                {form.serviceAreas.map((area) => (
                  <span
                    key={area}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/50 shadow-2xs"
                  >
                    <span>{area}</span>
                    <button
                      type="button"
                      onClick={() => removeServiceArea(area)}
                      className="text-primary-400 hover:text-primary-700 dark:hover:text-primary-200 transition-colors p-0.5"
                      title={`Remove ${area}`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
                {form.serviceAreas.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                    No service areas added yet. Type an area above to add it.
                  </p>
                )}
              </div>

              {errors.serviceAreas && (
                <p className="text-xs text-danger-600 dark:text-danger-400">{errors.serviceAreas}</p>
              )}
            </div>
          )}
        </Card>

        {/* ─── SECTION E: Submission ──────────────────────── */}
        <Card padding="lg" className="border border-surface-200 dark:border-slate-800 rounded-2xl shadow-card dark:shadow-none">
          <SectionHeading step="E" title="Submit Your Application" desc="Finalize and send for platform verification" />

          {/* Notice */}
          <div className="flex gap-3 bg-primary-50/70 dark:bg-slate-800/60 border border-primary-100 dark:border-slate-800 rounded-xl p-4 mb-5">
            <FileText size={18} className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <p className="font-semibold text-slate-900 dark:text-slate-200 mb-0.5">Admin Review Required</p>
              <p>
                Your application will be queued for administrative review upon submission. You will immediately receive a unique Application ID to monitor review progress at any time.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            loading={loading}
            disabled={loading}
            fullWidth
            size="lg"
            rightIcon={<ArrowRight size={16} />}
          >
            Submit Shop Registration
          </Button>

          {/* Already registered link */}
          <div className="mt-4 text-center">
            <Link
              to={ROUTES.APPLICATION_STATUS}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Already submitted? <span className="font-semibold text-primary-600 dark:text-primary-400">Check application status →</span>
            </Link>
          </div>
        </Card>
      </form>
    </div>
  );
}
