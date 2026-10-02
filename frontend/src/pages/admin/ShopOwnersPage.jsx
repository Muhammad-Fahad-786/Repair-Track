// ─────────────────────────────────────────────────────────────
// RepairTrack — Admin Shop Owners Page (Phase 5.7)
// Route: /admin/shop-owners
// Real backend integration:
// Derived from /api/v1/admin/shop-applications/ and /api/v1/shops
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, Mail, Phone, Store, CheckCircle2, Clock, XCircle,
  Search, Eye, ShieldCheck, RefreshCw, Loader2, AlertCircle
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { getAdminShopApplications, getAdminShops } from '../../services/adminService';

const APP_STATUS_BADGE = {
  PENDING:  'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

export default function ShopOwnersPage() {
  const [applications, setApplications] = useState([]);
  const [shops, setShops]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState('');
  const [searchQuery, setSearchQuery]   = useState('');
  const [selectedOwner, setSelectedOwner] = useState(null);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [appsData, shopsData] = await Promise.all([
        getAdminShopApplications(),
        getAdminShops(),
      ]);
      setApplications(appsData);
      setShops(shopsData);
    } catch (err) {
      console.error('Failed to load shop owners data:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to load shop owner records from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate real shop owners from applications & registered shops
  const ownersList = useMemo(() => {
    return (applications || []).map((app) => {
      const assignedShop = shops.find(
        (s) =>
          (app.shop_id && s.id === app.shop_id) ||
          (s.name && app.shop_name && s.name.toLowerCase() === app.shop_name.toLowerCase())
      );

      const accountStatus =
        app.status === 'APPROVED'
          ? 'ACTIVE'
          : app.status === 'PENDING'
          ? 'PENDING_REVIEW'
          : 'DECLINED';

      return {
        id: app.id,
        userId: app.user_id,
        name: app.applicant_name || 'Partner Applicant',
        email: app.applicant_email || 'No email provided',
        phone: app.applicant_phone || 'No phone provided',
        shopName: app.shop_name || 'Workshop',
        shopLocation: app.city || app.address || 'Local',
        applicationStatus: app.status,
        accountStatus,
        createdAt: app.created_at ? app.created_at.split('T')[0] : 'N/A',
        assignedShop,
      };
    });
  }, [applications, shops]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ownersList;
    return ownersList.filter(
      (o) =>
        (o.name && o.name.toLowerCase().includes(q)) ||
        (o.email && o.email.toLowerCase().includes(q)) ||
        (o.shopName && o.shopName.toLowerCase().includes(q)) ||
        (o.shopLocation && o.shopLocation.toLowerCase().includes(q))
    );
  }, [ownersList, searchQuery]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users size={22} className="text-primary-600 dark:text-primary-400" /> Platform Shop Owners
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Registered shop managers, onboarding applicants, and owner credentials across the network.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
          >
            {refreshing ? 'Syncing...' : 'Refresh'}
          </Button>

          <div className="w-full sm:w-64">
            <Input
              placeholder="Search owner, email, shop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={15} />}
            />
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-danger-50 dark:bg-red-950/40 border border-danger-200 dark:border-red-800/60 p-4 rounded-2xl flex items-center justify-between text-xs text-danger-700 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <Button size="xs" variant="outline" onClick={() => loadData(true)}>
            Try Again
          </Button>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400 mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading shop owner profiles...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold text-[11px] tracking-wider border-b border-surface-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Owner Name</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Assigned Shop</th>
                  <th className="px-5 py-3.5">Application Status</th>
                  <th className="px-5 py-3.5">Account Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-slate-800">
                {filtered.map((owner) => {
                  const isAccActive = owner.accountStatus === 'ACTIVE';
                  return (
                    <tr key={owner.id} className="hover:bg-surface-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Owner Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {owner.name ? owner.name.charAt(0) : 'O'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{owner.name}</p>
                            <p className="text-slate-400 dark:text-slate-500 text-[11px]">{owner.shopLocation}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4 space-y-0.5">
                        <p className="font-mono text-slate-700 dark:text-slate-300">{owner.email}</p>
                        <p className="text-slate-400 dark:text-slate-500 text-[11px]">{owner.phone}</p>
                      </td>

                      {/* Assigned Shop */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                          <Store size={13} className="text-primary-600 dark:text-primary-400 shrink-0" />
                          <span>{owner.shopName}</span>
                        </div>
                      </td>

                      {/* Application Status */}
                      <td className="px-5 py-4">
                        <Badge variant={APP_STATUS_BADGE[owner.applicationStatus] || 'default'} size="sm">
                          {owner.applicationStatus}
                        </Badge>
                      </td>

                      {/* Account Status */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                          isAccActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            isAccActive ? 'bg-emerald-500' : 'bg-amber-500'
                          }`} />
                          {owner.accountStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setSelectedOwner(owner)}
                          leftIcon={<Eye size={12} />}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 px-4">
            <Users size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-300 font-semibold text-sm">No shop owner profiles found</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              {searchQuery ? 'Try changing your search terms.' : 'Onboarded shop managers will appear here automatically.'}
            </p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedOwner && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs" onClick={() => setSelectedOwner(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-modal border border-surface-200 dark:border-slate-800">
            <div className="flex items-start justify-between pb-4 border-b border-surface-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedOwner.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedOwner.shopName}</p>
              </div>
              <Badge variant={APP_STATUS_BADGE[selectedOwner.applicationStatus] || 'default'}>
                {selectedOwner.applicationStatus}
              </Badge>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Email Address</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 text-sm">{selectedOwner.email}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Phone Number</span>
                <span className="text-slate-800 dark:text-slate-200 text-sm">{selectedOwner.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Assigned Workshop</span>
                <span className="text-slate-800 dark:text-slate-200 text-sm font-semibold">{selectedOwner.shopName} ({selectedOwner.shopLocation})</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Application Submitted</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedOwner.createdAt}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Platform Access Level</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedOwner.accountStatus}</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-surface-100 dark:border-slate-800">
              <Button size="sm" variant="ghost" onClick={() => setSelectedOwner(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
