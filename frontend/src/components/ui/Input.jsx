// ─────────────────────────────────────────────────────────────
// RepairTrack — Input Component
// ─────────────────────────────────────────────────────────────

import { forwardRef } from 'react';
import { cn } from '../../utils';

/**
 * Text input with label, helper text, error state, and icon support.
 *
 * @param {string}           label      — Field label
 * @param {string}           error      — Error message (triggers error styles)
 * @param {string}           hint       — Helper text below the input
 * @param {React.ReactNode}  leftIcon   — Icon inside input on the left
 * @param {React.ReactNode}  rightIcon  — Icon inside input on the right
 * @param {boolean}          required   — Shows asterisk on label
 */
const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    required  = false,
    className,
    id,
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && (
            <span className="ml-1 text-danger-500 dark:text-danger-400" aria-hidden="true">*</span>
          )}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative">
        {/* Left icon */}
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
            {leftIcon}
          </span>
        )}

        {/* Input element */}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={cn(
            // Base
            'w-full rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            // Padding — adjust for icons
            leftIcon  ? 'pl-10' : 'pl-3.5',
            rightIcon ? 'pr-10' : 'pr-3.5',
            'py-2.5',
            // State: normal
            !error && [
              'border-surface-300 dark:border-slate-700',
              'focus:border-primary-500 focus:ring-primary-500/20',
              'hover:border-slate-400 dark:hover:border-slate-600',
            ],
            // State: error
            error && [
              'border-danger-500',
              'focus:border-danger-500 focus:ring-danger-500/20',
            ],
            // Disabled
            props.disabled && 'bg-surface-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed',
            className
          )}
          {...props}
        />

        {/* Right icon */}
        {rightIcon && (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-slate-500">
            {rightIcon}
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-xs text-danger-600 dark:text-danger-400 flex items-center gap-1"
        >
          {error}
        </p>
      )}

      {/* Hint text */}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
});

export default Input;

// ─── Textarea variant ─────────────────────────────────────────
export const Textarea = forwardRef(function Textarea(
  { label, error, hint, required = false, rows = 4, className, id, ...props },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {required && <span className="ml-1 text-danger-500 dark:text-danger-400" aria-hidden="true">*</span>}
        </label>
      )}

      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={!!error}
        className={cn(
          'w-full rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-y',
          'transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          !error
            ? 'border-surface-300 dark:border-slate-700 focus:border-primary-500 focus:ring-primary-500/20 hover:border-slate-400 dark:hover:border-slate-600'
            : 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20',
          props.disabled && 'bg-surface-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed',
          className
        )}
        {...props}
      />

      {error && (
        <p role="alert" className="text-xs text-danger-600 dark:text-danger-400">{error}</p>
      )}
      {!error && hint && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
    </div>
  );
});
