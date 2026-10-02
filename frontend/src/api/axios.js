// ─────────────────────────────────────────────────────────────
// RepairTrack — Centralized Axios Client
// ─────────────────────────────────────────────────────────────

import axios from 'axios';
import { STORAGE_KEYS } from '../constants';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request Interceptor ──────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN || 'repairtrack_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    let message = 'An unexpected error occurred.';

    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') {
      message = detail;
    } else if (Array.isArray(detail)) {
      message = detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
    } else if (error.message) {
      message = error.message;
    }

    // Step 15: Token expiration / invalid token handling
    // If a 401 occurs on a protected endpoint (not on /auth/login or /auth/register),
    // clear stored token and notify the auth context.
    const isAuthEndpoint =
      error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/register');

    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN || 'repairtrack_access_token');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    if (import.meta.env.DEV) {
      console.error(`[API Error] ${status || 'Network'}: ${message}`, error.config?.url);
    }

    return Promise.reject({
      status,
      message,
      data: error.response?.data,
      original: error,
    });
  }
);

export default api;
