// ─────────────────────────────────────────────────────────────
// RepairTrack — Dedicated Shop Discovery Page (/shops)
// Location-based shop search, category filters, and real API shop directory.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Store, ChevronRight, RotateCcw, X, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { ROUTES } from '../constants';
import { MOCK_LOCATIONS } from '../constants/mockShops';
import { getShops } from '../services/shopService';
import ShopCard from '../components/landing/ShopCard';
import LocationSelector from '../components/shops/LocationSelector';
import ShopFilters from '../components/shops/ShopFilters';
import ShopEmptyState from '../components/shops/ShopEmptyState';
import Button from '../components/ui/Button';

// ─── Skeleton Card for Loading State ──────────────────────────
function ShopCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-surface-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 animate-pulse flex flex-col h-72">
      <div className="flex items-start gap-3.5 mb-4">
        <div className="h-12 w-12 rounded-xl bg-surface-200 dark:bg-slate-800 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-surface-200 dark:bg-slate-800 rounded w-3/4" />
          <div className="h-3 bg-surface-200 dark:bg-slate-800 rounded w-1/2" />
        </div>
      </div>
      <div className="h-3 bg-surface-200 dark:bg-slate-800 rounded w-1/3 mb-4" />
      <div className="space-y-2 mb-4 flex-1">
        <div className="h-3 bg-surface-200 dark:bg-slate-800 rounded w-full" />
        <div className="h-3 bg-surface-200 dark:bg-slate-800 rounded w-4/5" />
      </div>
      <div className="h-9 bg-surface-200 dark:bg-slate-800 rounded-lg w-full mt-auto" />
    </div>
  );
}

