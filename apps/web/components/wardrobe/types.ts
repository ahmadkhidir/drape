/**
 * Digital Wardrobe & Public Spec Types
 * Spec Anchor: docs/Drape/features/FEAT-009.md, docs/Drape/screens/09-digital-wardrobe.md, CONTRACTS.md (C-017, C-018, C-028, C-029)
 */

export interface SavedFitting {
  id: string;
  fabricId: string;
  fabricName: string;
  silhouetteId: string;
  silhouetteName: string;
  renderUrl: string;
  hasMotionVideo: boolean;
  motionVideoUrl: string | null;
  drapeScore: number;
  createdAt: string;
}

export interface WardrobeOrder {
  id: string;
  orderNumber: string;
  status: 'confirmed' | 'cutting' | 'dispatched' | 'delivered';
  fabricName: string;
  yardsCut: number;
  totalAmount: number;
  specPdfUrl: string;
  carrierTrackingUrl: string | null;
  dyeLotCode?: string;
  createdAt: string;
}

export interface WardrobeData {
  savedFittings: SavedFitting[];
  orders: WardrobeOrder[];
}

export interface GuestLookupRequest {
  orderNumber: string;
  billingEmail: string;
}

export interface GuestLookupResponse {
  oneTimeAccessToken: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    fabricName: string;
    yardsCut: number;
    specPdfUrl: string;
    carrierTrackingUrl: string | null;
    dyeLotCode?: string;
  };
}

export interface FabricSpecDetail {
  sku: string;
  name: string;
  millName: string;
  countryOfOrigin: string;
  fiberBreakdown: string;
  gsm: number;
  widthInches: number;
  dyeLotCode: string;
  drapeCoefficient?: number;
  stiffnessRating?: number;
}

export interface TailorTechnicalNotes {
  pressingTemperatureC: number;
  steamPermitted: boolean;
  interliningType: string;
  needleSizeRecommendation: string;
}

export interface PublicSpecDossier {
  specId: string;
  orderNumber: string;
  customerFirstName: string;
  silhouetteName: string;
  fabric: FabricSpecDetail;
  yardageOrdered: number;
  fittingRenderUrl: string;
  grainlineCuttingDiagramUrl: string;
  technicalNotes: TailorTechnicalNotes;
  expiresAt: string;
}

export interface SpecDossierExportTelemetryPayload {
  event_id?: string;
  occurred_at?: string;
  platform?: 'web';
  app_version?: string;
  order_id: string;
  silhouette_id: string;
  export_format: 'pdf';
  user_id?: string | null;
}
