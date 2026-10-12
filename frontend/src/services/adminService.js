// ─────────────────────────────────────────────────────────────
// RepairTrack — Admin API Service (Phase 5.7)
// Centralized service for Platform Administration:
//   - GET  /api/v1/admin/shop-applications/
//   - POST /api/v1/admin/shop-applications/{id}/approve
//   - POST /api/v1/admin/shop-applications/{id}/reject
//   - GET  /api/v1/admin/pickups
//   - GET  /api/v1/admin/repairs
//   - GET  /api/v1/shops
// ─────────────────────────────────────────────────────────────

import api from '../api/axios';

/**
 * Normalizes an admin pickup response object.
 *
 * @param {object} raw - Raw PickupResponse from backend
 * @returns {object} Normalized admin pickup
 */
export function adaptAdminPickup(raw) {
  if (!raw) return null;

  const brand = (raw.device_brand || '').trim();
  const model = (raw.device_model || '').trim();
  const brandModel = [brand, model].filter(Boolean).join(' ');
  const device = brandModel || raw.device_type;
  const fullDevice = brandModel ? `${raw.device_type} (${brandModel})` : raw.device_type;

  return {
    id: raw.id,
    displayId: `#PICK-${String(raw.id).padStart(4, '0')}`,
    customerId: raw.customer_id,
    shopId: raw.shop_id,
    deviceType: raw.device_type,
    deviceBrand: raw.device_brand || '',
    deviceModel: raw.device_model || '',
    device,
    fullDevice,
    problemDescription: raw.problem_description || '',
    issue: raw.problem_description || 'Device Inspection Request',
    pickupAddress: raw.pickup_address,
    address: raw.pickup_address,
    preferredDate: raw.preferred_date || null,
    preferredTime: raw.preferred_time || null,
    requestedDate: raw.preferred_date || (raw.created_at ? raw.created_at.split('T')[0] : 'N/A'),
    status: raw.status, // PENDING, ACCEPTED, SCHEDULED, PICKED_UP, RECEIVED, REJECTED
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    shop: raw.shop || null,
    shopName: raw.shop?.name || `Shop #${raw.shop_id}`,
    shopPhone: raw.shop?.phone || '',
    shopEmail: raw.shop?.email || '',
    shopAddress: raw.shop?.address || '',
    shopCity: raw.shop?.city || '',
    customer: raw.customer || null,
    customerName: raw.customer?.name || `Customer #${raw.customer_id}`,
    customerPhone: raw.customer?.phone || '',
    customerEmail: raw.customer?.email || '',
    city: raw.shop?.city || (raw.pickup_address ? raw.pickup_address.split(',').pop()?.trim() : 'Local'),
    raw,
  };
}

/**
 * Normalizes an admin repair response object.
 *
 * @param {object} raw - Raw RepairResponse from backend
 * @returns {object} Normalized admin repair
 */
