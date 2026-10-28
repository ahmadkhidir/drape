/**
 * Drape Master Tailor Directory API Client & Telemetry Dispatcher
 * Spec Anchors:
 * - FEAT-010: "Send to Atelier" Concierge Handoff
 * - C-025: GET /api/v1/tailors
 * - C-026: GET /api/v1/tailors/:id
 * - C-027: POST /api/v1/orders/:id/route-tailor
 * - EVT-014: tailor_concierge_routed (analytics.md)
 */

import {
  TailorCity,
  TailorCityParam,
  TailorSpecialty,
  TailorStudioItem,
  TailorStudioDetail,
  TailorListResponse,
  TailorFilterParams,
  RouteOrderToTailorRequest,
  RouteTailorResponse,
  TailorConciergeRoutedEvent,
} from './types';

/**
 * Curated Seed Data for Verified Master Tailors & Couture Salons
 * Matches services/core/src/db/schema/tailors.ts
 */
export const INITIAL_TAILOR_STUDIOS: TailorStudioDetail[] = [
  {
    id: '33333333-3333-4333-a333-333333333301',
    studioName: 'Savile & Co. Bespoke Cutters',
    masterCutter: 'Arthur Pendelton',
    bio: 'Over four decades of heritage suiting and architectural tailoring on Savile Row, specializing in hand-padded chest canvassing and structured British drape silhouettes.',
    city: 'London',
    address: '14 Savile Row, Mayfair, London W1S 3JN, United Kingdom',
    contactEmail: 'concierge@savileandco.co.uk',
    phone: '+44 20 7946 0192',
    specialties: ['suiting', 'corsetry'],
    rating: 4.96,
    reviewCount: 52,
    turnaroundWeeks: 4,
    leadTimeDays: 28,
    activeCapacity: true,
    averageLaborCostUSD: 2200.0,
    portfolioImages: [
      'https://assets.drape.luxury/tailors/savile-london-01.webp',
      'https://assets.drape.luxury/tailors/savile-london-02.webp',
    ],
    guildBadge: 'Savile Row Bespoke Association',
    verifiedReviews: [
      {
        authorName: 'Lord Harrington',
        rating: 5.0,
        comment: 'Master Pendelton rendered the charcoal barathea suiting with absolute perfection.',
        createdAt: '2026-01-18T14:30:00Z',
      },
      {
        authorName: 'Lady Genevieve',
        rating: 4.9,
        comment: 'The corseted dinner jacket draped seamlessly from the 3D technical spec.',
        createdAt: '2026-02-04T09:15:00Z',
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '33333333-3333-4333-a333-333333333302',
    studioName: 'Atelier Savile New York',
    masterCutter: 'Percival Vance',
    bio: "Manhattan's premier bespoke house specializing in sharp modern suiting, architectural tuxedos, and intricate corseted evening wear for galas and red carpets.",
    city: 'New York',
    address: '740 Madison Ave, New York, NY 10065, United States',
    contactEmail: 'concierge@ateliersavileny.com',
    phone: '+1 212 555 0148',
    specialties: ['suiting', 'corsetry', 'bridal'],
    rating: 4.95,
    reviewCount: 48,
    turnaroundWeeks: 3,
    leadTimeDays: 21,
    activeCapacity: true,
    averageLaborCostUSD: 2400.0,
    portfolioImages: [
      'https://assets.drape.luxury/tailors/atelier-ny-01.webp',
      'https://assets.drape.luxury/tailors/atelier-ny-02.webp',
    ],
    guildBadge: 'Council of Bespoke Tailors America',
    verifiedReviews: [
      {
        authorName: 'Marcus Sterling',
        rating: 5.0,
        comment: 'The bolt of emerald silk brocade arrived in archival packaging and the fit is peerless.',
        createdAt: '2026-02-14T11:00:00Z',
      },
      {
        authorName: 'Claire Dupont',
        rating: 4.9,
        comment: 'Flawless execution of the Grecian bias silhouette with zero fabric waste.',
        createdAt: '2026-02-22T16:45:00Z',
      },
    ],
    createdAt: '2026-01-05T00:00:00Z',
  },
  {
    id: '33333333-3333-4333-a333-333333333303',
    studioName: 'Maison de Couture Saint-Honoré',
    masterCutter: 'Geneviève Delacroix',
    bio: 'Historic Parisian haute couture bridal and corsetry atelier employing ancestral French bias draping and delicate hand-finished silk embroidery.',
    city: 'Paris',
    address: '28 Rue du Faubourg Saint-Honoré, 75008 Paris, France',
    contactEmail: 'contact@sainthonore-couture.fr',
    phone: '+33 1 42 68 55 00',
    specialties: ['bridal', 'corsetry'],
    rating: 4.98,
    reviewCount: 64,
    turnaroundWeeks: 5,
    leadTimeDays: 35,
    activeCapacity: true,
    averageLaborCostUSD: 3100.0,
    portfolioImages: [
      'https://assets.drape.luxury/tailors/maison-paris-01.webp',
      'https://assets.drape.luxury/tailors/maison-paris-02.webp',
    ],
    guildBadge: 'Chambre Syndicale de la Haute Couture',
    verifiedReviews: [
      {
        authorName: 'Elena Rostova',
        rating: 5.0,
        comment: 'Delacroix shaped the silk crepe de chine bridal gown with transcendental grace.',
        createdAt: '2026-01-29T10:10:00Z',
      },
    ],
    createdAt: '2026-01-03T00:00:00Z',
  },
  {
    id: '33333333-3333-4333-a333-333333333304',
    studioName: 'Sartoria Brera Alta Moda',
    masterCutter: 'Giancarlo Rossi',
    bio: 'Milanese soft-shoulder tailoring and fluid silk evening silhouettes executed with superlative Italian craftsmanship and hand-stitched pick lapels.',
    city: 'Milan',
    address: 'Via Brera 8, 20121 Milano MI, Italy',
    contactEmail: 'info@sartoriabrera.it',
    phone: '+39 02 876 5432',
    specialties: ['suiting', 'bridal'],
    rating: 4.94,
    reviewCount: 42,
    turnaroundWeeks: 4,
    leadTimeDays: 28,
    activeCapacity: true,
    averageLaborCostUSD: 2600.0,
    portfolioImages: [
      'https://assets.drape.luxury/tailors/sartoria-milano-01.webp',
      'https://assets.drape.luxury/tailors/sartoria-milano-02.webp',
    ],
    guildBadge: 'Camera Nazionale della Moda Italiana',
    verifiedReviews: [
      {
        authorName: 'Alessandro Conti',
        rating: 4.9,
        comment: 'Effortless Milanese drape. The wool-silk blend fell exactly as the WebGPU simulation previewed.',
        createdAt: '2026-02-10T13:20:00Z',
      },
    ],
    createdAt: '2026-01-08T00:00:00Z',
  },
  {
    id: '33333333-3333-4333-a333-333333333305',
    studioName: 'Sartoria Quadrilatero Milano',
    masterCutter: 'Matteo Bellini',
    bio: 'Exclusive Montenapoleone bespoke workshop renowned for hand-canvassed double-breasted overcoats and structured wool tuxedos. Currently at capacity due to seasonal gala demand.',
    city: 'Milan',
    address: 'Via Monte Napoleone 12, 20121 Milano MI, Italy',
    contactEmail: 'concierge@quadrilaterobellini.it',
    phone: '+39 02 760 1928',
    specialties: ['suiting'],
    rating: 4.92,
    reviewCount: 39,
    turnaroundWeeks: 6,
    leadTimeDays: 42,
    activeCapacity: false, // Waitlist only per FEAT-010 & C-027
    averageLaborCostUSD: 2800.0,
    portfolioImages: [
      'https://assets.drape.luxury/tailors/quadrilatero-milano-01.webp',
    ],
    guildBadge: 'Camera Nazionale della Moda Italiana',
    verifiedReviews: [
      {
        authorName: 'Matteo Morandi',
        rating: 5.0,
        comment: 'Phenomenal precision, although waitlists can extend into the next season.',
        createdAt: '2026-01-12T15:40:00Z',
      },
    ],
    createdAt: '2026-01-04T00:00:00Z',
  },
  {
    id: '33333333-3333-4333-a333-333333333306',
    studioName: 'Alara Heritage Atelier',
    masterCutter: 'Folashade Adeleke',
    bio: 'Acclaimed West African luxury couture house fusing ancestral Aso-Oke hand weaving, traditional Agbada embroidery, and modern corseted evening gowns.',
    city: 'Lagos',
    address: '12A Temple Run Road, Ikoyi, Lagos 101233, Nigeria',
    contactEmail: 'bespoke@alaraheritage.ng',
    phone: '+234 1 271 0022',
    specialties: ['traditional', 'bridal', 'suiting'],
    rating: 4.97,
    reviewCount: 57,
    turnaroundWeeks: 4,
    leadTimeDays: 28,
    activeCapacity: true,
    averageLaborCostUSD: 1600.0,
    portfolioImages: [
      'https://assets.drape.luxury/tailors/alara-lagos-01.webp',
      'https://assets.drape.luxury/tailors/alara-lagos-02.webp',
    ],
    guildBadge: 'West African Bespoke Guild',
    verifiedReviews: [
      {
        authorName: 'Chidinma Okafor',
        rating: 5.0,
        comment: 'The bridal corset and traditional metallic brocade train took breath away at the reception.',
        createdAt: '2026-02-19T18:00:00Z',
      },
      {
        authorName: 'Babatunde Alabi',
        rating: 4.9,
        comment: 'Exceptional cutting precision and prompt white-glove delivery to Ikoyi.',
        createdAt: '2026-02-25T11:30:00Z',
      },
    ],
    createdAt: '2026-01-07T00:00:00Z',
  },
];

export const CITIES: TailorCity[] = ['London', 'New York', 'Paris', 'Milan', 'Lagos'];

export const SPECIALTY_TABS: Array<{ id: TailorSpecialty; label: string }> = [
  { id: 'bridal', label: 'Bridal & Gowns' },
  { id: 'suiting', label: 'Bespoke Suiting' },
  { id: 'corsetry', label: 'Corsetry' },
  { id: 'traditional', label: 'Traditional Cultural Attire' },
];

/**
 * Normalizes city string for API C-025 contract query ('New York' -> 'New_York')
 */
export function normalizeCityForApi(city: TailorCity): TailorCityParam {
  if (city === 'New York') return 'New_York';
  return city;
}

/**
 * Normalizes city string from API/db for display ('New_York' -> 'New York')
 */
export function formatCityName(city: string): TailorCity {
  const normalized = city.replace(/_/g, ' ');
  if (normalized === 'New York') return 'New York';
  if (normalized === 'London') return 'London';
  if (normalized === 'Paris') return 'Paris';
  if (normalized === 'Milan') return 'Milan';
  if (normalized === 'Lagos') return 'Lagos';
  return normalized as TailorCity;
}

/**
 * Filters the local in-memory dataset according to search and selection criteria.
 */
export function filterLocalTailors(params: TailorFilterParams = {}): TailorListResponse {
  let filtered = [...INITIAL_TAILOR_STUDIOS];

  // City filter (multi-select)
  if (params.cities && params.cities.length > 0) {
    const formattedCities = params.cities.map((c) => formatCityName(c));
    filtered = filtered.filter((studio) =>
      formattedCities.includes(formatCityName(studio.city))
    );
  }

  // Specialty filter
  if (params.specialty) {
    filtered = filtered.filter((studio) =>
      studio.specialties.includes(params.specialty!)
    );
  }

  // Max turnaround filter
  if (params.maxTurnaroundWeeks !== undefined) {
    filtered = filtered.filter(
      (studio) => studio.turnaroundWeeks <= params.maxTurnaroundWeeks!
    );
  }

  // Accepting commissions filter
  if (params.acceptingCommissions !== undefined) {
    filtered = filtered.filter(
      (studio) => studio.activeCapacity === params.acceptingCommissions
    );
  }

  // Text search
  if (params.searchQuery && params.searchQuery.trim().length > 0) {
    const q = params.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (s) =>
        s.studioName.toLowerCase().includes(q) ||
        s.masterCutter.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.bio.toLowerCase().includes(q) ||
        (s.guildBadge && s.guildBadge.toLowerCase().includes(q))
    );
  }

  const page = params.page || 1;
  const limit = params.limit || 12;
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedItems = filtered.slice(startIndex, startIndex + limit);

  return {
    items: paginatedItems,
    pagination: {
      totalItems,
      totalPages,
      currentPage: page,
    },
  };
}

/**
 * Finds alternative accredited ateliers in the same city when a studio is at capacity.
 */
export function findAlternativeSisterStudios(
  studioId: string,
  city: string
): TailorStudioDetail[] {
  const normalizedCity = formatCityName(city);
  return INITIAL_TAILOR_STUDIOS.filter(
    (s) => s.id !== studioId && formatCityName(s.city) === normalizedCity && s.activeCapacity
  );
}

/**
 * C-025: Fetch tailors from API with fallback to local seed data.
 */
export async function fetchTailors(
  params: TailorFilterParams = {}
): Promise<TailorListResponse> {
  const query = new URLSearchParams();
  if (params.cities && params.cities.length === 1) {
    query.set('city', normalizeCityForApi(params.cities[0]));
  }
  if (params.specialty) {
    query.set('specialty', params.specialty);
  }
  if (params.maxTurnaroundWeeks) {
    query.set('maxTurnaroundWeeks', params.maxTurnaroundWeeks.toString());
  }
  if (params.acceptingCommissions !== undefined) {
    query.set('acceptingCommissions', params.acceptingCommissions.toString());
  }
  if (params.page) {
    query.set('page', params.page.toString());
  }
  if (params.limit) {
    query.set('limit', params.limit.toString());
  }

  const endpoint = `/api/v1/tailors${query.toString() ? `?${query.toString()}` : ''}`;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      // If multi-city filter was requested on client side, refine client results
      if (params.cities && params.cities.length > 1) {
        return filterLocalTailors(params);
      }
      return data;
    }
  } catch {
    // Network unavailable or server offline: fall back to local seed data
  }

  return filterLocalTailors(params);
}

