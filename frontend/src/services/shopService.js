// ─────────────────────────────────────────────────────────────
// RepairTrack — Shop API Service
// Centralized service for public shop discovery and shop profiles.
// ─────────────────────────────────────────────────────────────

import api from '../api/axios';

/**
 * Derives a category icon key based on category or service name.
 */
function deriveCategoryIcon(category = '', services = '') {
  const text = `${category} ${services}`.toLowerCase();
  if (text.includes('laptop') || text.includes('computer') || text.includes('pc')) {
    return 'laptop';
  }
  if (text.includes('wash') || text.includes('appliance') || text.includes('refrigerator') || text.includes('ac')) {
    return 'washing-machine';
  }
  if (text.includes('tv') || text.includes('display') || text.includes('monitor') || text.includes('screen')) {
    return 'monitor';
  }
  return 'smartphone';
}

/**
 * Normalizes a raw backend Shop response into the frontend UI shape.
 * Ensures no undefined/null rendering occurs in ShopCard and ShopProfilePage.
 */
export function adaptShop(rawShop) {
  if (!rawShop) return null;

  const category = rawShop.category || 'Multi-Device Repair';
  const categoryIcon = deriveCategoryIcon(category, rawShop.services);
  const city = rawShop.city || '';
  const address = rawShop.address || (city ? `${city}, India` : 'Registered Workshop');
  const location = city ? (rawShop.address ? `${rawShop.address}, ${city}` : city) : address;
  const isPickupAvailable = Boolean(rawShop.pickup_available);

  // Parse comma-separated services string into structured service objects
  let parsedServices = [];
  if (typeof rawShop.services === 'string' && rawShop.services.trim()) {
    parsedServices = rawShop.services
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((svcName) => ({
        name: svcName,
        desc: `Professional ${svcName.toLowerCase()} with quality tested components and warranty.`,
        estTime: 'Same day – 48 hrs',
        estCost: '₹999 – ₹3,499',
      }));
  }

  // Fallback services if none specified
  if (parsedServices.length === 0) {
    parsedServices = [
      {
        name: 'Device Inspection & Diagnostics',
        desc: 'Comprehensive hardware check and fault localization.',
        estTime: '1–2 hours',
        estCost: 'Free with repair',
      },
      {
        name: 'Screen & Display Replacement',
        desc: 'OEM grade screen replacement with quality testing.',
        estTime: 'Same day',
        estCost: '₹1,500 – ₹5,000',
      },
      {
        name: 'Battery & Power Subsystem Fix',
        desc: 'Battery swap, charging IC restoration, and port repair.',
        estTime: '1–2 hours',
        estCost: '₹1,200 – ₹3,200',
      },
      {
        name: 'Motherboard & Circuit Restoration',
        desc: 'Micro-soldering and chip-level restoration by senior technicians.',
        estTime: '1–2 days',
        estCost: '₹2,500 – ₹6,500',
      },
    ];
  }

  // Generate tag pills safely
  const tagList = [
    category,
    city,
    ...(parsedServices.slice(0, 2).map((s) => s.name)),
  ].filter(Boolean);

  return {
    id: rawShop.id,
    slug: rawShop.slug,
    name: rawShop.name,
    category,
    categoryIcon,
    location,
    city,
    address,
    state: rawShop.state || '',
    phone: rawShop.phone || '+91 98765 43210',
    email: rawShop.email || 'contact@repairshop.in',
    description: rawShop.description || `Verified repair workshop providing professional services for ${category.toLowerCase()}.`,
    status: rawShop.is_active ? 'ACTIVE' : 'INACTIVE',
    isVerified: true,
    isOpen: Boolean(rawShop.is_active),
    rating: 4.8,
    reviewCount: 48,
    turnaround: '24–48 hours',
    hours: 'Mon – Sat: 10:00 AM – 8:00 PM',
    pickupAvailable: isPickupAvailable,
    serviceAreas: city ? [city] : ['Local Area'],
    tags: Array.from(new Set(tagList)),
    services: parsedServices,
    features: [
      '30-Day Service Warranty',
      'Certified Technicians',
      'Doorstep Pickup Available',
      'Live Repair Tracking',
    ],
  };
}

/**
 * Fetch all publicly listed approved & active shops.
 * Supports optional backend filter parameters: { location, search, category }.
 */
export async function getShops(params = {}) {
  const queryParams = {};
  if (params.location && params.location.trim()) {
    queryParams.location = params.location.trim();
  }
  if (params.search && params.search.trim()) {
    queryParams.search = params.search.trim();
  }
  if (params.category && params.category.trim() && params.category.trim().toLowerCase() !== 'all') {
    queryParams.category = params.category.trim();
  }

  const response = await api.get('/shops', { params: queryParams });
  const rawList = Array.isArray(response.data) ? response.data : [];
  return rawList.map(adaptShop);
}

/**
 * Fetch a single shop by its URL slug.
 */
export async function getShopBySlug(slug) {
  if (!slug) throw new Error('Shop slug is required');
  const response = await api.get(`/shops/slug/${encodeURIComponent(slug)}`);
  return adaptShop(response.data);
}

/**
 * Fetch a single shop by its database ID.
 */
export async function getShopById(id) {
  if (!id) throw new Error('Shop ID is required');
  const response = await api.get(`/shops/${id}`);
  return adaptShop(response.data);
}

export default {
  getShops,
  getShopBySlug,
  getShopById,
  adaptShop,
};
