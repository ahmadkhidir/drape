/**
 * Drape Neural Tailoring & Biometric Consent Types
 * Spec Anchors: C-004, C-005, C-011, C-012, C-013, FEAT-004, FEAT-005, NFR-030, NFR-040
 */

export type RegulationStandard = 'BIPA_IL' | 'GDPR_ART_9' | 'CCPA_CPRA' | 'CUBI_TX';

export interface BiometricConsentRecord {
  id: string;
  userId: string;
  regulationStandard: RegulationStandard;
  consentGranted: boolean;
  grantedAt: string;
  expiresAt: string;
  consentToken: string;
  remainingDays?: number;
}

export interface BiometricConsentRequest {
  regulationStandard: RegulationStandard;
  consentGranted: boolean;
  noticeVersion: string;
  userAgent: string;
}

export type SilhouettePresetId =
  | 'corseted_mermaid'
  | 'grecian_bias_gown'
  | 'architectural_tuxedo'
  | 'ballgown_offshoulder'
  | 'asymmetric_cape_dress'
  | 'high_neck_column'
  | 'tailored_blazer'
  | 'aline_slip';

export type MannequinBodyType = 'petite' | 'athletic' | 'curvy' | 'tall' | 'standard';

export interface SilhouettePreset {
  id: SilhouettePresetId;
  assetId: string; // e.g. "A-024"
  name: string;
  category: 'Couture Evening' | 'Tailored Suiting' | 'Bridal Architecture' | 'Contemporary Minimalist';
  description: string;
  recommendedFabrics: string[];
  svgPath: string;
}

export interface InferredMeasurements {
  estimatedHeightCm: number;
  bustCircumferenceCm: number;
  waistCircumferenceCm: number;
  hipCircumferenceCm: number;
}

export interface FittingSession {
  id: string;
  userId: string;
  fabricId: string;
  fabricName?: string;
  fabricThumbnail?: string;
  silhouetteId: SilhouettePresetId;
  silhouetteName?: string;
  mode: 'photo' | 'mannequin';
  mannequinBodyType?: MannequinBodyType;
  customPrompt?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  renderUrl: string | null;
  beforePhotoUrl?: string | null;
  motionVideoUrl: string | null;
  isWatermarked: boolean;
  drapeScore: number; // 0.0 to 1.0 (>= 0.92 per NFR-030)
  inferredMeasurements: InferredMeasurements;
  fallbackUsed: boolean;
  fallbackReason: string | null;
  ephemeralExpiresAt: string;
  createdAt: string;
}

export type FittingWsStatus =
  | 'QUEUED'
  | 'SEGMENTING_BODY'
  | 'SEGMENTING_POSE'
  | 'DEFORMING_MESH'
  | 'DRAPING_CLOTH'
  | 'SYNTHESIZING_TEXTURES'
  | 'COMPOSITING'
  | 'COMPLETED'
  | 'FAILED';

export interface FittingWsStatusUpdate {
  event: 'FITTING_STATUS_UPDATE';
  jobId: string;
  status: FittingWsStatus;
  progressPercent: number;
  message: string;
}

export interface FittingWsCompleted {
  event: 'FITTING_COMPLETED';
  jobId: string;
  status: 'COMPLETED';
  renderUrl: string;
  drapeScore: number;
  isWatermarked: boolean;
  ephemeralExpiresAt: string;
}

export interface FittingWsFailed {
  event: 'FITTING_FAILED';
  jobId: string;
  status: 'FAILED';
  errorCode: 'INFERENCE_TIMEOUT' | 'OCCLUSION_ERROR' | 'GPU_ERROR';
  errorMessage: string;
  fallbackRenderUrl?: string;
}

export interface ImageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    width: number;
    height: number;
    aspectRatio: number;
    fileSizeBytes: number;
    estimatedLuminance: number;
  };
}
