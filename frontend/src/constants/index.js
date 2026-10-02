// ─────────────────────────────────────────────────────────────
// RepairTrack — Application Constants
// ─────────────────────────────────────────────────────────────

// ─── App Meta ─────────────────────────────────────────────────
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'RepairTrack';

// ─── User Roles ───────────────────────────────────────────────
export const ROLES = {
  ADMIN:      'ADMIN',
  SHOP_OWNER: 'SHOP_OWNER',
  CUSTOMER:   'CUSTOMER',
};

// ─── Shop Application Statuses ────────────────────────────────
export const APPLICATION_STATUS = {
  PENDING:  'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

// ─── Pickup Request Statuses ───────────────────────────────────
export const PICKUP_STATUS = {
  PENDING:   'PENDING',
  ACCEPTED:  'ACCEPTED',
  REJECTED:  'REJECTED',
  SCHEDULED: 'SCHEDULED',
  PICKED_UP: 'PICKED_UP',
  RECEIVED:  'RECEIVED',
};

// ─── Repair Statuses ──────────────────────────────────────────
export const REPAIR_STATUS = {
  RECEIVED:   'RECEIVED',
  DIAGNOSING: 'DIAGNOSING',
  REPAIRING:  'REPAIRING',
  READY:      'READY',
  COMPLETED:  'COMPLETED',
  CANCELLED:  'CANCELLED',
};

// ─── AI Priority Levels ───────────────────────────────────────
export const AI_PRIORITY = {
  LOW:    'LOW',
  MEDIUM: 'MEDIUM',
  HIGH:   'HIGH',
};

// ─── Route Paths ──────────────────────────────────────────────
export const ROUTES = {
  HOME:  '/',
  TRACK: '/track',
  SHOPS: '/shops',
  SHOP_DETAIL: (slug) => `/shops/${slug}`,

  // ── Customer Auth ──────────────────────────────────────────
  LOGIN:    '/login',
  REGISTER: '/register',

  // ── Shop Owner Auth ────────────────────────────────────────
  REGISTER_SHOP:      '/register-shop',
  SHOP_OWNER_LOGIN:   '/shop-owner/login',
  APPLICATION_STATUS: '/application-status',

  // ── Admin Auth ────────────────────────────────────────────
  ADMIN_LOGIN: '/admin/login',

  // ── Admin Dashboard ───────────────────────────────────────
  ADMIN:               '/admin',
  ADMIN_SHOP_REQUESTS: '/admin/shop-requests',
  ADMIN_SHOPS:         '/admin/shops',
  ADMIN_SHOP_OWNERS:   '/admin/shop-owners',
  ADMIN_CUSTOMERS:     '/admin/customers',
  ADMIN_REPAIRS:       '/admin/repairs',
  ADMIN_PICKUPS:       '/admin/pickups',

  // ── Shop Owner Dashboard ──────────────────────────────────
  SHOP_OWNER_DASHBOARD: '/shop-owner/dashboard',
  SHOP_OWNER_PICKUPS:   '/shop-owner/pickups',
  SHOP_OWNER_REPAIRS:   '/shop-owner/repairs',
  SHOP_OWNER_CUSTOMERS: '/shop-owner/customers',
  SHOP_OWNER_SHOP:      '/shop-owner/shop',
  SHOP_OWNER_PROFILE:   '/shop-owner/profile',

  // ── Customer Dashboard ────────────────────────────────────
  DASHBOARD:             '/dashboard',
  DASHBOARD_REPAIRS:     '/dashboard/repairs',
  DASHBOARD_PICKUPS:     '/dashboard/pickups',
  DASHBOARD_PICKUPS_NEW: '/dashboard/pickups/new',
  DASHBOARD_TRACK:       '/dashboard/track',
  DASHBOARD_PROFILE:     '/dashboard/profile',
};

// ─── Local Storage Keys ───────────────────────────────────────
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'repairtrack_access_token',
  AUTH_USER:  'repairtrack_auth_user',
  AUTH_ROLE:  'repairtrack_auth_role',
};

// ─── Status Display Labels ────────────────────────────────────
export const PICKUP_STATUS_LABELS = {
  [PICKUP_STATUS.PENDING]:   'Pending',
  [PICKUP_STATUS.ACCEPTED]:  'Accepted',
  [PICKUP_STATUS.REJECTED]:  'Rejected',
  [PICKUP_STATUS.SCHEDULED]: 'Scheduled',
  [PICKUP_STATUS.PICKED_UP]: 'Picked Up',
  [PICKUP_STATUS.RECEIVED]:  'Received',
};

export const REPAIR_STATUS_LABELS = {
  [REPAIR_STATUS.RECEIVED]:   'Received',
  [REPAIR_STATUS.DIAGNOSING]: 'Diagnosing',
  [REPAIR_STATUS.REPAIRING]:  'Repairing',
  [REPAIR_STATUS.READY]:      'Ready for Pickup',
  [REPAIR_STATUS.COMPLETED]:  'Completed',
  [REPAIR_STATUS.CANCELLED]:  'Cancelled',
};

export const APPLICATION_STATUS_LABELS = {
  [APPLICATION_STATUS.PENDING]:  'Pending Review',
  [APPLICATION_STATUS.APPROVED]: 'Approved',
  [APPLICATION_STATUS.REJECTED]: 'Rejected',
};

// ─── Repair status progression order (for dropdowns) ──────────
export const REPAIR_STATUS_ORDER = [
  REPAIR_STATUS.RECEIVED,
  REPAIR_STATUS.DIAGNOSING,
  REPAIR_STATUS.REPAIRING,
  REPAIR_STATUS.READY,
  REPAIR_STATUS.COMPLETED,
  REPAIR_STATUS.CANCELLED,
];
