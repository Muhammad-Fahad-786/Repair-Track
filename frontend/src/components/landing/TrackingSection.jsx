// ─────────────────────────────────────────────────────────────
// RepairTrack — Repair Tracking Section
// ─────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight, Cpu, ShieldCheck } from 'lucide-react';
import Button from '../ui/Button';
import { ROUTES } from '../../constants';

// ─── Mock Tracking Interface Card ─────────────────────────────
function TrackingCard() {
  const timeline = [
    { label: 'Received at Workshop', time: 'Sep 18, 10:30 AM', done: true  },
    { label: 'Initial Diagnosis',    time: 'Sep 18, 2:15 PM',  done: true  },
    { label: 'Hardware Repairing',   time: 'Sep 19, 9:00 AM',  done: false, active: true },
    { label: 'Quality Testing & QA', time: 'Estimated 3:00 PM',done: false },
    { label: 'Ready for Pickup',     time: 'Estimated Sep 20', done: false },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-card overflow-hidden w-full max-w-sm transition-colors duration-200">
      {/* Top indicator bar */}
      <div className="h-1 bg-primary-600" />

      <div className="p-5 sm:p-6">
        {/* Repair ID header */}
        <div className="flex items-center justify-between gap-2 mb-4 pb-3.5 border-b border-surface-100 dark:border-slate-800">
          <div>
            <p className="text-2xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">Unique Repair ID</p>
            <p className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 tracking-wide mt-0.5">RT-SH001-X7K92</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800/50">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-600 animate-pulse" />
            In Progress
          </span>
        </div>

        {/* Device & Shop info */}
        <div className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-slate-800/60 rounded-xl mb-4 border border-surface-100 dark:border-slate-700/60">
          <div className="flex-center h-10 w-10 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 shrink-0 border border-primary-100 dark:border-primary-800/40">
            <Cpu size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">Dell Inspiron 15 3511</p>
            <p className="text-2xs text-slate-500 dark:text-slate-400 truncate">Shop: Khan Laptop Care</p>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="space-y-1 mb-4">
          {timeline.map((step, i) => (
            <div key={step.label} className="flex items-start gap-3">
              <div className="flex flex-col items-center mt-0.5 shrink-0">
                {step.done ? (
                  <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-500 text-white" strokeWidth={2} />
                ) : step.active ? (
                  <div className="h-4 w-4 rounded-full border-2 border-primary-600 bg-primary-600 flex-center shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </div>
                ) : (
                  <Circle size={16} className="text-slate-200 dark:text-slate-700" />
                )}
                {i < timeline.length - 1 && (
                  <div className={`w-px h-3.5 my-0.5 ${step.done ? 'bg-emerald-200 dark:bg-emerald-800' : 'bg-surface-200 dark:bg-slate-700'}`} />
                )}
              </div>
              <div className="pb-1 flex-1 flex items-start justify-between min-w-0">
                <span className={`text-xs font-semibold truncate ${step.done ? 'text-emerald-700 dark:text-emerald-400' : step.active ? 'text-primary-700 dark:text-primary-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                  {step.label}
                </span>
                <span className="text-2xs text-slate-400 dark:text-slate-500 shrink-0 ml-2 font-mono">{step.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Cost & Remote Approval */}
        <div className="flex items-center justify-between pt-3.5 border-t border-surface-100 dark:border-slate-800">
          <div>
            <p className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Estimated Cost</p>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">₹2,500</p>
          </div>
          <span className="text-2xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2.5 py-1 rounded-full">
            Cost Approved ✓
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function TrackingSection() {
  return (
    <section className="py-16 md:py-24 bg-surface-50 dark:bg-slate-900/50 border-b border-surface-200 dark:border-slate-800/80 transition-colors duration-200">
      <div className="page-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">

          {/* ── Copy (Left, 7 cols) ────────────────────── */}
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-2.5">
              Live Progress Tracking
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-4 leading-[1.2]">
              Always know what's happening
              <br />
              <span className="text-primary-600 dark:text-primary-400">with your repair.</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-6 max-w-xl">
              No more wondering or calling for updates. Every repair receives a unique Repair ID
              that gives you real-time visibility into technician notes, repair stages, and estimated costs.
            </p>

            <ul className="space-y-3 mb-8 max-w-md">
              {[
                'Track repair status anytime with a single Repair ID',
                'Transparent cost estimation with online approval',
                'Real-time notes added directly by the assigned technician',
                'Instant notification when your device is ready for return',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle2 size={17} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Button
              as={Link}
              to={ROUTES.TRACK}
              size="lg"
              rightIcon={<ArrowRight size={18} />}
              className="font-semibold shadow-sm"
            >
              Track Your Repair Now
            </Button>
          </div>

          {/* ── Visual (Right, 5 cols) ─────────────────── */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-sm">
              <TrackingCard />
              {/* Decorative back panel */}
              <div
                aria-hidden="true"
                className="absolute -bottom-3 -left-3 h-full w-full rounded-2xl bg-primary-50/70 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 -z-10"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
