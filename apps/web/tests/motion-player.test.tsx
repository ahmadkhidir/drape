import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  MotionPlayer,
  calculateRotationAngle,
  calculateFrameIndex,
  calculateSeekTimeFromFraction,
  createEvt008Payload,
  type MotionTelemetryEvent,
} from '../components/fitting/MotionPlayer';
import { FittingResultsViewContent } from '../components/fitting/FittingResultsViewContent';

// Mock Next.js navigation hooks for test environment
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (param: string) => {
      if (param === 'fabricId') return 'FAB-SLK-892';
      if (param === 'silhouetteId') return 'corseted_mermaid';
      if (param === 'drapeScore') return '0.96';
      return null;
    },
  }),
}));

describe('FEAT-006: 360° Motion Video Player - Pure Calculations', () => {
  describe('calculateRotationAngle (Turntable 360° Mapping)', () => {
    it('maps 0.0s start time to 0 degrees', () => {
      expect(calculateRotationAngle(0.0, 4.0)).toBe(0);
    });

    it('maps quarter turnaround (1.0s) to 90 degrees', () => {
      expect(calculateRotationAngle(1.0, 4.0)).toBe(90);
    });

    it('maps half turnaround (2.0s) to 180 degrees (direct back view)', () => {
      expect(calculateRotationAngle(2.0, 4.0)).toBe(180);
    });

    it('maps three-quarter turnaround (3.0s) to 270 degrees', () => {
      expect(calculateRotationAngle(3.0, 4.0)).toBe(270);
    });

    it('seamlessly wraps 4.0s loop boundary back to 0 degrees', () => {
      expect(calculateRotationAngle(4.0, 4.0)).toBe(0);
    });

    it('handles looping time overflows beyond 4 seconds', () => {
      expect(calculateRotationAngle(5.0, 4.0)).toBe(90);
      expect(calculateRotationAngle(6.0, 4.0)).toBe(180);
    });
  });

  describe('calculateFrameIndex (30 FPS Discrete Frame Tracking)', () => {
    it('indexes first frame at 0.0s as frame 0', () => {
      expect(calculateFrameIndex(0.0, 30, 120)).toBe(0);
    });

    it('indexes frame at 1.0s as frame 30', () => {
      expect(calculateFrameIndex(1.0, 30, 120)).toBe(30);
    });

    it('indexes frame at 2.0s as frame 60', () => {
      expect(calculateFrameIndex(2.0, 30, 120)).toBe(60);
    });

    it('clamps last frame at 3.99s to 119 without index overflow', () => {
      expect(calculateFrameIndex(3.99, 30, 120)).toBe(119);
    });

    it('bounds frame calculation within valid totalFrames range [0, 119]', () => {
      expect(calculateFrameIndex(-1.0, 30, 120)).toBe(0);
      expect(calculateFrameIndex(10.0, 30, 120)).toBeLessThan(120);
    });
  });

  describe('calculateSeekTimeFromFraction (Scrubber Horizontal Dragging)', () => {
    it('maps 0% scrub fraction to 0.0 seconds', () => {
      expect(calculateSeekTimeFromFraction(0.0, 4.0)).toBe(0.0);
    });

    it('maps 50% scrub fraction to exactly 2.0 seconds', () => {
      expect(calculateSeekTimeFromFraction(0.5, 4.0)).toBe(2.0);
    });

    it('maps 100% scrub fraction to exactly 4.0 seconds', () => {
      expect(calculateSeekTimeFromFraction(1.0, 4.0)).toBe(4.0);
    });

    it('clamps negative scrub fractions to 0.0s boundary', () => {
      expect(calculateSeekTimeFromFraction(-0.25, 4.0)).toBe(0.0);
    });

    it('clamps over-drag fractions > 1.0 to max duration boundary', () => {
      expect(calculateSeekTimeFromFraction(1.25, 4.0)).toBe(4.0);
    });
  });

  describe('EVT-008 Telemetry Event Dispatch Specification', () => {
    it('constructs schema-valid EVT-008 payload per analytics.md', () => {
      const fittingId = 'fit-test-uuid-1234';
      const latencyMs = 3840;
      const event: MotionTelemetryEvent = createEvt008Payload(fittingId, latencyMs, 4);

      expect(event.event).toBe('motion_video_generated');
      expect(event.fitting_id).toBe(fittingId);
      expect(event.duration_seconds).toBe(4);
      expect(event.generation_latency_ms).toBe(3840);
      expect(event.platform).toBe('web');
      expect(event.event_id).toBeDefined();
      expect(event.occurred_at).toBeDefined();
      expect(new Date(event.occurred_at).getTime()).toBeGreaterThan(0);
    });
  });
});

