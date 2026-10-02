// ─────────────────────────────────────────────────────────────
// RepairTrack — Final CTA Section
// ─────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { ROUTES } from '../../constants';

export default function FinalCTA() {
  return (
    <section className="py-16 md:py-20 bg-primary-600 dark:bg-primary-700/90 relative overflow-hidden transition-colors duration-200" aria-label="Call to action">
      {/* Subtle ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-0 right-1/4 h-80 w-80 rounded-full bg-primary-500/50 blur-3xl" />
        <div className="absolute -bottom-20 left-1/4 h-80 w-80 rounded-full bg-primary-700/50 blur-3xl" />
      </div>

      <div className="page-container relative text-center max-w-3xl mx-auto">
        {/* Heading */}
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
          Ready to get your repair moving?
        </h2>
        <p className="text-primary-100 text-base sm:text-lg max-w-xl mx-auto mb-9 leading-relaxed">
          Find a verified nearby repair shop or track your ongoing repair in seconds.
          No upfront cost, no complications.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            to={ROUTES.SHOPS}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-white text-primary-700 font-bold text-sm sm:text-base shadow-sm hover:bg-primary-50 hover:text-primary-800 active:bg-primary-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600"
          >
            <span>Find a Repair Shop</span>
            <ArrowRight size={18} className="text-current" />
          </Link>
          <Link
            to={ROUTES.TRACK}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl border-2 border-primary-400 text-white font-bold text-sm sm:text-base hover:bg-primary-700/50 hover:text-white active:bg-primary-700 active:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600"
          >
            <MapPin size={18} className="text-current" />
            <span>Track Your Repair</span>
          </Link>
        </div>

        {/* Supporting note + shop owner entry point */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-primary-200">
          <p>Free public access. No account required to search shops or check repair status.</p>
          <span className="hidden sm:inline text-primary-400">·</span>
          <Link
            to={ROUTES.REGISTER_SHOP}
            className="text-white font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
          >
            Own a repair shop? Register here →
          </Link>
        </div>
      </div>
    </section>
  );
}
