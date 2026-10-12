// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// RepairTrack â€” Real Repair Management & Tracking Service (Phase 5.8)
// Real integration with FastAPI endpoints:
//   Shop Owner:
//     POST  /api/v1/shop-owner/repairs
//     GET   /api/v1/shop-owner/repairs
//     GET   /api/v1/shop-owner/repairs/{repair_id}
//     PATCH /api/v1/shop-owner/repairs/{repair_id}/status
//     POST  /api/v1/shop-owner/repairs/{repair_id}/history
//     PATCH /api/v1/shop-owner/repairs/{repair_id}/estimate
//     POST  /api/v1/shop-owner/repairs/analyze  (Phase 5.8 - AI)
//   Customer:
//     GET   /api/v1/repairs/my
//     GET   /api/v1/repairs/{repair_id}
//     POST  /api/v1/repairs/{repair_id}/approve-estimate
//   Public:
//     GET   /api/v1/track/{repair_id}
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import api from '../api/axios';

/**
 * Valid state transitions matching backend repair_service.py:
 *   RECEIVED   -> DIAGNOSING, CANCELLED
 *   DIAGNOSING -> REPAIRING, CANCELLED
 *   REPAIRING  -> READY, CANCELLED
 *   READY      -> COMPLETED, REPAIRING
 *   COMPLETED  -> terminal
 *   CANCELLED  -> terminal
 */
export const VALID_REPAIR_TRANSITIONS = {
  RECEIVED: ['DIAGNOSING', 'CANCELLED'],
  DIAGNOSING: ['REPAIRING', 'CANCELLED'],
  REPAIRING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'REPAIRING'],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * Adapt a single repair history / audit log entry.
 */
export function adaptRepairHistory(raw) {
  if (!raw) return null;
  return {
    id: raw.id || null,
    repairId: raw.repair_id,
    status: raw.status,
    note: raw.note || '',
    changedBy: raw.changed_by ?? null,
    createdAt: raw.created_at,
    raw,
  };
}

/**
 * Normalizes a raw backend RepairResponse or RepairTrackingResponse
 * into a uniform frontend representation.
 */
