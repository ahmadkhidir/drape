/**
 * Drape Initial Luxury Fabric Catalogue Seed Data
 * Spec Anchor: ASSETS.md (A-032..A-046), C-007, C-008, C-009, C-010, FEAT-001, FEAT-002, FEAT-003
 */

export type FiberCategory = 'silk' | 'wool' | 'linen' | 'cotton' | 'blend' | 'velvet' | 'brocade';
export type WeaveStructure = 'twill' | 'satin' | 'jacquard' | 'crepe' | 'plain' | 'brocade' | 'chiffon';
export type OccasionType = 'black_tie' | 'bridal' | 'daywear' | 'cocktail' | 'suiting';

export interface ActiveBolt {
  id: string;
  dyeLotCode: string;
  remainingContinuousYards: number;
  isLowStock: boolean;
  warehouseLocation: string;
}

export interface CareInstructions {
  ironTemperatureMaxC: number;
  dryCleanOnly: boolean;
  interliningRecommendation: string;
}

export interface PhysicsMatrix {
  massDensity: number;
  bendingStiffness: number;
  tensileElasticity: number;
  airDamping: number;
  gravityVector: [number, number, number];
}

export interface VerletParameters {
  mass: number;
  springStiffness: number;
  dampingFactor: number;
  gravityScale: number;
}

export interface PBRTextures {
  albedoUrl: string;
  normalMapUrl: string;
  roughnessMapUrl: string;
  metallicMapUrl: string;
  subsurfaceLutUrl: string;
}

export interface ShaderAssets {
  fabricId: string;
  wgslShaderUrl: string;
  webglShaderUrl: string;
  loopingVideoFallbackUrl: string;
  physicsMatrix: PhysicsMatrix;
  verletParameters: VerletParameters;
  textures: PBRTextures;
  microWeaveTileBaseUrl: string;
  maxTileZoomLevel: number;
  wgslShaderSource: string;
  webglShaderSource: string;
}

export interface FabricRecord {
  id: string;
  name: string;
  millName: string;
  countryOfOrigin: string;
  fiberBreakdown: string;
  fiberCategory: FiberCategory;
  weaveStructure: WeaveStructure;
  occasion: OccasionType;
  gsm: number;
  widthInches: number;
  drapeCoefficient: number;
  stiffnessRating: number;
  stretchPercentage: number;
  transparencyRating: number;
  tearResistance: string;
  pricePerYard: number;
  swatchPrice: number;
  pbrTexturesUrl: string;
  thumbnailUrl: string;
  normalMapUrl: string;
  activeBolt: ActiveBolt;
  careInstructions: CareInstructions;
  shaderAssets: ShaderAssets;
  tileBase64: string;
  createdAt: string;
}

export const WGSL_SIMULATION_SHADER = `// WGSL Cloth Physics Verlet Simulation & Vertex Shading
// Spec Anchor: FEAT-002, C-009

struct SimulationParams {
  dt: f32,
  damping: f32,
  gravity: vec3<f32>,
  springStiffness: f32,
  particleMass: f32,
};

struct Particle {
  position: vec3<f32>,
  prevPosition: vec3<f32>,
  acceleration: vec3<f32>,
  pinned: u32,
};

@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<storage, read_write> particles: array<Particle>;

@compute @workgroup_size(64)
fn simulateVerlet(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  if (index >= arrayLength(&particles)) {
    return;
  }

  var p = particles[index];
  if (p.pinned == 1u) {
    return;
  }

  let dt = params.dt;
  let currentPos = p.position;
  let prevPos = p.prevPosition;

  // Verlet integration: x(t+dt) = x(t) + (x(t) - x(t-dt)) * (1 - damping) + a * dt^2
  let velocity = (currentPos - prevPos) * (1.0 - params.damping);
  let totalAccel = p.acceleration + params.gravity;
  let nextPos = currentPos + velocity + totalAccel * (dt * dt);

  p.prevPosition = currentPos;
  p.position = nextPos;
  p.acceleration = vec3<f32>(0.0, 0.0, 0.0);
  particles[index] = p;
}

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) normal: vec3<f32>,
};

struct VertexOutput {
  @builtin(position) clipPosition: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) worldNormal: vec3<f32>,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  out.clipPosition = vec4<f32>(in.position, 1.0);
  out.uv = in.uv;
  out.worldNormal = in.normal;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let lightDir = normalize(vec3<f32>(0.5, 1.0, 0.8));
  let diffuse = max(dot(in.worldNormal, lightDir), 0.2);
  return vec4<f32>(diffuse, diffuse, diffuse, 1.0);
}
`;

