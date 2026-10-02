// ─────────────────────────────────────────────────────────────
// RepairTrack — Customer Pickup API Service (Phase 5.4)
// Real integration with FastAPI endpoints:
//   POST /api/v1/pickups
//   GET  /api/v1/pickups/my
//   GET  /api/v1/pickups/{pickup_id}
// ─────────────────────────────────────────────────────────────

import api from '../api/axios';

/**
 * Normalizes a raw backend PickupResponse into the frontend shape.
 * Ensures consistent rendering across list, card, and detail components.
 */
export function adaptPickup(raw) {
  if (!raw) return null;

  const brand = (raw.device_brand || '').trim();
  const model = (raw.device_model || '').trim();
  const brandModel = [brand, model].filter(Boolean).join(' ');
  const device = brandModel || raw.device_type;
  const fullDeviceName = brandModel ? `${raw.device_type} (${brandModel})` : raw.device_type;

  return {
    id: raw.id,
    displayId: `#PICK-${String(raw.id).padStart(4, '0')}`,
    customerId: raw.customer_id,
    shopId: raw.shop_id,
    deviceType: raw.device_type,
    deviceBrand: raw.device_brand || '',
    deviceModel: raw.device_model || '',
    device,
    fullDeviceName,
    problemDescription: raw.problem_description || '',
    issue: raw.problem_description || 'Device Repair Request',
    pickupAddress: raw.pickup_address,
    address: raw.pickup_address,
    preferredDate: raw.preferred_date || null,
    preferredTime: raw.preferred_time || null,
    requestedDate: raw.preferred_date || (raw.created_at ? raw.created_at.split('T')[0] : 'Today'),
    scheduledDate: raw.status === 'SCHEDULED' && raw.preferred_date ? raw.preferred_date : null,
    status: raw.status, // PENDING, ACCEPTED, REJECTED, SCHEDULED, PICKED_UP, RECEIVED
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    shop: raw.shop || null,
    shopName: raw.shop?.name || `Shop #${raw.shop_id}`,
    shopPhone: raw.shop?.phone || '',
    shopEmail: raw.shop?.email || '',
    shopAddress: raw.shop?.address || '',
    shopCity: raw.shop?.city || '',
    customer: raw.customer || null,
    customerName: raw.customer?.name || '',
    customerPhone: raw.customer?.phone || '',
    customerEmail: raw.customer?.email || '',
    raw,
  };
}

/**
 * Create a new pickup request for an active, approved shop.
 * Authenticated CUSTOMER only.
 *
 * @param {Object} data Form input data
 * @returns {Promise<Object>} Normalized pickup object
 */
export async function createPickup(data) {
  const shopId = parseInt(data.shopId ?? data.shop_id, 10);
  if (isNaN(shopId) || shopId <= 0) {
    throw new Error('A valid repair shop must be selected.');
  }

  // Combine address and city cleanly if needed
  let fullAddress = (data.address || data.pickupAddress || data.pickup_address || '').trim();
  const city = (data.city || '').trim();
  if (city && !fullAddress.toLowerCase().includes(city.toLowerCase())) {
    fullAddress = `${fullAddress}, ${city}`;
  }

  // Combine problem and additional notes if present
  let problemDesc = (data.problem || data.problemDescription || data.problem_description || '').trim();
  const notes = (data.notes || '').trim();
  if (notes) {
    problemDesc = `${problemDesc}\n\nAdditional Notes: ${notes}`.trim();
  }

  const payload = {
    shop_id: shopId,
    device_type: (data.deviceType || data.device_type || '').trim(),
    device_brand: (data.brand || data.deviceBrand || data.device_brand || '').trim() || null,
    device_model: (data.model || data.deviceModel || data.device_model || '').trim() || null,
    problem_description: problemDesc || null,
    pickup_address: fullAddress,
    preferred_date: data.preferredDate || data.preferred_date || null,
    preferred_time: data.preferredTime || data.preferred_time || null,
  };

  const response = await api.post('/pickups', payload);
  return adaptPickup(response.data);
}

/**
 * Fetch all pickup requests belonging to the authenticated customer.
 * Authenticated CUSTOMER only.
 *
 * @returns {Promise<Array<Object>>} List of normalized pickups
 */
export async function getMyPickups() {
  const response = await api.get('/pickups/my');
  const rawList = Array.isArray(response.data) ? response.data : [];
  return rawList.map(adaptPickup);
}

