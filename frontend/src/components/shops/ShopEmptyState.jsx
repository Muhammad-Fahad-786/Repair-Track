// ─────────────────────────────────────────────────────────────
// RepairTrack — Shop Empty State Component
// Distinct empty states for location mismatch vs query mismatch.
// ─────────────────────────────────────────────────────────────

import { MapPinOff, SearchX, RotateCcw } from 'lucide-react';
import Button from '../ui/Button';

export default function ShopEmptyState({
  type = 'general', // 'location' | 'query' | 'general'
  selectedLocation,
  query,
  onClearLocation,
  onResetAll,
}) {
  if (type === 'location') {
    return (
      <div className="col-span-full py-16 px-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-xs max-w-lg mx-auto transition-colors duration-200">
        <div className="flex-center h-16 w-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50 mx-auto mb-4">
          <MapPinOff size={30} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5">
          No repair shops available in {selectedLocation || 'this location'} yet.
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
          We are currently expanding our repair network. Try selecting another city or browse all available registered shops.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Button
            onClick={onClearLocation}
            variant="primary"
            size="md"
            leftIcon={<RotateCcw size={15} />}
          >
            Clear Location
          </Button>
          <Button
            onClick={onResetAll}
            variant="secondary"
            size="md"
          >
            Browse All Shops
          </Button>
        </div>
      </div>
    );
  }

  // Query or combined filters mismatch
  return (
    <div className="col-span-full py-16 px-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-xs max-w-lg mx-auto transition-colors duration-200">
      <div className="flex-center h-16 w-16 rounded-2xl bg-surface-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-surface-200 dark:border-slate-700 mx-auto mb-4">
        <SearchX size={30} />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5">
        No matching repair shops found
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
        {query
          ? `No shops matched your search for "${query}". Try different keywords or reset your filters.`
          : 'No shops match the selected filter criteria. Try adjusting your category or location.'}
      </p>
      <Button
        onClick={onResetAll}
        variant="primary"
        size="md"
        leftIcon={<RotateCcw size={15} />}
      >
        Clear Filters
      </Button>
    </div>
  );
}
