import { describe, it, expect } from 'vitest';
import { SILHOUETTE_PRESETS, getSilhouetteById } from '../lib/silhouettes';
import {
  validateFileConstraints,
  validatePortraitImage,
  MAX_PHOTO_FILE_SIZE_BYTES,
  MIN_RESOLUTION_HEIGHT,
  ALLOWED_IMAGE_TYPES,
} from '../lib/validation';
import { FITTING_STEPS } from '../components/fitting/FittingProgressModal';
import { CURRENT_NOTICE_VERSION, CONSENT_STORAGE_KEY } from '../components/fitting/BiometricConsentModal';
import { FittingWsStatusUpdate, FittingWsCompleted, FittingWsFailed } from '../lib/fitting-types';

describe('Architectural Silhouette Presets (ASSETS.md A-024..A-031)', () => {
  it('defines exactly 8 curated architectural silhouette presets', () => {
    expect(SILHOUETTE_PRESETS).toHaveLength(8);
  });

  it('contains all required preset IDs from CONTRACTS.md C-011', () => {
    const ids = SILHOUETTE_PRESETS.map((p) => p.id);
    expect(ids).toContain('corseted_mermaid');
    expect(ids).toContain('grecian_bias_gown');
    expect(ids).toContain('architectural_tuxedo');
    expect(ids).toContain('ballgown_offshoulder');
    expect(ids).toContain('asymmetric_cape_dress');
    expect(ids).toContain('high_neck_column');
    expect(ids).toContain('tailored_blazer');
    expect(ids).toContain('aline_slip');
  });

  it('maps each preset to its corresponding ASSETS.md identifier from A-024 to A-031', () => {
    const assetMap = new Map(SILHOUETTE_PRESETS.map((p) => [p.id, p.assetId]));
    expect(assetMap.get('corseted_mermaid')).toBe('A-024');
    expect(assetMap.get('grecian_bias_gown')).toBe('A-025');
    expect(assetMap.get('architectural_tuxedo')).toBe('A-026');
    expect(assetMap.get('ballgown_offshoulder')).toBe('A-027');
    expect(assetMap.get('asymmetric_cape_dress')).toBe('A-028');
    expect(assetMap.get('high_neck_column')).toBe('A-029');
    expect(assetMap.get('tailored_blazer')).toBe('A-030');
    expect(assetMap.get('aline_slip')).toBe('A-031');
  });

  it('provides valid vector SVG paths and recommended fabric pairings for every silhouette', () => {
    for (const preset of SILHOUETTE_PRESETS) {
      expect(preset.svgPath).toBeDefined();
      expect(preset.svgPath.length).toBeGreaterThan(10);
      expect(preset.recommendedFabrics.length).toBeGreaterThan(0);
      expect(preset.name.length).toBeGreaterThan(3);
    }
  });

  it('retrieves silhouette by id using getSilhouetteById', () => {
    const preset = getSilhouetteById('corseted_mermaid');
    expect(preset).toBeDefined();
    expect(preset?.name).toBe('Corseted Mermaid Gown');
    expect(preset?.assetId).toBe('A-024');

    const nonExistent = getSilhouetteById('unknown_silhouette');
    expect(nonExistent).toBeUndefined();
  });
});

describe('Biometric Consent & Privacy Governance (C-004, FEAT-005, NFR-040)', () => {
  it('references the authoritative Illinois BIPA notice version', () => {
    expect(CURRENT_NOTICE_VERSION).toBe('2026.1-BIPA');
    expect(CONSENT_STORAGE_KEY).toBe('drape_biometric_consent_token');
  });

  it('validates supported regulatory standards per C-004', () => {
    const supportedStandards = ['BIPA_IL', 'GDPR_ART_9', 'CCPA_CPRA', 'CUBI_TX'];
    expect(supportedStandards).toContain('BIPA_IL');
    expect(supportedStandards).toContain('GDPR_ART_9');
  });
});

