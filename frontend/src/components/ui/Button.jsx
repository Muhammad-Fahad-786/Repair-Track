// ─────────────────────────────────────────────────────────────
// RepairTrack — Button Component
// ─────────────────────────────────────────────────────────────

import { cn } from '../../utils';
import Spinner from './Spinner';

// ─── Variant Styles ───────────────────────────────────────────
const variantStyles = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 hover:text-white focus-visible:text-white active:bg-primary-800 active:text-white shadow-sm',
  secondary:
    'bg-surface-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-surface-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white active:bg-surface-300 dark:active:bg-slate-600 active:text-slate-900 dark:active:text-white border border-surface-200 dark:border-slate-700',
  outline:
    'bg-transparent text-primary-600 dark:text-primary-400 border border-primary-600 dark:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-700 dark:hover:text-primary-300 active:bg-primary-100 dark:active:bg-primary-900/40 active:text-primary-800 dark:active:text-primary-200',
  danger:
    'bg-danger-600 text-white hover:bg-danger-700 hover:text-white active:bg-danger-800 active:text-white shadow-sm',
  ghost:
    'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:bg-surface-200 dark:active:bg-slate-700 active:text-slate-900 dark:active:text-white',
  success:
    'bg-success-600 text-white hover:bg-success-700 hover:text-white active:bg-success-700 active:text-white shadow-sm',
};

// ─── Size Styles ──────────────────────────────────────────────
const sizeStyles = {
  xs:   'h-7  px-2.5 text-xs  gap-1',
  sm:   'h-8  px-3   text-sm  gap-1.5',
  md:   'h-10 px-4   text-sm  gap-2',
  lg:   'h-11 px-5   text-base gap-2',
  xl:   'h-12 px-6   text-base gap-2.5',
  icon: 'h-10 w-10   text-sm',
};

// ─── Shared class builder ─────────────────────────────────────
function buildClassName({ variant, size, isDisabled, fullWidth, className }) {
  return cn(
    'inline-flex items-center justify-center font-medium rounded-lg',
    'transition-all duration-150 ease-smooth',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
    'select-none',
    variantStyles[variant],
    sizeStyles[size],
    isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
    fullWidth   && 'w-full',
    className
  );
}

// ─── Component ────────────────────────────────────────────────
/**
 * Primary Button component for RepairTrack.
 *
 * Supports polymorphic `as` prop — pass a React Router <Link> or any element.
 * When `as` is provided, renders as that component (no loading/disabled states applied).
 *
 * @param {'primary'|'secondary'|'outline'|'danger'|'ghost'|'success'} variant
 * @param {'sm'|'md'|'lg'|'xl'|'icon'} size
 * @param {boolean} loading  — Shows spinner, disables interaction
 * @param {boolean} disabled
 * @param {boolean} fullWidth
 * @param {React.ElementType} as — Polymorphic element (e.g. Link from react-router-dom)
 * @param {React.ReactNode} leftIcon  — Icon before label
 * @param {React.ReactNode} rightIcon — Icon after label
 */
export default function Button({
  children,
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  disabled  = false,
  fullWidth = false,
  as:       Component,
  leftIcon,
  rightIcon,
  className,
  type = 'button',
  ...props
}) {
  const isDisabled = disabled || loading;
  const sharedClassName = buildClassName({ variant, size, isDisabled, fullWidth, className });

  // ── Polymorphic render (Link, anchor, etc.) ─────────────────
  if (Component) {
    return (
      <Component className={sharedClassName} {...props}>
        {leftIcon  && <span className="shrink-0 text-current flex items-center">{leftIcon}</span>}
        {children  && (
          <span className={size === 'icon' ? 'sr-only' : 'text-current'}>{children}</span>
        )}
        {rightIcon && <span className="shrink-0 text-current flex items-center">{rightIcon}</span>}
      </Component>
    );
  }

  // ── Standard button ─────────────────────────────────────────
  return (
    <button
      type={type}
      disabled={isDisabled}
      className={sharedClassName}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" className="text-current" />
      ) : (
        leftIcon && <span className="shrink-0 text-current flex items-center">{leftIcon}</span>
      )}

      {children && (
        <span className={size === 'icon' ? 'sr-only' : 'text-current'}>{children}</span>
      )}

      {!loading && rightIcon && (
        <span className="shrink-0 text-current flex items-center">{rightIcon}</span>
      )}
    </button>
  );
}
