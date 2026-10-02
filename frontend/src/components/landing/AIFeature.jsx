// ─────────────────────────────────────────────────────────────
// RepairTrack — AI Feature Callout Section
// ─────────────────────────────────────────────────────────────

import { Sparkles, Flame, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

// ─── AI Analysis Visual Card ──────────────────────────────────
function AIAnalysisCard() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-card dark:shadow-none p-5 sm:p-6 w-full max-w-sm transition-colors duration-200">
      {/* Customer input description */}
      <div className="mb-4">
        <p className="text-2xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
          Customer Reported Issue
        </p>
        <div className="p-3 bg-surface-50 dark:bg-slate-800/70 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed border border-surface-200/80 dark:border-slate-700 italic">
          "Laptop gets extremely hot and shuts down automatically after 10 minutes of use."
        </div>
      </div>

      {/* AI Processing divider */}
      <div className="flex items-center gap-2 my-4">
        <div className="flex-1 h-px bg-surface-200 dark:bg-slate-800" />
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-100 dark:border-primary-800/60 shadow-2xs">
          <Sparkles size={12} className="text-primary-600 dark:text-primary-400" />
          <span className="text-2xs font-bold text-primary-700 dark:text-primary-300">AI Assistance</span>
        </div>
        <div className="flex-1 h-px bg-surface-200 dark:bg-slate-800" />
      </div>

      {/* AI Suggested Output */}
      <div className="space-y-3">
        {/* Category */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-50 dark:bg-slate-800/60 border border-surface-100 dark:border-slate-700/60">
          <div className="flex-center h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50 shrink-0">
            <Flame size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-2xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">Suggested Category</p>
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Overheating / Thermal Management</p>
          </div>
        </div>

        {/* Priority */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-50 dark:bg-slate-800/60 border border-surface-100 dark:border-slate-700/60">
          <div className="flex-center h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/50 shrink-0">
            <AlertTriangle size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-2xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">Urgency Priority</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/50 mt-0.5">
              HIGH PRIORITY
            </span>
          </div>
        </div>

        {/* Technical Summary */}
        <div className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-50 dark:bg-slate-800/60 border border-surface-100 dark:border-slate-700/60">
          <div className="flex-center h-8 w-8 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-800/50 shrink-0 mt-0.5">
            <FileText size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-2xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">Quick Technical Summary</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug mt-0.5">
              Inspect heatsink thermal paste, cooling fan operation, and air exhaust vents for blockages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function AIFeature() {
  return (
    <section className="py-16 md:py-24 bg-surface-50 dark:bg-slate-950 border-b border-surface-200 dark:border-slate-800 transition-colors duration-200" aria-label="AI classification assistance">
      <div className="page-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">

          {/* ── Copy (Left, 7 cols) ────────────────────── */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-1.5 bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-primary-100 dark:border-primary-800 mb-4">
              <Sparkles size={13} />
              <span>Smart Issue Categorization</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4 leading-[1.2]">
              Smarter repair issue classification
            </h2>

            <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed mb-6 max-w-xl">
              When a customer describes a device problem, RepairTrack can assist shop technicians
              by recommending the repair category, estimating priority, and generating a brief diagnostic checklist.
            </p>

            <ul className="space-y-3 mb-6 max-w-md">
              {[
                'Instant categorization from customer-written descriptions',
                'Priority suggestion helps shops triage urgent repairs',
                'Concise technical summaries save diagnosis intake time',
                'Shop owners always maintain complete manual override',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle2 size={17} className="text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-xs text-slate-400 dark:text-slate-500 italic max-w-lg">
              Note: AI is designed as a workflow aid for repair technicians — not an automated replacement for hands-on hardware inspection.
            </p>
          </div>

          {/* ── Visual (Right, 5 cols) ─────────────────── */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-sm">
              <AIAnalysisCard />
              {/* Subtle back decorative frame */}
              <div
                aria-hidden="true"
                className="absolute -bottom-3 -right-3 h-full w-full rounded-2xl bg-primary-50/70 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/50 -z-10"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
