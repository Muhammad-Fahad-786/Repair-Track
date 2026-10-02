// ─────────────────────────────────────────────────────────────
// RepairTrack — Shop Application API Service (Phase 5.3)
// Real backend integration for shop registration & admin approval.
// ─────────────────────────────────────────────────────────────

import api from '../api/axios';

/**
 * Submit a new shop registration application (CUSTOMER only).
 *
 * @param {object} data
 * @param {string} data.shopName - Required shop name
 * @param {string} [data.description] - Shop description
 * @param {string} [data.address] - Street address
 * @param {string} [data.city] - City / Primary location
 * @param {string|string[]} [data.services] - Offered services (array or comma-separated string)
 * @param {boolean} [data.pickupAvailable] - Doorstep pickup availability
 * @returns {Promise<object>} Created ShopApplicationResponse
 */
export async function submitShopApplication(data) {
  const servicesStr = Array.isArray(data.services)
    ? data.services.filter(Boolean).join(', ')
    : (data.services || null);

  const payload = {
    shop_name: (data.shopName || data.shop_name || '').trim(),
    description: (data.description || '').trim() || null,
    address: (data.address || '').trim() || null,
    city: (data.city || '').trim() || null,
    services: servicesStr?.trim() || null,
    pickup_available: Boolean(data.pickupAvailable ?? data.pickup_available),
  };

  const response = await api.post('/shop-applications/', payload);
  return response.data;
}

/**
 * Fetch all shop applications submitted by the currently authenticated user.
 *
 * @returns {Promise<Array<object>>} List of ShopApplicationResponse
 */
export async function getMyShopApplications() {
  const response = await api.get('/shop-applications/my');
  return Array.isArray(response.data) ? response.data : [];
}

/**
 * Fetch all shop applications for administrative review (ADMIN only).
 *
 * @param {object} [params]
 * @param {'PENDING'|'APPROVED'|'REJECTED'} [params.status] - Optional status filter
 * @returns {Promise<Array<object>>} List of ShopApplicationAdminResponse
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
 * Approve a PENDING shop application (ADMIN only).
 * Side effects on backend:
 * - Promotes applicant role to SHOP_OWNER
 * - Creates an APPROVED and active Shop
 * - Marks application APPROVED
 *
 * @param {number|string} applicationId
 * @returns {Promise<object>} Updated ShopApplicationAdminResponse
 */
export async function approveShopApplication(applicationId) {
  if (!applicationId) throw new Error('Application ID is required');
  const response = await api.post(`/admin/shop-applications/${applicationId}/approve`);
  return response.data;
}

/**
 * Reject a PENDING shop application with a reason (ADMIN only).
 *
 * @param {number|string} applicationId
 * @param {string} rejectionReason - Required reason for rejection
 * @returns {Promise<object>} Updated ShopApplicationAdminResponse
 */
export async function rejectShopApplication(applicationId, rejectionReason) {
  if (!applicationId) throw new Error('Application ID is required');
  if (!rejectionReason || !rejectionReason.trim()) {
    throw new Error('A rejection reason is required');
  }

  const response = await api.post(`/admin/shop-applications/${applicationId}/reject`, {
    rejection_reason: rejectionReason.trim(),
  });
  return response.data;
}

export default {
  submitShopApplication,
  getMyShopApplications,
  getAdminShopApplications,
  approveShopApplication,
  rejectShopApplication,
};