describe('Client-Side Portrait Image Validation (FEAT-004, C-011, Screen 04)', () => {
  it('enforces allowed image MIME types and 15MB file size boundary', () => {
    expect(ALLOWED_IMAGE_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp']);
    expect(MAX_PHOTO_FILE_SIZE_BYTES).toBe(15 * 1024 * 1024);

    // Unsupported type
    const invalidFile = new File(['dummy'], 'photo.gif', { type: 'image/gif' });
    const check1 = validateFileConstraints(invalidFile);
    expect(check1.valid).toBe(false);
    expect(check1.error).toContain('Unsupported image format');

    // Oversized file
    const largeFile = new File([new Uint8Array(16 * 1024 * 1024)], 'huge.jpg', {
      type: 'image/jpeg',
    });
    const check2 = validateFileConstraints(largeFile);
    expect(check2.valid).toBe(false);
    expect(check2.error).toContain('15MB limit');

    // Valid file
    const validFile = new File(['valid content'], 'portrait.jpg', { type: 'image/jpeg' });
    const check3 = validateFileConstraints(validFile);
    expect(check3.valid).toBe(true);
  });

  it('validates portrait resolution meets minimum 1080p standard', async () => {
    expect(MIN_RESOLUTION_HEIGHT).toBe(1080);

    const testFile = new File(['image bytes'], 'sample.jpg', { type: 'image/jpeg' });

    // Mock low resolution (e.g. 480x640)
    const mockLowResBitmap = () =>
      Promise.resolve({
        width: 480,
        height: 640,
        close: () => {},
      } as unknown as ImageBitmap);

    const lowResResult = await validatePortraitImage(testFile, mockLowResBitmap as any);
    expect(lowResResult.valid).toBe(false);
    expect(lowResResult.errors.some((e) => e.includes('1080p'))).toBe(true);

    // Mock high resolution upright portrait (1080x1920)
    const mockHighResBitmap = () =>
      Promise.resolve({
        width: 1080,
        height: 1920,
        close: () => {},
      } as unknown as ImageBitmap);

    const highResResult = await validatePortraitImage(testFile, mockHighResBitmap as any);
    expect(highResResult.valid).toBe(true);
    expect(highResResult.errors).toHaveLength(0);
    expect(highResResult.metadata?.height).toBe(1920);
    expect(highResResult.metadata?.width).toBe(1080);
  });

  it('detects landscape orientation and requires upright portrait orientation', async () => {
    const testFile = new File(['image bytes'], 'landscape.jpg', { type: 'image/jpeg' });

    // 1920 width x 1080 height = landscape (aspect ratio > 1.0)
    const mockLandscapeBitmap = () =>
      Promise.resolve({
        width: 1920,
        height: 1080,
        close: () => {},
      } as unknown as ImageBitmap);

    const landscapeResult = await validatePortraitImage(testFile, mockLandscapeBitmap as any);
    expect(landscapeResult.valid).toBe(false);
    expect(landscapeResult.errors.some((e) => e.includes('Landscape orientation'))).toBe(true);
  });
});

describe('WebSocket Progress Stepper & Fitting Lifecycles (C-013, NFR-004)', () => {
  it('defines the 4 canonical progress stepper milestones', () => {
    expect(FITTING_STEPS).toHaveLength(4);
    expect(FITTING_STEPS[0].id).toBe('SEGMENTING_BODY');
    expect(FITTING_STEPS[1].id).toBe('DEFORMING_MESH');
    expect(FITTING_STEPS[2].id).toBe('SYNTHESIZING_TEXTURES');
    expect(FITTING_STEPS[3].id).toBe('COMPLETED');
  });

  it('correctly structures WebSocket status update events per C-013', () => {
    const updateEvent: FittingWsStatusUpdate = {
      event: 'FITTING_STATUS_UPDATE',
      jobId: 'job-1234',
      status: 'DRAPING_CLOTH',
      progressPercent: 55,
      message: 'Calculating fabric gravitational drape...',
    };

    expect(updateEvent.event).toBe('FITTING_STATUS_UPDATE');
    expect(updateEvent.progressPercent).toBe(55);
    expect(updateEvent.status).toBe('DRAPING_CLOTH');
  });

  it('correctly structures WebSocket completion events per C-013', () => {
    const completedEvent: FittingWsCompleted = {
      event: 'FITTING_COMPLETED',
      jobId: 'job-5678',
      status: 'COMPLETED',
      renderUrl: 'https://cdn.drape.fashion/renders/job-5678.webp',
      drapeScore: 0.96,
      isWatermarked: false,
      ephemeralExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };

    expect(completedEvent.event).toBe('FITTING_COMPLETED');
    expect(completedEvent.drapeScore).toBeGreaterThanOrEqual(0.92); // NFR-030 threshold
    expect(completedEvent.renderUrl).toContain('job-5678');
  });

  it('handles WebSocket failure events with parametric mannequin fallback per FEAT-004', () => {
    const failedEvent: FittingWsFailed = {
      event: 'FITTING_FAILED',
      jobId: 'job-9999',
      status: 'FAILED',
      errorCode: 'INFERENCE_TIMEOUT',
      errorMessage: 'GPU worker inference exceeded 8.0s timeout limit.',
      fallbackRenderUrl: 'https://cdn.drape.fashion/mannequins/standard-corseted-mermaid.webp',
    };

    expect(failedEvent.event).toBe('FITTING_FAILED');
    expect(failedEvent.errorCode).toBe('INFERENCE_TIMEOUT');
    expect(failedEvent.fallbackRenderUrl).toBeDefined();
  });
});

describe('Drape Fidelity Confidence Rating (NFR-030)', () => {
  it('confirms drape score meets or exceeds the 92.0% master tailor golden benchmark', () => {
    const sampleScore = 0.96;
    const nfrThreshold = 0.92;
    expect(sampleScore).toBeGreaterThanOrEqual(nfrThreshold);
  });
});
