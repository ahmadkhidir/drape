/**
 * Digital Wardrobe & Technical Tailor Spec PDF Integration & Unit Tests
 * Spec Anchor: docs/Drape/features/FEAT-009.md, docs/Drape/analytics.md (EVT-013), CONTRACTS.md (C-017, C-018, C-028, C-029)
 * Persona: Marcus Sterling (FEAT-009)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { buildServer } from '../src/server.js';
import { store } from '../src/db/store.js';
import { signJwt, verifyJwt } from '../src/utils/crypto.js';
import { pdfSpecService } from '../src/services/pdf-spec.service.js';

describe('Digital Wardrobe & Tailor Handoff Spec Engine (FEAT-009)', () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  const marcusId = '33333333-3333-4333-a333-333333333333';
  const elenaId = '11111111-1111-4111-a111-111111111111';
  const unauthorizedUserId = '99999999-9999-4999-a999-999999999999';

  let marcusToken: string;
  let elenaToken: string;
  let unauthorizedToken: string;

  beforeEach(async () => {
    store.seedDefaults();
    pdfSpecService.seedDefaultData();
    pdfSpecService.clearTelemetryEvents();

    marcusToken = signJwt({
      sub: marcusId,
      email: 'marcus.sterling@sterling-pe.com',
      fullName: 'Marcus Sterling',
      role: 'customer',
    });

    elenaToken = signJwt({
      sub: elenaId,
      email: 'elena@rostova-atelier.com',
      fullName: 'Elena Rostova',
      role: 'customer',
    });

    unauthorizedToken = signJwt({
      sub: unauthorizedUserId,
      email: 'stranger@example.com',
      fullName: 'Stranger',
      role: 'customer',
    });

    app = await buildServer();
  });

  // =========================================================================
  // 1. UNIT TESTS: PDF SPEC SERVICE (pdfSpecService)
  // =========================================================================
  describe('PDF Spec Generator Unit Tests (pdfSpecService)', () => {
    it('generates a valid, non-empty vector PDF 1.4 document buffer', () => {
      const pdfBuffer = pdfSpecService.generateTailorSpecPdf({
        orderNumber: 'DRP-2027-442',
        customerName: 'Marcus Sterling',
        fittingId: 'fit_marcus_solaro_01',
        silhouetteName: 'Architectural Double-Breasted Tuxedo',
        fabric: {
          sku: 'FAB-SLK-892',
          name: 'Emerald Architectural Silk Brocade',
          millName: 'Taroni Silk Mills',
          countryOfOrigin: 'IT',
          fiberBreakdown: '85% Mulberry Silk, 15% Metallic Lurex',
          gsm: 320,
          widthInches: 54.0,
          dyeLotCode: 'LOT-2026-EMR-04',
        },
        yardageOrdered: 4.0,
        technicalNotes: {
          pressingTemperatureC: 150,
          steamPermitted: true,
          interliningType: 'Medium-weight natural horsehair canvas and silk organza stay',
          needleSizeRecommendation: '70/10 Microtex Sharp Needle with #50 silk filament thread',
        },
      });

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(1000);

      const pdfString = pdfBuffer.toString('utf8');
      expect(pdfString.startsWith('%PDF-1.4')).toBe(true);
      expect(pdfString.includes('%%EOF')).toBe(true);
      expect(pdfString.includes('xref')).toBe(true);
      expect(pdfString.includes('trailer')).toBe(true);
      expect(pdfString.includes('/Type /Catalog')).toBe(true);
    });

    it('generates PDF dossier in < 2.0s per FEAT-009 acceptance criteria', () => {
      const start = performance.now();
      const pdfBuffer = pdfSpecService.generateTailorSpecPdf({
        orderNumber: 'DRP-2027-442',
        customerName: 'Marcus Sterling',
        silhouetteName: 'Architectural Double-Breasted Tuxedo',
        fabric: {
          sku: 'FAB-SLK-892',
          name: 'Emerald Architectural Silk Brocade',
          millName: 'Taroni Silk Mills',
          countryOfOrigin: 'IT',
          fiberBreakdown: '85% Mulberry Silk, 15% Metallic Lurex',
          gsm: 320,
          widthInches: 54.0,
          dyeLotCode: 'LOT-2026-EMR-04',
        },
        yardageOrdered: 4.0,
        technicalNotes: {
          pressingTemperatureC: 150,
          steamPermitted: true,
          interliningType: 'Horsehair canvas',
          needleSizeRecommendation: '70/10 Microtex',
        },
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(2000); // Strict FEAT-009 budget: < 2.0s
      expect(pdfBuffer.length).toBeGreaterThan(500);
    });

    it('contains all mandatory textile guild specification elements', () => {
      const pdfBuffer = pdfSpecService.generateTailorSpecPdf({
        orderNumber: 'DRP-2027-442',
        customerName: 'Marcus Sterling',
        silhouetteName: 'Architectural Double-Breasted Tuxedo',
        fabric: {
          sku: 'FAB-SLK-892',
          name: 'Emerald Architectural Silk Brocade',
          millName: 'Taroni Silk Mills',
          countryOfOrigin: 'IT',
          fiberBreakdown: '85% Mulberry Silk, 15% Metallic Lurex',
          gsm: 320,
          widthInches: 54.0,
          dyeLotCode: 'LOT-2026-EMR-04',
          drapeCoefficient: 0.65,
          stiffnessRating: 4.5,
        },
        yardageOrdered: 4.0,
        cuttingLayout: {
          panels: [
            { name: 'Front Chest Piece', lengthYards: 1.25, widthInches: 24.0, grainlineAngleDegrees: 0.0 },
            { name: 'Back Bodice', lengthYards: 1.0, widthInches: 22.0, grainlineAngleDegrees: 0.0 },
          ],
        },
        technicalNotes: {
          pressingTemperatureC: 150,
          steamPermitted: true,
          interliningType: 'Horsehair canvas',
          needleSizeRecommendation: '70/10 Microtex',
        },
      });

      const pdfString = pdfBuffer.toString('utf8');

      // Textile Guild Header
      expect(pdfString).toContain('DRAPE');
      expect(pdfString).toContain('TECHNICAL TAILOR SPECIFICATION DOSSIER');
      expect(pdfString).toContain('SAVILE ROW BESPOKE STANDARD');

      // Metadata
      expect(pdfString).toContain('DRP-2027-442');
      expect(pdfString).toContain('Marcus Sterling');
      expect(pdfString).toContain('Architectural Double-Breasted Tuxedo');

      // Textile Specification & Provenance
      expect(pdfString).toContain('FAB-SLK-892');
      expect(pdfString).toContain('Taroni Silk Mills');
      expect(pdfString).toContain('320 GSM');
      expect(pdfString).toContain('54.0 Inches');
      expect(pdfString).toContain('LOT-2026-EMR-04');

      // Grainline Alignment & Blueprint
      expect(pdfString).toContain('GRAINLINE ALIGNMENT');
      expect(pdfString).toContain('WARP');
      expect(pdfString).toContain('WEFT');
      expect(pdfString).toContain('BIAS');

      // Care & Pressing Protocol
      expect(pdfString).toContain('150 deg C');
      expect(pdfString).toContain('PERMITTED');
      expect(pdfString).toContain('Horsehair canvas');

      // Master Cutter Certification
      expect(pdfString).toContain('Elena Rostova');
      expect(pdfString).toContain('SAVILE ROW ACCREDITED');
    });
  });

  // =========================================================================
  // 2. INTEGRATION TESTS: C-028 GET /api/v1/wardrobe
  // =========================================================================
  describe('C-028: GET /api/v1/wardrobe (Digital Wardrobe Vault)', () => {
    it('returns 401 UNAUTHORIZED when no authorization header is provided', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/wardrobe',
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 UNAUTHORIZED when invalid Bearer token is provided', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/wardrobe',
        headers: {
          authorization: 'Bearer invalid.token.payload',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('returns 200 with saved fittings and purchased orders for Marcus Sterling (tab=all)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/wardrobe',
        headers: {
          authorization: `Bearer ${marcusToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);

      // Verify saved fittings structure
      expect(Array.isArray(body.savedFittings)).toBe(true);
      expect(body.savedFittings.length).toBeGreaterThan(0);
      const fitting = body.savedFittings[0];
      expect(fitting).toHaveProperty('id');
      expect(fitting).toHaveProperty('fabricId', 'FAB-SLK-892');
      expect(fitting).toHaveProperty('fabricName');
      expect(fitting).toHaveProperty('silhouetteId', 'architectural_tuxedo');
      expect(fitting).toHaveProperty('silhouetteName');
      expect(fitting).toHaveProperty('renderUrl');
      expect(fitting).toHaveProperty('hasMotionVideo', true);
      expect(fitting).toHaveProperty('motionVideoUrl');
      expect(fitting).toHaveProperty('drapeScore', 0.94);
      expect(fitting).toHaveProperty('createdAt');

      // Verify orders structure
      expect(Array.isArray(body.orders)).toBe(true);
      expect(body.orders.length).toBeGreaterThan(0);
      const order = body.orders[0];
      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('orderNumber', 'DRP-2027-442');
      expect(order).toHaveProperty('status', 'confirmed');
      expect(order).toHaveProperty('fabricName');
      expect(order).toHaveProperty('yardsCut', 4.0);
      expect(order).toHaveProperty('totalAmount', 180.0);
      expect(order).toHaveProperty('specPdfUrl');
      expect(order.specPdfUrl).toContain('/tailor-spec/pdf');
      expect(order).toHaveProperty('carrierTrackingUrl');
      expect(order).toHaveProperty('createdAt');
    });

    it('filters strictly by tab=fittings, returning empty orders list', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/wardrobe?tab=fittings',
        headers: {
          authorization: `Bearer ${marcusToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.savedFittings.length).toBeGreaterThan(0);
      expect(body.orders).toEqual([]);
    });

    it('filters strictly by tab=orders, returning empty fittings list', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/wardrobe?tab=orders',
        headers: {
          authorization: `Bearer ${marcusToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.savedFittings).toEqual([]);
      expect(body.orders.length).toBeGreaterThan(0);
    });

    it('handles pagination parameters correctly', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/wardrobe?page=2&limit=5',
        headers: {
          authorization: `Bearer ${marcusToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.savedFittings)).toBe(true);
      expect(Array.isArray(body.orders)).toBe(true);
    });
  });

  // =========================================================================
  // 3. INTEGRATION TESTS: C-029 POST /api/v1/wardrobe/lookup-guest
  // =========================================================================
  describe('C-029: POST /api/v1/wardrobe/lookup-guest', () => {
    it('returns 400 VALIDATION_FAILED when orderNumber is missing or email is malformed', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/wardrobe/lookup-guest',
        payload: {
          orderNumber: '',
          billingEmail: 'not-an-email',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('VALIDATION_FAILED');
    });

    it('returns 404 ORDER_LOOKUP_FAILED when order number is not found', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/wardrobe/lookup-guest',
        payload: {
          orderNumber: 'DRP-NON-EXISTENT',
          billingEmail: 'patron@example.com',
        },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('ORDER_LOOKUP_FAILED');
    });

    it('returns 404 ORDER_LOOKUP_FAILED when billing email does not match order record', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/wardrobe/lookup-guest',
        payload: {
          orderNumber: 'DRP-2027-442',
          billingEmail: 'wrong.email@example.com',
        },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('ORDER_LOOKUP_FAILED');
    });

    it('returns 200 with 2-hour scoped oneTimeAccessToken and order summary for valid guest match', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/wardrobe/lookup-guest',
        payload: {
          orderNumber: 'DRP-2027-442',
          billingEmail: 'marcus.sterling@sterling-pe.com',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);

      expect(body).toHaveProperty('oneTimeAccessToken');
      expect(typeof body.oneTimeAccessToken).toBe('string');

      // Verify token is a valid JWT with 2-hour lifetime
      const decoded = verifyJwt(body.oneTimeAccessToken);
      expect(decoded.sub).toBe(marcusId);
      expect(decoded.email).toBe('marcus.sterling@sterling-pe.com');
      expect(decoded.orderNumber).toBe('DRP-2027-442');
      expect(decoded.scope).toBe('guest_order_access');

      // Verify order payload conforms to C-029
      expect(body.order).toHaveProperty('id');
      expect(body.order).toHaveProperty('orderNumber', 'DRP-2027-442');
      expect(body.order).toHaveProperty('status', 'confirmed');
      expect(body.order).toHaveProperty('fabricName');
      expect(body.order).toHaveProperty('yardsCut', 4.0);
      expect(body.order).toHaveProperty('specPdfUrl');
      expect(body.order).toHaveProperty('carrierTrackingUrl');
    });
  });

  // =========================================================================
  // 4. INTEGRATION TESTS: C-017 GET /api/v1/fittings/:id/tailor-spec/pdf & EVT-013
  // =========================================================================
  describe('C-017: GET /api/v1/fittings/:id/tailor-spec/pdf & EVT-013', () => {
    it('returns 401 UNAUTHORIZED when no authorization credentials are provided', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fittings/fit_marcus_solaro_01/tailor-spec/pdf',
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 FORBIDDEN when user attempts to download another patron spec dossier', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fittings/fit_marcus_solaro_01/tailor-spec/pdf',
        headers: {
          authorization: `Bearer ${unauthorizedToken}`,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('FORBIDDEN');
    });

    it('returns 404 SPEC_NOT_FOUND when non-existent fitting or order is requested', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fittings/fit_non_existent/tailor-spec/pdf',
        headers: {
          authorization: `Bearer ${marcusToken}`,
        },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('SPEC_NOT_FOUND');
    });

    it('returns 200 application/pdf vector dossier and emits EVT-013 for authenticated owner', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fittings/fit_marcus_solaro_01/tailor-spec/pdf',
        headers: {
          authorization: `Bearer ${marcusToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toBe('attachment; filename="Drape-Tailor-Spec.pdf"');

      // Verify binary buffer
      expect(res.rawPayload.length).toBeGreaterThan(1000);
      const pdfText = res.rawPayload.toString('utf8');
      expect(pdfText.startsWith('%PDF-1.4')).toBe(true);
      expect(pdfText.includes('DRAPE')).toBe(true);

      // Verify EVT-013 telemetry event emission
      const events = pdfSpecService.getTelemetryEvents();
      expect(events.length).toBe(1);
      const evt = events[0];
      expect(evt.eventType).toBe('spec_dossier_exported');
      expect(evt.userId).toBe(marcusId);
      expect(evt.payload).toHaveProperty('order_id');
      expect(evt.payload).toHaveProperty('silhouette_id', 'architectural_tuxedo');
      expect(evt.payload).toHaveProperty('export_format', 'pdf');
    });

    it('supports PDF download using guest oneTimeAccessToken from C-029', async () => {
      // 1. Acquire guest token
      const guestRes = await app.inject({
        method: 'POST',
        url: '/api/v1/wardrobe/lookup-guest',
        payload: {
          orderNumber: 'DRP-2027-442',
          billingEmail: 'marcus.sterling@sterling-pe.com',
        },
      });
      const { oneTimeAccessToken } = JSON.parse(guestRes.payload);

      // 2. Download spec dossier using query token
      const pdfRes = await app.inject({
        method: 'GET',
        url: `/api/v1/fittings/ord_marcus_01/tailor-spec/pdf?orderId=ord_marcus_01&token=${oneTimeAccessToken}`,
      });

      expect(pdfRes.statusCode).toBe(200);
      expect(pdfRes.headers['content-type']).toBe('application/pdf');
      expect(pdfRes.rawPayload.toString('utf8').startsWith('%PDF-1.4')).toBe(true);
    });
  });

  // =========================================================================
  // 5. INTEGRATION TESTS: C-018 GET /api/v1/specs/public/:specToken
  // =========================================================================
  describe('C-018: GET /api/v1/specs/public/:specToken (External Tailor Read-Only View)', () => {
    it('returns 404 SPEC_TOKEN_NOT_FOUND when token does not exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/specs/public/invalid_spec_token_999',
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('SPEC_TOKEN_NOT_FOUND');
    });

    it('returns 404 SPEC_TOKEN_NOT_FOUND when token is expired', async () => {
      const expiredToken = 'spec_tok_expired_01';
      pdfSpecService.createPublicSpec({
        specToken: expiredToken,
        specId: 'SPEC-EXPIRED',
        orderNumber: 'DRP-EXPIRED',
        customerFirstName: 'Expired',
        silhouetteName: 'Expired Gown',
        fabric: {
          sku: 'FAB-SLK-892',
          name: 'Silk',
          millName: 'Taroni',
          countryOfOrigin: 'IT',
          fiberBreakdown: '100% Silk',
          gsm: 300,
          widthInches: 54,
          dyeLotCode: 'LOT-EXP',
        },
        yardageOrdered: 3,
        fittingRenderUrl: 'https://example.com/render.jpg',
        grainlineCuttingDiagramUrl: 'https://example.com/diagram.svg',
        technicalNotes: {
          pressingTemperatureC: 150,
          steamPermitted: true,
          interliningType: 'Canvas',
          needleSizeRecommendation: '70/10',
        },
        expiresAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour in the past
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/specs/public/${expiredToken}`,
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.code).toBe('SPEC_TOKEN_NOT_FOUND');
    });

    it('returns 200 with full technical specification dossier for external master tailor without authentication', async () => {
      const validToken = 'spec_tok_marcus_savile_row_2026';
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/specs/public/${validToken}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);

      expect(body).toHaveProperty('specId', 'SPEC-2027-094');
      expect(body).toHaveProperty('orderNumber', 'DRP-2027-442');
      expect(body).toHaveProperty('customerFirstName', 'Marcus');
      expect(body).toHaveProperty('silhouetteName', 'Architectural Double-Breasted Tuxedo');

      // Fabric breakdown conforming to C-018
      expect(body.fabric).toEqual({
        sku: 'FAB-SLK-892',
        name: 'Emerald Architectural Silk Brocade',
        millName: 'Taroni Silk Mills',
        countryOfOrigin: 'IT',
        fiberBreakdown: '85% Mulberry Silk, 15% Metallic Lurex',
        gsm: 320,
        widthInches: 54.0,
        dyeLotCode: 'LOT-2026-EMR-04',
      });

      expect(body).toHaveProperty('yardageOrdered', 4.0);
      expect(body).toHaveProperty('fittingRenderUrl');
      expect(body).toHaveProperty('grainlineCuttingDiagramUrl');

      // Technical tailoring notes
      expect(body.technicalNotes).toEqual({
        pressingTemperatureC: 150,
        steamPermitted: true,
        interliningType: 'Medium-weight natural horsehair canvas and silk organza stay',
        needleSizeRecommendation: '70/10 Microtex Sharp Needle with #50 silk filament thread',
      });

      expect(body).toHaveProperty('expiresAt');
    });
  });
});
