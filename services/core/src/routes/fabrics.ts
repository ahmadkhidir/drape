/**
 * Drape Fabric Catalog & Shader Delivery Routes
 * Spec Anchor: C-007, C-008, C-009, C-010, FEAT-001, FEAT-002, FEAT-003
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import {
  SEED_FABRICS,
  getFabricById,
  getFabricTileBuffer,
  WGSL_SIMULATION_SHADER,
  WEBGL_SIMULATION_SHADER,
  type FiberCategory,
  type WeaveStructure,
  type OccasionType,
} from '../db/fabrics-seed.js';

const ALLOWED_FIBERS: readonly string[] = ['silk', 'wool', 'linen', 'cotton', 'blend', 'velvet', 'brocade'];
const ALLOWED_WEAVES: readonly string[] = ['twill', 'satin', 'jacquard', 'crepe', 'plain', 'brocade', 'chiffon'];
const ALLOWED_OCCASIONS: readonly string[] = ['black_tie', 'bridal', 'daywear', 'cocktail', 'suiting'];
const ALLOWED_SORTS: readonly string[] = ['featured', 'gsm_asc', 'gsm_desc', 'price_asc', 'price_desc', 'newest'];

interface CatalogQuery {
  query?: string;
  search?: string;
  fiber?: string;
  fiberCategory?: string;
  minGsm?: string | number;
  maxGsm?: string | number;
  weave?: string;
  weaveStructure?: string;
  occasion?: string;
  minContinuousYards?: string | number;
  sort?: string;
  page?: string | number;
  limit?: string | number;
}

interface TileParams {
  id: string;
  level: string;
  x: string;
  y: string;
}

export const fabricRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * C-007: GET /api/v1/fabrics
   * Public catalog retrieval with multimodal filtering, continuous bolt yardage, and facet summaries.
   */
  fastify.get('/api/v1/fabrics', async (request: FastifyRequest<{ Querystring: CatalogQuery }>, reply: FastifyReply) => {
    const q = request.query;
    const fields: Record<string, string> = {};

    // Validate minGsm
    let minGsm: number | undefined;
    if (q.minGsm !== undefined && q.minGsm !== '') {
      const val = Number(q.minGsm);
      if (isNaN(val) || val < 30.0 || val > 900.0) {
        fields.minGsm = 'minGsm must be a number between 30.0 and 900.0';
      } else {
        minGsm = val;
      }
    }

    // Validate maxGsm
    let maxGsm: number | undefined;
    if (q.maxGsm !== undefined && q.maxGsm !== '') {
      const val = Number(q.maxGsm);
      if (isNaN(val) || val < 30.0 || val > 900.0) {
        fields.maxGsm = 'maxGsm must be a number between 30.0 and 900.0';
      } else {
        maxGsm = val;
      }
    }

    // Check minGsm <= maxGsm
    if (minGsm !== undefined && maxGsm !== undefined && minGsm > maxGsm) {
      fields.minGsm = 'minGsm cannot exceed maxGsm';
    }

    // Validate fiber / fiberCategory
    const rawFiber = q.fiberCategory || q.fiber;
    let fiberFilter: FiberCategory | undefined;
    if (rawFiber !== undefined && rawFiber !== '') {
      const f = rawFiber.toLowerCase();
      if (!ALLOWED_FIBERS.includes(f)) {
        fields.fiber = `fiber must be one of: ${ALLOWED_FIBERS.join(', ')}`;
      } else {
        fiberFilter = f as FiberCategory;
      }
    }

    // Validate weave / weaveStructure
    const rawWeave = q.weaveStructure || q.weave;
    let weaveFilter: WeaveStructure | undefined;
    if (rawWeave !== undefined && rawWeave !== '') {
      const w = rawWeave.toLowerCase();
      if (!ALLOWED_WEAVES.includes(w)) {
        fields.weave = `weave must be one of: ${ALLOWED_WEAVES.join(', ')}`;
      } else {
        weaveFilter = w as WeaveStructure;
      }
    }

    // Validate occasion
    let occasionFilter: OccasionType | undefined;
    if (q.occasion !== undefined && q.occasion !== '') {
      const occ = q.occasion.toLowerCase();
      if (!ALLOWED_OCCASIONS.includes(occ)) {
        fields.occasion = `occasion must be one of: ${ALLOWED_OCCASIONS.join(', ')}`;
      } else {
        occasionFilter = occ as OccasionType;
      }
    }

    // Validate minContinuousYards
    let minContinuousYards = 0.125;
    if (q.minContinuousYards !== undefined && q.minContinuousYards !== '') {
      const yds = Number(q.minContinuousYards);
      if (isNaN(yds) || yds < 0) {
        fields.minContinuousYards = 'minContinuousYards must be a non-negative number';
      } else {
        minContinuousYards = yds;
      }
    }

    // Validate sort
    let sort = 'featured';
    if (q.sort !== undefined && q.sort !== '') {
      const s = q.sort.toLowerCase();
      if (!ALLOWED_SORTS.includes(s)) {
        fields.sort = `sort must be one of: ${ALLOWED_SORTS.join(', ')}`;
      } else {
        sort = s;
      }
    }

    // Validate page
    let page = 1;
    if (q.page !== undefined && q.page !== '') {
      const p = Number(q.page);
      if (isNaN(p) || p < 1 || !Number.isInteger(p)) {
        fields.page = 'page must be an integer greater than or equal to 1';
      } else {
        page = p;
      }
    }

    // Validate limit
    let limit = 12;
    if (q.limit !== undefined && q.limit !== '') {
      const l = Number(q.limit);
      if (isNaN(l) || l < 1 || l > 48 || !Number.isInteger(l)) {
        fields.limit = 'limit must be an integer between 1 and 48';
      } else {
        limit = l;
      }
    }

    // Return 400 if validation errors occurred
    if (Object.keys(fields).length > 0) {
      return reply.status(400).send({
        code: 'INVALID_FILTER_PARAMS',
        message: 'Filter query parameter values out of acceptable bounds.',
        fields,
      });
    }

    // Apply filtering across authoritative catalog
    const searchTerm = (q.search || q.query)?.trim().toLowerCase();

    let filtered = SEED_FABRICS.filter((fabric) => {
      // Natural language / keyword search
      if (searchTerm) {
        const matchesName = fabric.name.toLowerCase().includes(searchTerm);
        const matchesMill = fabric.millName.toLowerCase().includes(searchTerm);
        const matchesFiber = fabric.fiberBreakdown.toLowerCase().includes(searchTerm);
        const matchesCategory = fabric.fiberCategory.toLowerCase().includes(searchTerm);
        const matchesWeave = fabric.weaveStructure.toLowerCase().includes(searchTerm);
        const matchesId = fabric.id.toLowerCase().includes(searchTerm);
        const matchesOccasion = fabric.occasion.toLowerCase().replace(/_/g, ' ').includes(searchTerm);

        if (
          !matchesName &&
          !matchesMill &&
          !matchesFiber &&
          !matchesCategory &&
          !matchesWeave &&
          !matchesId &&
          !matchesOccasion
        ) {
          return false;
        }
      }

      // Fiber category filter
      if (fiberFilter && fabric.fiberCategory !== fiberFilter) {
        // Special case: brocade can be fiber category or weave
        if (fiberFilter === 'brocade' && fabric.weaveStructure === 'brocade') {
          // match allowed
        } else {
          return false;
        }
      }

      // Weave structure filter
      if (weaveFilter && fabric.weaveStructure !== weaveFilter) {
        return false;
      }

      // Occasion filter
      if (occasionFilter && fabric.occasion !== occasionFilter) {
        return false;
      }

      // GSM bounds
      if (minGsm !== undefined && fabric.gsm < minGsm) {
        return false;
      }
      if (maxGsm !== undefined && fabric.gsm > maxGsm) {
        return false;
      }

      // Continuous yardage filter
      if (fabric.activeBolt.remainingContinuousYards < minContinuousYards) {
        return false;
      }

      return true;
    });

    // Apply sorting
    if (sort === 'gsm_asc') {
      filtered.sort((a, b) => a.gsm - b.gsm);
    } else if (sort === 'gsm_desc') {
      filtered.sort((a, b) => b.gsm - a.gsm);
    } else if (sort === 'price_asc') {
      filtered.sort((a, b) => a.pricePerYard - b.pricePerYard);
    } else if (sort === 'price_desc') {
      filtered.sort((a, b) => b.pricePerYard - a.pricePerYard);
    } else if (sort === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    // Compute facet counts across the full catalog for active facet navigation
    const fiberCounts: Record<string, number> = {};
    const weaveCounts: Record<string, number> = {};
    let lightCount = 0;
    let mediumCount = 0;
    let heavyCount = 0;

    for (const f of SEED_FABRICS) {
      fiberCounts[f.fiberCategory] = (fiberCounts[f.fiberCategory] || 0) + 1;
      weaveCounts[f.weaveStructure] = (weaveCounts[f.weaveStructure] || 0) + 1;

      if (f.gsm < 150) {
        lightCount++;
      } else if (f.gsm <= 300) {
        mediumCount++;
      } else {
        heavyCount++;
      }
    }

    const gsmRanges: Record<string, number> = {
      '<150': lightCount,
      '150-300': mediumCount,
      '>300': heavyCount,
      'light (<150)': lightCount,
      'medium (150-300)': mediumCount,
      'heavy (>300)': heavyCount,
    };

    return reply.status(200).send({
      items: paginatedItems.map((f) => ({
        id: f.id,
        name: f.name,
        millName: f.millName,
        countryOfOrigin: f.countryOfOrigin,
        fiberBreakdown: f.fiberBreakdown,
        gsm: f.gsm,
        widthInches: f.widthInches,
        drapeCoefficient: f.drapeCoefficient,
        stiffnessRating: f.stiffnessRating,
        pricePerYard: f.pricePerYard,
        remainingContinuousYards: f.activeBolt.remainingContinuousYards,
        isLowStock: f.activeBolt.isLowStock,
        thumbnailUrl: f.thumbnailUrl,
        normalMapUrl: f.normalMapUrl,
      })),
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
      facets: {
        fiberCounts,
        weaveCounts,
        gsmRanges,
      },
    });
  });

  /**
   * C-008: GET /api/v1/fabrics/:id
   * Complete physical textile profile and continuous warehouse bolt status.
   */
  fastify.get('/api/v1/fabrics/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const fabric = getFabricById(id);

    if (!fabric) {
      return reply.status(404).send({
        code: 'FABRIC_NOT_FOUND',
        message: 'Fabric SKU not found in active atelier catalog.',
      });
    }

    return reply.status(200).send({
      id: fabric.id,
      name: fabric.name,
      millName: fabric.millName,
      countryOfOrigin: fabric.countryOfOrigin,
      fiberBreakdown: fabric.fiberBreakdown,
      gsm: fabric.gsm,
      widthInches: fabric.widthInches,
      rollWidthInches: fabric.widthInches,
      drapeCoefficient: fabric.drapeCoefficient,
      drapeFluidityCoefficient: fabric.drapeCoefficient,
      stiffnessRating: fabric.stiffnessRating,
      stretchPercentage: fabric.stretchPercentage,
      transparencyRating: fabric.transparencyRating,
      tearResistance: fabric.tearResistance,
      pricePerYard: fabric.pricePerYard,
      swatchPrice: fabric.swatchPrice,
      pbrTexturesUrl: fabric.pbrTexturesUrl,
      activeBolt: {
        id: fabric.activeBolt.id,
        dyeLotCode: fabric.activeBolt.dyeLotCode,
        remainingContinuousYards: fabric.activeBolt.remainingContinuousYards,
        isLowStock: fabric.activeBolt.isLowStock,
      },
      continuousBoltRolls: [
        {
          id: fabric.activeBolt.id,
          dyeLotCode: fabric.activeBolt.dyeLotCode,
          remainingContinuousYards: fabric.activeBolt.remainingContinuousYards,
          isLowStock: fabric.activeBolt.isLowStock,
          warehouseLocation: fabric.activeBolt.warehouseLocation,
        },
      ],
      careInstructions: fabric.careInstructions,
      createdAt: fabric.createdAt,
    });
  });

  /**
   * C-009: GET /api/v1/fabrics/:id/shader-assets
   * WebGPU WGSL simulation shaders, WebGL fallback bundle, PBR textures, and physical matrices.
   */
  fastify.get(
    '/api/v1/fabrics/:id/shader-assets',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const fabric = getFabricById(id);

      if (!fabric) {
        return reply.status(404).send({
          code: 'FABRIC_NOT_FOUND',
          message: 'Fabric SKU not found.',
        });
      }

      return reply.status(200).send({
        fabricId: fabric.id,
        wgslShaderUrl: fabric.shaderAssets.wgslShaderUrl,
        webglShaderUrl: fabric.shaderAssets.webglShaderUrl,
        loopingVideoFallbackUrl: fabric.shaderAssets.loopingVideoFallbackUrl,
        physicsMatrix: fabric.shaderAssets.physicsMatrix,
        verletParameters: fabric.shaderAssets.verletParameters,
        textures: fabric.shaderAssets.textures,
        microWeaveTileBaseUrl: fabric.shaderAssets.microWeaveTileBaseUrl,
        maxTileZoomLevel: fabric.shaderAssets.maxTileZoomLevel,
        wgslShaderSource: fabric.shaderAssets.wgslShaderSource,
        webglShaderSource: fabric.shaderAssets.webglShaderSource,
      });
    }
  );

  /**
   * C-010: GET /api/v1/fabrics/:id/micro-weave/tiles/:level/:x/:y
   * Pyramidal deep-zoom texture tile endpoint returning binary 256x256 WebP tiles with strong ETag and Cache-Control.
   */
  fastify.get(
    '/api/v1/fabrics/:id/micro-weave/tiles/:level/:x/:y',
    async (request: FastifyRequest<{ Params: TileParams }>, reply: FastifyReply) => {
      const { id, level, x, y } = request.params;

      const fabric = getFabricById(id);
      if (!fabric) {
        return reply.status(404).send({
          code: 'TILE_NOT_FOUND',
          message: 'Weave texture tile does not exist for this textile SKU.',
        });
      }

      const lvl = Number(level);
      const coordX = Number(x);
      const coordY = Number(y);

      // Validate coordinate ranges
      if (
        isNaN(lvl) ||
        isNaN(coordX) ||
        isNaN(coordY) ||
        !Number.isInteger(lvl) ||
        !Number.isInteger(coordX) ||
        !Number.isInteger(coordY) ||
        lvl < 0 ||
        lvl > 5
      ) {
        return reply.status(400).send({
          code: 'INVALID_TILE_COORDINATES',
          message: 'Requested zoom level or tile coordinates are out of valid range.',
        });
      }

      const maxCoord = Math.pow(2, lvl);
      if (coordX < 0 || coordX >= maxCoord || coordY < 0 || coordY >= maxCoord) {
        return reply.status(400).send({
          code: 'INVALID_TILE_COORDINATES',
          message: 'Requested zoom level or tile coordinates are out of valid range.',
        });
      }

      const etag = `"tile-${fabric.id}-${lvl}-${coordX}-${coordY}"`;

      // Conditional HTTP Cache check
      if (request.headers['if-none-match'] === etag) {
        return reply.status(304).send();
      }

      const tileBuffer = getFabricTileBuffer(fabric.id, lvl, coordX, coordY);
      if (!tileBuffer) {
        return reply.status(404).send({
          code: 'TILE_NOT_FOUND',
          message: 'Weave texture tile does not exist for this textile SKU.',
        });
      }

      return reply
        .header('Content-Type', 'image/webp')
        .header('Cache-Control', 'public, max-age=31536000, immutable')
        .header('ETag', etag)
        .status(200)
        .send(tileBuffer);
    }
  );

  /**
   * Direct Shader Delivery Endpoints
   */
  fastify.get('/shaders/cloth-simulation.wgsl', async (_request, reply) => {
    return reply.type('text/plain; charset=utf-8').status(200).send(WGSL_SIMULATION_SHADER);
  });

  fastify.get('/shaders/cloth-simulation.glsl', async (_request, reply) => {
    return reply.type('text/plain; charset=utf-8').status(200).send(WEBGL_SIMULATION_SHADER);
  });
};