export const WEBGL_SIMULATION_SHADER = `#version 300 es
// WebGL 2.0 Fallback Verlet Cloth Shader
// Spec Anchor: FEAT-002, C-009

precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_prevPosition;
layout(location = 2) in vec2 a_uv;
layout(location = 3) in float a_pinned;

uniform float u_dt;
uniform float u_damping;
uniform vec3 u_gravity;

out vec3 v_nextPosition;
out vec3 v_currentPosition;
out vec2 v_uv;

void main() {
  v_uv = a_uv;
  if (a_pinned > 0.5) {
    v_nextPosition = a_position;
    v_currentPosition = a_position;
    gl_Position = vec4(a_position, 1.0);
    return;
  }

  vec3 velocity = (a_position - a_prevPosition) * (1.0 - u_damping);
  vec3 nextPos = a_position + velocity + u_gravity * (u_dt * u_dt);

  v_nextPosition = nextPos;
  v_currentPosition = a_position;
  gl_Position = vec4(nextPos, 1.0);
}
`;

/**
 * Authoritative Initial Seed Dataset for Drape Haute Couture Catalog
 * Covering texture slots A-032 through A-046.
 */
export const SEED_FABRICS: FabricRecord[] = [
  {
    id: 'FAB-SLK-892',
    name: 'Mulberry Silk Jacquard',
    millName: 'Bevilacqua Tessuti',
    countryOfOrigin: 'IT',
    fiberBreakdown: '85% Mulberry Silk, 15% Metallic Lurex',
    fiberCategory: 'silk',
    weaveStructure: 'jacquard',
    occasion: 'black_tie',
    gsm: 320,
    widthInches: 54.0,
    drapeCoefficient: 0.45,
    stiffnessRating: 6.5,
    stretchPercentage: 2.0,
    transparencyRating: 0.05,
    tearResistance: '48 N (warp) / 45 N (weft)',
    pricePerYard: 185.0,
    swatchPrice: 25.0,
    pbrTexturesUrl: '/api/v1/fabrics/FAB-SLK-892/shader-assets',
    thumbnailUrl: '/assets/textures/fabrics/silk-jacquard-albedo.jpg',
    normalMapUrl: '/assets/textures/fabrics/silk-jacquard-normal.jpg',
    activeBolt: {
      id: 'bolt_901',
      dyeLotCode: 'LOT-2026-EMR-04',
      remainingContinuousYards: 14.5,
      isLowStock: false,
      warehouseLocation: 'RACK-B-04',
    },
    careInstructions: {
      ironTemperatureMaxC: 110,
      dryCleanOnly: true,
      interliningRecommendation: 'Silk organza or lightweight hair canvas',
    },
    shaderAssets: {
      fabricId: 'FAB-SLK-892',
      wgslShaderUrl: '/shaders/cloth-simulation.wgsl',
      webglShaderUrl: '/shaders/cloth-simulation.glsl',
      loopingVideoFallbackUrl: '/assets/motion/fabrics/FAB-SLK-892-drape-loop.mp4',
      physicsMatrix: {
        massDensity: 0.32,
        bendingStiffness: 6.5,
        tensileElasticity: 0.85,
        airDamping: 0.02,
        gravityVector: [0.0, -9.81, 0.0],
      },
      verletParameters: {
        mass: 0.32,
        springStiffness: 6.5,
        dampingFactor: 0.02,
        gravityScale: 1.0,
      },
      textures: {
        albedoUrl: '/assets/textures/fabrics/silk-jacquard-albedo.jpg', // A-032
        normalMapUrl: '/assets/textures/fabrics/silk-jacquard-normal.jpg', // A-033
        roughnessMapUrl: '/assets/textures/fabrics/silk-jacquard-roughness.jpg', // A-034
        metallicMapUrl: '/assets/textures/fabrics/silk-jacquard-metallic.jpg',
        subsurfaceLutUrl: '/assets/textures/fabrics/subsurface-lut.png',
      },
      microWeaveTileBaseUrl: '/api/v1/fabrics/FAB-SLK-892/micro-weave/tiles',
      maxTileZoomLevel: 5,
      wgslShaderSource: WGSL_SIMULATION_SHADER,
      webglShaderSource: WEBGL_SIMULATION_SHADER,
    },
    tileBase64:
      'UklGRrgAAABXRUJQVlA4IKwAAADwEACdASoAAQABPm02mUmkIyKhICgAgA2JaW7hdrEbQAtLZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtWAA/v+uZx4//uh76vKnZaLThPYEAAAAAAAAAAAA',
    createdAt: '2026-10-27T10:00:00.000Z',
  },
  {
    id: 'FAB-SLK-401',
    name: 'Duchesse Silk Satin',
    millName: 'Taroni Seta',
    countryOfOrigin: 'IT',
    fiberBreakdown: '100% Silk Duchesse',
    fiberCategory: 'silk',
    weaveStructure: 'satin',
    occasion: 'bridal',
    gsm: 280,
    widthInches: 54.0,
    drapeCoefficient: 0.72,
    stiffnessRating: 4.2,
    stretchPercentage: 1.5,
    transparencyRating: 0.0,
    tearResistance: '38 N (warp) / 36 N (weft)',
    pricePerYard: 145.0,
    swatchPrice: 25.0,
    pbrTexturesUrl: '/api/v1/fabrics/FAB-SLK-401/shader-assets',
    thumbnailUrl: '/assets/textures/fabrics/ivory-satin-albedo.jpg',
    normalMapUrl: '/assets/textures/fabrics/ivory-satin-normal.jpg',
    activeBolt: {
      id: 'bolt_902',
      dyeLotCode: 'LOT-2026-IVR-01',
      remainingContinuousYards: 22.0,
      isLowStock: false,
      warehouseLocation: 'RACK-A-12',
    },
    careInstructions: {
      ironTemperatureMaxC: 110,
      dryCleanOnly: true,
      interliningRecommendation: 'Fine silk habotai or cotton batiste',
    },
    shaderAssets: {
      fabricId: 'FAB-SLK-401',
      wgslShaderUrl: '/shaders/cloth-simulation.wgsl',
      webglShaderUrl: '/shaders/cloth-simulation.glsl',
      loopingVideoFallbackUrl: '/assets/motion/fabrics/FAB-SLK-401-drape-loop.mp4',
      physicsMatrix: {
        massDensity: 0.28,
        bendingStiffness: 4.2,
        tensileElasticity: 0.9,
        airDamping: 0.03,
        gravityVector: [0.0, -9.81, 0.0],
      },
      verletParameters: {
        mass: 0.28,
        springStiffness: 4.2,
        dampingFactor: 0.03,
        gravityScale: 1.0,
      },
      textures: {
        albedoUrl: '/assets/textures/fabrics/ivory-satin-albedo.jpg', // A-035
        normalMapUrl: '/assets/textures/fabrics/ivory-satin-normal.jpg', // A-036
        roughnessMapUrl: '/assets/textures/fabrics/ivory-satin-roughness.jpg', // A-037
        metallicMapUrl: '/assets/textures/fabrics/ivory-satin-metallic.jpg',
        subsurfaceLutUrl: '/assets/textures/fabrics/subsurface-lut.png',
      },
      microWeaveTileBaseUrl: '/api/v1/fabrics/FAB-SLK-401/micro-weave/tiles',
      maxTileZoomLevel: 5,
      wgslShaderSource: WGSL_SIMULATION_SHADER,
      webglShaderSource: WEBGL_SIMULATION_SHADER,
    },
    tileBase64:
      'UklGRqwAAABXRUJQVlA4IKAAAADwEACdASoAAQABPm02mUmkIyKhICgAgA2JaW7hdrEbQAtLZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtWAA/v/L4v0swAAAAAAAAAAA',
    createdAt: '2026-10-27T10:15:00.000Z',
  },
  {
    id: 'FAB-WOL-205',
    name: 'Biella Worsted Wool Crepe',
    millName: 'Lanificio Fratelli Cerruti',
    countryOfOrigin: 'IT',
    fiberBreakdown: '100% Super 150s Worsted Wool',
    fiberCategory: 'wool',
    weaveStructure: 'crepe',
    occasion: 'suiting',
    gsm: 290,
    widthInches: 60.0,
    drapeCoefficient: 0.58,
    stiffnessRating: 5.0,
    stretchPercentage: 4.0,
    transparencyRating: 0.0,
    tearResistance: '52 N (warp) / 50 N (weft)',
    pricePerYard: 120.0,
    swatchPrice: 25.0,
    pbrTexturesUrl: '/api/v1/fabrics/FAB-WOL-205/shader-assets',
    thumbnailUrl: '/assets/textures/fabrics/charcoal-wool-albedo.jpg',
    normalMapUrl: '/assets/textures/fabrics/charcoal-wool-normal.jpg',
    activeBolt: {
      id: 'bolt_903',
      dyeLotCode: 'LOT-2026-CHR-08',
      remainingContinuousYards: 18.75,
      isLowStock: false,
      warehouseLocation: 'RACK-C-02',
    },
    careInstructions: {
      ironTemperatureMaxC: 150,
      dryCleanOnly: true,
      interliningRecommendation: 'Wool hair canvas and domette',
    },
    shaderAssets: {
      fabricId: 'FAB-WOL-205',
      wgslShaderUrl: '/shaders/cloth-simulation.wgsl',
      webglShaderUrl: '/shaders/cloth-simulation.glsl',
      loopingVideoFallbackUrl: '/assets/motion/fabrics/FAB-WOL-205-drape-loop.mp4',
      physicsMatrix: {
        massDensity: 0.29,
        bendingStiffness: 5.0,
        tensileElasticity: 0.75,
        airDamping: 0.04,
        gravityVector: [0.0, -9.81, 0.0],
      },
      verletParameters: {
        mass: 0.29,
        springStiffness: 5.0,
        dampingFactor: 0.04,
        gravityScale: 1.0,
      },
      textures: {
        albedoUrl: '/assets/textures/fabrics/charcoal-wool-albedo.jpg', // A-038
        normalMapUrl: '/assets/textures/fabrics/charcoal-wool-normal.jpg', // A-039
        roughnessMapUrl: '/assets/textures/fabrics/charcoal-wool-roughness.jpg', // A-040
        metallicMapUrl: '/assets/textures/fabrics/charcoal-wool-metallic.jpg',
        subsurfaceLutUrl: '/assets/textures/fabrics/subsurface-lut.png',
      },
      microWeaveTileBaseUrl: '/api/v1/fabrics/FAB-WOL-205/micro-weave/tiles',
      maxTileZoomLevel: 5,
      wgslShaderSource: WGSL_SIMULATION_SHADER,
      webglShaderSource: WEBGL_SIMULATION_SHADER,
    },
    tileBase64:
      'UklGRrAAAABXRUJQVlA4IKQAAADwEACdASoAAQABPm02mkmkIqKhICgAgA2JaW7hdrEbQAnsA99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk4UAA/v+3/TuFNdpwdcCAAAAAAAAAAA==',
    createdAt: '2026-10-27T10:30:00.000Z',
  },
  {
    id: 'FAB-VLV-730',
    name: 'Venetian Silk Velvet',
    millName: 'Luigi Bevilacqua',
    countryOfOrigin: 'IT',
    fiberBreakdown: '82% Viscose Rayon Pile, 18% Mulberry Silk Ground',
    fiberCategory: 'velvet',
    weaveStructure: 'brocade',
    occasion: 'cocktail',
    gsm: 380,
    widthInches: 54.0,
    drapeCoefficient: 0.65,
    stiffnessRating: 5.5,
    stretchPercentage: 3.0,
    transparencyRating: 0.0,
    tearResistance: '42 N (warp) / 40 N (weft)',
    pricePerYard: 160.0,
    swatchPrice: 25.0,
    pbrTexturesUrl: '/api/v1/fabrics/FAB-VLV-730/shader-assets',
    thumbnailUrl: '/assets/textures/fabrics/obsidian-velvet-albedo.jpg',
    normalMapUrl: '/assets/textures/fabrics/obsidian-velvet-normal.jpg',
    activeBolt: {
      id: 'bolt_904',
      dyeLotCode: 'LOT-2026-VLV-02',
      remainingContinuousYards: 8.5,
      isLowStock: false,
      warehouseLocation: 'RACK-D-15',
    },
    careInstructions: {
      ironTemperatureMaxC: 110,
      dryCleanOnly: true,
      interliningRecommendation: 'Velvet needle board steaming only, lightweight cotton flannel',
    },
    shaderAssets: {
      fabricId: 'FAB-VLV-730',
      wgslShaderUrl: '/shaders/cloth-simulation.wgsl',
      webglShaderUrl: '/shaders/cloth-simulation.glsl',
      loopingVideoFallbackUrl: '/assets/motion/fabrics/FAB-VLV-730-drape-loop.mp4',
      physicsMatrix: {
        massDensity: 0.38,
        bendingStiffness: 5.5,
        tensileElasticity: 0.7,
        airDamping: 0.05,
        gravityVector: [0.0, -9.81, 0.0],
      },
      verletParameters: {
        mass: 0.38,
        springStiffness: 5.5,
        dampingFactor: 0.05,
        gravityScale: 1.0,
      },
      textures: {
        albedoUrl: '/assets/textures/fabrics/obsidian-velvet-albedo.jpg', // A-041
        normalMapUrl: '/assets/textures/fabrics/obsidian-velvet-normal.jpg', // A-042
        roughnessMapUrl: '/assets/textures/fabrics/obsidian-velvet-roughness.jpg', // A-043
        metallicMapUrl: '/assets/textures/fabrics/obsidian-velvet-metallic.jpg',
        subsurfaceLutUrl: '/assets/textures/fabrics/subsurface-lut.png',
      },
      microWeaveTileBaseUrl: '/api/v1/fabrics/FAB-VLV-730/micro-weave/tiles',
      maxTileZoomLevel: 5,
      wgslShaderSource: WGSL_SIMULATION_SHADER,
      webglShaderSource: WEBGL_SIMULATION_SHADER,
    },
    tileBase64:
      'UklGRrAAAABXRUJQVlA4IKQAAADwEACdASoAAQABPm02mkmkIqKhICgAgA2JaW7hdrEbQAnsA99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk4UAA/v/JsB3Cmu04OuBAAAAAAAAAAA==',
    createdAt: '2026-10-27T10:45:00.000Z',
  },
  {
    id: 'FAB-LIN-112',
    name: 'Normandy Raw Slub Linen',
    millName: 'Libeco Lagae',
    countryOfOrigin: 'BE',
    fiberBreakdown: '100% Normandy Raw Flax Linen',
    fiberCategory: 'linen',
    weaveStructure: 'plain',
    occasion: 'daywear',
    gsm: 240,
    widthInches: 58.0,
    drapeCoefficient: 0.38,
    stiffnessRating: 7.0,
    stretchPercentage: 0.5,
    transparencyRating: 0.15,
    tearResistance: '60 N (warp) / 58 N (weft)',
    pricePerYard: 85.0,
    swatchPrice: 25.0,
    pbrTexturesUrl: '/api/v1/fabrics/FAB-LIN-112/shader-assets',
    thumbnailUrl: '/assets/textures/fabrics/raw-linen-albedo.jpg',
    normalMapUrl: '/assets/textures/fabrics/raw-linen-normal.jpg',
    activeBolt: {
      id: 'bolt_905',
      dyeLotCode: 'LOT-2026-FLX-05',
      remainingContinuousYards: 4.25, // Less than 5.0 yards -> Low stock warning indicator (FEAT-001)
      isLowStock: true,
      warehouseLocation: 'RACK-E-01',
    },
    careInstructions: {
      ironTemperatureMaxC: 200,
      dryCleanOnly: false,
      interliningRecommendation: 'Preshrunk lightweight linen or cotton lawn',
    },
    shaderAssets: {
      fabricId: 'FAB-LIN-112',
      wgslShaderUrl: '/shaders/cloth-simulation.wgsl',
      webglShaderUrl: '/shaders/cloth-simulation.glsl',
      loopingVideoFallbackUrl: '/assets/motion/fabrics/FAB-LIN-112-drape-loop.mp4',
      physicsMatrix: {
        massDensity: 0.24,
        bendingStiffness: 7.0,
        tensileElasticity: 0.6,
        airDamping: 0.03,
        gravityVector: [0.0, -9.81, 0.0],
      },
      verletParameters: {
        mass: 0.24,
        springStiffness: 7.0,
        dampingFactor: 0.03,
        gravityScale: 1.0,
      },
      textures: {
        albedoUrl: '/assets/textures/fabrics/raw-linen-albedo.jpg', // A-044
        normalMapUrl: '/assets/textures/fabrics/raw-linen-normal.jpg', // A-045
        roughnessMapUrl: '/assets/textures/fabrics/raw-linen-roughness.jpg', // A-046
        metallicMapUrl: '/assets/textures/fabrics/raw-linen-metallic.jpg',
        subsurfaceLutUrl: '/assets/textures/fabrics/subsurface-lut.png',
      },
      microWeaveTileBaseUrl: '/api/v1/fabrics/FAB-LIN-112/micro-weave/tiles',
      maxTileZoomLevel: 5,
      wgslShaderSource: WGSL_SIMULATION_SHADER,
      webglShaderSource: WEBGL_SIMULATION_SHADER,
    },
    tileBase64:
      'UklGRrIAAABXRUJQVlA4IKYAAADwEACdASoAAQABPm02mUmkIyKhICgAgA2JaW7hdrEbQAnsA99snIfAfpdrxcnIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99snIe+2Tj+AA/v+oKf9B8TUw/v7XbgAAAAAAAAAA',
    createdAt: '2026-10-27T11:00:00.000Z',
  },
];

/**
 * Retrieves a fabric by unique SKU ID.
 */
export function getFabricById(id: string): FabricRecord | undefined {
  return SEED_FABRICS.find((f) => f.id.toLowerCase() === id.trim().toLowerCase());
}

/**
 * Returns binary 256x256 WebP tile buffer for a fabric SKU and coordinates.
 */
export function getFabricTileBuffer(id: string, level: number, x: number, y: number): Buffer | null {
  const fabric = getFabricById(id);
  if (!fabric) {
    return null;
  }

  // Validate pyramidal zoom level and bounds: level 0..5, coordinates 0 <= x, y < 2^level
  if (level < 0 || level > 5 || !Number.isInteger(level)) {
    return null;
  }
  const maxCoord = Math.pow(2, level);
  if (x < 0 || x >= maxCoord || !Number.isInteger(x) || y < 0 || y >= maxCoord || !Number.isInteger(y)) {
    return null;
  }

  return Buffer.from(fabric.tileBase64, 'base64');
}
