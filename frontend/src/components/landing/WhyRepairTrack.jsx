// ─────────────────────────────────────────────────────────────
// RepairTrack — Why RepairTrack Section
// ─────────────────────────────────────────────────────────────

import { Eye, Truck, Store, Hash } from 'lucide-react';

const BENEFITS = [
  {
    icon:  Eye,
    title: 'Transparent Updates',
    desc:  'Know exactly what stage your repair is in. Every status change, note, and diagnosis is visible to you.',
    color: 'text-primary-600 dark:text-primary-400',
    bg:    'bg-primary-50 dark:bg-primary-950/40',
    border:'border-primary-100 dark:border-primary-800/40',
  },
  {
    icon:  Truck,
    title: 'Convenient Doorstep Pickup',
    desc:  'Request pickup directly from verified shops in your city without having to travel or wait in line.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg:    'bg-emerald-50 dark:bg-emerald-950/40',
    border:'border-emerald-100 dark:border-emerald-800/40',
  },
  {
    icon:  Store,
    title: 'Verified Local Specialists',
    desc:  'Discover authenticated repair businesses with verified customer reviews, clear specialties, and warranties.',
    color: 'text-sky-600 dark:text-sky-400',
    bg:    'bg-sky-50 dark:bg-sky-950/40',
    border:'border-sky-100 dark:border-sky-800/40',
  },
  {
    icon:  Hash,
    title: 'Single Repair ID',
    desc:  'One readable Repair ID is all you need to track your repair, verify status, and approve costs anytime.',
    color: 'text-amber-600 dark:text-amber-400',
    bg:    'bg-amber-50 dark:bg-amber-950/40',
    border:'border-amber-100 dark:border-amber-800/40',
  },
];

export default function WhyRepairTrack() {
  return (
    <section className="py-16 md:py-24 bg-white dark:bg-slate-950 border-b border-surface-200 dark:border-slate-800/80 transition-colors duration-200" aria-label="Why choose RepairTrack">
      <div className="page-container">

        {/* ── Section Header ──────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-2.5">
            Platform Benefits
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-3.5">
            Everything repair, in one place
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
            RepairTrack bridges the gap between device owners and local repair businesses
            through transparency, digital tracking, and reliable pickups.
          </p>
        </div>

        {/* ── Benefits Grid ────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {BENEFITS.map(({ icon: Icon, title, desc, color, bg, border }) => (
            <div
              key={title}
              className="flex items-start gap-4 p-6 bg-surface-50/70 dark:bg-slate-900/60 rounded-2xl border border-surface-200 dark:border-slate-800 hover:border-surface-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm transition-all duration-150"
            >
              <div className={`flex-center h-12 w-12 rounded-xl shrink-0 border ${bg} ${border}`}>
                <Icon size={22} className={color} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5">{title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