export function adaptAdminRepair(raw) {
  if (!raw) return null;

  const brand = (raw.device_brand || '').trim();
  const model = (raw.device_model || '').trim();
  const brandModel = [brand, model].filter(Boolean).join(' ');
  const device = brandModel || raw.device_type;
  const fullDevice = brandModel ? `${raw.device_type} (${brandModel})` : raw.device_type;

  const costNumber = raw.estimated_cost != null ? Number(raw.estimated_cost) : null;
  const formattedCost = costNumber != null && !isNaN(costNumber)
    ? `₹${costNumber.toLocaleString('en-IN')}`
    : 'TBD';

  return {
    id: raw.id,
    repairId: raw.repair_id,
    trackingCode: raw.repair_id, // Alias for table columns
    customerId: raw.customer_id,
    shopId: raw.shop_id,
    pickupRequestId: raw.pickup_request_id || null,
    deviceType: raw.device_type,
    deviceBrand: raw.device_brand || '',
    deviceModel: raw.device_model || '',
    device,
    fullDevice,
    problemDescription: raw.problem_description || '',
    issue: raw.problem_description || 'Hardware / Software Repair',
    estimatedCost: costNumber,
    cost: formattedCost,
    status: raw.status, // RECEIVED, DIAGNOSING, REPAIRING, READY, COMPLETED, CANCELLED
    isEstimateApproved: Boolean(raw.customer_approved),
    customerApproved: Boolean(raw.customer_approved),
    receivedAt: raw.received_at || raw.created_at,
    estimatedCompletion: raw.estimated_completion || null,
    completedAt: raw.completed_at || null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    startDate: raw.created_at ? raw.created_at.split('T')[0] : 'N/A',
    lastUpdate: raw.updated_at ? raw.updated_at.split('T')[0] : 'N/A',
    shop: raw.shop || null,
    shopName: raw.shop?.name || `Shop #${raw.shop_id}`,
    shopPhone: raw.shop?.phone || '',
    shopEmail: raw.shop?.email || '',
    shopAddress: raw.shop?.address || '',
    shopCity: raw.shop?.city || '',
    customer: raw.customer || null,
    customerName: raw.customer?.name || `Customer #${raw.customer_id}`,
    customerPhone: raw.customer?.phone || '',
    customerEmail: raw.customer?.email || '',
    history: Array.isArray(raw.history) ? raw.history : [],
    raw,
  };
}

/**
 * Fetch all shop applications for administrative review (ADMIN only).
 *
 * @param {object} [params]
 * @param {'PENDING'|'APPROVED'|'REJECTED'|'ALL'} [params.status]
 * @returns {Promise<Array<object>>}
 */
export async function getAdminShopApplications(params = {}) {
  const queryParams = {};
  if (params.status && params.status !== 'ALL') {
    queryParams.status = params.status;
  }
  const response = await api.get('/admin/shop-applications/', { params: queryParams });
  return Array.isArray(response.data) ? response.data : [];
}

/**
 * Approve a pending shop application (ADMIN only).
 *
 * @param {number} applicationId
 * @returns {Promise<object>}
 */
export async function approveShopApplication(applicationId) {
  const response = await api.post(`/admin/shop-applications/${applicationId}/approve`);
  return response.data;
}

/**
 * Reject a pending shop application (ADMIN only).
 *
 * @param {number} applicationId
 * @param {string} reason
 * @returns {Promise<object>}
 */
export async function rejectShopApplication(applicationId, reason) {
  const payload = {
    rejection_reason: (reason || '').trim() || 'Application declined by administrator.',
  };
  const response = await api.post(`/admin/shop-applications/${applicationId}/reject`, payload);
  return response.data;
}

/**
 * Fetch all repair jobs across all shops (ADMIN only).
 *
 * @param {object} [params]
 * @param {string} [params.status] - Optional RepairStatus filter
 * @returns {Promise<Array<object>>}
 */
export async function getAdminRepairs(params = {}) {
  const queryParams = {};
  if (params.status && params.status !== 'ALL') {
    queryParams.status = params.status;
  }
  const response = await api.get('/admin/repairs', { params: queryParams });
  const list = Array.isArray(response.data) ? response.data : [];
  return list.map(adaptAdminRepair);
}

/**
 * Fetch all pickup requests across all shops (ADMIN only).
 *
 * @param {object} [params]
 * @param {string} [params.status] - Optional PickupStatus filter
 * @returns {Promise<Array<object>>}
 */
export async function getAdminPickups(params = {}) {
  const queryParams = {};
  if (params.status && params.status !== 'ALL') {
    queryParams.status = params.status;
  }
  const response = await api.get('/admin/pickups', { params: queryParams });
  const list = Array.isArray(response.data) ? response.data : [];
  return list.map(adaptAdminPickup);
}

/**
 * Fetch all registered repair shops with summary metrics and owner data (ADMIN only).
 *
 * @param {object} [params]
 * @returns {Promise<Array<object>>}
 */
export async function getAdminShops(params = {}) {
  const response = await api.get('/admin/shops', { params });
  return Array.isArray(response.data) ? response.data : [];
}

/**
 * Fetch detailed shop overview including owner info and summary metrics (ADMIN only).
 *
 * @param {number|string} shopId
 * @returns {Promise<object>}
 */
