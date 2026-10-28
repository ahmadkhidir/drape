/**
 * Digital Wardrobe & Public Spec Dossier UI Test Suite
 * Spec Anchors:
 *   - docs/Drape/features/FEAT-009.md (Digital Wardrobe & Tailor Handoff Spec Export)
 *   - docs/Drape/screens/09-digital-wardrobe.md (Screen 9: Digital Wardrobe)
 *   - docs/Drape/analytics.md (EVT-013: spec_dossier_exported)
 *   - CONTRACTS.md (C-017, C-018, C-028, C-029)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'tok-marcus-442' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import {
  EmptyWardrobe,
  WardrobeTabs,
  FittingCard,
  OrderHistoryTable,
  GuestOrderLookup,
  MotionVideoModal,
  fetchWardrobe,
  lookupGuestOrder,
  fetchPublicSpec,
  triggerTailorPdfDownload,
  recordTelemetryEvent,
  telemetryLog,
  FALLBACK_SAVED_FITTINGS,
  FALLBACK_ORDERS,
  FALLBACK_PUBLIC_SPEC,
} from '../components/wardrobe';

import DigitalWardrobePage from '../app/wardrobe/page';
import PublicSpecDossierPage from '../app/specs/[token]/page';

describe('FEAT-009: Digital Wardrobe & Tailor Handoff Spec UI', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network offline')));
    telemetryLog.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('1. Empty Wardrobe Presentation (Screen 09, ASSETS.md)', () => {
    it('renders declared Empty Wardrobe Artwork with exact photo direction text', () => {
      const html = renderToStaticMarkup(<EmptyWardrobe />);

      // Must render declared Empty Wardrobe Artwork description in aria-label
      expect(html).toContain('An antique wooden tailor valet stand holding a clean brass hanger in an airy, sunlit Parisian studio');
      expect(html).toContain('data-testid="empty-wardrobe"');
    });

    it('renders declared empty state headline and Explore Textiles CTA button', () => {
      const html = renderToStaticMarkup(<EmptyWardrobe />);

      // Declared Headline
      expect(html).toContain('Your wardrobe is awaiting its first commission');
      expect(html).toContain('data-testid="empty-wardrobe-headline"');

      // Declared CTA Button pointing to /catalog
      expect(html).toContain('data-testid="explore-textiles-cta"');
      expect(html).toContain('href="/catalog"');
      expect(html).toContain('Explore Textiles');
    });
  });

  describe('2. Wardrobe Tabs & Navigation (Screen 09, C-028)', () => {
    it('renders "Saved Fittings" and "Purchased Orders" tabs with correct count badges', () => {
      const html = renderToStaticMarkup(
        <WardrobeTabs
          activeTab="fittings"
          onTabChange={vi.fn()}
          fittingsCount={3}
          ordersCount={2}
        />
      );

      expect(html).toContain('data-testid="tab-saved-fittings"');
      expect(html).toContain('Saved Fittings');
      expect(html).toContain('3');

      expect(html).toContain('data-testid="tab-purchased-orders"');
      expect(html).toContain('Purchased Orders');
      expect(html).toContain('2');
    });

    it('sets proper ARIA attributes for accessible tab switching', () => {
      const html = renderToStaticMarkup(
        <WardrobeTabs
          activeTab="orders"
          onTabChange={vi.fn()}
          fittingsCount={4}
          ordersCount={1}
        />
      );

      expect(html).toContain('role="tablist"');
      expect(html).toContain('aria-selected="false"'); // fittings tab
      expect(html).toContain('aria-selected="true"'); // orders tab
    });
  });

  describe('3. Saved Fittings Gallery (FittingCard & C-028)', () => {
    const mockFitting = FALLBACK_SAVED_FITTINGS[0];

    it('renders neural garment preview, swatch chip, silhouette name, and drape score', () => {
      const html = renderToStaticMarkup(<FittingCard fitting={mockFitting} />);

      expect(html).toContain(`data-testid="fitting-card-${mockFitting.id}"`);
      expect(html).toContain(mockFitting.silhouetteName);
      expect(html).toContain(mockFitting.fabricName);
      expect(html).toContain('96% Fit'); // drapeScore 0.96
      expect(html).toContain('Neural Fit');
    });

    it('renders quick action buttons: Inspect 3D Drape, View 360° Walk, Download Tailor PDF, Share Spec', () => {
      const html = renderToStaticMarkup(<FittingCard fitting={mockFitting} />);

      // Inspect 3D Drape link
      expect(html).toContain(`href="/fittings/${mockFitting.id}"`);
      expect(html).toContain(`data-testid="inspect-drape-${mockFitting.id}"`);
      expect(html).toContain('Inspect 3D Drape');

      // View 360° Walk button
      expect(html).toContain(`data-testid="view-motion-${mockFitting.id}"`);
      expect(html).toContain('View 360° Walk');

      // Download Tailor PDF button
      expect(html).toContain(`data-testid="download-pdf-${mockFitting.id}"`);
      expect(html).toContain('Download Tailor PDF');

      // Share Spec button
      expect(html).toContain(`data-testid="share-spec-${mockFitting.id}"`);
      expect(html).toContain('Share Spec');
    });

    it('displays 360° runway walk badge when motion video is available', () => {
      const html = renderToStaticMarkup(<FittingCard fitting={mockFitting} />);
      expect(html).toContain(`data-testid="motion-badge-${mockFitting.id}"`);
      expect(html).toContain('360° Walk');
    });
  });

  describe('4. Purchased Orders History (OrderHistoryTable & C-028)', () => {
    it('renders order history table with tracking numbers, dye-lot codes, and yardage', () => {
      const html = renderToStaticMarkup(<OrderHistoryTable orders={FALLBACK_ORDERS} />);

      expect(html).toContain('data-testid="orders-table"');
      expect(html).toContain('DRP-2027-442');
      expect(html).toContain('LOT-2026-EMR-04');
      expect(html).toContain('4 1/4 yds'); // fractional formatting of 4.25
      expect(html).toContain('In Cutting Room');
      expect(html).toContain('DHL Express');
    });

    it('renders one-click repeat bolt reorder and tailor routing actions', () => {
      const html = renderToStaticMarkup(<OrderHistoryTable orders={FALLBACK_ORDERS} />);

      expect(html).toContain('data-testid="reorder-bolt-ord-442-01"');
      expect(html).toContain('Reorder Bolt');
      expect(html).toContain('data-testid="route-tailor-ord-442-01"');
      expect(html).toContain('Route Tailor');
      expect(html).toContain('href="/tailors"');
    });
  });

  describe('5. Unauthenticated Guest Flow (GuestOrderLookup & C-029)', () => {
    it('renders order lookup form requiring orderNumber and billingEmail', () => {
      const html = renderToStaticMarkup(<GuestOrderLookup />);

      expect(html).toContain('data-testid="guest-order-lookup"');
      expect(html).toContain('data-testid="input-order-number"');
      expect(html).toContain('data-testid="input-billing-email"');
      expect(html).toContain('data-testid="submit-guest-lookup"');
      expect(html).toContain('Retrieve Commission Spec');
    });

    it('successfully resolves guest commission via C-029 lookup', async () => {
      const result = await lookupGuestOrder({
        orderNumber: 'DRP-2027-442',
        billingEmail: 'marcus@sterling.atelier',
      });

      expect(result.order).toBeDefined();
      expect(result.order.orderNumber).toBe('DRP-2027-442');
      expect(result.order.fabricName).toBe('Emerald Architectural Silk Brocade');
      expect(result.order.yardsCut).toBe(4.25);
      expect(result.oneTimeAccessToken).toContain('guest-scoped-jwt');
    });

    it('throws validation error when required lookup fields are missing', async () => {
      await expect(
        lookupGuestOrder({ orderNumber: '', billingEmail: '' })
      ).rejects.toThrow('Both order number and billing email are required.');
    });

    it('throws error when order is not found', async () => {
      await expect(
        lookupGuestOrder({ orderNumber: 'DRP-NON-EXISTENT', billingEmail: 'test@unknown.com' })
      ).rejects.toThrow('ORDER_LOOKUP_FAILED');
    });
  });

  describe('6. Telemetry Event EVT-013 (spec_dossier_exported) & C-017 PDF Export', () => {
    it('records EVT-013 telemetry event with order_id, silhouette_id, and export_format', () => {
      recordTelemetryEvent({
        order_id: 'DRP-2027-442',
        silhouette_id: 'corseted_mermaid',
        export_format: 'pdf',
      });

      expect(telemetryLog.length).toBe(1);
      const evt = telemetryLog[0];
      expect(evt.event_name).toBe('spec_dossier_exported');
      expect(evt.order_id).toBe('DRP-2027-442');
      expect(evt.silhouette_id).toBe('corseted_mermaid');
      expect(evt.export_format).toBe('pdf');
      expect(evt.platform).toBe('web');
      expect(evt.occurred_at).toBeDefined();
    });

    it('triggers C-017 PDF download and automatically dispatches EVT-013', async () => {
      const res = await triggerTailorPdfDownload({
        orderId: 'ord-442-01',
        orderNumber: 'DRP-2027-442',
        silhouetteId: 'corseted_mermaid',
      });

      expect(res.success).toBe(true);
      expect(telemetryLog.length).toBe(1);
      expect(telemetryLog[0].order_id).toBe('ord-442-01');
      expect(telemetryLog[0].export_format).toBe('pdf');
    });
  });

  describe('7. External Tailor Public Spec Portal at /specs/[token] (C-018)', () => {
    it('fetches and returns public spec dossier for external tailors without login', async () => {
      const dossier = await fetchPublicSpec('tok-marcus-442');

      expect(dossier.orderNumber).toBe('DRP-2027-442');
      expect(dossier.customerFirstName).toBe('Marcus');
      expect(dossier.silhouetteName).toBe('Corseted Mermaid Gown');
      expect(dossier.fabric.millName).toBe('Lanificio Tessile d’Oro');
      expect(dossier.fabric.countryOfOrigin).toBe('IT');
      expect(dossier.fabric.fiberBreakdown).toBe('85% Mulberry Silk, 15% Metallic Lurex');
      expect(dossier.fabric.gsm).toBe(340);
      expect(dossier.fabric.widthInches).toBe(54);
      expect(dossier.fabric.dyeLotCode).toBe('LOT-2026-EMR-04');
      expect(dossier.yardageOrdered).toBe(4.25);
    });

    it('throws SPEC_TOKEN_NOT_FOUND when token is invalid or expired', async () => {
      await expect(fetchPublicSpec('invalid')).rejects.toThrow('SPEC_TOKEN_NOT_FOUND');
      await expect(fetchPublicSpec('expired')).rejects.toThrow('SPEC_TOKEN_NOT_FOUND');
    });

    it('renders clean, non-editable read-only dossier portal with mill provenance, fiber breakdown, and cutting layout', () => {
      const html = renderToStaticMarkup(<PublicSpecDossierPage />);

      // Non-editable portal banner
      expect(html).toContain('MASTER TAILOR HANDOFF PORTAL');
      expect(html).toContain('Non-Editable Read-Only Technical Dossier');
      expect(html).toContain('data-testid="public-spec-dossier"');

      // Guild certification
      expect(html).toContain('International Textile Guild Standard');

      // Order & Client Details
      expect(html).toContain('data-testid="spec-order-number"');
      expect(html).toContain('DRP-2027-442');
      expect(html).toContain('Corseted Mermaid Gown');

      // Textile Provenance & Physical Specs
      expect(html).toContain('data-testid="spec-mill-name"');
      expect(html).toContain('Lanificio Tessile d’Oro');
      expect(html).toContain('data-testid="spec-fiber-breakdown"');
      expect(html).toContain('85% Mulberry Silk, 15% Metallic Lurex');
      expect(html).toContain('data-testid="spec-gsm"');
      expect(html).toContain('340 GSM');
      expect(html).toContain('data-testid="spec-bolt-width"');
      expect(html).toContain('54');
      expect(html).toContain('137.2 cm');
      expect(html).toContain('data-testid="spec-dye-lot"');
      expect(html).toContain('LOT-2026-EMR-04');
      expect(html).toContain('data-testid="spec-yardage"');
      expect(html).toContain('4.25 yards');

      // Atelier Technical Notes
      expect(html).toContain('Max 140°C');
      expect(html).toContain('Prohibited (Dry Iron Only)');
      expect(html).toContain('Silk organza or lightweight horsehair canvas stay');
      expect(html).toContain('70/10 Microtex Sharp Needle with #50 silk filament thread');

      // Grainline Orientation & Calculated Cutting Layout Diagram (SVG)
      expect(html).toContain('data-testid="grainline-diagram"');
      expect(html).toContain('Front Bodice (0°)');
      expect(html).toContain('Back Bodice (0°)');
      expect(html).toContain('Skirt Flare A (45° Bias)');
      expect(html).toContain('Skirt Flare B (45° Bias)');

      // One-Click PDF Download Button
      expect(html).toContain('data-testid="dossier-download-pdf-btn"');
      expect(html).toContain('Download Vector PDF');
    });
  });

  describe('8. 360° Looping Motion Video Modal (MotionVideoModal)', () => {
    it('renders motion video modal with video player when open', () => {
      const mockFitting = FALLBACK_SAVED_FITTINGS[0];
      const html = renderToStaticMarkup(
        <MotionVideoModal fitting={mockFitting} isOpen={true} onClose={vi.fn()} />
      );

      expect(html).toContain('data-testid="motion-video-modal"');
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('360° Neural Motion Walk');
      expect(html).toContain(mockFitting.silhouetteName);
      expect(html).toContain('data-testid="motion-video-element"');
      expect(html).toContain('data-testid="close-motion-modal"');
    });

    it('returns null when isOpen is false', () => {
      const mockFitting = FALLBACK_SAVED_FITTINGS[0];
      const html = renderToStaticMarkup(
        <MotionVideoModal fitting={mockFitting} isOpen={false} onClose={vi.fn()} />
      );

      expect(html).toBe('');
    });
  });

  describe('9. Complete Digital Wardrobe Page (DigitalWardrobePage)', () => {
    it('renders hero summary banner with user profile status, active orders count, and saved fittings count', () => {
      const html = renderToStaticMarkup(<DigitalWardrobePage />);

      expect(html).toContain('data-testid="wardrobe-hero-summary"');
      expect(html).toContain('data-testid="user-profile-status"');
      expect(html).toContain('Marcus Sterling • Atelier Client Tier');
      expect(html).toContain('data-testid="active-orders-count"');
      expect(html).toContain('data-testid="saved-fittings-count"');
      expect(html).toContain('data-testid="hero-commission-fitting-btn"');
      expect(html).toContain('New Fitting');
    });

    it('renders guest mode toggle button in masthead', () => {
      const html = renderToStaticMarkup(<DigitalWardrobePage />);

      expect(html).toContain('data-testid="toggle-guest-mode-btn"');
      expect(html).toContain('Guest Order Lookup');
    });

    it('fetches digital wardrobe items via C-028 service', async () => {
      const data = await fetchWardrobe('all');

      expect(data.savedFittings.length).toBeGreaterThan(0);
      expect(data.orders.length).toBeGreaterThan(0);
      expect(data.savedFittings[0].silhouetteName).toBe('Corseted Mermaid Gown');
      expect(data.orders[0].orderNumber).toBe('DRP-2027-442');
    });
  });
});
