// ─────────────────────────────────────────────────────────────
// RepairTrack — Hero Section
// ─────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom';
import {
  ArrowRight, MapPin, CheckCircle2, Clock, Wrench, Smartphone, Cpu, ShieldCheck,
} from 'lucide-react';
import Button from '../ui/Button';
import { ROUTES } from '../../constants';

// ─── Repair Status Card (hero interactive visual) ──────────────
function RepairStatusCard() {
  const steps = [
    { label: 'Received',   done: true  },
    { label: 'Diagnosing', done: true  },
    { label: 'Repairing',  done: false, active: true },
    { label: 'Ready',      done: false },
    { label: 'Completed',  done: false },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card dark:shadow-none border border-surface-200 dark:border-slate-800 p-5 sm:p-6 w-full max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3.5 border-b border-surface-100 dark:border-slate-800">
        <div>
          <p className="text-2xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
            Repair ID
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-white font-mono tracking-wide">
            RT-SH001-X7K92
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-600 animate-pulse" />
          Repairing
        </span>
      </div>

      {/* Device info */}
      <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-slate-800/60 rounded-xl mb-4 border border-surface-100 dark:border-slate-700/60">
        <div className="flex-center h-10 w-10 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 shrink-0 border border-primary-100 dark:border-primary-800">
          <Cpu size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Dell Inspiron 15</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Motherboard &amp; Overheating Inspection</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-1.5 my-3">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-3">
            {/* Step circle + connector */}
            <div className="flex flex-col items-center">
              <div
                className={`h-5 w-5 rounded-full flex-center border-2 text-xs transition-colors ${
                  step.done
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : step.active
                    ? 'bg-primary-600 border-primary-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-surface-300 dark:border-slate-600 text-slate-400'
                }`}
              >
                {step.done ? (
                  <CheckCircle2 size={12} strokeWidth={3} />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-0.5 h-3 my-0.5 ${
                    step.done ? 'bg-emerald-200 dark:bg-emerald-800' : 'bg-surface-200 dark:bg-slate-700'
                  }`}
                />
              )}
            </div>
            <span
              className={`text-xs font-semibold ${
                step.done
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : step.active
                  ? 'text-primary-700 dark:text-primary-400 font-bold'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Cost & Approval Footer */}
      <div className="mt-4 pt-3.5 border-t border-surface-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Estimated Cost</span>
          <span className="text-base font-bold text-slate-900 dark:text-white font-mono">₹2,500</span>
        </div>
        <span className="text-2xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full">
          Approved by Customer
        </span>
      </div>
    </div>
  );
}

// ─── Floating Stat Chip ────────────────────────────────────────
function MiniStatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-xl shadow-card dark:shadow-none border border-surface-200 dark:border-slate-800 px-3 py-2">
      <div className={`flex-center h-8 w-8 rounded-lg shrink-0 ${color}`}>
        <Icon size={15} />
      </div>
      <div>
        <p className="text-2xs font-medium text-slate-400 dark:text-slate-500 leading-none">{label}</p>
        <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-slate-950 pt-10 pb-16 md:pt-14 md:pb-20 lg:pt-16 lg:pb-24">
      {/* Subtle ambient gradient mesh */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-primary-50/70 dark:bg-primary-950/30 blur-3xl" />
        <div className="absolute top-1/2 -left-20 h-72 w-72 rounded-full bg-surface-100 dark:bg-slate-900/40 blur-3xl" />
      </div>

      <div className="page-container relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

          {/* ── Left Column: Value Proposition (7 cols) ───── */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-primary-100 dark:border-primary-800 mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-600" />
              <span>Registered Local Repair Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white leading-[1.15] tracking-tight mb-5">
              Repair made simple.
              <br />
              <span className="text-primary-600 dark:text-primary-400">From pickup</span> to completion.
            </h1>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed mb-8 max-w-xl">
              Find trusted local repair shops, schedule a device pickup from your home,
              and track repair progress in real time — with complete cost transparency.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <Button
                as={Link}
                to={ROUTES.SHOPS}
                size="lg"
                rightIcon={<ArrowRight size={18} />}
                className="font-semibold shadow-sm"
              >
                Find a Repair Shop
              </Button>
              <Button
                as={Link}
                to={ROUTES.TRACK}
                variant="outline"
                size="lg"
                leftIcon={<MapPin size={18} />}
                className="font-semibold bg-white dark:bg-slate-900"
              >
                Track Your Repair
              </Button>
            </div>

            {/* Social Trust Indicators */}
            <div className="mt-8 pt-6 border-t border-surface-100 dark:border-slate-800 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                Verified shops
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                Doorstep pickup
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                100% Free tracking
              </span>
            </div>
          </div>

          {/* ── Right Column: Interactive Status Visual (5 cols) ─ */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-sm">
              {/* Main repair card */}
              <RepairStatusCard />

              {/* Floating Stat Chip 1 (Top right) */}
              <div className="absolute -top-4 -right-2 sm:-right-4 hidden sm:block">
                <MiniStatCard
                  icon={ShieldCheck}
                  label="Verified Shops"
                  value="100% Reg."
                  color="bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400"
                />
              </div>

              {/* Floating Stat Chip 2 (Bottom left) */}
              <div className="absolute -bottom-4 -left-2 sm:-left-4 hidden sm:block">
                <MiniStatCard
                  icon={Clock}
                  label="Avg. Turnaround"
                  value="Same Day – 2d"
                  color="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
