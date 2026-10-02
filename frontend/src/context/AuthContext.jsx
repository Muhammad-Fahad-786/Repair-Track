// ─────────────────────────────────────────────────────────────
// RepairTrack — Auth Context (Phase 5.1 Real JWT Authentication)
//
// Authoritative user state powered by FastAPI backend JWT.
// Persists access token in localStorage (repairtrack_access_token)
// and restores session on page reload via GET /api/v1/auth/me.
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { ROLES, ROUTES, STORAGE_KEYS } from '../constants';

// ─── Context ──────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Role → redirect path ─────────────────────────────────────
export const ROLE_REDIRECT = {
  [ROLES.CUSTOMER]:   ROUTES.DASHBOARD,
  [ROLES.SHOP_OWNER]: ROUTES.SHOP_OWNER_DASHBOARD,
  [ROLES.ADMIN]:      ROUTES.ADMIN,
};

function formatUser(userData) {
  if (!userData) return null;
  const initials = userData.name
    ? userData.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'RT';

  return {
    ...userData,
    avatar: userData.avatar || initials,
  };
}

// ─── Provider ─────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [role, setRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // ─── Startup Auth Restoration (Step 6) ──────────────────────
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) {
      setUserState(null);
      setRole(null);
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      const userData = formatUser(response.data);
      setUserState(userData);
      setRole(userData.role);
      setIsAuthenticated(true);
    } catch {
      // Invalid or expired token — clear session
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      setUserState(null);
      setRole(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    // Listen for unauthorized 401 events dispatched by Axios interceptor
    const handleUnauthorized = () => {
      setUserState(null);
      setRole(null);
      setIsAuthenticated(false);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [checkAuth]);

  /**
   * Real Login — Authenticates with FastAPI backend via POST /auth/login.
   * Stores JWT, validates via /auth/me, and updates state.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<object>} The authenticated user
   */
  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });

    const { access_token, user: apiUser } = response.data;
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, access_token);

    // Remove legacy mock keys if present
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    localStorage.removeItem(STORAGE_KEYS.AUTH_ROLE);

    // Authoritative user profile
    const userData = formatUser(apiUser);
    setUserState(userData);
    setRole(userData.role);
    setIsAuthenticated(true);

    return userData;
  }, []);

  /**
   * Real Register — Creates customer account via POST /auth/register.
   * Stores JWT, updates state, and returns user.
   *
   * @param {{ name: string, email: string, password: string, phone?: string }} payload
   * @returns {Promise<object>} The registered user
   */
  const register = useCallback(async ({ name, email, password, phone }) => {
    const response = await api.post('/auth/register', {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone?.trim() || undefined,
    });

    const { access_token, user: apiUser } = response.data;
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, access_token);

    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    localStorage.removeItem(STORAGE_KEYS.AUTH_ROLE);

    const userData = formatUser(apiUser);
    setUserState(userData);
    setRole(userData.role);
    setIsAuthenticated(true);

    return userData;
  }, []);

  /**
   * Logout — Clears JWT and resets authentication state.
   */
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    localStorage.removeItem(STORAGE_KEYS.AUTH_ROLE);
    setUserState(null);
    setRole(null);
    setIsAuthenticated(false);
  }, []);

  /**
   * Directly update user data (e.g., after profile edit).
   */
  const setUser = useCallback((userData) => {
    const formatted = formatUser(userData);
    setUserState(formatted);
    if (formatted?.role) {
      setRole(formatted.role);
    }
  }, []);

  /**
   * Refresh current user profile from /auth/me.
   */
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) return null;
    try {
      const response = await api.get('/auth/me');
      const userData = formatUser(response.data);
      setUserState(userData);
      setRole(userData.role);
      setIsAuthenticated(true);
      return userData;
    } catch {
      logout();
      return null;
    }
  }, [logout]);

  /**
   * Returns default redirect path for a role or current role.
   */
  const getRedirectPath = useCallback((targetRole = null) => {
    const r = targetRole || role;
    return ROLE_REDIRECT[r] || ROUTES.HOME;
  }, [role]);

  /**
   * Role-aware destination path for RepairTrack logo.
   */
  const getLogoDestination = useCallback(() => {
    if (!isAuthenticated || !role) return ROUTES.HOME;
    return ROLE_REDIRECT[role] || ROUTES.HOME;
  }, [isAuthenticated, role]);

  const value = {
    user,
    role,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    setUser,
    refreshUser,
    getRedirectPath,
    getLogoDestination,
    logoDestination: getLogoDestination(),
    // Convenience boolean checks
    isCustomer:  role === ROLES.CUSTOMER,
    isShopOwner: role === ROLES.SHOP_OWNER,
    isAdmin:     role === ROLES.ADMIN,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}

export default AuthContext;
