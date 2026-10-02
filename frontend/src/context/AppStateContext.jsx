// ─────────────────────────────────────────────────────────────
// RepairTrack — App State Context
// Centralized mock data layer with localStorage persistence.
// Shared between Customer, Shop Owner, and Admin workflows.
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { MOCK_SHOP_REQUESTS, MOCK_REPAIRS, MOCK_PICKUPS } from '../constants/mockData';
import { MOCK_SHOPS } from '../constants/mockShops';

const AppStateContext = createContext(null);

// ─── localStorage keys ────────────────────────────────────────
const LS_APPLICATIONS = 'repairtrack_shop_applications';
const LS_SHOPS        = 'repairtrack_shops';
const LS_REPAIRS      = 'repairtrack_repairs';
const LS_PICKUPS      = 'repairtrack_pickups';

// ─── Helper initializers with localStorage fallback ────────────
function loadInitialApplications() {
  try {
    const raw = localStorage.getItem(LS_APPLICATIONS);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load applications from localStorage:', err);
  }
  return MOCK_SHOP_REQUESTS.map((req, idx) => ({
    ...req,
    applicationId: req.applicationId || `APP-2026-000${idx + 1}`,
  }));
}

function loadInitialShops() {
  try {
    const raw = localStorage.getItem(LS_SHOPS);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load shops from localStorage:', err);
  }
  // Initialize with ACTIVE status if not present
  return MOCK_SHOPS.map((s, idx) => ({
    ...s,
    status: s.status || 'ACTIVE',
    ownerName: s.ownerName || (idx === 1 ? 'Sanjay Kumar' : idx === 0 ? 'Rashid Khan' : 'Authorized Partner'),
    registeredDate: s.registeredDate || '2026-07-01',
  }));
}

function loadInitialRepairs() {
  try {
    const raw = localStorage.getItem(LS_REPAIRS);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load repairs from localStorage:', err);
  }
  return MOCK_REPAIRS;
}

function loadInitialPickups() {
  try {
    const raw = localStorage.getItem(LS_PICKUPS);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load pickups from localStorage:', err);
  }
  return MOCK_PICKUPS;
}

