/**
 * Drape Core Master Tailor & Concierge Routing Service
 * Spec Anchor: docs/Drape/features/FEAT-010.md, docs/Drape/schema.md, docs/Drape/analytics.md (EVT-014), C-025, C-026, C-027
 */

import { randomUUID } from 'node:crypto';
import { store } from '../db/store.js';
import {
  initialTailorStudios,
  type TailorStudio,
  type TailorDispatch,
  type VerifiedReview,
} from '../db/schema/tailors.js';

export interface TailorStudioListItem {
  id: string;
  studioName: string;
  masterCutter: string;
  city: string;
  address: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  turnaroundWeeks: number;
  activeCapacity: boolean;
  leadTimeDays: number;
  portfolioImages: string[];
  guildBadge: string | null;
}

export interface TailorStudioDetail {
  id: string;
  studioName: string;
  masterCutter: string;
  bio: string;
  city: string;
  address: string;
  contactEmail: string;
  phone: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  turnaroundWeeks: number;
  activeCapacity: boolean;
  averageLaborCostUSD: number;
  portfolioImages: string[];
  verifiedReviews: VerifiedReview[];
  createdAt: string;
}

export interface TailorFilterParams {
  city?: string;
  specialty?: string;
  maxTurnaroundWeeks?: number;
  acceptingCommissions?: boolean;
  page?: number;
  limit?: number;
}

export interface RouteOrderParams {
  orderId: string;
  tailorStudioId: string;
  consultationDatePreferred?: string;
  specialInstructions?: string;
  user: {
    id: string;
    role: string;
    email?: string;
  };
}

export interface RouteTailorResult {
  dispatchRecord: {
    id: string;
    orderId: string;
    tailorStudioId: string;
    studioName: string;
    status: 'dispatched' | 'received_at_atelier';
    digitalSpecUrl: string;
    carrierTrackingNumber: string | null;
    dispatchedAt: string;
  };
  bookingConfirmation: {
    consultationCalendarUrl: string;
    estimatedAtelierArrivalDate: string;
  };
}

export interface TelemetryEventPayload {
  eventId: string;
  eventName: string;
  properties: Record<string, any>;
  timestamp: string;
}

export class OrderOrTailorNotFoundError extends Error {
  constructor(message = 'Order or Tailor Studio ID not found.') {
    super(message);
    this.name = 'OrderOrTailorNotFoundError';
  }
}

export class OrderNotRoutableError extends Error {
  constructor(message = 'Order is already dispatched to customer address or has been cancelled.') {
    super(message);
    this.name = 'OrderNotRoutableError';
  }
}

export class TailorAtCapacityError extends Error {
  public waitlistEstimatedDate: string;

