// ─────────────────────────────────────────────────────────────
// RepairTrack — How It Works Section
// ─────────────────────────────────────────────────────────────

import { Store, Truck, Activity, PackageCheck } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    icon:   Store,
    title:  'Find a Shop',
    desc:   'Browse verified repair shops near you and choose the right specialist for your device problem.',
    color:  'text-primary-600 dark:text-primary-400',
    bg:     'bg-primary-50 dark:bg-primary-950/60',
    border: 'border-primary-200 dark:border-primary-800',
  },
  {
    number: '02',
    icon:   Truck,
    title:  'Request a Pickup',
    desc:   'Describe the issue, set your pickup address, and the shop will collect your device directly.',
    color:  'text-sky-600 dark:text-sky-400',
    bg:     'bg-sky-50 dark:bg-sky-950/60',
    border: 'border-sky-200 dark:border-sky-800',
  },
  {
    number: '03',
    icon:   Activity,
    title:  'Track Your Repair',
    desc:   'Follow status updates, view diagnoses, and approve repair costs online using your Repair ID.',
    color:  'text-amber-600 dark:text-amber-400',
    bg:     'bg-amber-50 dark:bg-amber-950/60',
    border: 'border-amber-200 dark:border-amber-800',
  },
  {
    number: '04',
    icon:   PackageCheck,
    title:  'Get It Back',
    desc:   'Know the moment your device is fully fixed and ready for delivery or convenient store pickup.',
    color:  'text-emerald-600 dark:text-emerald-400',
    bg:     'bg-emerald-50 dark:bg-emerald-950/60',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-16 md:py-24 bg-surface-50 dark:bg-slate-900/60 border-b border-surface-200 dark:border-slate-800 scroll-mt-24"
      aria-label="How it works"
    >
      <div className="page-container">

        {/* ── Section Header ──────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-2.5">
            Step-by-Step Workflow
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3.5">
            How RepairTrack works
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
            From initial problem submission to getting your working device back,
            the entire repair journey is simple, digital, and transparent.
          </p>
        </div>

        {/* ── Steps Grid ───────────────────────────────── */}
        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Connector line — desktop only, cleanly aligned with circle center */}
          <div
            aria-hidden="true"
            className="hidden lg:block absolute top-9 left-[15%] right-[15%] h-0.5 bg-surface-300 dark:bg-slate-700 -z-0"
          />

          {STEPS.map(({ number, icon: Icon, title, desc, color, bg, border }) => (
            <div key={title} className="relative z-10 flex flex-col items-center text-center">
              {/* Step number badge + icon circle */}
              <div className="relative mb-5">
                <div className={`flex-center h-18 w-18 rounded-2xl border-2 ${bg} ${border} shadow-xs`}>
                  <Icon size={30} className={color} strokeWidth={2.2} />
                </div>
                <span
                  className={`absolute -top-2.5 -right-2.5 flex-center h-7 w-7 rounded-full text-xs font-extrabold bg-white dark:bg-slate-800 border-2 ${border} ${color} shadow-xs`}
                >
                  {number}
                </span>
              </div>

              {/* Step Content */}
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
