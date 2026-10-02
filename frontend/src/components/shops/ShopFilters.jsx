// ─────────────────────────────────────────────────────────────
// RepairTrack — Shop Filters Component
// Search input and category filter buttons.
// ─────────────────────────────────────────────────────────────

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../../utils';

export const SHOP_CATEGORIES = [
  { id: 'All',        label: 'All Devices' },
  { id: 'Mobile',     label: 'Mobile & Tablet' },
  { id: 'Laptop',     label: 'Laptop & Computer' },
  { id: 'TV',         label: 'TV & Display' },
  { id: 'Appliances', label: 'Home Appliances' },
];

export default function ShopFilters({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  className,
}) {
  return (
    <div className={cn('space-y-3.5', className)}>
      {/* ── Search Input Bar ────────────────────────────── */}
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
          <Search size={18} />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by shop name, device model, service (e.g. screen, battery, fan)..."
          aria-label="Search repair shops"
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-surface-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
                     focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 hover:border-surface-300 dark:hover:border-slate-600 transition-colors shadow-xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Clear search input"
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Category Filter Pills ───────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
          Category:
        </span>
        {SHOP_CATEGORIES.map((cat) => {
          const isSelected = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all duration-150 border',
                isSelected
                  ? 'bg-primary-600 text-white hover:bg-primary-700 hover:text-white border-primary-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-surface-200 dark:border-slate-700 hover:border-surface-300 dark:hover:border-slate-600 hover:bg-surface-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