export function AppStateProvider({ children }) {
  const [shopApplications, setShopApplications] = useState(loadInitialApplications);
  const [shops,            setShops]            = useState(loadInitialShops);
  const [repairs,          setRepairs]          = useState(loadInitialRepairs);
  const [pickups,          setPickups]          = useState(loadInitialPickups);

  // Sync to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(LS_APPLICATIONS, JSON.stringify(shopApplications));
    } catch (e) {
      // quota or private mode error
    }
  }, [shopApplications]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_SHOPS, JSON.stringify(shops));
    } catch (e) {}
  }, [shops]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_REPAIRS, JSON.stringify(repairs));
    } catch (e) {}
  }, [repairs]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_PICKUPS, JSON.stringify(pickups));
    } catch (e) {}
  }, [pickups]);

  // ─── Shop Applications Methods ──────────────────────────────
  const addShopApplication = useCallback((formData) => {
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const appId = `APP-2026-${randomSuffix}`;
    const newApp = {
      id: `sr-${Date.now()}`,
      applicationId: appId,
      shopName: formData.shopName,
      ownerName: formData.ownerName,
      ownerEmail: formData.ownerEmail,
      ownerPhone: formData.ownerPhone,
      category: formData.category,
      location: formData.address ? `${formData.address}, ${formData.city}` : formData.city,
      address: formData.address,
      city: formData.city,
      description: formData.description || '',
      submittedDate: new Date().toISOString(),
      status: 'PENDING',
      services: formData.selectedServices || [],
      pickupAvailable: Boolean(formData.pickupAvailable),
      serviceAreas: formData.serviceAreas || [formData.city],
      rejectionReason: null,
    };

    setShopApplications((prev) => [newApp, ...prev]);
    return newApp;
  }, []);

  const approveShopApplication = useCallback((id, optionalApp = null) => {
    // 1. Update application status to APPROVED
    let approvedApp = optionalApp || null;

    setShopApplications((prev) =>
      prev.map((app) => {
        if (app.id === id || app.applicationId === id) {
          approvedApp = { ...app, status: 'APPROVED', rejectionReason: null };
          return approvedApp;
        }
        return app;
      })
    );

    // 2. Automatically create or sync shop in central shops state
    setShops((prevShops) => {
      const app = approvedApp || shopApplications.find((a) => a.id === id || a.applicationId === id);
      if (!app) return prevShops;

      // Check if shop already exists for this application or name
      const baseSlug = (app.shopName || 'repair-shop')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      const existingIndex = prevShops.findIndex(
        (s) =>
          (s.applicationId && (s.applicationId === app.id || s.applicationId === app.applicationId)) ||
          s.slug === baseSlug ||
          (s.name && s.name.toLowerCase().trim() === app.shopName.toLowerCase().trim())
      );

      if (existingIndex !== -1) {
        // Shop already exists — activate it and ensure verified status
        const updated = [...prevShops];
        updated[existingIndex] = {
          ...updated[existingIndex],
          status: 'ACTIVE',
          isVerified: true,
          applicationId: app.id || app.applicationId,
        };
        return updated;
      }

      // Generate unique slug
      let uniqueSlug = baseSlug;
      let counter = 1;
      while (prevShops.some((s) => s.slug === uniqueSlug)) {
        uniqueSlug = `${baseSlug}-${counter++}`;
      }

      // Determine category icon
      const catLower = (app.category || '').toLowerCase();
      const categoryIcon =
        catLower.includes('laptop') || catLower.includes('computer')
          ? 'laptop'
          : catLower.includes('wash') || catLower.includes('appliance')
          ? 'washing-machine'
          : catLower.includes('screen') || catLower.includes('tv') || catLower.includes('monitor')
          ? 'monitor'
          : 'smartphone';

      // Build service areas array
      const serviceAreas =
        Array.isArray(app.serviceAreas) && app.serviceAreas.length > 0
          ? app.serviceAreas
          : [app.city || 'Local Area'];

      // Build services list
      const services =
        Array.isArray(app.services) && app.services.length > 0
          ? app.services.map((svc) =>
              typeof svc === 'string'
                ? {
                    name: svc,
                    desc: `Certified ${svc} by trained technicians with quality tested parts.`,
                    estTime: 'Same day – 48 hrs',
                    estCost: '₹999 – ₹3,499',
                  }
                : svc
            )
          : [
              {
                name: 'Device Inspection & Diagnostics',
                desc: 'Comprehensive hardware and chip-level inspection.',
                estTime: '2–4 hours',
                estCost: 'Free with repair',
              },
              {
                name: 'Component & Screen Replacement',
                desc: 'OEM grade screen, battery, or charging port fix with warranty.',
                estTime: 'Same day',
                estCost: '₹1,500 – ₹4,500',
              },
              {
                name: 'Motherboard & Circuit Restoration',
                desc: 'Precision micro-soldering and IC restoration.',
                estTime: '1–2 days',
                estCost: '₹2,500 – ₹6,000',
              },
            ];

      const newShop = {
        id: `shop-${Date.now()}`,
        slug: uniqueSlug,
        name: app.shopName,
        category: app.category || 'Multi-Device Repair',
        categoryIcon,
        location: app.city || (app.address ? `${app.address}, ${app.city}` : 'Central Hub'),
        address: app.address || `${app.city || 'Downtown'}, India`,
        city: app.city || 'Indore',
        phone: app.ownerPhone || app.phone || '+91 98765 43210',
        email: app.ownerEmail || app.email || 'contact@repairshop.in',
        ownerName: app.ownerName || 'Verified Partner',
        hours: 'Mon – Sat: 10:00 AM – 8:00 PM',
        rating: 5.0,
        reviewCount: 0,
        serviceAreas,
        description:
          app.description ||
          `Professional repair services by ${app.shopName}. Certified technicians, fast turnaround, and doorstep pickup available for all supported devices.`,
        tags: [app.category || 'Repairs', ...serviceAreas].filter(Boolean),
        turnaround: '24–48 hours',
        isVerified: true,
        isOpen: true,
        pickupAvailable: app.pickupAvailable !== undefined ? Boolean(app.pickupAvailable) : true,
        status: 'ACTIVE',
        applicationId: app.id || app.applicationId,
        registeredDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        services,
        features: [
          '30-Day Service Warranty',
          'Certified Technicians',
          'Doorstep Pickup Available',
          'Live Repair Tracking',
        ],
      };

      return [newShop, ...prevShops];
    });
  }, [shopApplications]);

  const rejectShopApplication = useCallback((id, reason) => {
    setShopApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? {
              ...app,
              status: 'REJECTED',
              rejectionReason: reason || 'Application does not meet current platform standards.',
            }
          : app
      )
    );
  }, []);

  const findApplication = useCallback(
    ({ email, applicationId }) => {
      const cleanEmail = email ? email.trim().toLowerCase() : '';
      const cleanAppId = applicationId ? applicationId.trim().toUpperCase() : '';

      return shopApplications.find((app) => {
        const matchesEmail = cleanEmail && app.ownerEmail.toLowerCase() === cleanEmail;
        const matchesId =
          cleanAppId &&
          (app.applicationId?.toUpperCase() === cleanAppId || app.id?.toUpperCase() === cleanAppId);

        if (cleanEmail && cleanAppId) {
          return matchesEmail || matchesId;
        }
        return matchesEmail || matchesId;
      });
    },
    [shopApplications]
  );

  // ─── Shop Active / Inactive Methods ─────────────────────────
  const toggleShopStatus = useCallback((shopId) => {
    setShops((prev) =>
      prev.map((shop) => {
        if (shop.id === shopId || shop.slug === shopId) {
          const nextStatus = shop.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
          return { ...shop, status: nextStatus };
        }
        return shop;
      })
    );
  }, []);

  const setShopStatus = useCallback((shopId, status) => {
    setShops((prev) =>
      prev.map((shop) =>
        shop.id === shopId || shop.slug === shopId ? { ...shop, status } : shop
      )
    );
  }, []);

  // ─── Repairs Tracking Methods ───────────────────────────────
  const getRepairByCode = useCallback(
    (code) => {
      if (!code) return null;
      const clean = code.trim().toLowerCase();
      return (
        repairs.find(
          (r) =>
            r.trackingCode?.toLowerCase() === clean ||
            r.id?.toLowerCase() === clean ||
            (clean === 'rt-sh001-x7k92' && r.trackingCode === 'RT-SH001-X7K92')
        ) || null
      );
    },
    [repairs]
  );

  // ─── Pickups Methods ────────────────────────────────────────
  const addPickup = useCallback((pickupData) => {
    const newPickup = {
      id: `p-${Date.now()}`,
      customerId: pickupData.customerId || 'c1',
      customerName: pickupData.customerName || 'Arjun Mehta',
      customerPhone: pickupData.phone || '+91 98100 11111',
      address: pickupData.address,
      city: pickupData.city,
      device: `${pickupData.brand} ${pickupData.model}`.trim(),
      issue: pickupData.problem,
      status: 'PENDING',
      requestedDate: pickupData.preferredDate || new Date().toISOString().split('T')[0],
      scheduledDate: null,
      shopId: pickupData.shopId,
      shopName: pickupData.shopName || 'Partner Repair Shop',
      shopSlug: pickupData.shopSlug || 'quickfix-mobile-center',
      notes: pickupData.notes || '',
    };

    setPickups((prev) => [newPickup, ...prev]);
    return newPickup;
  }, []);

  const value = {
    // Shop applications
    shopApplications,
    addShopApplication,
    approveShopApplication,
    rejectShopApplication,
    findApplication,

    // Shops
    shops,
    activeShops: shops.filter((s) => s.status === 'ACTIVE'),
    toggleShopStatus,
    setShopStatus,

    // Repairs
    repairs,
    getRepairByCode,

    // Pickups
    pickups,
    addPickup,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

export default AppStateContext;
