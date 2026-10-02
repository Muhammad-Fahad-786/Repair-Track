// ─────────────────────────────────────────────────────────────
// RepairTrack — Spinner / Loader Component
// ─────────────────────────────────────────────────────────────

import { cn } from '../../utils';

const sizeStyles = {
  xs:  'h-3 w-3 border-[1.5px]',
  sm:  'h-4 w-4 border-2',
  md:  'h-6 w-6 border-2',
  lg:  'h-8 w-8 border-[3px]',
  xl:  'h-12 w-12 border-4',
};

/**
 * Accessible loading spinner.
 *
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} size
 * @param {string} className — Extra Tailwind classes (e.g. color overrides)
 * @param {string} label     — Screen reader label
 */
export default function Spinner({
  size      = 'md',
  className,
  label     = 'Loading…',
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block rounded-full',
        'border-current border-r-transparent',
        'animate-spin',
        sizeStyles[size],
        className
      )}
    />
  );
}

// ─── Full-page loading overlay ────────────────────────────────
export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex-center min-h-screen bg-surface-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" className="text-primary-600 dark:text-primary-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
      </div>
    </div>
  );
}

// ─── Inline section loader ────────────────────────────────────
export function SectionLoader({ label = 'Loading…' }) {
  return (
    <div className="flex-center py-16">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className="text-primary-600 dark:text-primary-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}