export default function ShopsPage() {
  const [shops, setShops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedLocation, setSelectedLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Fetch real approved shops from backend API
  const fetchShops = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getShops();
      setShops(data);
    } catch (err) {
      console.error('Failed to load shops from API:', err);
      setError('Unable to load shops right now. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  // Public discovery displays approved, active shops
  const availableShops = useMemo(() => {
    return (shops || []).filter((s) => s.status !== 'INACTIVE');
  }, [shops]);

  // Dynamically build available locations list from demo cities + all active shops
  const availableLocations = useMemo(() => {
    const locSet = new Set(MOCK_LOCATIONS);

    availableShops.forEach((shop) => {
      if (shop.city && typeof shop.city === 'string') {
        locSet.add(shop.city.trim());
      }
      if (shop.location && typeof shop.location === 'string') {
        const parts = shop.location.split(',').map((p) => p.trim());
        const cityCandidate = parts[parts.length - 1];
        if (cityCandidate) locSet.add(cityCandidate);
      }
      if (Array.isArray(shop.serviceAreas)) {
        shop.serviceAreas.forEach((area) => {
          if (area && typeof area === 'string') locSet.add(area.trim());
        });
      }
    });

    return Array.from(locSet).filter(Boolean).sort();
  }, [availableShops]);

  // Multi-criteria client-side filtering (Location + Category + Search)
  const filteredShops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const locLower = selectedLocation.trim().toLowerCase();

    return availableShops.filter((shop) => {
      // 1. Location filter based on shop.serviceAreas, shop.city, or shop.location
      const matchesLocation =
        !locLower ||
        (Array.isArray(shop.serviceAreas) &&
          shop.serviceAreas.some((area) => area && area.toLowerCase() === locLower)) ||
        (shop.city && shop.city.toLowerCase() === locLower) ||
        (shop.location && shop.location.toLowerCase().includes(locLower));

      // 2. Category filter
      let matchesCategory = true;
      if (selectedCategory !== 'All') {
        const catKey = selectedCategory.toLowerCase();
        matchesCategory = (shop.category || '').toLowerCase().includes(catKey);
      }

      // 3. Search query filter
      const matchesSearch =
        !q ||
        (shop.name || '').toLowerCase().includes(q) ||
        (shop.category || '').toLowerCase().includes(q) ||
        (shop.city && shop.city.toLowerCase().includes(q)) ||
        (shop.location && shop.location.toLowerCase().includes(q)) ||
        (Array.isArray(shop.serviceAreas) &&
          shop.serviceAreas.some((a) => a && a.toLowerCase().includes(q))) ||
        (Array.isArray(shop.tags) && shop.tags.some((t) => t && t.toLowerCase().includes(q))) ||
        (Array.isArray(shop.services) &&
          shop.services.some((s) => ((s && s.name) || s || '').toLowerCase().includes(q)));

      return matchesLocation && matchesCategory && matchesSearch;
    });
  }, [availableShops, selectedLocation, selectedCategory, searchQuery]);

  // Check if location alone resulted in 0 shops
  const shopsForLocationOnly = useMemo(() => {
    if (!selectedLocation) return availableShops;
    const locLower = selectedLocation.trim().toLowerCase();
    return availableShops.filter(
      (s) =>
        (Array.isArray(s.serviceAreas) &&
          s.serviceAreas.some((area) => area && area.toLowerCase() === locLower)) ||
        (s.city && s.city.toLowerCase() === locLower) ||
        (s.location && s.location.toLowerCase().includes(locLower))
    );
  }, [availableShops, selectedLocation]);

  const handleResetAll = () => {
    setSelectedLocation('');
    setSearchQuery('');
    setSelectedCategory('All');
  };

  const hasActiveFilters = Boolean(selectedLocation || searchQuery || selectedCategory !== 'All');

  // Determine empty state classification
  const emptyStateType =
    selectedLocation && shopsForLocationOnly.length === 0
      ? 'location'
      : 'query';

  return (
    <div className="bg-surface-50 dark:bg-slate-950 min-h-screen pb-20 transition-colors duration-200">
      {/* ── Breadcrumbs ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border-b border-surface-200 dark:border-slate-800 transition-colors duration-200">
        <div className="page-container py-3">
          <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
            <Link to={ROUTES.HOME} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              Home
            </Link>
            <ChevronRight size={13} className="text-slate-400 dark:text-slate-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Repair Shops</span>
          </nav>
        </div>
      </div>

      {/* ── Page Header ─────────────────────────────────────── */}
      <section className="bg-white dark:bg-slate-900/60 border-b border-surface-200 dark:border-slate-800 py-10 md:py-14 transition-colors duration-200">
        <div className="page-container">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800/40 mb-3.5">
              <Store size={14} />
              <span>Verified Repair Marketplace</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-3">
              Find a Repair Shop Near You
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg leading-relaxed">
              Choose your location to find repair shops available for pickup and repair services in your area.
              Filter by device type or search directly by problem description.
            </p>
          </div>
        </div>
      </section>

      {/* ── Main Discovery Section ───────────────────────────── */}
      <div className="page-container py-8 md:py-10 space-y-7">

        {/* ── 1. Location Selector (Prominent top filter) ────── */}
        <LocationSelector
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          locations={availableLocations}
        />

        {/* ── 2. Search & Category Filters ───────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs transition-colors duration-200">
          <ShopFilters
            query={searchQuery}
            onQueryChange={setSearchQuery}
            category={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </div>

        {/* ── 3. Results Summary Bar ──────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {isLoading ? (
                'Loading repair shops…'
              ) : filteredShops.length === 1 ? (
                '1 repair shop available'
              ) : (
                `${filteredShops.length} repair shops available`
              )}
              {selectedLocation && !isLoading && (
                <span className="text-primary-600 dark:text-primary-400 font-semibold ml-1">
                  for {selectedLocation}
                </span>
              )}
            </h2>

            {/* Active filter badge chips */}
            {selectedLocation && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800/50">
                <MapPin size={11} />
                {selectedLocation}
                <button
                  type="button"
                  onClick={() => setSelectedLocation('')}
                  className="hover:text-primary-900 dark:hover:text-primary-100 ml-0.5"
                  aria-label="Remove location filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedCategory !== 'All' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-surface-200 dark:border-slate-700">
                Category: {selectedCategory}
                <button
                  type="button"
                  onClick={() => setSelectedCategory('All')}
                  className="hover:text-slate-900 dark:hover:text-slate-100 ml-0.5"
                  aria-label="Remove category filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-surface-200 dark:border-slate-700">
                "{searchQuery}"
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-slate-900 dark:hover:text-slate-100 ml-0.5"
                  aria-label="Remove search query"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>

          {/* Reset button if any filter is active */}
          {hasActiveFilters && !isLoading && (
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 self-start sm:self-auto transition-colors"
            >
              <RotateCcw size={13} />
              <span>Reset all filters</span>
            </button>
          )}
        </div>

        {/* ── 4. Shop Content: Loading / Error / Grid / Empty ─── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <ShopCardSkeleton />
            <ShopCardSkeleton />
            <ShopCardSkeleton />
          </div>
        ) : error ? (
          <div className="col-span-full py-12 px-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-xs max-w-lg mx-auto">
            <div className="flex-center h-14 w-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/50 mx-auto mb-4">
              <AlertCircle size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Unable to load shops
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              {error}
            </p>
            <Button
              onClick={fetchShops}
              variant="primary"
              size="md"
              leftIcon={<RefreshCw size={15} />}
            >
              Try Again
            </Button>
          </div>
        ) : filteredShops.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1">
            <ShopEmptyState
              type={emptyStateType}
              selectedLocation={selectedLocation}
              query={searchQuery}
              onClearLocation={() => setSelectedLocation('')}
              onResetAll={handleResetAll}
            />
          </div>
        )}

      </div>
    </div>
  );
}
