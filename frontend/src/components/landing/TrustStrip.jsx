// ─────────────────────────────────────────────────────────────
// RepairTrack — Trust / Value Strip
// ─────────────────────────────────────────────────────────────

import { ShieldCheck, Truck, Activity, Bell } from 'lucide-react';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Verified Repair Shops',
    desc:  'Every registered shop is verified for quality and reliability.',
    color: 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border-primary-100 dark:border-primary-800',
  },
  {
    icon: Truck,
    title: 'Doorstep Device Pickup',
    desc:  'Request pickup from home without having to visit the shop.',
    color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
  },
  {
    icon: Activity,
    title: 'Live Repair Tracking',
    desc:  'Real-time status updates from diagnosis to device ready.',
    color: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-800',
  },
  {
    icon: Bell,
    title: 'Transparent Pricing',
    desc:  'Review estimated costs and approve repairs directly online.',
    color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800',
  },
];

export default function TrustStrip() {
  return (
    <section className="bg-surface-50 dark:bg-slate-900/60 border-y border-surface-200 dark:border-slate-800 py-8 md:py-10">
      <div className="page-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="flex items-start gap-3.5">
              <div className={`flex-center h-10 w-10 rounded-xl border shrink-0 ${color}`}>
                <Icon size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">{title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