/**
 * Fetch a single pickup request by its ID.
 * Backend verifies customer ownership (returns 403 if belonging to someone else).
 *
 * @param {number|string} pickupId
 * @returns {Promise<Object>} Normalized pickup object
 */
export async function getPickupById(pickupId) {
  if (!pickupId) throw new Error('Pickup ID is required.');
  const response = await api.get(`/pickups/${pickupId}`);
  return adaptPickup(response.data);
}

// ─────────────────────────────────────────────────────────────
// Shop Owner Pickup Management Endpoints (Phase 5.5)
// Real integration with:
//   GET   /api/v1/shop-owner/pickups
//   GET   /api/v1/shop-owner/pickups/{pickup_id}
//   POST  /api/v1/shop-owner/pickups/{pickup_id}/accept
//   POST  /api/v1/shop-owner/pickups/{pickup_id}/reject
//   PATCH /api/v1/shop-owner/pickups/{pickup_id}/status
// ─────────────────────────────────────────────────────────────

/**
 * Fetch all pickup requests belonging to the authenticated shop owner's shop(s).
 * Authenticated SHOP_OWNER only.
 *
 * @param {string|null} statusFilter Optional status filter (PENDING, ACCEPTED, SCHEDULED, PICKED_UP, RECEIVED, REJECTED)
 * @returns {Promise<Array<Object>>} List of normalized pickups
 */
export async function getShopOwnerPickups(statusFilter = null) {
  const params = {};
  if (statusFilter) {
    params.status = statusFilter;
  }
  const response = await api.get('/shop-owner/pickups', { params });
  const rawList = Array.isArray(response.data) ? response.data : [];
  return rawList.map(adaptPickup);
}

/**
 * Fetch a single pickup request for the shop owner's shop.
 * Authenticated SHOP_OWNER only.
 * Returns 404 if not found, 403 if belonging to another shop.
 *
 * @param {number|string} pickupId
 * @returns {Promise<Object>} Normalized pickup object
 */
export async function getShopOwnerPickupById(pickupId) {
  if (!pickupId) throw new Error('Pickup ID is required.');
  const response = await api.get(`/shop-owner/pickups/${pickupId}`);
  return adaptPickup(response.data);
}

/**
 * Accept a PENDING pickup request (PENDING -> ACCEPTED).
 * Authenticated SHOP_OWNER only.
 *
 * @param {number|string} pickupId
 * @returns {Promise<Object>} Normalized updated pickup object
 */
export async function acceptPickup(pickupId) {
  if (!pickupId) throw new Error('Pickup ID is required.');
  const response = await api.post(`/shop-owner/pickups/${pickupId}/accept`);
  return adaptPickup(response.data);
}

/**
 * Reject a PENDING pickup request (PENDING -> REJECTED).
 * Authenticated SHOP_OWNER only.
 *
 * @param {number|string} pickupId
 * @param {string|null} rejectionReason Optional reason for rejection
 * @returns {Promise<Object>} Normalized updated pickup object
 */
export async function rejectPickup(pickupId, rejectionReason = null) {
  if (!pickupId) throw new Error('Pickup ID is required.');
  const payload = rejectionReason ? { rejection_reason: rejectionReason } : {};
  const response = await api.post(`/shop-owner/pickups/${pickupId}/reject`, payload);
  return adaptPickup(response.data);
}

/**
 * Update pickup status following strict forward workflow transitions:
 *   ACCEPTED  -> SCHEDULED
 *   SCHEDULED -> PICKED_UP
 *   PICKED_UP -> RECEIVED
 * Authenticated SHOP_OWNER only.
 *
 * @param {number|string} pickupId
 * @param {string} status The new status
 * @returns {Promise<Object>} Normalized updated pickup object
 */
export async function updatePickupStatus(pickupId, status) {
  if (!pickupId) throw new Error('Pickup ID is required.');
  if (!status) throw new Error('New status is required.');
  const response = await api.patch(`/shop-owner/pickups/${pickupId}/status`, { status });
  return adaptPickup(response.data);
}

export default {
  adaptPickup,
  createPickup,
  getMyPickups,
  getPickupById,
  getShopOwnerPickups,
  getShopOwnerPickupById,
  acceptPickup,
  rejectPickup,
  updatePickupStatus,
};
