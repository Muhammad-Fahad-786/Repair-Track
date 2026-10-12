// ─────────────────────────────────────────────────────────────
// RepairTrack — Shop Owner My Shop Page
// Route: /shop-owner/shop
// ─────────────────────────────────────────────────────────────

import { Store, MapPin, Clock, Star, Phone, Mail, Globe, Edit2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MOCK_SHOP_OWNER } from '../../constants/mockData';
import Badge from '../../components/ui/Badge';

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-surface-100 dark:border-slate-800 last:border-0">
      <div className="h-8 w-8 rounded-lg bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={14} className="text-primary-600 dark:text-primary-400" />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function MyShopPage() {
  const { user } = useAuth();
  const shop = MOCK_SHOP_OWNER || {};

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Store size={22} className="text-primary-600 dark:text-primary-400" /> My Shop
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Your shop profile as customers see it.</p>
      </div>

      {/* Shop card */}
      <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {/* Hero banner */}
        <div className="h-28 bg-gradient-to-r from-primary-600 to-primary-700 relative">
          <div className="absolute bottom-0 left-5 translate-y-1/2">
            <div className="h-16 w-16 rounded-2xl bg-white dark:bg-slate-800 shadow-card flex items-center justify-center text-primary-600 dark:text-primary-400 border border-transparent dark:border-slate-700">
              <Store size={28} />
            </div>
          </div>
          <div className="absolute top-3 right-3">
            <Badge variant="success">
              <CheckCircle2 size={12} className="mr-1" />
              Approved
            </Badge>
          </div>
        </div>

        <div className="pt-12 px-5 pb-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {user?.shopName || shop.shopName || 'QuickFix Mobile Center'}
          </h2>
          <div className="flex items-center gap-1.5 mt-1">
            <Star size={13} className="text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{shop.rating || '4.7'}</span>
            <span className="text-xs text-slate-400 dark:text-slate-400">({shop.reviewCount || '128'} reviews)</span>
          </div>

          <div className="mt-5">
            <InfoRow icon={MapPin} label="Address"     value={shop.address || '12-B, Sector 18, Noida, UP'} />
            <InfoRow icon={Phone}  label="Phone"       value={shop.phone   || user?.phone || '+91 98222 34567'} />
            <InfoRow icon={Mail}   label="Email"       value={shop.email   || user?.email} />
            <InfoRow icon={Clock}  label="Working Hours" value={shop.hours || 'Mon–Sat: 10:00 AM – 7:00 PM'} />
            <InfoRow icon={Globe}  label="Specialises in" value={(shop.specializations || ['Smartphones', 'Tablets', 'Laptops']).join(', ')} />
          </div>
        </div>
      </div>

      {/* Edit notice */}
      <div className="bg-surface-50 dark:bg-slate-900/60 border border-surface-200 dark:border-slate-800 rounded-xl px-5 py-4 flex items-start gap-3">
        <Edit2 size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Shop profile editing will be available in an upcoming update.
          Contact support to update your shop details in the meantime.
        </p>
      </div>
    </div>
  );
}
