// ─────────────────────────────────────────────────────────────
// RepairTrack — Admin Shops Management Page (Phase 5.7)
// Route: /admin/shops
// Real backend integration:
// GET /api/v1/shops
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Store, CheckCircle2, XCircle, Search, Eye, AlertTriangle,
  MapPin, Phone, Mail, Calendar, ExternalLink, RefreshCw,
  Loader2, AlertCircle, PackageCheck
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { getAdminShops } from '../../services/adminService';

export default function ShopsAdminPage() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState(null); // View details modal
  const [confirmToggle, setConfirmToggle] = useState(null); // Shop to inspect toggle status
  const [apiGapNotice, setApiGapNotice] = useState('');

  const loadShops = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const data = await getAdminShops();
      setShops(data);
    } catch (err) {
      console.error('Failed to load shops:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to load shops from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  const filteredShops = useMemo(() => {
    return (shops || []).filter((shop) => {
      const isActive = Boolean(shop.is_active);
      const matchesTab =
        activeTab === 'ALL' ||
        (activeTab === 'ACTIVE' && isActive) ||
        (activeTab === 'INACTIVE' && !isActive);

      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        (shop.name && shop.name.toLowerCase().includes(q)) ||
        (shop.category && shop.category.toLowerCase().includes(q)) ||
        (shop.city && shop.city.toLowerCase().includes(q)) ||
        (shop.address && shop.address.toLowerCase().includes(q));

      return matchesTab && matchesQuery;
    });
  }, [shops, activeTab, searchQuery]);

  const handleAttemptToggle = () => {
    // Backend capability gap: backend has no PATCH /admin/shops/{id}/status endpoint.
    // As instructed by prompt: Do NOT fake in localStorage; report as capability gap instead.
    setApiGapNotice(
      `Direct shop status toggle for "${confirmToggle?.name}" is not supported by the backend API. Shop activation is strictly controlled during onboarding approval.`
    );
    setConfirmToggle(null);
  };

  const activeCount = shops.filter((s) => s.is_active).length;
  const inactiveCount = shops.length - activeCount;

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Store size={22} className="text-primary-600 dark:text-primary-400" /> Platform Repair Shops
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Supervise registered workshops, inspect active operating status, and review operational metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
            onClick={() => loadShops(true)}
            disabled={refreshing || loading}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Backend API Notice */}
      {apiGapNotice && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 rounded-2xl flex items-start justify-between text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={17} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Backend Limitation Notice</p>
              <p className="mt-0.5 leading-relaxed">{apiGapNotice}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setApiGapNotice('')}
            className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-200 font-bold ml-2 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-danger-50 dark:bg-red-950/40 border border-danger-200 dark:border-red-800/60 p-4 rounded-2xl flex items-center justify-between text-xs text-danger-700 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <Button size="xs" variant="outline" onClick={() => loadShops(true)}>
            Try Again
          </Button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-surface-200 dark:border-slate-800 shadow-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: 'ALL',      label: 'All Shops', count: shops.length },
            { key: 'ACTIVE',   label: 'Active',    count: activeCount },
            { key: 'INACTIVE', label: 'Inactive',  count: inactiveCount },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-surface-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full md:w-72">
          <Input
            placeholder="Search shop name, category, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={15} />}
            className="w-full"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-surface-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400 mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Fetching registered workshops...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-bold text-[11px] tracking-wider border-b border-surface-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Shop Name</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Location</th>
                  <th className="px-5 py-3.5">Doorstep Pickup</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Registered Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-slate-800">
                {filteredShops.map((shop) => {
                  const isActive = Boolean(shop.is_active);
                  const registeredDate = shop.created_at ? shop.created_at.split('T')[0] : 'N/A';
                  return (
                    <tr key={shop.id} className="hover:bg-surface-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Shop Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            isActive ? 'bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300' : 'bg-surface-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            {shop.name ? shop.name.charAt(0) : 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{shop.name}</p>
                            <span className="font-mono text-slate-400 dark:text-slate-500 text-[10px]">slug: {shop.slug}</span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-medium">
                        {shop.category || 'General Electronics'}
                      </td>

                      {/* Location */}
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1 truncate max-w-xs">
                          <MapPin size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                          <span className="truncate">{shop.city ? `${shop.city}, ${shop.state || 'India'}` : shop.address || 'Local Workshop'}</span>
                        </div>
                      </td>

                      {/* Doorstep Pickup */}
                      <td className="px-5 py-4">
                        {shop.pickup_available ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 text-[10px]">
                            <PackageCheck size={11} /> Supported
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[11px]">Walk-in only</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <Badge variant={isActive ? 'success' : 'default'} size="sm">
                          {isActive ? (
                            <span className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-success-500" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Inactive
                            </span>
                          )}
                        </Badge>
                      </td>

                      {/* Registered Date */}
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-medium">
                        {registeredDate}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setSelectedShop(shop)}
                            leftIcon={<Eye size={13} />}
                          >
                            Details
                          </Button>

                          <Button
                            size="xs"
                            variant="outline"
                            className="text-slate-600 dark:text-slate-400"
                            onClick={() => setConfirmToggle(shop)}
                          >
                            Status
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredShops.length === 0 && (
          <div className="text-center py-16 px-4">
            <Store size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-semibold text-sm">No shops found</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              {searchQuery ? 'Try changing your search terms or filters.' : 'Approved workshops will appear here automatically.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Modal: View Shop Details ────────────────────────── */}
      {selectedShop && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setSelectedShop(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-modal border border-surface-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-surface-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedShop.name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedShop.category}</p>
              </div>
              <Badge variant={selectedShop.is_active ? 'success' : 'default'}>
                {selectedShop.is_active ? 'ACTIVE' : 'INACTIVE'}
              </Badge>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Shop ID</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">#{selectedShop.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">URL Slug</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">/shops/{selectedShop.slug}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Contact Phone</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedShop.phone || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Contact Email</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{selectedShop.email || 'Not specified'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Physical Address</span>
                <p className="text-slate-700 dark:text-slate-300 bg-surface-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-surface-200 dark:border-slate-700">
                  {selectedShop.address || 'Address on record'} {selectedShop.city ? `(${selectedShop.city}, ${selectedShop.state || ''})` : ''}
                </p>
              </div>

              {selectedShop.services && (
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-1">Offered Repair Services</span>
                  <p className="text-slate-700 dark:text-slate-300 bg-surface-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-surface-200 dark:border-slate-700">
                    {selectedShop.services}
                  </p>
                </div>
              )}

              <div>
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Description</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-surface-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-surface-200 dark:border-slate-700">
                  {selectedShop.description || 'Verified workshop providing repair services on RepairTrack.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-surface-100 dark:border-slate-800">
              <Link
                to={`/shops/${selectedShop.slug}`}
                target="_blank"
                className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 inline-flex items-center gap-1"
              >
                Open Public Profile <ExternalLink size={12} />
              </Link>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSelectedShop(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Status Supervision Dialog ───────────────── */}
      {confirmToggle && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setConfirmToggle(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-modal border border-surface-200 dark:border-slate-700">
            <div className="h-11 w-11 rounded-2xl flex items-center justify-center mb-3.5 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={22} />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5">
              Shop Status Supervision: {confirmToggle.name}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              Current operational status is <strong>{confirmToggle.is_active ? 'ACTIVE' : 'INACTIVE'}</strong>.
              <br /><br />
              Note: The backend FastAPI service does not currently expose a direct shop deactivation endpoint. Shop activation status is governed during the onboarding application approval process.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <Button size="sm" variant="ghost" onClick={() => setConfirmToggle(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAttemptToggle}
              >
                Acknowledge
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
