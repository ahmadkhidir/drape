/**
 * Drape Master Tailor Directory & Concierge Handoff Types
 * Permanent Spec Anchors:
 * - FEAT-010: "Send to Atelier" Vetted Master Tailor Concierge
 * - Screen 8: Master Tailor Directory (screens/08-master-tailor-directory.md)
 * - C-025: GET /api/v1/tailors
 * - C-026: GET /api/v1/tailors/:id
 * - C-027: POST /api/v1/orders/:id/route-tailor
 * - EVT-014: tailor_concierge_routed (analytics.md)
 */

export type TailorCity = 'London' | 'New York' | 'Paris' | 'Milan' | 'Lagos';
export type TailorCityParam = 'London' | 'New_York' | 'Paris' | 'Milan' | 'Lagos';

export type TailorSpecialty = 'bridal' | 'suiting' | 'corsetry' | 'traditional';

export interface VerifiedReview {
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface TailorStudioItem {
  id: string;
  studioName: string;
  masterCutter: string;
  bio?: string;
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
  averageLaborCostUSD?: number;
  verifiedReviews?: VerifiedReview[];
}

export interface TailorStudioDetail extends TailorStudioItem {
  bio: string;
  contactEmail: string;
  phone: string;
  averageLaborCostUSD: number;
  verifiedReviews: VerifiedReview[];
  createdAt: string;
}

export interface TailorPagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export interface TailorListResponse {
  items: TailorStudioItem[];
  pagination: TailorPagination;
}

export interface TailorFilterParams {
  cities?: TailorCity[];
  specialty?: TailorSpecialty;
  maxTurnaroundWeeks?: number;
  acceptingCommissions?: boolean;
  page?: number;
  limit?: number;
  searchQuery?: string;
}

export interface RouteOrderToTailorRequest {
  tailorStudioId: string;
  consultationDatePreferred?: string;
  specialInstructions?: string;
}

export interface TailorDispatchRecord {
  id: string;
  orderId: string;
  tailorStudioId: string;
  studioName: string;
  status: 'dispatched' | 'received_at_atelier' | 'in_construction' | 'completed';
  digitalSpecUrl: string;
  carrierTrackingNumber: string | null;
  dispatchedAt: string;
}

export interface TailorBookingConfirmation {
  consultationCalendarUrl: string;
  estimatedAtelierArrivalDate: string;
}

export interface RouteTailorResponse {
  dispatchRecord: TailorDispatchRecord;
  bookingConfirmation: TailorBookingConfirmation;
}

export interface RouteTailorErrorResponse {
  code: 'ORDER_NOT_ROUTABLE' | 'ORDER_OR_TAILOR_NOT_FOUND' | 'TAILOR_AT_CAPACITY' | 'VALIDATION_FAILED';
  message: string;
  waitlistEstimatedDate?: string;
}

export interface TailorConciergeRoutedEvent {
  event_id: string;
  occurred_at: string;
  platform: 'web';
  app_version: string;
  event_name: 'tailor_concierge_routed';
  order_id: string;
  tailor_studio_id: string;
  city: string;
}

export interface TailorNomination {
  tailorName: string;
  studioName: string;
  city: string;
  specialty: string;
  nominatorEmail: string;
  websiteOrInstagram?: string;
  notes?: string;
}
