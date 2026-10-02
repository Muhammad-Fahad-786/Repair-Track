// ─────────────────────────────────────────────────────────────
// RepairTrack — Card Component
// ─────────────────────────────────────────────────────────────

import { cn } from '../../utils';

/**
 * Base card surface with optional header, body, and footer slots.
 *
 * @param {boolean} hoverable — Adds hover shadow transition
 * @param {boolean} bordered  — Adds border (default: true)
 * @param {'sm'|'md'|'lg'|'none'} padding
 */
export default function Card({
  children,
  hoverable = false,
  bordered  = true,
  padding   = 'md',
  className,
  ...props
}) {
  const paddingStyles = {
    none: '',
    sm:   'p-4',
    md:   'p-5',
    lg:   'p-6',
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 rounded-xl shadow-card dark:shadow-none',
        bordered  && 'border border-surface-200 dark:border-slate-800',
        hoverable && 'transition-all duration-200 hover:shadow-card-hover dark:hover:border-slate-700 cursor-pointer',
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Card Sub-components ──────────────────────────────────────
export function CardHeader({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between pb-4 mb-4 border-b border-surface-200 dark:border-slate-800',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }) {
  return (
    <h3
      className={cn('text-base font-semibold text-slate-900 dark:text-white', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardBody({ children, className, ...props }) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between pt-4 mt-4 border-t border-surface-200 dark:border-slate-800',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Stat Card — for dashboard overview panels ─────────────────
/**
 * @param {string}           title
 * @param {string|number}    value
 * @param {React.ReactNode}  icon
 * @param {string}           description — Optional supporting text
 * @param {'primary'|'success'|'warning'|'danger'|'info'} accent
 */
export function StatCard({ title, value, icon, description, accent = 'primary', className }) {
  const accentStyles = {
    primary: 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-800/50',
    success: 'bg-success-50 dark:bg-success-950/60 text-success-600 dark:text-success-400 border border-success-100 dark:border-success-800/50',
    warning: 'bg-warning-50 dark:bg-warning-950/60 text-warning-600 dark:text-warning-400 border border-warning-100 dark:border-warning-800/50',
    danger:  'bg-danger-50  dark:bg-danger-950/60  text-danger-600  dark:text-danger-400  border border-danger-100  dark:border-danger-800/50',
    info:    'bg-info-50    dark:bg-info-950/60    text-info-600    dark:text-info-400    border border-info-100    dark:border-info-800/50',
  };

  return (
    <Card className={cn('', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          {description && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{description}</p>
          )}
        </div>
        {icon && (
          <div className={cn('flex-center h-10 w-10 rounded-lg shrink-0', accentStyles[accent])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
