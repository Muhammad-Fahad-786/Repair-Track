// ─────────────────────────────────────────────────────────────
// RepairTrack — Utility Helpers
// ─────────────────────────────────────────────────────────────

import { PICKUP_STATUS, REPAIR_STATUS } from '../constants';

// ─── Class Name Merging ───────────────────────────────────────
/**
 * Merges class name strings, filtering out falsy values.
 * Lightweight alternative to clsx for basic cases.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// ─── Date / Time Formatting ───────────────────────────────────
/**
 * Format an ISO date string to a readable date.
 * e.g. "Sep 20, 2026"
 */
export function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'short',
    day:   'numeric',
  });
}

/**
 * Format an ISO date string to a readable date + time.
 * e.g. "Sep 20, 2026 at 3:45 PM"
 */
export function formatDateTime(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('en-US', {
    year:   'numeric',
    month:  'short',
    day:    'numeric',
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Returns relative time string — e.g. "2 hours ago".
 */
export function timeAgo(isoString) {
  if (!isoString) return '—';
  const now  = Date.now();
  const then = new Date(isoString).getTime();
  const diff = Math.floor((now - then) / 1000); // seconds

  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Status Color Helpers ─────────────────────────────────────
/**
 * Returns Tailwind color classes for a given pickup status badge.
 */
export function getPickupStatusColor(status) {
  const map = {
    [PICKUP_STATUS.PENDING]:   'bg-warning-100 text-warning-700 border-warning-200',
    [PICKUP_STATUS.ACCEPTED]:  'bg-info-100 text-info-700 border-info-200',
    [PICKUP_STATUS.REJECTED]:  'bg-danger-100 text-danger-700 border-danger-200',
    [PICKUP_STATUS.SCHEDULED]: 'bg-primary-100 text-primary-700 border-primary-200',
    [PICKUP_STATUS.PICKED_UP]: 'bg-primary-100 text-primary-700 border-primary-200',
    [PICKUP_STATUS.RECEIVED]:  'bg-success-100 text-success-700 border-success-200',
  };
  return map[status] || 'bg-surface-100 text-slate-600 border-surface-200';
}

/**
 * Returns Tailwind color classes for a given repair status badge.
 */
export function getRepairStatusColor(status) {
  const map = {
    [REPAIR_STATUS.RECEIVED]:   'bg-info-100 text-info-700 border-info-200',
    [REPAIR_STATUS.DIAGNOSING]: 'bg-warning-100 text-warning-700 border-warning-200',
    [REPAIR_STATUS.REPAIRING]:  'bg-primary-100 text-primary-700 border-primary-200',
    [REPAIR_STATUS.READY]:      'bg-success-100 text-success-700 border-success-200',
    [REPAIR_STATUS.COMPLETED]:  'bg-success-100 text-success-700 border-success-200',
    [REPAIR_STATUS.CANCELLED]:  'bg-danger-100 text-danger-700 border-danger-200',
  };
  return map[status] || 'bg-surface-100 text-slate-600 border-surface-200';
}

// ─── String Utilities ─────────────────────────────────────────
/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Truncates a string to a max length, appending "…".
 */
export function truncate(str, maxLength = 60) {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}

/**
 * Returns initials from a full name — e.g. "John Doe" → "JD".
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

// ─── Validation Helpers ───────────────────────────────────────
/**
 * Basic email validation.
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Password strength check — min 8 chars.
 */
export function isValidPassword(password) {
  return password && password.length >= 8;
}

// ─── Currency Formatting ──────────────────────────────────────
/**
 * Format a number as currency string.
 * e.g. 1500 → "$1,500.00"
 */
export function formatCurrency(amount, currency = 'USD') {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