  constructor(
    message = 'Selected studio has temporarily paused new commissions. Please select an alternate atelier.',
    waitlistEstimatedDate: string = '2026-12-01'
  ) {
    super(message);
    this.name = 'TailorAtCapacityError';
    this.waitlistEstimatedDate = waitlistEstimatedDate;
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Access denied to requested order.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class TailorService {
  private studios: Map<string, TailorStudioDetail> = new Map();
  private dispatches: Map<string, TailorDispatch> = new Map();
  private telemetryEvents: TelemetryEventPayload[] = [];

  constructor() {
    this.seedDefaults();
  }

  public seedDefaults(): void {
    this.studios.clear();
    for (const studio of initialTailorStudios) {
      this.studios.set(studio.id, {
        id: studio.id,
        studioName: studio.studioName,
        masterCutter: studio.masterCutter,
        bio: studio.bio,
        city: studio.city,
        address: studio.address,
        contactEmail: studio.contactEmail,
        phone: studio.phone,
        specialties: [...studio.specialties],
        rating: Number(studio.rating),
        reviewCount: studio.reviewCount,
        turnaroundWeeks: studio.turnaroundWeeks,
        activeCapacity: studio.activeCapacity,
        averageLaborCostUSD: Number(studio.averageLaborCostUSD),
        portfolioImages: [...studio.portfolioImages],
        verifiedReviews: [...studio.verifiedReviews],
        createdAt: studio.createdAt,
      });
    }
  }

  /**
   * C-025: List and filter master tailor studios directory.
   */
  public async listTailors(filters: TailorFilterParams = {}): Promise<{
    items: TailorStudioListItem[];
    pagination: {
      totalItems: number;
      totalPages: number;
      currentPage: number;
    };
  }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.max(1, Math.min(50, filters.limit ?? 10));
    const acceptingCommissions = filters.acceptingCommissions ?? true;

    let results = Array.from(this.studios.values());

    // Filter by city (normalize "New York" vs "New_York" and case-insensitive)
    if (filters.city) {
      const normalizedCityFilter = filters.city.trim().toLowerCase().replace(/\s+/g, '_');
      results = results.filter((s) => {
        const studioCity = s.city.trim().toLowerCase().replace(/\s+/g, '_');
        return studioCity === normalizedCityFilter;
      });
    }

    // Filter by specialty
    if (filters.specialty) {
      const targetSpecialty = filters.specialty.trim().toLowerCase();
      results = results.filter((s) =>
        s.specialties.some((spec) => spec.toLowerCase() === targetSpecialty)
      );
    }

    // Filter by max turnaround weeks
    if (filters.maxTurnaroundWeeks !== undefined) {
      const maxWeeks = filters.maxTurnaroundWeeks;
      results = results.filter((s) => s.turnaroundWeeks <= maxWeeks);
    }

    // Filter by accepting commissions (activeCapacity)
    if (acceptingCommissions !== undefined) {
      if (acceptingCommissions) {
        results = results.filter((s) => s.activeCapacity === true);
      }
    }

    const totalItems = results.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const startIndex = (page - 1) * limit;
    const paginated = results.slice(startIndex, startIndex + limit);

    const items: TailorStudioListItem[] = paginated.map((s) => ({
      id: s.id,
      studioName: s.studioName,
      masterCutter: s.masterCutter,
      city: s.city,
      address: s.address,
      specialties: s.specialties,
      rating: s.rating,
      reviewCount: s.reviewCount,
      turnaroundWeeks: s.turnaroundWeeks,
      activeCapacity: s.activeCapacity,
      leadTimeDays: s.turnaroundWeeks * 7,
      portfolioImages: s.portfolioImages,
      guildBadge:
        initialTailorStudios.find((init) => init.id === s.id)?.guildBadge ?? null,
    }));

    return {
      items,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
      },
    };
  }

  /**
   * C-026: Retrieve master tailor studio profile details by ID.
   */
  public async getTailorById(id: string): Promise<TailorStudioDetail | null> {
    return this.studios.get(id) || null;
  }

  /**
   * Check studio capacity and calculate estimated waitlist date.
   */
  public async checkTailorCapacity(id: string): Promise<{
    studio: TailorStudioDetail | null;
    isAtCapacity: boolean;
    waitlistEstimatedDate?: string;
  }> {
    const studio = await this.getTailorById(id);
    if (!studio) {
      return { studio: null, isAtCapacity: false };
    }

    if (!studio.activeCapacity) {
      // Calculate estimated waitlist date (6 weeks out)
      const waitlistDate = new Date();
      waitlistDate.setDate(waitlistDate.getDate() + 42);
      const isoDate = waitlistDate.toISOString().split('T')[0];
      return {
        studio,
        isAtCapacity: true,
        waitlistEstimatedDate: isoDate,
      };
    }

    return {
      studio,
      isAtCapacity: false,
    };
  }

