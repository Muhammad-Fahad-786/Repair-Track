// ─────────────────────────────────────────────────────────────
// RepairTrack — New Pickup Request Page (Customer)
// Route: /dashboard/pickups/new
// Real integration with POST /api/v1/pickups
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Package, CheckCircle2, ChevronRight, Smartphone, MapPin,
  Phone, Calendar, FileText, Store, ArrowLeft, AlertCircle, Ban,
} from 'lucide-react';
import Input, { Textarea } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { ROUTES } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { getShops } from '../../services/shopService';
import { createPickup } from '../../services/pickupService';

const DEVICE_TYPES = [
  'Smartphone', 'Tablet', 'Laptop', 'Desktop PC', 'Smart TV',
  'Washing Machine', 'Refrigerator', 'Air Conditioner', 'Microwave', 'Other',
];

const CITIES = ['Delhi', 'Noida', 'Gurugram', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Other'];

// ─── Success state ─────────────────────────────────────────────
function SuccessView({ pickup, onReset }) {
  return (
    <div className="max-w-md mx-auto text-center py-12">
      <div className="flex justify-center mb-5">
        <div className="h-20 w-20 rounded-full bg-success-100 dark:bg-success-950/60 border border-success-200 dark:border-success-800/50 flex items-center justify-center">
          <CheckCircle2 size={40} className="text-success-600 dark:text-success-400" strokeWidth={1.8} />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Pickup Request Submitted!</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
        Your pickup request has been received by <strong className="text-slate-800 dark:text-slate-200">{pickup?.shopName || 'the repair shop'}</strong>.
        The shop will review and confirm a pickup schedule.
      </p>

      {/* Real pickup summary card */}
      <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-4 mb-8 text-left shadow-xs space-y-2.5 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-surface-100 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Pickup Reference:</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">{pickup?.displayId || `#PICK-${pickup?.id}`}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Shop:</span>
          <span className="font-medium text-slate-800 dark:text-slate-200">{pickup?.shopName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Device:</span>
          <span className="font-medium text-slate-800 dark:text-slate-200">{pickup?.fullDeviceName || pickup?.device}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Status:</span>
          <span className="px-2 py-0.5 rounded-full font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
            {pickup?.status || 'PENDING'}
          </span>
        </div>
        {pickup?.preferredDate && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Preferred Date:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{pickup.preferredDate}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          as={Link}
          to={ROUTES.DASHBOARD_PICKUPS}
          leftIcon={<Package size={16} />}
        >
          View My Pickups
        </Button>
        <Button
          variant="outline"
          onClick={onReset}
        >
          Submit Another
        </Button>
      </div>
    </div>
  );
}

// ─── Main form ─────────────────────────────────────────────────
export default function NewPickupPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [shops,        setShops]        = useState([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [submitted,    setSubmitted]    = useState(false);
  const [submittedPickup, setSubmittedPickup] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [errors,       setErrors]       = useState({});
  const [apiError,     setApiError]     = useState('');

  const [form, setForm] = useState({
    shopId:          searchParams.get('shop') || '',
    deviceType:      '',
    brand:           '',
    model:           '',
    problem:         '',
    address:         '',
    city:            '',
    phone:           user?.phone || '',
    preferredDate:   '',
    notes:           '',
  });

  // Fetch approved active shops on mount
  useEffect(() => {
    let isMounted = true;
    setLoadingShops(true);

    getShops()
      .then((data) => {
        if (!isMounted) return;
        setShops(data);
        const shopParam = searchParams.get('shop');
        if (shopParam) {
          const matched = data.find((s) => String(s.id) === String(shopParam));
          if (matched) {
            setForm((f) => ({ ...f, shopId: String(matched.id) }));
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error fetching shops for pickup form:', err);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingShops(false);
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  // Keep phone updated if user profile loads asynchronously
  useEffect(() => {
    if (user?.phone && !form.phone) {
      setForm((f) => ({ ...f, phone: user.phone }));
    }
  }, [user]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    if (apiError) setApiError('');
  };

  const selectedShop = shops.find((s) => String(s.id) === String(form.shopId));
  const isSelectedShopInactive = selectedShop && (!selectedShop.isOpen || selectedShop.status === 'INACTIVE');

  const validate = () => {
    const e = {};
    if (!form.shopId) {
      e.shopId = 'Please select an active repair shop.';
    } else if (isSelectedShopInactive) {
      e.shopId = 'This repair shop is currently unavailable for pickup requests.';
    }

    if (!form.deviceType)    e.deviceType  = 'Select a device type.';
    if (!form.brand.trim())  e.brand       = 'Enter the device brand.';
    if (!form.model.trim())  e.model       = 'Enter the device model.';
    if (!form.problem.trim() || form.problem.trim().length < 10)
      e.problem = 'Describe the problem (at least 10 characters).';
    if (!form.address.trim()) e.address   = 'Enter your pickup address.';
    if (!form.city)           e.city      = 'Select your city.';
    if (!form.phone.trim())   e.phone     = 'Enter your phone number.';
    if (!form.preferredDate)  e.preferredDate = 'Select a preferred pickup date.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent duplicate submissions

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setApiError('');
    setLoading(true);

    try {
      const created = await createPickup(form);
      setSubmittedPickup(created);
      setSubmitted(true);
    } catch (err) {
      console.error('Pickup creation failed:', err);
      if (err.status === 400 || err.status === 404) {
        if (
          err.message?.toLowerCase().includes('not currently approved') ||
          err.message?.toLowerCase().includes('inactive') ||
          err.message?.toLowerCase().includes('not exist')
        ) {
          setApiError('This repair shop is currently unavailable for pickup requests.');
        } else {
          setApiError(err.message || 'Unable to schedule pickup with this shop.');
        }
      } else if (err.status === 403) {
        setApiError('Only customer accounts may create pickup requests.');
      } else if (err.status === 422) {
        setApiError(err.message || 'Please check the form for invalid input.');
      } else {
        setApiError(err.message || 'Failed to submit pickup request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setSubmittedPickup(null);
    setForm({
      shopId: '',
      deviceType: '',
      brand: '',
      model: '',
      problem: '',
      address: '',
      city: '',
      phone: user?.phone || '',
      preferredDate: '',
      notes: '',
    });
    setErrors({});
    setApiError('');
  };

  if (submitted) {
    return <SuccessView pickup={submittedPickup} onReset={handleReset} />;
  }

  // Today's date as min for preferred date input
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        to={ROUTES.DASHBOARD_PICKUPS}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-5 transition-colors"
      >
        <ArrowLeft size={15} /> Back to My Pickups
      </Link>

      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Package size={22} className="text-warning-600 dark:text-amber-400" /> New Pickup Request
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Fill in the details below and we'll coordinate the pickup with your chosen shop.
        </p>
      </div>

      {/* API Error Banner */}
      {apiError && (
        <div className="mb-6 p-4 rounded-xl bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-800/40 text-danger-700 dark:text-danger-400 text-sm font-medium flex items-start gap-2.5">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-danger-600 dark:text-danger-400" />
          <div className="flex-1">
            <p>{apiError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">

        {/* ── Section 1: Shop Selection ──────────────────────── */}
        <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Store size={16} className="text-primary-600 dark:text-primary-400" /> Choose Shop
            </h2>
            {loadingShops && (
              <span className="text-xs text-slate-400">Loading verified shops...</span>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
              Select an Active Repair Shop <span className="text-danger-500">*</span>
            </label>
            <select
              value={form.shopId}
              onChange={set('shopId')}
              disabled={loadingShops}
              className={`w-full rounded-lg border text-sm px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all ${errors.shopId ? 'border-danger-500' : 'border-surface-300 dark:border-slate-700 hover:border-slate-400'}`}
            >
              <option value="" className="bg-white dark:bg-slate-900">— Select an available shop —</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900">
                  {s.name} — {s.location || s.city || 'Verified Workshop'} {s.status === 'INACTIVE' ? '(Inactive)' : ''}
                </option>
              ))}
            </select>
            {errors.shopId && <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">{errors.shopId}</p>}
            {isSelectedShopInactive && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                <Ban size={13} /> This shop is temporarily inactive and cannot accept pickup requests.
              </p>
            )}
          </div>
        </div>

        {/* ── Section 2: Device Information ─────────────────── */}
        <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Smartphone size={16} className="text-primary-600 dark:text-primary-400" /> Device Information
          </h2>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
              Device Type <span className="text-danger-500">*</span>
            </label>
            <select
              value={form.deviceType}
              onChange={set('deviceType')}
              className={`w-full rounded-lg border text-sm px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all ${errors.deviceType ? 'border-danger-500' : 'border-surface-300 dark:border-slate-700 hover:border-slate-400'}`}
            >
              <option value="" className="bg-white dark:bg-slate-900">— Select device type —</option>
              {DEVICE_TYPES.map((t) => <option key={t} className="bg-white dark:bg-slate-900">{t}</option>)}
            </select>
            {errors.deviceType && <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">{errors.deviceType}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Brand"
              placeholder="e.g. Apple, Samsung"
              required
              value={form.brand}
              onChange={set('brand')}
              error={errors.brand}
            />
            <Input
              label="Model"
              placeholder="e.g. iPhone 14 Pro"
              required
              value={form.model}
              onChange={set('model')}
              error={errors.model}
            />
          </div>
          <Textarea
            label="Problem Description"
            placeholder="Describe the issue in detail (minimum 10 characters)…"
            required
            rows={3}
            value={form.problem}
            onChange={set('problem')}
            error={errors.problem}
            hint="Be specific — e.g. 'Screen cracked after drop, touch not working on top half'"
          />
        </div>

        {/* ── Section 3: Pickup Details ─────────────────────── */}
        <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <MapPin size={16} className="text-primary-600 dark:text-primary-400" /> Pickup Details
          </h2>
          <Input
            label="Pickup Address"
            placeholder="Full address — flat, street, area"
            required
            value={form.address}
            onChange={set('address')}
            error={errors.address}
            leftIcon={<MapPin size={15} />}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                City <span className="text-danger-500">*</span>
              </label>
              <select
                value={form.city}
                onChange={set('city')}
                className={`w-full rounded-lg border text-sm px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all ${errors.city ? 'border-danger-500' : 'border-surface-300 dark:border-slate-700 hover:border-slate-400'}`}
              >
                <option value="" className="bg-white dark:bg-slate-900">— Select city —</option>
                {CITIES.map((c) => <option key={c} className="bg-white dark:bg-slate-900">{c}</option>)}
              </select>
              {errors.city && <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">{errors.city}</p>}
            </div>
            <Input
              label="Phone Number"
              placeholder="+91 98XXX XXXXX"
              required
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              error={errors.phone}
              leftIcon={<Phone size={15} />}
            />
          </div>
          <Input
            label="Preferred Pickup Date"
            type="date"
            required
            min={today}
            value={form.preferredDate}
            onChange={set('preferredDate')}
            error={errors.preferredDate}
            leftIcon={<Calendar size={15} />}
          />
        </div>

        {/* ── Section 4: Additional Notes ───────────────────── */}
        <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <FileText size={16} className="text-primary-600 dark:text-primary-400" /> Additional Notes (Optional)
          </h2>
          <Textarea
            placeholder="Any additional instructions for the shop or pickup rider…"
            rows={2}
            value={form.notes}
            onChange={set('notes')}
          />
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3 pb-2">
          <Button
            type="submit"
            loading={loading}
            disabled={loading || isSelectedShopInactive}
            fullWidth
            size="lg"
            rightIcon={<ChevronRight size={18} />}
          >
            {loading ? 'Submitting Request...' : 'Request Pickup'}
          </Button>
          <Button
            as={Link}
            to={ROUTES.DASHBOARD_PICKUPS}
            variant="outline"
            size="lg"
            className="sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
