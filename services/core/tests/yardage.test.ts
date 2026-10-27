/**
 * Yardage & Pattern Layout Engine Test Suite
 * Spec Anchor: docs/Drape/features/FEAT-007.md, CONTRACTS.md (C-016, C-039), nfr.md (NFR-006)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';
import {
  calculateYardage,
  calculateLayoutGrpc,
  roundToEighthYard,
  SUPPORTED_SILHOUETTES,
  type SilhouetteId,
} from '../src/services/yardage.js';

describe('Algorithmic Yardage & Pattern Layout Engine', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer({
      fastifyOptions: { logger: false },
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1/8th-Yard Fractional Precision (AGENTS.md#Discipline, FEAT-007)', () => {
    it('rounds various numbers up to exact 1/8th yard (0.125) increments', () => {
      expect(roundToEighthYard(1.0)).toBe(1.0);
      expect(roundToEighthYard(1.001)).toBe(1.125);
      expect(roundToEighthYard(1.125)).toBe(1.125);
      expect(roundToEighthYard(1.126)).toBe(1.25);
      expect(roundToEighthYard(4.2)).toBe(4.25);
      expect(roundToEighthYard(3.875)).toBe(3.875);
      expect(roundToEighthYard(3.876)).toBe(4.0);
    });

    it('guarantees zero rounding drift on fractional eighths', () => {
      for (let i = 1; i <= 64; i++) {
        const val = i * 0.125;
        const rounded = roundToEighthYard(val);
        expect(rounded).toBe(val);
        expect((rounded * 8) % 1).toBe(0);
      }
    });
  });

  describe('8 Architectural Silhouettes (FEAT-007, C-016)', () => {
    it.each(SUPPORTED_SILHOUETTES)('successfully calculates layout for silhouette: %s', async (silhouetteId) => {
      const result = await calculateYardage({
        silhouetteId,
        fabricId: 'FAB-SLK-892',
        heightCm: 173.0, // 5'8"
        bustCircumferenceCm: 88.0,
        waistCircumferenceCm: 70.0,
        hipCircumferenceCm: 96.0,
      });

      expect(result.recommendedYards).toBeGreaterThan(0);
      // Must be a multiple of 1/8th yard (0.125)
      expect((result.recommendedYards * 8) % 1).toBe(0);
      expect((result.safetyMarginYards * 8) % 1).toBe(0);
      expect(result.recommendedMeters).toBeCloseTo(result.recommendedYards * 0.9144, 1);
      expect(result.boltWidthInches).toBe(54.0);
      expect(result.activeBoltId).toBe('bolt_901');
      expect(result.cuttingLayout.panels.length).toBeGreaterThan(0);
      expect(result.cuttingLayout.diagramSvgUrl).toContain('data:image/svg+xml');
      expect(result.estimatedTotalPrice).toBeGreaterThan(0);

      // Verify each panel contains length, width, and grainline
      for (const panel of result.cuttingLayout.panels) {
        expect(panel.name).toBeTruthy();
        expect(panel.lengthYards).toBeGreaterThan(0);
        expect(panel.widthInches).toBeGreaterThan(0);
        expect([0.0, 45.0, 90.0]).toContain(panel.grainlineAngleDegrees);
      }
    });

    it('supports alias silhouette identifiers (e.g. corseted_mermaid, grecian_bias, tuxedo)', async () => {
      const aliasResult = await calculateYardage({
        silhouetteId: 'corseted_mermaid',
        fabricId: 'FAB-SLK-892',
        heightCm: 170.0,
      });
      expect(aliasResult.recommendedYards).toBeGreaterThan(0);

      const tuxedoResult = await calculateYardage({
        silhouetteId: 'tuxedo',
        fabricId: 'FAB-WOL-102',
        heightCm: 180.0,
      });
      expect(tuxedoResult.recommendedYards).toBeGreaterThan(0);
    });
  });

  describe('Directional Nap Constraints (FEAT-007, C-016)', () => {
    it('applies one-way layout buffer (+15-20%) for napped velvet compared to non-napped silk', async () => {
      const unNappedResult = await calculateYardage({
        silhouetteId: 'corseted_mermaid_gown',
        fabricId: 'FAB-SLK-892', // non-napped brocade, width 54"
        heightCm: 175.0,
        bustCircumferenceCm: 90.0,
        waistCircumferenceCm: 72.0,
        hipCircumferenceCm: 98.0,
      });

      const nappedResult = await calculateYardage({
        silhouetteId: 'corseted_mermaid_gown',
        fabricId: 'FAB-VLV-401', // directional silk velvet, width 54"
        heightCm: 175.0,
        bustCircumferenceCm: 90.0,
        waistCircumferenceCm: 72.0,
        hipCircumferenceCm: 98.0,
      });

      expect(unNappedResult.isDirectionalNap).toBe(false);
      expect(nappedResult.isDirectionalNap).toBe(true);

      // Velvet must require strictly more linear yardage due to one-way nap alignment (+18% buffer)
      expect(nappedResult.recommendedYards).toBeGreaterThan(unNappedResult.recommendedYards);

      // SVG diagram should explicitly indicate directional nap layout
      const decodedSvg = decodeURIComponent(nappedResult.cuttingLayout.diagramSvgUrl);
      expect(decodedSvg).toContain('DIRECTIONAL NAP');
    });
  });

  describe('Bolt Width & Train Length Adaptations', () => {
    it('requires more linear yardage for 45-inch bolt compared to 60-inch bolt', async () => {
      const narrowBoltResult = await calculateYardage({
        silhouetteId: 'structured_tuxedo',
        fabricId: 'FAB-CRD-305', // 45" width
        heightCm: 180.0,
        bustCircumferenceCm: 100.0,
        waistCircumferenceCm: 84.0,
        hipCircumferenceCm: 102.0,
      });

      const wideBoltResult = await calculateYardage({
        silhouetteId: 'structured_tuxedo',
        fabricId: 'FAB-WOL-102', // 60" width
        heightCm: 180.0,
        bustCircumferenceCm: 100.0,
        waistCircumferenceCm: 84.0,
        hipCircumferenceCm: 102.0,
      });

      expect(narrowBoltResult.boltWidthInches).toBe(45.0);
      expect(wideBoltResult.boltWidthInches).toBe(60.0);
      // Narrow bolt forces panels into additional shelves, increasing linear yardage
      expect(narrowBoltResult.recommendedYards).toBeGreaterThan(wideBoltResult.recommendedYards);
    });

    it('increases required yardage when custom train length is specified', async () => {
      const withoutTrain = await calculateYardage({
        silhouetteId: 'corseted_mermaid_gown',
        fabricId: 'FAB-SLK-892',
        heightCm: 172.0,
        customTrainLengthInches: 0.0,
      });

      const withTrain = await calculateYardage({
        silhouetteId: 'corseted_mermaid_gown',
        fabricId: 'FAB-SLK-892',
        heightCm: 172.0,
        customTrainLengthInches: 36.0, // 36-inch royal train
      });

      expect(withTrain.recommendedYards).toBeGreaterThan(withoutTrain.recommendedYards);
    });

    it('triggers isSplitBoltWarning when recommended yardage exceeds remaining continuous stock', async () => {
      // FAB-SAT-204 only has 4.0 continuous yards remaining on bolt_sat_03
      // A ballgown with a train requires more than 4.0 yards
      const result = await calculateYardage({
        silhouetteId: 'off_shoulder_ballgown',
        fabricId: 'FAB-SAT-204',
        heightCm: 175.0,
        customTrainLengthInches: 24.0,
      });

      expect(result.remainingContinuousYardsOnBolt).toBe(4.0);
      expect(result.recommendedYards).toBeGreaterThan(4.0);
      expect(result.isSplitBoltWarning).toBe(true);
    });
  });

  describe('Standard Sizing Fallback', () => {
    it('uses standard size measurements when custom circumferences are omitted', async () => {
      const resultUS2 = await calculateYardage({
        silhouetteId: 'aline_slip',
        fabricId: 'FAB-SLK-892',
        heightCm: 168.0,
        standardSize: 'US_2',
      });

      const resultUS18 = await calculateYardage({
        silhouetteId: 'aline_slip',
        fabricId: 'FAB-SLK-892',
        heightCm: 168.0,
        standardSize: 'US_18',
      });

      expect(resultUS18.recommendedYards).toBeGreaterThanOrEqual(resultUS2.recommendedYards);
    });
  });

  describe('NFR-006 Latency Benchmark (<35ms P95)', () => {
    it('executes multi-panel cutting layout calculations with P95 latency strictly below 35ms', async () => {
      const iterations = 60;
      const latencies: number[] = [];

      const silhouettes: SilhouetteId[] = [
        'corseted_mermaid_gown',
        'structured_tuxedo',
        'off_shoulder_ballgown',
        'asymmetric_cape_dress',
      ];

      for (let i = 0; i < iterations; i++) {
        const sil = silhouettes[i % silhouettes.length];
        const t0 = performance.now();
        await calculateYardage({
          silhouetteId: sil,
          fabricId: 'FAB-SLK-892',
          heightCm: 170.0 + (i % 20),
          bustCircumferenceCm: 85.0 + (i % 25),
          waistCircumferenceCm: 65.0 + (i % 20),
          hipCircumferenceCm: 90.0 + (i % 25),
          customTrainLengthInches: (i % 3) * 12.0,
        });
        const elapsed = performance.now() - t0;
        latencies.push(elapsed);
      }

      latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(latencies.length * 0.95);
      const p95Latency = latencies[p95Index];
      const p50Latency = latencies[Math.floor(latencies.length * 0.5)];

      // Verify against NFR-006: Target p50/p95/p99 = 15ms / 35ms / 60ms
      expect(p95Latency).toBeLessThan(35.0);
      expect(p50Latency).toBeLessThan(15.0);
    });
  });

  describe('C-016 HTTP Endpoint: POST /api/v1/yardage/calculate', () => {
    it('returns 200 with full tailored yardage response', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/yardage/calculate',
        payload: {
          silhouetteId: 'corseted_mermaid_gown',
          fabricId: 'FAB-SLK-892',
          heightCm: 173.0,
          bustCircumferenceCm: 88.0,
          waistCircumferenceCm: 70.0,
          hipCircumferenceCm: 96.0,
          customTrainLengthInches: 12.0,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('recommendedYards');
      expect(body).toHaveProperty('recommendedMeters');
      expect(body).toHaveProperty('safetyMarginYards');
      expect(body).toHaveProperty('boltWidthInches', 54.0);
      expect(body).toHaveProperty('activeBoltId', 'bolt_901');
      expect(body).toHaveProperty('remainingContinuousYardsOnBolt');
      expect(body).toHaveProperty('isSplitBoltWarning');
      expect(body).toHaveProperty('isDirectionalNap', false);
      expect(body.cuttingLayout.panels.length).toBeGreaterThan(0);
      expect(body.cuttingLayout.diagramSvgUrl).toMatch(/^data:image\/svg\+xml/);
      expect(body.estimatedTotalPrice).toBeGreaterThan(0);
    });

    it('returns 400 VALIDATION_FAILED when measurements are outside physiological bounds', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/yardage/calculate',
        payload: {
          silhouetteId: 'corseted_mermaid_gown',
          fabricId: 'FAB-SLK-892',
          heightCm: 90.0, // Invalid: min is 120.0
          bustCircumferenceCm: 250.0, // Invalid: max is 180.0
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('VALIDATION_FAILED');
      expect(body.message).toContain('physiological ranges');
      expect(body.fields).toHaveProperty('heightCm');
      expect(body.fields).toHaveProperty('bustCircumferenceCm');
    });

    it('returns 400 VALIDATION_FAILED when required heightCm is omitted', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/yardage/calculate',
        payload: {
          silhouetteId: 'corseted_mermaid_gown',
          fabricId: 'FAB-SLK-892',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('VALIDATION_FAILED');
      expect(body.fields).toHaveProperty('heightCm');
    });

    it('returns 404 FABRIC_OR_SILHOUETTE_NOT_FOUND when unknown silhouette or fabric is provided', async () => {
      const unknownSil = await app.inject({
        method: 'POST',
        url: '/api/v1/yardage/calculate',
        payload: {
          silhouetteId: 'non_existent_silhouette',
          fabricId: 'FAB-SLK-892',
          heightCm: 170.0,
        },
      });

      expect(unknownSil.statusCode).toBe(404);
      expect(JSON.parse(unknownSil.body).code).toBe('FABRIC_OR_SILHOUETTE_NOT_FOUND');

      const unknownFab = await app.inject({
        method: 'POST',
        url: '/api/v1/yardage/calculate',
        payload: {
          silhouetteId: 'corseted_mermaid_gown',
          fabricId: 'FAB-UNKNOWN-999',
          heightCm: 170.0,
        },
      });

      expect(unknownFab.statusCode).toBe(404);
      expect(JSON.parse(unknownFab.body).code).toBe('FABRIC_OR_SILHOUETTE_NOT_FOUND');
    });
  });

  describe('C-039 Internal gRPC-equivalent Service: calculateLayoutGrpc', () => {
    it('computes layout and returns protobuf-conforming response including diagram_svg_blob', async () => {
      const response = await calculateLayoutGrpc({
        silhouette_id: 'structured_tuxedo',
        fabric_sku: 'FAB-WOL-102',
        bolt_width_inches: 60.0,
        is_directional_nap: false,
        customer_height_cm: 182.0,
        bust_cm: 104.0,
        waist_cm: 86.0,
        hip_cm: 102.0,
        train_length_inches: 0.0,
        safety_margin_factor: 0.08,
      });

      expect(response.recommended_yards).toBeGreaterThan(0);
      expect(response.recommended_meters).toBeGreaterThan(0);
      expect(response.safety_margin_yards).toBeGreaterThan(0);
      expect(response.panels.length).toBeGreaterThan(0);
      expect(Buffer.isBuffer(response.diagram_svg_blob)).toBe(true);
      expect(response.diagram_svg_blob.toString('utf-8')).toContain('<svg');
      expect(response.calculation_time_ms).toBeLessThanOrEqual(35);
    });

    it('throws code 3 (INVALID_ARGUMENT) on invalid anatomical bounds', async () => {
      await expect(
        calculateLayoutGrpc({
          silhouette_id: 'structured_tuxedo',
          fabric_sku: 'FAB-WOL-102',
          bolt_width_inches: 60.0,
          is_directional_nap: false,
          customer_height_cm: 250.0, // Exceeds max 220.0
        })
      ).rejects.toMatchObject({ code: 3 });
    });

    it('throws code 5 (NOT_FOUND) on unknown silhouette', async () => {
      await expect(
        calculateLayoutGrpc({
          silhouette_id: 'unknown_garment',
          fabric_sku: 'FAB-WOL-102',
          bolt_width_inches: 60.0,
          is_directional_nap: false,
          customer_height_cm: 175.0,
        })
      ).rejects.toMatchObject({ code: 5 });
    });
  });
});