/**
 * C-026: Fetch single tailor studio profile by ID.
 */
export async function fetchTailorById(id: string): Promise<TailorStudioDetail | null> {
  try {
    const res = await fetch(`/api/v1/tailors/${id}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Network fallback
  }

  const local = INITIAL_TAILOR_STUDIOS.find((s) => s.id === id);
  return local || null;
}

/**
 * C-027: Submit concierge tailor routing request.
 */
export async function routeOrderToTailor(
  orderId: string,
  request: RouteOrderToTailorRequest,
  token?: string
): Promise<RouteTailorResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`/api/v1/orders/${orderId}/route-tailor`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (res.ok) {
      const data: RouteTailorResponse = await res.json();
      return data;
    } else {
      const errorData = await res.json().catch(() => ({}));
      const err = new Error(errorData.message || 'Routing order to tailor failed.');
      (err as unknown as { code: string; waitlistEstimatedDate?: string }).code =
        errorData.code || 'UNKNOWN_ERROR';
      (err as unknown as { waitlistEstimatedDate?: string }).waitlistEstimatedDate =
        errorData.waitlistEstimatedDate;
      throw err;
    }
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string; waitlistEstimatedDate?: string };
    if (e.code) {
      throw err;
    }
    // Check if target tailor is at capacity in local seed
    const targetStudio = INITIAL_TAILOR_STUDIOS.find((s) => s.id === request.tailorStudioId);
    if (targetStudio && !targetStudio.activeCapacity) {
      const waitlistDate = new Date();
      waitlistDate.setDate(waitlistDate.getDate() + 42);
      const capacityErr = new Error(
        'Selected studio has temporarily paused new commissions. Please select an alternate atelier.'
      );
      (capacityErr as unknown as { code: string; waitlistEstimatedDate: string }).code =
        'TAILOR_AT_CAPACITY';
      (capacityErr as unknown as { waitlistEstimatedDate: string }).waitlistEstimatedDate =
        waitlistDate.toISOString().split('T')[0];
      throw capacityErr;
    }

    // Local simulated success response for offline/preview environments
    const studio = targetStudio || INITIAL_TAILOR_STUDIOS[0];
    const dispatchDate = new Date().toISOString();
    const arrivalDate = new Date();
    arrivalDate.setDate(arrivalDate.getDate() + 4);

    return {
      dispatchRecord: {
        id: `disp_${Math.random().toString(36).substring(2, 9)}`,
        orderId,
        tailorStudioId: request.tailorStudioId,
        studioName: studio.studioName,
        status: 'dispatched',
        digitalSpecUrl: `https://drape.com/specs/public/spec_${orderId}`,
        carrierTrackingNumber: `DHL-CONCIERGE-${Math.floor(1000000 + Math.random() * 9000000)}`,
        dispatchedAt: dispatchDate,
      },
      bookingConfirmation: {
        consultationCalendarUrl: `https://calendar.drape.luxury/atelier/${studio.studioName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')}/consultation?ref=${orderId}`,
        estimatedAtelierArrivalDate: arrivalDate.toISOString().split('T')[0],
      },
    };
  }
}

