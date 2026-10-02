// ─────────────────────────────────────────────────────────────
// RepairTrack — Location Selector Component
// Mock UI for filtering shops by service area.
// ─────────────────────────────────────────────────────────────

import { MapPin, Navigation, X, Check } from 'lucide-react';
import { MOCK_LOCATIONS } from '../../constants/mockShops';
import { cn } from '../../utils';

export default function LocationSelector({
  selectedLocation,
  onLocationChange,
  locations = MOCK_LOCATIONS,
  className,
}) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 transition-colors duration-200',
        className
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* ── Left label & prompt ───────────────────────── */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex-center h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-800/40 shrink-0">
            <MapPin size={20} className="text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="location-select"
                className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider"
              >
                Choose your location
              </label>
              {selectedLocation && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800/50">
                  <Check size={11} strokeWidth={3} />
                  {selectedLocation}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select your city to view shops offering local pickup and repair services.
            </p>
          </div>
        </div>

        {/* ── Right dropdown selector ───────────────────── */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-full sm:w-56">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
              <Navigation size={15} />
            </span>
            <select
              id="location-select"
              value={selectedLocation}
              onChange={(e) => onLocationChange(e.target.value)}
              aria-label="Filter shops by location"
              className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-surface-300 dark:border-slate-700 bg-surface-50/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-800 text-sm font-medium text-slate-800 dark:text-slate-200
                         focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                         hover:border-surface-400 dark:hover:border-slate-600 transition-colors appearance-none cursor-pointer"
            >
              <option value="" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">All Locations (Browse All)</option>
              {locations.map((loc) => (
                <option key={loc} value={loc} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {loc}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-slate-500 text-xs">
              ▼
            </span>
          </div>

          {selectedLocation && (
            <button
              type="button"
              onClick={() => onLocationChange('')}
              title="Clear selected location"
              className="flex-center h-10 w-10 rounded-xl border border-surface-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-surface-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              aria-label="Clear location filter"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Quick-select location pills ────────────────── */}
      <div className="mt-3.5 pt-3 border-t border-surface-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-slate-400 dark:text-slate-500 font-medium mr-1 text-2xs uppercase tracking-wider">
          Quick select:
        </span>
        <button
          type="button"
          onClick={() => onLocationChange('')}
          className={cn(
            'px-2.5 py-1 rounded-lg font-medium transition-colors text-2xs',
            !selectedLocation
              ? 'bg-primary-600 text-white hover:bg-primary-700 hover:text-white font-semibold'
              : 'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-surface-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
          )}
        >
          All Locations
        </button>
        {locations.map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => onLocationChange(loc)}
            className={cn(
              'px-2.5 py-1 rounded-lg font-medium transition-colors text-2xs',
              selectedLocation === loc
                ? 'bg-primary-600 text-white hover:bg-primary-700 hover:text-white font-semibold shadow-xs'
                : 'bg-surface-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-surface-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
            )}
          >
            {loc}
          </button>
        ))}
      </div>
    </div>
  );
}
