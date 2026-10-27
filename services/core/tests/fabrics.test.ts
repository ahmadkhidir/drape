/**
 * Fabric Catalog & Shader Delivery Route Tests
 * Spec Anchor: C-007, C-008, C-009, C-010, FEAT-001, FEAT-002, FEAT-003, AGENTS.md
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../src/server.js';

describe('Fabric Catalog & Shader Delivery Service (C-007..C-010)', () => {
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

  // =========================================================================
  // C-007: GET /api/v1/fabrics
  // =========================================================================
  describe('C-007: GET /api/v1/fabrics', () => {
    it('returns 200 with full initial seed catalog, pagination, and facet summaries', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics',
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);

      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('facets');

      // Seed catalog contains 5 luxury textiles
      expect(data.items.length).toBe(5);
      expect(data.pagination.totalItems).toBe(5);
      expect(data.pagination.totalPages).toBe(1);
      expect(data.pagination.currentPage).toBe(1);

      // Verify item fields match C-007 specification
      const firstItem = data.items[0];
      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('name');
      expect(firstItem).toHaveProperty('millName');
      expect(firstItem).toHaveProperty('countryOfOrigin');
      expect(firstItem).toHaveProperty('fiberBreakdown');
      expect(typeof firstItem.gsm).toBe('number');
      expect(typeof firstItem.widthInches).toBe('number');
      expect(typeof firstItem.drapeCoefficient).toBe('number');
      expect(typeof firstItem.stiffnessRating).toBe('number');
      expect(typeof firstItem.pricePerYard).toBe('number');
      expect(typeof firstItem.remainingContinuousYards).toBe('number');
      expect(typeof firstItem.isLowStock).toBe('boolean');
      expect(firstItem).toHaveProperty('thumbnailUrl');
      expect(firstItem).toHaveProperty('normalMapUrl');

      // Verify facet structure
      expect(data.facets).toHaveProperty('fiberCounts');
      expect(data.facets).toHaveProperty('weaveCounts');
      expect(data.facets).toHaveProperty('gsmRanges');
      expect(data.facets.fiberCounts.silk).toBe(2);
      expect(data.facets.fiberCounts.wool).toBe(1);
      expect(data.facets.fiberCounts.linen).toBe(1);
      expect(data.facets.fiberCounts.velvet).toBe(1);
    });

    it('accurately identifies low-stock bolts (< 5.0 yards remaining) per FEAT-001', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics',
      });

      const data = JSON.parse(res.body);
      const linen = data.items.find((item: { id: string }) => item.id === 'FAB-LIN-112');
      const silk = data.items.find((item: { id: string }) => item.id === 'FAB-SLK-892');

      // Normandy linen has 4.25 yards -> low stock warning
      expect(linen).toBeDefined();
      expect(linen.remainingContinuousYards).toBe(4.25);
      expect(linen.isLowStock).toBe(true);

      // Silk jacquard has 14.5 yards -> healthy stock
      expect(silk).toBeDefined();
      expect(silk.remainingContinuousYards).toBe(14.5);
      expect(silk.isLowStock).toBe(false);
    });

    it('filters catalog by fiber parameter (silk)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics?fiber=silk',
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.items.length).toBe(2);
      expect(data.items.every((f: { id: string }) => f.id.startsWith('FAB-SLK'))).toBe(true);
    });

    it('filters catalog by fiberCategory synonym (wool)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics?fiberCategory=wool',
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.items.length).toBe(1);
      expect(data.items[0].id).toBe('FAB-WOL-205');
    });

    it('filters catalog by weave parameter (satin)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics?weave=satin',
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.items.length).toBe(1);
      expect(data.items[0].id).toBe('FAB-SLK-401');
    });

    it('filters catalog by occasion parameter (black_tie)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics?occasion=black_tie',
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.items.length).toBe(1);
      expect(data.items[0].id).toBe('FAB-SLK-892');
    });

    it('filters catalog by minGsm threshold (GSM >= 300)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics?minGsm=300',
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.items.length).toBe(2);
      expect(data.items.every((f: { gsm: number }) => f.gsm >= 300)).toBe(true);
    });

    it('filters catalog by maxGsm threshold (GSM <= 250)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics?maxGsm=250',
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.items.length).toBe(1);
      expect(data.items[0].id).toBe('FAB-LIN-112');
      expect(data.items[0].gsm).toBe(240);
    });

    it('filters catalog by minContinuousYards', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics?minContinuousYards=10',
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.items.length).toBe(3);
      expect(data.items.every((f: { remainingContinuousYards: number }) => f.remainingContinuousYards >= 10)).toBe(
        true
      );
    });

    it('supports free-text natural occasion and keyword search', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics?search=Jacquard',
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.items.length).toBe(1);
      expect(data.items[0].id).toBe('FAB-SLK-892');

      const millRes = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics?query=Bevilacqua',
      });
      expect(millRes.statusCode).toBe(200);
      const millData = JSON.parse(millRes.body);
      expect(millData.items.length).toBe(2);
    });

    it('sorts catalog items ascending and descending by GSM and price', async () => {
      const gsmAsc = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics?sort=gsm_asc',
      });
      const gsmData = JSON.parse(gsmAsc.body);
      expect(gsmData.items[0].gsm).toBe(240);
      expect(gsmData.items[gsmData.items.length - 1].gsm).toBe(380);

      const priceDesc = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics?sort=price_desc',
      });
      const priceData = JSON.parse(priceDesc.body);
      expect(priceData.items[0].pricePerYard).toBe(185.0);
      expect(priceData.items[priceData.items.length - 1].pricePerYard).toBe(85.0);
    });

    it('paginates results accurately with page and limit parameters', async () => {
      const page1 = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics?page=1&limit=2',
      });
      const data1 = JSON.parse(page1.body);
      expect(data1.items.length).toBe(2);
      expect(data1.pagination.totalItems).toBe(5);
      expect(data1.pagination.totalPages).toBe(3);
      expect(data1.pagination.currentPage).toBe(1);

      const page3 = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics?page=3&limit=2',
      });
      const data3 = JSON.parse(page3.body);
      expect(data3.items.length).toBe(1);
      expect(data3.pagination.currentPage).toBe(3);
    });

    it('returns 400 INVALID_FILTER_PARAMS for out-of-bound parameters', async () => {
      const badMinGsm = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics?minGsm=20', // min allowed is 30.0
      });
      expect(badMinGsm.statusCode).toBe(400);
      const err1 = JSON.parse(badMinGsm.body);
      expect(err1.code).toBe('INVALID_FILTER_PARAMS');
      expect(err1.fields).toHaveProperty('minGsm');

      const invertedGsm = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics?minGsm=500&maxGsm=200',
      });
      expect(invertedGsm.statusCode).toBe(400);
      const err2 = JSON.parse(invertedGsm.body);
      expect(err2.fields.minGsm).toContain('cannot exceed');

      const badFiber = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics?fiber=polyester',
      });
      expect(badFiber.statusCode).toBe(400);
      const err3 = JSON.parse(badFiber.body);
      expect(err3.fields).toHaveProperty('fiber');

      const badLimit = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics?limit=99', // max allowed is 48
      });
      expect(badLimit.statusCode).toBe(400);
      const err4 = JSON.parse(badLimit.body);
      expect(err4.fields).toHaveProperty('limit');
    });
  });

  // =========================================================================
  // C-008: GET /api/v1/fabrics/:id
  // =========================================================================
  describe('C-008: GET /api/v1/fabrics/:id', () => {
    it('returns 200 with full textile technical specs, certified GSM, and continuous bolt roll data', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics/FAB-SLK-892',
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);

      expect(data.id).toBe('FAB-SLK-892');
      expect(data.name).toBe('Mulberry Silk Jacquard');
      expect(data.millName).toBe('Bevilacqua Tessuti');
      expect(data.countryOfOrigin).toBe('IT');
      expect(data.gsm).toBe(320);
      expect(data.widthInches).toBe(54.0);
      expect(data.drapeCoefficient).toBe(0.45);
      expect(data.drapeFluidityCoefficient).toBe(0.45);
      expect(data.stiffnessRating).toBe(6.5);
      expect(data.stretchPercentage).toBe(2.0);
      expect(data.transparencyRating).toBe(0.05);
      expect(data.tearResistance).toContain('48 N');
      expect(data.pricePerYard).toBe(185.0);
      expect(data.swatchPrice).toBe(25.0);
      expect(data.pbrTexturesUrl).toBe('/api/v1/fabrics/FAB-SLK-892/shader-assets');

      // Active bolt details
      expect(data.activeBolt).toBeDefined();
      expect(data.activeBolt.id).toBe('bolt_901');
      expect(data.activeBolt.dyeLotCode).toBe('LOT-2026-EMR-04');
      expect(data.activeBolt.remainingContinuousYards).toBe(14.5);
      expect(data.activeBolt.isLowStock).toBe(false);

      // Care instructions
      expect(data.careInstructions).toBeDefined();
      expect(data.careInstructions.dryCleanOnly).toBe(true);
      expect(data.careInstructions.ironTemperatureMaxC).toBe(110);
      expect(data.careInstructions.interliningRecommendation).toContain('Silk organza');
    });

    it('returns 404 FABRIC_NOT_FOUND when SKU does not exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics/FAB-NONEXISTENT',
      });

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res.body);
      expect(data.code).toBe('FABRIC_NOT_FOUND');
      expect(data.message).toContain('not found in active atelier catalog');
    });
  });

  // =========================================================================
  // C-009: GET /api/v1/fabrics/:id/shader-assets
  // =========================================================================
  describe('C-009: GET /api/v1/fabrics/:id/shader-assets', () => {
    it('returns 200 with WGSL simulation shader, WebGL fallback bundle, PBR textures, and physical matrices', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics/FAB-SLK-892/shader-assets',
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);

      expect(data.fabricId).toBe('FAB-SLK-892');
      expect(data.wgslShaderUrl).toBe('/shaders/cloth-simulation.wgsl');
      expect(data.webglShaderUrl).toBe('/shaders/cloth-simulation.glsl');
      expect(data.loopingVideoFallbackUrl).toContain('drape-loop.mp4');

      // Physical matrix parameters
      expect(data.physicsMatrix).toBeDefined();
      expect(data.physicsMatrix.massDensity).toBe(0.32);
      expect(data.physicsMatrix.bendingStiffness).toBe(6.5);
      expect(data.physicsMatrix.tensileElasticity).toBe(0.85);
      expect(data.physicsMatrix.airDamping).toBe(0.02);
      expect(data.physicsMatrix.gravityVector).toEqual([0.0, -9.81, 0.0]);

      // Verlet parameters
      expect(data.verletParameters).toBeDefined();
      expect(data.verletParameters.mass).toBe(0.32);
      expect(data.verletParameters.springStiffness).toBe(6.5);
      expect(data.verletParameters.dampingFactor).toBe(0.02);
      expect(data.verletParameters.gravityScale).toBe(1.0);

      // PBR Texture maps matching ASSETS.md A-032..A-034
      expect(data.textures).toBeDefined();
      expect(data.textures.albedoUrl).toContain('silk-jacquard-albedo.jpg');
      expect(data.textures.normalMapUrl).toContain('silk-jacquard-normal.jpg');
      expect(data.textures.roughnessMapUrl).toContain('silk-jacquard-roughness.jpg');
      expect(data.textures.metallicMapUrl).toContain('silk-jacquard-metallic.jpg');

      // Micro-weave tile coordinates
      expect(data.microWeaveTileBaseUrl).toBe('/api/v1/fabrics/FAB-SLK-892/micro-weave/tiles');
      expect(data.maxTileZoomLevel).toBe(5);

      // Shader source availability
      expect(data.wgslShaderSource).toContain('@compute');
      expect(data.wgslShaderSource).toContain('simulateVerlet');
      expect(data.webglShaderSource).toContain('#version 300 es');
    });

    it('returns 404 FABRIC_NOT_FOUND for non-existent fabric shader assets', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics/FAB-DOES-NOT-EXIST/shader-assets',
      });

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res.body);
      expect(data.code).toBe('FABRIC_NOT_FOUND');
    });
  });

  // =========================================================================
  // C-010: GET /api/v1/fabrics/:id/micro-weave/tiles/:level/:x/:y
  // =========================================================================
  describe('C-010: GET /api/v1/fabrics/:id/micro-weave/tiles/:level/:x/:y', () => {
    it('serves valid 256x256 WebP binary tile with immutable cache and strong ETag', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics/FAB-SLK-892/micro-weave/tiles/0/0/0',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/webp');
      expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(res.headers.etag).toBe('"tile-FAB-SLK-892-0-0-0"');

      // Verify binary buffer contains valid RIFF/WEBP/VP8 signature
      const buffer = res.rawPayload;
      expect(buffer.length).toBeGreaterThan(50);
      expect(buffer.toString('ascii', 0, 4)).toBe('RIFF');
      expect(buffer.toString('ascii', 8, 12)).toBe('WEBP');
      expect(buffer.toString('ascii', 12, 16)).toBe('VP8 ');

      // Verify dimensions (256x256)
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      expect(width).toBe(256);
      expect(height).toBe(256);
    });

    it('returns 304 Not Modified when If-None-Match matches tile ETag', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics/FAB-SLK-892/micro-weave/tiles/0/0/0',
        headers: {
          'if-none-match': '"tile-FAB-SLK-892-0-0-0"',
        },
      });

      expect(res.statusCode).toBe(304);
      expect(res.body).toBe('');
    });

    it('serves deep-zoom coordinates across pyramid levels up to max level 5', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics/FAB-LIN-112/micro-weave/tiles/3/4/7',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/webp');
      expect(res.headers.etag).toBe('"tile-FAB-LIN-112-3-4-7"');
    });

    it('returns 400 INVALID_TILE_COORDINATES for out-of-bound zoom levels or tile coordinates', async () => {
      // Zoom level > 5
      const badLevel = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics/FAB-SLK-892/micro-weave/tiles/6/0/0',
      });
      expect(badLevel.statusCode).toBe(400);
      expect(JSON.parse(badLevel.body).code).toBe('INVALID_TILE_COORDINATES');

      // Coordinate x exceeds 2^level - 1 (at level 0, only x=0, y=0 are valid)
      const badCoord = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics/FAB-SLK-892/micro-weave/tiles/0/1/0',
      });
      expect(badCoord.statusCode).toBe(400);
      expect(JSON.parse(badCoord.body).code).toBe('INVALID_TILE_COORDINATES');

      // Negative coordinate
      const negCoord = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics/FAB-SLK-892/micro-weave/tiles/2/-1/0',
      });
      expect(negCoord.statusCode).toBe(400);

      // Non-integer coordinates
      const nonInt = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics/FAB-SLK-892/micro-weave/tiles/foo/bar/baz',
      });
      expect(nonInt.statusCode).toBe(400);
    });

    it('returns 404 TILE_NOT_FOUND when fabric SKU is unknown', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/fabrics/FAB-NONEXISTENT/micro-weave/tiles/0/0/0',
      });

      expect(res.statusCode).toBe(404);
      const data = JSON.parse(res.body);
      expect(data.code).toBe('TILE_NOT_FOUND');
    });
  });

  // =========================================================================
  // Direct Shader Delivery Endpoints
  // =========================================================================
  describe('Direct Shader Asset Endpoints', () => {
    it('serves valid WGSL cloth simulation source code at /shaders/cloth-simulation.wgsl', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/shaders/cloth-simulation.wgsl',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('struct SimulationParams');
      expect(res.body).toContain('fn simulateVerlet');
      expect(res.body).toContain('fn vs_main');
      expect(res.body).toContain('fn fs_main');
    });

    it('serves valid WebGL 2.0 GLSL cloth simulation shader at /shaders/cloth-simulation.glsl', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/shaders/cloth-simulation.glsl',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('#version 300 es');
      expect(res.body).toContain('v_nextPosition');
    });
  });
});