export async function getAdminShopOverview(shopId) {
  const response = await api.get(`/admin/shops/${shopId}`);
  return response.data;
}

/**
 * Fetch customers associated with a specific shop (ADMIN only).
 *
 * @param {number|string} shopId
 * @returns {Promise<Array<object>>}
 */
export async function getAdminShopCustomers(shopId) {
  const response = await api.get(`/admin/shops/${shopId}/customers`);
  return Array.isArray(response.data) ? response.data : [];
}

/**
 * Fetch pickup requests belonging to a specific shop (ADMIN only).
 *
 * @param {number|string} shopId
 * @returns {Promise<Array<object>>}
 */
export async function getAdminShopPickups(shopId) {
  const response = await api.get(`/admin/shops/${shopId}/pickups`);
  const list = Array.isArray(response.data) ? response.data : [];
  return list.map(adaptAdminPickup);
}

/**
 * Fetch repairs belonging to a specific shop (ADMIN only).
 *
 * @param {number|string} shopId
 * @returns {Promise<Array<object>>}
 */
export async function getAdminShopRepairs(shopId) {
  const response = await api.get(`/admin/shops/${shopId}/repairs`);
  const list = Array.isArray(response.data) ? response.data : [];
  return list.map(adaptAdminRepair);
}

/**
 * Fetch aggregated metrics and recent activity for the Admin Dashboard.
 * Executes concurrent queries for shops, applications, pickups, and repairs.
 *
 * @returns {Promise<object>} Aggregated overview metrics
 */
export async function getAdminDashboardOverview() {
  const [shopsRes, appsRes, pickupsRes, repairsRes] = await Promise.allSettled([
    getAdminShops(),
    getAdminShopApplications(),
    getAdminPickups(),
    getAdminRepairs(),
  ]);

  const shops = shopsRes.status === 'fulfilled' ? shopsRes.value : [];
  const applications = appsRes.status === 'fulfilled' ? appsRes.value : [];
  const pickups = pickupsRes.status === 'fulfilled' ? pickupsRes.value : [];
  const repairs = repairsRes.status === 'fulfilled' ? repairsRes.value : [];

  // Unique shop owners derived from approved applications / shops
  const shopOwnerEmails = new Set();
  applications.forEach((app) => {
    if (app.applicant_email) shopOwnerEmails.add(app.applicant_email.toLowerCase());
  });
  shops.forEach((s) => {
    if (s.email) shopOwnerEmails.add(s.email.toLowerCase());
  });

  // Unique customers derived from pickups and repairs
  const customerIds = new Set();
  pickups.forEach((p) => {
    if (p.customerId) customerIds.add(`id-${p.customerId}`);
    else if (p.customerEmail) customerIds.add(`email-${p.customerEmail.toLowerCase()}`);
  });
  repairs.forEach((r) => {
    if (r.customerId) customerIds.add(`id-${r.customerId}`);
    else if (r.customerEmail) customerIds.add(`email-${r.customerEmail.toLowerCase()}`);
  });

  const totalShops = shops.length;
  const activeShops = shops.filter((s) => s.is_active).length;
  const inactiveShops = totalShops - activeShops;
  const pendingRequests = applications.filter((a) => a.status === 'PENDING').length;
  const totalPickups = pickups.length;
  const pendingPickups = pickups.filter((p) => p.status === 'PENDING').length;
  const totalRepairs = repairs.length;
  const activeRepairs = repairs.filter((r) => !['COMPLETED', 'CANCELLED'].includes(r.status)).length;
  const completedRepairs = repairs.filter((r) => r.status === 'COMPLETED').length;

  return {
    metrics: {
      totalShops,
      activeShops,
      inactiveShops,
      pendingRequests,
      totalShopOwners: shopOwnerEmails.size || totalShops,
      totalCustomers: customerIds.size,
      totalPickups,
      pendingPickups,
      totalRepairs,
      activeRepairs,
      completedRepairs,
    },
    raw: {
      shops,
      applications,
      pickups,
      repairs,
    },
  };
}
