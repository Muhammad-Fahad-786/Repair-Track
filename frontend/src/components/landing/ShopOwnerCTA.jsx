// ─────────────────────────────────────────────────────────────
// RepairTrack — Shop Owner Homepage CTA Section
// Cohesive light theme matching the RepairTrack design system.
// ─────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom';
import {
  Store, ChevronRight, ShieldCheck,
  TrendingUp, Users, ArrowRight, Wrench, Package
} from 'lucide-react';
import { ROUTES } from '../../constants';

export default function ShopOwnerCTA() {
  const featureBadges = [
    {
      title: 'Digital Job Cards',
      desc: 'Create, update, and manage repairs with real-time customer status sync.',
      icon: Wrench,
    },
    {
      title: 'Doorstep Pickups',
      desc: 'Receive pickup requests directly from customers in your service areas.',
      icon: Package,
    },
    {
      title: 'Verified Badge',
      desc: 'Build customer trust and expand your local visibility across your city.',
      icon: ShieldCheck,
    },
    {
      title: 'Real-time Customer Tracking',
      desc: 'Automate tracking milestones and notify customers when devices are ready.',
      icon: TrendingUp,
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-white dark:bg-slate-950 border-t border-surface-200 dark:border-slate-800/80 relative transition-colors duration-200" aria-label="For shop owners">
      <div className="page-container max-w-5xl mx-auto">
        <div className="bg-surface-50 dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-xs transition-colors duration-200">
          {/* Header */}
          <div className="max-w-2xl mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/50 border border-primary-200 dark:border-primary-800/50 text-primary-700 dark:text-primary-300 text-xs font-semibold mb-3">
              <Store size={14} />
              <span>For Local Repair Businesses</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight mb-2">
              Own a Repair Shop?
            </h2>

            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg leading-relaxed">
              Join RepairTrack to manage pickups, repairs, customers, and your shop digitally.
            </p>
          </div>

          {/* 4 Feature Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {featureBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.title}
                  className="bg-white dark:bg-slate-800/80 border border-surface-200 dark:border-slate-700/70 rounded-2xl p-4 shadow-2xs hover:border-primary-200 dark:hover:border-primary-800/70 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="h-9 w-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-800/40 flex items-center justify-center mb-3">
                      <Icon size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{badge.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{badge.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Call to Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <Link
              to={ROUTES.REGISTER_SHOP}
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-primary-600 text-white font-bold text-sm shadow-xs hover:bg-primary-700 active:bg-primary-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <span>Register Your Shop</span>
              <ChevronRight size={16} />
            </Link>

            <Link
              to={ROUTES.SHOP_OWNER_LOGIN}
              className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1.5 transition-colors py-2"
            >
              <span>Already registered? Shop Owner Login</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
