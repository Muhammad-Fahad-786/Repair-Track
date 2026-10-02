// ─────────────────────────────────────────────────────────────
// RepairTrack — Badge Component
// ─────────────────────────────────────────────────────────────

import { cn } from '../../utils';

// ─── Variant Styles ───────────────────────────────────────────
const variantStyles = {
  default:  'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-surface-200 dark:border-slate-700',
  primary:  'bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800',
  success:  'bg-success-100 dark:bg-success-950/60 text-success-700 dark:text-success-300 border-success-200 dark:border-success-800',
  warning:  'bg-warning-100 dark:bg-warning-950/60 text-warning-700 dark:text-warning-300 border-warning-200 dark:border-warning-800',
  danger:   'bg-danger-100  dark:bg-danger-950/60  text-danger-700  dark:text-danger-300  border-danger-200  dark:border-danger-800',
  info:     'bg-info-100    dark:bg-info-950/60    text-info-700    dark:text-info-300    border-info-200    dark:border-info-800',
};

// ─── Size Styles ──────────────────────────────────────────────
const sizeStyles = {
  sm: 'px-2 py-0.5 text-2xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

/**
 * Status badge / label pill.
 *
 * @param {'default'|'primary'|'success'|'warning'|'danger'|'info'} variant
 * @param {'sm'|'md'|'lg'} size
 * @param {React.ReactNode} icon — Optional leading icon
 * @param {boolean} dot          — Show a dot indicator instead of text
 */
export default function Badge({
  children,
  variant   = 'default',
  size      = 'md',
  icon,
  className,
  ...props
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full border',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// ─── Dot Badge ────────────────────────────────────────────────
const dotColorStyles = {
  default: 'bg-slate-400',
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger:  'bg-danger-500',
  info:    'bg-info-500',
};

export function DotBadge({ variant = 'default', children, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300', className)}>
      <span
        className={cn(
          'inline-block h-2 w-2 rounded-full',
          dotColorStyles[variant]
        )}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
