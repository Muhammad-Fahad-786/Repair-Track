// ─────────────────────────────────────────────────────────────
// RepairTrack — Shop Discovery Section
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Store, X } from 'lucide-react';
import { MOCK_SHOPS } from '../../constants/mockShops';
import ShopCard from './ShopCard';

// ─── Category filter options ──────────────────────────────────
const CATEGORIES = [
  'All',
  'Laptop & Computer',
  'Mobile & Tablet',
  'Home Appliance',
  'TV & Display',
];

// ─── Empty State ─────────────────────────────────────────────
function EmptyState({ query, onReset }) {
  return (
    <div className="col-span-full flex flex-col items-center py-16 px-4 text-center bg-surface-50 dark:bg-slate-900 rounded-2xl border border-dashed border-surface-300 dark:border-slate-800 transition-colors duration-200">
      <div className="flex-center h-14 w-14 rounded-2xl bg-white dark:bg-slate-800 border border-surface-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 mb-4 shadow-xs">
        <Store size={28} />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5">No shops match your search</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-5 leading-relaxed">
        {query
          ? `We couldn't find any repair shops matching "${query}". Try searching for laptop, mobile, screen, or another category.`
          : 'No shops available in the selected category. Try switching to "All Categories".'}
      </p>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/40 hover:bg-primary-100 dark:hover:bg-primary-900/50 border border-primary-200 dark:border-primary-800/50 transition-colors"
      >
        Clear filters and show all shops
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function ShopDiscovery() {
  const [query,    setQuery]    = useState('');
  const [category, setCategory] = useState('All');

  // Case-insensitive filtering matching name, category, location, or tags
  const filteredShops = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_SHOPS.filter((shop) => {
      const matchesCategory =
        category === 'All' || shop.category.toLowerCase().startsWith(category.toLowerCase());
      const matchesQuery =
        !q ||
        shop.name.toLowerCase().includes(q) ||
        shop.category.toLowerCase().includes(q) ||
        shop.location.toLowerCase().includes(q) ||
        shop.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  const handleReset = () => {
    setQuery('');
    setCategory('All');
  };

  return (
    <section
      id="find-shops"
      className="py-16 md:py-24 bg-white dark:bg-slate-950 scroll-mt-24 transition-colors duration-200"
      aria-label="Shop Discovery"
    >
      <div className="page-container">

        {/* ── Section Header ──────────────────────────── */}
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-2.5">
            Verified Repair Network
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-3.5">
            Find the right repair shop
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
            Discover verified local repair shops specializing in laptops, smartphones,
            home appliances, and displays. Filter by category or search by location.
          </p>
        </div>

        {/* ── Unified Search + Filter Bar ─────────────── */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5 p-2 bg-surface-50 dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl shadow-xs transition-colors duration-200">
            {/* Search input with clear button */}
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                <Search size={17} />
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by shop name, device, or city..."
                aria-label="Search repair shops"
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-surface-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 hover:border-surface-300 dark:hover:border-slate-600 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Category selector */}
            <div className="relative shrink-0 sm:w-52">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                <SlidersHorizontal size={14} />
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Filter by category"
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-surface-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200
                           focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                           hover:border-surface-300 dark:hover:border-slate-600 transition-colors appearance-none cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">{c === 'All' ? 'All Categories' : c}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-slate-500 text-xs">
                ▼
              </span>
            </div>
          </div>

          {/* Active filter count & quick tag indicators */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-3 px-1">
            <span>
              {filteredShops.length === MOCK_SHOPS.length
                ? `Showing all ${MOCK_SHOPS.length} verified repair shops`
                : `${filteredShops.length} shop${filteredShops.length !== 1 ? 's' : ''} found`}
            </span>
            {(query || category !== 'All') && (
              <button
                onClick={handleReset}
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-semibold"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* ── Shop Grid ───────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredShops.length > 0
            ? filteredShops.map((shop) => <ShopCard key={shop.id} shop={shop} />)
            : <EmptyState query={query} onReset={handleReset} />}
        </div>
      </div>
    </section>
  );
}