export function adaptRepair(raw) {
  if (!raw) return null;

  const brand = (raw.device_brand || '').trim();
  const model = (raw.device_model || '').trim();
  const brandModel = [brand, model].filter(Boolean).join(' ');
  const device = brandModel || raw.device_type;
  const fullDeviceName = brandModel ? `${raw.device_type} (${brandModel})` : raw.device_type;

  const costNum = raw.estimated_cost !== null && raw.estimated_cost !== undefined ? Number(raw.estimated_cost) : null;
  const costFormatted = costNum !== null && !isNaN(costNum) ? `₹${costNum.toLocaleString('en-IN')}` : 'Pending Estimate';

  const history = Array.isArray(raw.history)
    ? raw.history.map(adaptRepairHistory).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    : [];

  return {
    id: raw.id,
    repairId: raw.repair_id,
    trackingCode: raw.repair_id,
    displayId: raw.repair_id,
    customerId: raw.customer_id,
    shopId: raw.shop_id,
    pickupRequestId: raw.pickup_request_id,
    deviceType: raw.device_type,
    deviceBrand: raw.device_brand || '',
    deviceModel: raw.device_model || '',
    device,
    fullDeviceName,
    problemDescription: raw.problem_description || '',
    issue: raw.problem_description || 'Device Repair',
    estimatedCost: costNum,
    cost: costFormatted,
    status: raw.status, // RECEIVED, DIAGNOSING, REPAIRING, READY, COMPLETED, CANCELLED
    customerApproved: Boolean(raw.customer_approved),
    receivedAt: raw.received_at,
    estimatedCompletion: raw.estimated_completion,
    completedAt: raw.completed_at,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    shop: raw.shop || (raw.shop_name ? { name: raw.shop_name } : null),
    shopName: raw.shop?.name || raw.shop_name || `Shop #${raw.shop_id || ''}`,
    shopPhone: raw.shop?.phone || '',
    shopEmail: raw.shop?.email || '',
    shopAddress: raw.shop?.address || '',
    customer: raw.customer || null,
    customerName: raw.customer?.name || '',
    customerPhone: raw.customer?.phone || '',
    customerEmail: raw.customer?.email || '',
    // Phase 5.8 -- AI fields (nullable)
    aiCategory: raw.ai_category || null,
    aiPriority: raw.ai_priority || null,
    aiSummary: raw.ai_summary || null,
    history,
    raw,
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Shop Owner Repair Endpoints
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Fetch all repairs belonging to the authenticated shop owner's shop.
 * Authenticated SHOP_OWNER only.
 *
 * @param {string|null} statusFilter Optional status filter (RECEIVED, DIAGNOSING, REPAIRING, READY, COMPLETED, CANCELLED)
 * @returns {Promise<Array<Object>>} List of normalized repairs
 */
export async function getShopOwnerRepairs(statusFilter = null) {
  const params = {};
  if (statusFilter) {
    params.status = statusFilter;
  }
  const response = await api.get('/shop-owner/repairs', { params });
  const rawList = Array.isArray(response.data) ? response.data : [];
  return rawList.map(adaptRepair);
}

/**
 * Fetch a single repair by identifier (database ID or repair_id string like RT-SH001-XXXXX).
 * Authenticated SHOP_OWNER only.
 *
 * @param {string|number} repairId
 * @returns {Promise<Object>} Normalized repair object
 */
export async function getShopOwnerRepairById(repairId) {
  if (!repairId) throw new Error('Repair ID is required.');
  const response = await api.get(`/shop-owner/repairs/${encodeURIComponent(repairId)}`);
  return adaptRepair(response.data);
}

/**
 * Look up an existing repair associated with a specific pickup request ID.
 * Returns the matching repair object or null if none exists.
 *
 * @param {number|string} pickupId
 * @returns {Promise<Object|null>} Normalized repair object or null
 */
export async function getRepairByPickupId(pickupId) {
  if (!pickupId) return null;
  const targetId = parseInt(pickupId, 10);
  if (isNaN(targetId) || targetId <= 0) return null;
  const allRepairs = await getShopOwnerRepairs();
  return allRepairs.find((r) => Number(r.pickupRequestId) === targetId) || null;
}

/**
 * Create a new repair job from a pickup request that reached RECEIVED status.
 * Authenticated SHOP_OWNER only.
 *
 * @param {Object} data { pickup_id (required), estimated_cost (optional), problem_description (optional) }
 * @returns {Promise<Object>} Normalized created repair object (includes server-generated repair_id)
 */
export async function createRepair(data) {
  const pickupId = parseInt(data.pickupId ?? data.pickup_id ?? data.pickup_request_id, 10);
  if (isNaN(pickupId) || pickupId <= 0) {
    throw new Error('A valid RECEIVED pickup request ID is required to create a repair.');
  }

  const payload = {
    pickup_id: pickupId,
  };

  const rawCost = data.estimatedCost ?? data.estimated_cost;
  if (rawCost !== undefined && rawCost !== null && rawCost !== '') {
    const numCost = parseFloat(rawCost);
    if (!isNaN(numCost) && numCost >= 0) {
      payload.estimated_cost = numCost;
    }
  }

  const prob = (data.problemDescription ?? data.problem_description ?? '').trim();
  if (prob) {
    payload.problem_description = prob;
  }

  const response = await api.post('/shop-owner/repairs', payload);
  return adaptRepair(response.data);
}

/**
 * Update repair status following strict forward/backward workflow transitions.
 * Authenticated SHOP_OWNER only.
 *
 * @param {string|number} repairId
 * @param {Object} data { status: string, note?: string }
 * @returns {Promise<Object>} Normalized updated repair object
 */
export async function updateRepairStatus(repairId, { status, note }) {
  if (!repairId) throw new Error('Repair ID is required.');
  if (!status) throw new Error('New status is required.');

  const payload = {
    status,
    note: (note || '').trim() || null,
  };

  const response = await api.patch(`/shop-owner/repairs/${encodeURIComponent(repairId)}/status`, payload);
  return adaptRepair(response.data);
}

/**
 * Add a manual progress note or history entry without changing repair status.
 * Authenticated SHOP_OWNER only.
 *
 * @param {string|number} repairId
 * @param {Object} data { note: string }
 * @returns {Promise<Object>} Normalized history item
 */
export async function addRepairHistory(repairId, { note }) {
  if (!repairId) throw new Error('Repair ID is required.');
  const trimmed = (note || '').trim();
  if (!trimmed) throw new Error('Progress note is required.');

  const response = await api.post(`/shop-owner/repairs/${encodeURIComponent(repairId)}/history`, {
    note: trimmed,
  });
  return adaptRepairHistory(response.data);
}

/**
 * Update the estimated repair cost for a repair job.
 * Authenticated SHOP_OWNER only.
 *
 * @param {string|number} repairId
 * @param {number|string} estimatedCost Numeric cost value (>= 0)
 * @returns {Promise<Object>} Normalized updated repair object
 */
export async function updateRepairEstimate(repairId, estimatedCost) {
  if (!repairId) throw new Error('Repair ID is required.');
  const num = parseFloat(estimatedCost);
  if (isNaN(num) || num < 0) {
    throw new Error('Estimated cost must be a non-negative number.');
  }

  const response = await api.patch(`/shop-owner/repairs/${encodeURIComponent(repairId)}/estimate`, {
    estimated_cost: num,
  });
  return adaptRepair(response.data);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Phase 5.8 -- AI Repair Assistance
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Analyze a customer repair problem description using the backend AI service.
 * Authenticated SHOP_OWNER only â€” the backend calls the AI provider.
 * AI credentials are NEVER exposed to this file or the browser.
 *
 * @param {string} problemDescription Customer problem description (20-2000 chars)
 * @returns {Promise<Object>} AI analysis result:
 *   Success: { success: true, category, priority, summary }
 *   Failure: { success: false, message }
 *   The backend NEVER throws an HTTP error for AI failures.
 */
export async function analyzeRepairProblem(problemDescription) {
  const trimmed = (problemDescription || '').trim();
  if (trimmed.length < 20) {
    throw new Error('Problem description must be at least 20 characters for AI analysis.');
  }
  if (trimmed.length > 2000) {
    throw new Error('Problem description must not exceed 2000 characters.');
  }

  const response = await api.post(
    '/shop-owner/repairs/analyze',
    {
      problem_description: trimmed,
    },
    {
      timeout: 25000, // 25s timeout comfortably higher than backend 12s controlled limit
    }
  );
  return response.data;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Customer Repair Endpoints
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Fetch all repairs belonging to the authenticated customer.
 * Authenticated CUSTOMER only.
 *
 * @returns {Promise<Array<Object>>} List of normalized repairs
 */
export async function getMyRepairs() {
  const response = await api.get('/repairs/my');
  const rawList = Array.isArray(response.data) ? response.data : [];
  return rawList.map(adaptRepair);
}

/**
 * Fetch a single customer repair by identifier.
 * Authenticated CUSTOMER only.
 *
 * @param {string|number} repairId
 * @returns {Promise<Object>} Normalized repair object
 */
export async function getMyRepairById(repairId) {
  if (!repairId) throw new Error('Repair ID is required.');
  const response = await api.get(`/repairs/${encodeURIComponent(repairId)}`);
  return adaptRepair(response.data);
}

/**
 * Customer approval of the estimated cost.
 * Authenticated CUSTOMER only.
 *
 * @param {string|number} repairId
 * @returns {Promise<Object>} Normalized updated repair object
 */
export async function approveRepairEstimate(repairId) {
  if (!repairId) throw new Error('Repair ID is required.');
  const response = await api.post(`/repairs/${encodeURIComponent(repairId)}/approve-estimate`);
  return adaptRepair(response.data);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Public Repair Tracking Endpoint (No Auth Required)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Publicly track a repair using the human-readable Repair ID (e.g. RT-SH001-X7K92).
 * Unauthenticated (no token required).
 * Returns only safe tracking data without customer personal details.
 *
 * @param {string} repairId
 * @returns {Promise<Object>} Normalized public repair tracking object
 */
export async function trackRepair(repairId) {
  const cleanId = (repairId || '').trim();
  if (!cleanId) throw new Error('Repair ID is required.');
  const response = await api.get(`/track/${encodeURIComponent(cleanId)}`);
  return adaptRepair(response.data);
}

export default {
  VALID_REPAIR_TRANSITIONS,
  adaptRepair,
  adaptRepairHistory,
  getShopOwnerRepairs,
  getShopOwnerRepairById,
  getRepairByPickupId,
  createRepair,
  updateRepairStatus,
  addRepairHistory,
  updateRepairEstimate,
  analyzeRepairProblem,
  getMyRepairs,
  getMyRepairById,
  approveRepairEstimate,
  trackRepair,
};
