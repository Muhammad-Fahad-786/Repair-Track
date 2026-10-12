// ─────────────────────────────────────────────────────────────
// RepairTrack — Pickup Feature Section
// ─────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom';
import {
  User, Store, Truck, Wrench, CheckCircle2, ArrowRight, MapPin, Package,
} from 'lucide-react';
import Button from '../ui/Button';
import { ROUTES } from '../../constants';

// ─── Pickup Flow Visual Card ──────────────────────────────────
function PickupFlowCard() {
  const steps = [
    { icon: User,   label: 'Customer Request', sub: 'Details & address submitted',   done: true  },
    { icon: Store,  label: 'Shop Confirmation',sub: 'Owner accepts pickup schedule',  done: true  },
    { icon: Truck,  label: 'Device Collected', sub: 'Driver picks up from doorstep',  done: true  },
    { icon: Wrench, label: 'Repair In Progress',sub: 'Device received at workshop',   done: false, active: true },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-card p-5 sm:p-6 w-full max-w-sm transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3.5 border-b border-surface-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex-center h-9 w-9 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-800/40 shrink-0">
            <Package size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Pickup Request</p>
            <p className="text-2xs text-slate-400 dark:text-slate-500">#PICK-2026-8812</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
          <CheckCircle2 size={11} strokeWidth={3} />
          Scheduled
        </span>
      </div>

      {/* Pickup address card */}
      <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 mb-5 p-3 bg-surface-50 dark:bg-slate-800/60 rounded-xl border border-surface-100 dark:border-slate-700/60">
        <MapPin size={15} className="text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs">Pickup Location</p>
          <p className="text-slate-500 dark:text-slate-400 text-xs truncate">Flat 402, Lotus Towers, Sector 62, Noida</p>
        </div>
      </div>

      {/* Flow timeline */}
      <div className="space-y-1">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="flex items-start gap-3">
              {/* Vertical timeline node */}
              <div className="flex flex-col items-center pt-0.5">
                <div
                  className={`flex-center h-6 w-6 rounded-full border-2 shrink-0 ${
                    step.done
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : step.active
                      ? 'bg-primary-600 border-primary-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-surface-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2 size={12} strokeWidth={3} />
                  ) : (
                    <Icon size={11} />
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-0.5 h-4 my-0.5 ${step.done ? 'bg-emerald-200 dark:bg-emerald-800' : 'bg-surface-200 dark:bg-slate-700'}`} />
                )}
              </div>
              {/* Node text */}
              <div className="pb-1.5 min-w-0">
                <p className={`text-xs font-semibold ${step.active ? 'text-primary-700 dark:text-primary-400 font-bold' : step.done ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                  {step.label}
                </p>
                <p className="text-2xs text-slate-400 dark:text-slate-500">{step.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function PickupSection() {
  return (
    <section className="py-16 md:py-24 bg-white dark:bg-slate-950 border-b border-surface-200 dark:border-slate-800/80 transition-colors duration-200">
      <div className="page-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">

          {/* ── Visual (left on desktop, 5 cols) ───────── */}
          <div className="lg:col-span-5 flex justify-center lg:justify-start order-2 lg:order-1">
            <div className="relative w-full max-w-sm">
              <PickupFlowCard />
              {/* Subtle back decorative frame */}
              <div
                aria-hidden="true"
                className="absolute -bottom-3 -right-3 h-full w-full rounded-2xl bg-primary-50/70 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 -z-10"
              />
            </div>
          </div>

          {/* ── Copy (right on desktop, 7 cols) ────────── */}
          <div className="lg:col-span-7 order-1 lg:order-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-2.5">
              Doorstep Convenience
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-4 leading-[1.2]">
              Can't visit the shop?
              <br />
              <span className="text-primary-600 dark:text-primary-400">Let the repair</span> come to you.
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-6 max-w-xl">
              Busy schedule or bulky device? Request a pickup from any participating repair shop.
              Provide your address and problem description, and the shop takes care of the transport.
            </p>

            {/* Checklist */}
            <ul className="space-y-3 mb-8 max-w-md">
              {[
                'Select your preferred pickup address and contact number',
                'Shop owner reviews and accepts the pickup request',
                'Device is safely collected by verified shop staff',
                'Immediate digital confirmation and intake at the workshop',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle2 size={17} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Button
              as={Link}
              to={ROUTES.SHOPS}
              size="lg"
              rightIcon={<ArrowRight size={18} />}
              className="font-semibold shadow-sm"
            >
              Find a Pickup Shop
            </Button>
          </div>

        </div>
      </div>
    </section>
  );
}