  /**
   * C-027: Route order to partner master tailor and dispatch EVT-014.
   */
  public async routeOrderToTailor(params: RouteOrderParams): Promise<RouteTailorResult> {
    const { orderId, tailorStudioId, consultationDatePreferred, specialInstructions, user } = params;

    // 1. Fetch Order
    const order = await store.findOrderById(orderId);
    if (!order) {
      throw new OrderOrTailorNotFoundError('Order or Tailor Studio ID not found.');
    }

    // 2. Authorization check: order owner or admin
    if (user.role !== 'admin' && order.userId !== user.id) {
      throw new ForbiddenError('Access denied to requested order.');
    }

    // 3. Routability check
    if (order.status === 'cancelled' || order.status === 'delivered') {
      throw new OrderNotRoutableError(
        'Order is already dispatched to customer address or has been cancelled.'
      );
    }
    // If order is already dispatched directly to customer (and had no prior tailor dispatch)
    if (order.status === 'dispatched' && !order.tailorDispatch) {
      throw new OrderNotRoutableError(
        'Order is already dispatched to customer address or has been cancelled.'
      );
    }

    // 4. Fetch Tailor Studio
    const studio = await this.getTailorById(tailorStudioId);
    if (!studio) {
      throw new OrderOrTailorNotFoundError('Order or Tailor Studio ID not found.');
    }

    // 5. Capacity Check
    if (!studio.activeCapacity) {
      const waitlistDate = new Date();
      waitlistDate.setDate(waitlistDate.getDate() + 42);
      const waitlistEstimatedDate = waitlistDate.toISOString().split('T')[0];
      throw new TailorAtCapacityError(
        'Selected studio has temporarily paused new commissions. Please select an alternate atelier.',
        waitlistEstimatedDate
      );
    }

    // 6. Create Tailor Dispatch Record
    const dispatchId = randomUUID();
    const dispatchedAt = new Date().toISOString();
    const digitalSpecUrl = `https://drape.com/specs/public/spec_${order.orderNumber}`;
    const carrierTrackingNumber = `DHL-CONCIERGE-${Math.floor(1000000 + Math.random() * 9000000)}`;

    const slug = studio.studioName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const consultationCalendarUrl = `https://calendar.drape.luxury/atelier/${slug}/consultation?ref=${order.orderNumber}`;

    // Estimated arrival: 5 days from now
    const arrivalDate = new Date();
    arrivalDate.setDate(arrivalDate.getDate() + 5);
    const estimatedAtelierArrivalDate = arrivalDate.toISOString().split('T')[0];

    // Store dispatch in memory store
    const dispatchRecord: TailorDispatch = {
      id: dispatchId,
      orderId: order.id,
      tailorStudioId: studio.id,
      status: 'dispatched',
      digitalSpecUrl,
      carrierTrackingNumber,
      consultationDatePreferred: consultationDatePreferred || null,
      specialInstructions: specialInstructions || null,
      consultationCalendarUrl,
      estimatedAtelierArrivalDate,
      dispatchedAt: new Date(dispatchedAt),
    };
    this.dispatches.set(dispatchId, dispatchRecord);

    // Update parent order
    order.tailorDispatch = {
      dispatchId,
      tailorStudioId: studio.id,
      status: 'dispatched',
      studioName: studio.studioName,
      masterCutter: studio.masterCutter,
      city: studio.city,
    };

    // 7. Dispatch EVT-014 Telemetry Event
    this.dispatchTelemetry({
      eventId: 'EVT-014',
      eventName: 'tailor_concierge_routed',
      properties: {
        order_id: order.id,
        tailor_studio_id: studio.id,
        city: studio.city,
      },
      timestamp: dispatchedAt,
    });

    return {
      dispatchRecord: {
        id: dispatchId,
        orderId: order.id,
        tailorStudioId: studio.id,
        studioName: studio.studioName,
        status: 'dispatched',
        digitalSpecUrl,
        carrierTrackingNumber,
        dispatchedAt,
      },
      bookingConfirmation: {
        consultationCalendarUrl,
        estimatedAtelierArrivalDate,
      },
    };
  }

  /**
   * Dispatches telemetry event according to EVT-014 specification.
   */
  public dispatchTelemetry(payload: TelemetryEventPayload): void {
    this.telemetryEvents.push(payload);
  }

  public getTelemetryEvents(): TelemetryEventPayload[] {
    return [...this.telemetryEvents];
  }

  public clearTelemetryEvents(): void {
    this.telemetryEvents = [];
  }
}

export const tailorService = new TailorService();