describe('FEAT-006: MotionPlayer Component Rendering & States', () => {
  const mockFittingId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
  const mockStaticRender = 'https://cdn.drape.fashion/renders/test-fitting.webp';
  const mockVideoUrl = 'https://cdn.drape.fashion/motion/test-motion-walk.mp4';

  it('renders in idle state with generation trigger and trajectory presets', () => {
    const html = renderToStaticMarkup(
      <MotionPlayer
        fittingId={mockFittingId}
        staticRenderUrl={mockStaticRender}
        initialVideoUrl={null}
        fabricName="Como Silk Brocade"
        silhouetteName="Corseted Mermaid Gown"
      />
    );

    // Prompt and action
    expect(html).toContain('Experience Garment in Motion');
    expect(html).toContain('View in 360° Motion');

    // Trajectory presets
    expect(html).toContain('Turntable 360° Pivot');
    expect(html).toContain('Runway Step Turn');

    // Accessible container semantics
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="360-degree Motion Catwalk Video Player"');
  });

  it('renders video element and 360 scrubbing controls when video is available', () => {
    const html = renderToStaticMarkup(
      <MotionPlayer
        fittingId={mockFittingId}
        staticRenderUrl={mockStaticRender}
        initialVideoUrl={mockVideoUrl}
        fabricName="Como Silk Brocade"
        silhouetteName="Corseted Mermaid Gown"
        autoPlay={true}
      />
    );

    // Video element attributes
    expect(html).toContain(`src="${mockVideoUrl}"`);
    expect(html).toContain('loop=""');
    expect(html).toContain('muted=""');
    expect(html).toContain('playsInline=""');

    // Compass and HUD
    expect(html).toContain('360° Catwalk Motion • Neural Runway');
    expect(html).toContain('0°');
    expect(html).toContain('Frame 1/120');

    // Scrubber track semantics
    expect(html).toContain('role="slider"');
    expect(html).toContain('aria-label="360 Rotation Scrubber"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="360"');
    expect(html).toContain('aria-valuenow="0"');

    // Playback control buttons
    expect(html).toContain('Pause');
    expect(html).toContain('Reset 0°');
  });

  it('includes interactive horizontal scrubbing drag cues and keyboard shortcuts', () => {
    const html = renderToStaticMarkup(
      <MotionPlayer
        fittingId={mockFittingId}
        staticRenderUrl={mockStaticRender}
        initialVideoUrl={mockVideoUrl}
      />
    );

    expect(html).toContain('title="Drag horizontally across garment to scrub 360° rotation"');
    expect(html).toContain('Drag horizontally to rotate • Space to play/pause');
    expect(html).toContain('tabindex="0"');
  });

  it('renders back to portrait navigation link when callback is provided', () => {
    const onBack = vi.fn();
    const html = renderToStaticMarkup(
      <MotionPlayer
        fittingId={mockFittingId}
        staticRenderUrl={mockStaticRender}
        initialVideoUrl={mockVideoUrl}
        onBackToPortrait={onBack}
      />
    );

    expect(html).toContain('Back to Portrait');
  });
});

describe('Screen 5: Fitting Results View Integration (/fittings/:id)', () => {
  const mockFittingId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

  it('renders editorial studio layout with silhouette title and fabric badge', () => {
    const html = renderToStaticMarkup(<FittingResultsViewContent fittingId={mockFittingId} />);

    expect(html).toContain('Haute Couture Fitting Showcase');
    expect(html).toContain('Corseted Mermaid Gown');
    expect(html).toContain('Como Silk Brocade');
    expect(html).toContain('FAB-SLK-892');
  });

  it('renders the Master Tailor Drape Confidence indicator (NFR-030)', () => {
    const html = renderToStaticMarkup(<FittingResultsViewContent fittingId={mockFittingId} />);

    expect(html).toContain('96%');
    expect(html).toContain('Tailoring Drape Match');
    expect(html).toContain('Verified vs Master Tailor Golden Benchmark');
  });

  it('provides presentation mode switcher between static portrait and 360 motion walk', () => {
    const html = renderToStaticMarkup(<FittingResultsViewContent fittingId={mockFittingId} />);

    expect(html).toContain('Static 2D Portrait Lens');
    expect(html).toContain('360° Looping Catwalk Walk');
  });

  it('provides studio daylight and evening gala lighting toggles', () => {
    const html = renderToStaticMarkup(<FittingResultsViewContent fittingId={mockFittingId} />);

    expect(html).toContain('Daylight');
    expect(html).toContain('Gala');
  });

  it('renders inferred anatomical body dimensions card (C-012)', () => {
    const html = renderToStaticMarkup(<FittingResultsViewContent fittingId={mockFittingId} />);

    expect(html).toContain('Inferred Body Measurements');
    expect(html).toContain('AI Photogrammetry');
    expect(html).toContain('Height');
    expect(html).toContain('Bust');
    expect(html).toContain('Waist');
    expect(html).toContain('Hips');
  });

  it('renders primary commercial CTA to proceed to custom yardage checkout (Screen 5 & FEAT-007)', () => {
    const html = renderToStaticMarkup(<FittingResultsViewContent fittingId={mockFittingId} />);

    expect(html).toContain('Calculate Yardage &amp; Order');
    expect(html).toContain('Custom Yardage Calculation');
    expect(html).toContain('Direct Mill Provenance');
  });

  it('renders Master Tailor golden rubric feedback controls (NFR-030)', () => {
    const html = renderToStaticMarkup(<FittingResultsViewContent fittingId={mockFittingId} />);

    expect(html).toContain('Drape Fidelity Feedback:');
    expect(html).toContain('Flawless');
    expect(html).toContain('Needs Adjustment');
  });
});
