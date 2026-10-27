/**
 * Drape Atelier Checkout & Yardage Types
 * Permanent Spec Anchors:
 * - C-016 (POST /api/v1/yardage/calculate)
 * - C-019 (POST /api/v1/checkout/bolt-lock)
 * - C-020 (DELETE /api/v1/checkout/bolt-lock/:id)
 * - C-021 (POST /api/v1/checkout/create-intent)
 * - C-022 (POST /api/v1/checkout/orders)
 * - C-023 (GET /api/v1/orders/:id)
 * - FEAT-007, FEAT-008
 */

export type StandardSize =
  | 'US_0'
  | 'US_2'
  | 'US_4'
  | 'US_6'
  | 'US_8'
  | 'US_10'
  | 'US_12'
  | 'US_14'
  | 'US_16'
  | 'US_18'
  | 'US_20'
  | 'US_22'
  | 'US_24';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'NGN';

export interface CuttingPanel {
  name: string;
  lengthYards: number;
  widthInches: number;
  grainlineAngleDegrees: number; // 0.0 for straight grain, 45.0 for bias
  x?: number;
  y?: number;
}

export interface YardageCalculationRequest {
  silhouetteId: string;
  fabricId: string;
  heightCm: number;
  bustCircumferenceCm?: number;
  waistCircumferenceCm?: number;
  hipCircumferenceCm?: number;
  customTrainLengthInches?: number;
  standardSize?: StandardSize;
  boltWidthInches?: number;
}

export interface YardageCalculationResponse {
  recommendedYards: number; // rounded to nearest 0.125
  recommendedMeters: number;
  safetyMarginYards: number;
  boltWidthInches: number;
  activeBoltId: string;
  remainingContinuousYardsOnBolt: number;
  isSplitBoltWarning: boolean;
  isDirectionalNap: boolean;
  cuttingLayout: {
    panels: CuttingPanel[];
    diagramSvgUrl?: string;
  };
  estimatedTotalPrice: number;
}

export interface BoltLockRequest {
  boltId: string;
  requestedYards: number;
}

export interface BoltLockResponse {
  lockId: string;
  boltId: string;
  fabricId: string;
  lockedYards: number;
  lockAcquiredAt: string;
  expiresAt: string; // 15-minute ISO timestamp
  remainingUnallocatedYards: number;
}

export interface BoltReleaseResponse {
  released: boolean;
  boltId: string;
  message: string;
}

export interface CheckoutCartItem {
  fabricId: string;
  fabricName: string;
  millName: string;
  colorName?: string;
  thumbnailUrl?: string;
  boltId: string;
  dyeLotCode: string;
  yardsCut: number; // min 0.125, multiple of 0.125
  pricePerYard: number;
  isSwatchBox: boolean;
  lockId?: string;
  fittingId?: string;
}

export interface CreatePaymentIntentRequest {
  currency: Currency;
  items: Array<{
    fabricId: string;
    boltId: string;
    yardsCut: number;
    isSwatchBox: boolean;
    lockId: string;
  }>;
  applySwatchCredit?: boolean;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  subtotalAmount: number;
  swatchCreditApplied: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: Currency;
  expiresAt: string;
}

export interface ShippingAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string; // ISO 3166-1 alpha-2
}

export interface RecipientContact {
  fullName: string;
  email: string;
  phone: string;
}

export interface TailorRouting {
  tailorStudioId: string;
  studioName?: string;
  conciergeNotes?: string;
}

export interface CreateOrderRequest {
  idempotencyKey: string;
  paymentIntentId: string;
  items: Array<{
    fabricId: string;
    boltId: string;
    lockId: string;
    yardsCut: number;
    isSwatchBox: boolean;
    fittingId?: string | null;
  }>;
  acknowledgedNonReturnableCut: boolean;
  shippingAddress: ShippingAddress;
  recipientContact: RecipientContact;
  tailorRouting?: TailorRouting | null;
}

export interface OrderItem {
  id: string;
  fabricId: string;
  fabricName?: string;
  boltRollId: string;
  dyeLotCode: string;
  yardsCut: number;
  unitPrice: number;
  isSwatchBox: boolean;
}

export interface CarrierTracking {
  carrier: 'DHL_EXPRESS' | 'FEDEX' | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}

export interface TailorDispatch {
  dispatchId?: string;
  studioName: string;
  masterCutter: string;
  city: string;
  status: string;
}

export interface OrderDetails {
  id: string;
  orderNumber: string;
  userId?: string;
  status: 'pending' | 'confirmed' | 'cutting' | 'dispatched' | 'delivered' | 'cancelled';
  totalAmount: number;
  currency: Currency;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  recipientContact?: RecipientContact;
  carrierTracking?: CarrierTracking;
  dyeLotCertificateUrl: string;
  specDossierUrl: string;
  tailorDispatch?: TailorDispatch | null;
  createdAt: string;
}
