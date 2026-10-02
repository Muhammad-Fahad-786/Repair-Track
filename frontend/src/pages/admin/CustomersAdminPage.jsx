// ─────────────────────────────────────────────────────────────
// RepairTrack — Admin Customers Page (Phase 5.7)
// Route: /admin/customers
// Real backend integration:
// Derived from platform-wide pickups & repairs (ADMIN role)
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  User, Mail, Phone, Search, Package, Wrench, Calendar,
  CheckCircle2, RefreshCw, Loader2, AlertCircle, Eye
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { getAdminPickups, getAdminRepairs } from '../../services/adminService';

export default function CustomersAdminPage() {
  const [pickups, setPickups]         = useState([]);
  const [repairs, setRepairs]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [pickupsData, repairsData] = await Promise.all([
        getAdminPickups(),
        getAdminRepairs(),
      ]);
      setPickups(pickupsData);
      setRepairs(repairsData);
    } catch (err) {
      console.error('Failed to load customer activity:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to load customer records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate unique real customers from authenticated pickup and repair records
  const customersList = useMemo(() => {
    const map = new Map();

    const getOrInit = (id, fallbackName, fallbackEmail, fallbackPhone, createdAt) => {
      const key = id ? `id-${id}` : (fallbackEmail ? `email-${fallbackEmail.toLowerCase()}` : `name-${fallbackName}`);
      if (!map.has(key)) {
        map.set(key, {
          id: id || key,
          name: fallbackName || 'Registered Customer',
          email: fallbackEmail || 'N/A',
          phone: fallbackPhone || 'N/A',
          repairsCount: 0,
          pickupsCount: 0,
          earliestDate: createdAt ? createdAt.split('T')[0] : 'N/A',
          pickups: [],
          repairs: [],
        });
      }
      return map.get(key);
    };

    // Index pickups
    pickups.forEach((p) => {
      const cust = getOrInit(
        p.customerId,
        p.customerName || p.customer?.name,
        p.customerEmail || p.customer?.email,
        p.customerPhone || p.customer?.phone,
        p.createdAt
      );
      cust.pickupsCount += 1;
      cust.pickups.push(p);
      if (p.createdAt && p.createdAt < cust.earliestDate) {
        cust.earliestDate = p.createdAt.split('T')[0];
      }
    });

    // Index repairs
    repairs.forEach((r) => {
      const cust = getOrInit(
        r.customerId,
        r.customerName || r.customer?.name,
        r.customerEmail || r.customer?.email,
        r.customerPhone || r.customer?.phone,
        r.createdAt
      );
      cust.repairsCount += 1;
      cust.repairs.push(r);
      if (r.createdAt && r.createdAt < cust.earliestDate) {
        cust.earliestDate = r.createdAt.split('T')[0];
      }
    });

    return Array.from(map.values());
  }, [pickups, repairs]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customersList;
    return customersList.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q))
    );
  }, [customersList, searchQuery]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User size={22} className="text-primary-600 dark:text-primary-400" /> Platform Customers
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Registered customer accounts, contact details, and platform repair/pickup activity.
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
              placeholder="Search customer name, email..."
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
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Aggregating platform customer records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold text-[11px] tracking-wider border-b border-surface-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Customer Name</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5 text-center">Repairs</th>
                  <th className="px-5 py-3.5 text-center">Pickups</th>
                  <th className="px-5 py-3.5">Active Since</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-slate-800">
                {filtered.map((cust) => (
                  <tr key={cust.id} className="hover:bg-surface-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {cust.name ? cust.name.charAt(0) : 'C'}
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{cust.name}</p>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-4 font-mono text-slate-700 dark:text-slate-300">
                      {cust.email}
                    </td>

                    {/* Phone */}
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                      {cust.phone}
                    </td>

                    {/* Repairs */}
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1 font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-full border border-primary-200 dark:border-primary-800/60 text-[11px]">
                        <Wrench size={10} /> {cust.repairsCount}
                      </span>
                    </td>

                    {/* Pickups */}
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60 text-[11px]">
                        <Package size={10} /> {cust.pickupsCount}
                      </span>
                    </td>

                    {/* Joined Date */}
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-medium">
                      {cust.earliestDate}
                    </td>

                    {/* Account Status */}
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setSelectedCustomer(cust)}
                        leftIcon={<Eye size={12} />}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 px-4">
            <User size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-300 font-semibold text-sm">No customer records found</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              {searchQuery ? 'Try changing your search terms.' : 'Active customer profiles will appear here as users submit requests.'}
            </p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs" onClick={() => setSelectedCustomer(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-modal border border-surface-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-surface-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{selectedCustomer.email}</p>
              </div>
              <Badge variant="success">Active User</Badge>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-surface-50 dark:bg-slate-800/60 p-3 rounded-xl border border-surface-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Phone Number</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCustomer.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-0.5">First Seen / Active</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedCustomer.earliestDate}</span>
                </div>
              </div>

              {/* Activity breakdown */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2">Registered Repair Jobs ({selectedCustomer.repairs.length})</h4>
                {selectedCustomer.repairs.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">No repairs recorded.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedCustomer.repairs.map((r) => (
                      <div key={r.id} className="p-2.5 rounded-lg border border-surface-200 dark:border-slate-800 bg-surface-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-primary-600 dark:text-primary-400">{r.repairId}</span>
                          <span className="ml-2 font-medium text-slate-800 dark:text-slate-200">{r.device}</span>
                        </div>
                        <Badge size="xs" variant="default">{r.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2">Doorstep Pickups ({selectedCustomer.pickups.length})</h4>
                {selectedCustomer.pickups.length === 0 ? (
                  <p className="text-slate-400 text-xs italic">No pickups requested.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedCustomer.pickups.map((p) => (
                      <div key={p.id} className="p-2.5 rounded-lg border border-surface-200 dark:border-slate-800 bg-surface-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                        <div>
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">#PICK-{p.id}</span>
                          <span className="ml-2 font-medium text-slate-800 dark:text-slate-200">{p.device}</span>
                        </div>
                        <Badge size="xs" variant="default">{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-surface-100 dark:border-slate-800">
              <Button size="sm" variant="ghost" onClick={() => setSelectedCustomer(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
