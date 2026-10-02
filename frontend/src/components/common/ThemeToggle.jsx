// ─────────────────────────────────────────────────────────────
// RepairTrack — Theme Toggle Component
// Accessible toggle button for Dark and Light themes.
// ─────────────────────────────────────────────────────────────

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils';

export default function ThemeToggle({ className, showLabel = false }) {
  const { isDark, toggleTheme } = useTheme();

  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex items-center justify-center rounded-lg transition-colors duration-200 select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        showLabel
          ? 'px-3 py-2 text-sm font-medium gap-2 text-slate-700 dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-slate-800 w-full justify-start'
          : 'h-9 w-9 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-slate-800',
        className
      )}
      aria-label={label}
      title={label}
    >
      <span className="flex items-center justify-center shrink-0">
        {isDark ? (
          <Sun size={18} className="text-amber-400 transition-transform duration-200 rotate-0 hover:rotate-45" />
        ) : (
          <Moon size={18} className="text-slate-600 hover:text-primary-600 transition-transform duration-200" />
        )}
      </span>

      {showLabel && (
        <span className="text-sm font-medium">
          {isDark ? 'Light Theme' : 'Dark Theme'}
        </span>
      )}
    </button>
  );
}
