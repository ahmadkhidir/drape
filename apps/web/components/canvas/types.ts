/**
 * Canvas & Cloth Simulation Type Definitions
 * Permanent Spec Anchors: FEAT-002, FEAT-003, C-009, C-010
 */

export type GraphicsTier = 'booting' | 'webgpu' | 'webgl2' | 'fallback-media';
export type LifecycleStatus = 'booting' | 'ready' | 'context-lost' | 'restoring' | 'error';
export type GravityPreset = 'breeze' | 'drape';

/**
 * Physical property matrix for calibrated textile simulation.
 * C-009: GET /api/v1/fabrics/:id/shader-assets -> physicsMatrix
 */
export interface PhysicsMatrix {
  /** Mass density derived from fabric GSM (e.g. 0.28 for 280 GSM silk) */
  massDensity: number;
  /** Bending stiffness (0.0 to 10.0; high stiffness resists limp folding) */
  bendingStiffness: number;
  /** Tensile elasticity / spring rest resistance (0.0 to 1.0) */
  tensileElasticity: number;
  /** Air damping coefficient (0.0 to 1.0; high damping creates floating folds) */
  airDamping: number;
  /** 3-element gravity vector [x, y, z] */
  gravityVector: [number, number, number];
}

/**
 * PBR texture map URLs.
 * C-009: GET /api/v1/fabrics/:id/shader-assets -> textures
 */
export interface ShaderTextures {
  albedoUrl: string;
  normalMapUrl: string;
  roughnessMapUrl: string;
  metallicMapUrl: string;
  subsurfaceLutUrl: string;
}

/**
 * Complete shader assets payload from C-009 contract.
 */
export interface ShaderAssetsResponse {
  fabricId: string;
  wgslShaderUrl: string;
  webglShaderUrl: string;
  loopingVideoFallbackUrl: string;
  physicsMatrix: PhysicsMatrix;
  textures: ShaderTextures;
  microWeaveTileBaseUrl: string;
  maxTileZoomLevel: number;
}

/**
 * Hardware graphics probe result.
 */
export interface GraphicsCapabilities {
  tier: 'webgpu' | 'webgl2' | 'fallback-media';
  adapter?: unknown;
  device?: unknown;
  gl?: WebGL2RenderingContext | null;
  error?: string;
}

/**
 * Micro-weave tile coordinates per C-010.
 * GET /api/v1/fabrics/:id/micro-weave/tiles/:level/:x/:y
 */
export interface MicroWeaveTileCoord {
  level: number;
  x: number;
  y: number;
  url: string;
}

/**
 * Directional lighting parameters for microscopic inspection (FEAT-003).
 */
export interface DirectionalLightState {
  /** Azimuth rotation angle in degrees (0 to 360) */
  angleDeg: number;
  /** Pitch elevation angle in degrees (15 to 90) */
  pitchDeg: number;
  /** Light intensity (0.0 to 2.0) */
  intensity: number;
  /** Specular luster / metallic gloss factor */
  specularPower: number;
}