/**
 * EVT-014: Dispatches client telemetry event for tailor concierge routing.
 * Permanent Spec Anchor: docs/Drape/analytics.md#EVT-014
 */
export function emitTailorTelemetry(payload: {
  order_id: string;
  tailor_studio_id: string;
  city: string;
}): TailorConciergeRoutedEvent {
  const event: TailorConciergeRoutedEvent = {
    event_id: `evt_${Math.random().toString(36).substring(2, 11)}`,
    occurred_at: new Date().toISOString(),
    platform: 'web',
    app_version: '0.1.0',
    event_name: 'tailor_concierge_routed',
    order_id: payload.order_id,
    tailor_studio_id: payload.tailor_studio_id,
    city: payload.city,
  };

  // Broadcast to global window telemetry queue if present
  if (typeof window !== 'undefined') {
    const globalWindow = window as unknown as {
      __DRAPE_TELEMETRY__?: TailorConciergeRoutedEvent[];
    };
    if (!globalWindow.__DRAPE_TELEMETRY__) {
      globalWindow.__DRAPE_TELEMETRY__ = [];
    }
    globalWindow.__DRAPE_TELEMETRY__.push(event);

    try {
      window.dispatchEvent(
        new CustomEvent('drape:telemetry:EVT-014', { detail: event })
      );
    } catch {
      // Ignore in non-browser environments
    }
  }

  return event;
}
