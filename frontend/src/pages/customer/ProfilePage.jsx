// ─────────────────────────────────────────────────────────────
// RepairTrack — Customer Profile Page
// Route: /dashboard/profile
// Frontend-only — shows mock user info, no backend.
// ─────────────────────────────────────────────────────────────

import { User, Mail, Phone, ShieldCheck, Calendar, Edit2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-surface-100 dark:border-slate-800 last:border-0">
      <div className="h-9 w-9 rounded-xl bg-primary-50 dark:bg-primary-950/50 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-primary-600 dark:text-primary-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <User size={22} className="text-primary-600 dark:text-primary-400" /> My Profile
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Your account information.</p>
      </div>

      {/* Avatar + name card */}
      <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {user?.avatar || user?.name?.charAt(0) || '?'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{user?.name}</h2>
            <span className="inline-flex items-center gap-1.5 mt-1 text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 px-2.5 py-1 rounded-full">
              <ShieldCheck size={12} /> Customer Account
            </span>
          </div>
        </div>

        {/* Info rows */}
        <div>
          <InfoRow icon={Mail}     label="Email Address" value={user?.email} />
          <InfoRow icon={Phone}    label="Phone Number"  value={user?.phone || '+91 98100 11111'} />
          <InfoRow icon={ShieldCheck} label="Account Type" value="Customer" />
          <InfoRow icon={Calendar} label="Member Since"  value="June 2026" />
        </div>
      </div>

      {/* Edit notice */}
      <div className="bg-surface-50 dark:bg-slate-900/60 border border-surface-200 dark:border-slate-800 rounded-xl px-5 py-4 flex items-start gap-3">
        <Edit2 size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Profile editing will be available in an upcoming update.
          Your information is currently based on your registration details.
        </p>
      </div>
    </div>
  );
}
