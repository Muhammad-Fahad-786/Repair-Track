// ─────────────────────────────────────────────────────────────
// RepairTrack — Shop Owner Customers Page
// Route: /shop-owner/customers
// ─────────────────────────────────────────────────────────────

import { Users, Mail, Phone, Wrench, Package } from 'lucide-react';
import { MOCK_CUSTOMERS, MOCK_REPAIRS, MOCK_PICKUPS } from '../../constants/mockData';

export default function ShopCustomersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Users size={22} className="text-primary-600 dark:text-primary-400" /> Customers
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">All customers who have interacted with your shop.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-4 px-5 py-3 bg-surface-50 dark:bg-slate-800/80 border-b border-surface-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <span>Customer</span>
          <span>Contact</span>
          <span className="text-center">Repairs</span>
          <span className="text-center">Pickups</span>
        </div>

        {/* Rows */}
        {MOCK_CUSTOMERS.map((c) => {
          const repairCount = MOCK_REPAIRS.filter((r) => r.customerId === c.id).length;
          const pickupCount = MOCK_PICKUPS.filter((p) => p.customerId === c.id).length;
          return (
            <div key={c.id} className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 px-5 py-4 border-b border-surface-100 dark:border-slate-800 last:border-0 hover:bg-surface-50 dark:hover:bg-slate-800 transition-colors">
              {/* Name + avatar */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-950/60 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-sm shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{c.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{c.city}</p>
                </div>
              </div>
              {/* Contact */}
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                <p className="flex items-center gap-1"><Mail size={11} /> {c.email}</p>
                {c.phone && <p className="flex items-center gap-1"><Phone size={11} /> {c.phone}</p>}
              </div>
              {/* Repairs */}
              <div className="sm:text-center">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-full">
                  <Wrench size={11} /> {repairCount} repair{repairCount !== 1 ? 's' : ''}
                </span>
              </div>
              {/* Pickups */}
              <div className="sm:text-center">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-warning-700 dark:text-amber-300 bg-warning-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full">
                  <Package size={11} /> {pickupCount} pickup{pickupCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
