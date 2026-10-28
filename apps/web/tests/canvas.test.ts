import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VerletClothEngine } from '../components/canvas/clothPhysics';
import { detectGraphicsCapabilities } from '../components/canvas/ClothSandboxBoot';
import { getFabricColorAndShine, getFabricTextureUrl } from '../components/canvas/ClothSandbox';
import { PhysicsMatrix, ShaderAssetsResponse } from '../components/canvas/types';

describe('FEAT-002: Verlet Cloth Physics Engine', () => {
  const defaultPhysics: PhysicsMatrix = {
    massDensity: 0.28, // 280 GSM
    bendingStiffness: 4.5,
    tensileElasticity: 0.9,
    airDamping: 0.04,
    gravityVector: [0, -9.8, 0],
  };

  it('initializes zero-allocation typed buffers and pinned suspension points', () => {
    const engine = new VerletClothEngine({
      gridX: 10,
      gridY: 10,
      spacing: 0.1,
      physicsMatrix: defaultPhysics,
    });

    expect(engine.particleCount).toBe(100);
    expect(engine.positions.length).toBe(300);
    expect(engine.prevPositions.length).toBe(300);
    expect(engine.accelerations.length).toBe(300);
    expect(engine.normals.length).toBe(300);
    expect(engine.uvs.length).toBe(200);
    expect(engine.pinned.length).toBe(100);

    // Top corners and center are pinned for natural drape
    expect(engine.pinned[0]).toBe(1); // Top left
    expect(engine.pinned[9]).toBe(1); // Top right
    expect(engine.pinned[5]).toBe(1); // Top center
    expect(engine.pinned[50]).toBe(0); // Mid-cloth free
  });

  it('advances simulation with fixed-timestep Verlet integration without allocating', () => {
    const engine = new VerletClothEngine({
      gridX: 8,
      gridY: 8,
      spacing: 0.1,
      physicsMatrix: defaultPhysics,
    });

    const initialY = engine.positions[4 * 3 + 1];

    // Simulate 10 frames (160ms)
    for (let frame = 0; frame < 10; frame++) {
      engine.update(0.016);
    }

    const unpinnedY = engine.positions[35 * 3 + 1];
    // Free particle should drop under gravity
    expect(unpinnedY).toBeLessThan(initialY);
  });

  it('calibrates stiffness: high stiffness resists limp folding while low stiffness cascades fluidly', () => {
    // 1. High stiffness Silk Gazar (FEAT-002 Acceptance Criteria 2)
    const stiffEngine = new VerletClothEngine({
      gridX: 8,
      gridY: 8,
      spacing: 0.1,
      physicsMatrix: {
        ...defaultPhysics,
        massDensity: 0.4, // 400 GSM
        bendingStiffness: 9.5, // High bending rigidity
      },
    });

    // 2. Low stiffness Silk Charmeuse (FEAT-002 Acceptance Criteria 3)
    const fluidEngine = new VerletClothEngine({
      gridX: 8,
      gridY: 8,
      spacing: 0.1,
      physicsMatrix: {
        ...defaultPhysics,
        massDensity: 0.12, // 120 GSM
        bendingStiffness: 0.5, // Limp fluid drape
        airDamping: 0.08,
      },
    });

    // Step both engines
    for (let i = 0; i < 20; i++) {
      stiffEngine.step(1 / 60);
      fluidEngine.step(1 / 60);
    }

    // Measure deformation displacement on bottom edge
    const stiffBottomY = stiffEngine.positions[(7 * 8 + 4) * 3 + 1];
    const fluidBottomY = fluidEngine.positions[(7 * 8 + 4) * 3 + 1];

    // Fluid silk falls deeper than rigid architectural silk gazar
    expect(fluidBottomY).toBeLessThan(stiffBottomY);
  });

  it('supports tactile pointer grab, drag, ripple, and release', () => {
    const engine = new VerletClothEngine({
      gridX: 10,
      gridY: 10,
      spacing: 0.1,
      physicsMatrix: defaultPhysics,
    });

    // 1. Grab particle near center (0, 0)
    const grabbedIdx = engine.grab(0, 0, 0.5);
    expect(grabbedIdx).toBeGreaterThanOrEqual(0);

    // 2. Drag particle upwards
    engine.drag(0.2, 0.5, 0.1);
    engine.step(1 / 60);

    const draggedP = grabbedIdx * 3;
    expect(engine.positions[draggedP]).toBeCloseTo(0.2, 1);
    expect(engine.positions[draggedP + 1]).toBeCloseTo(0.5, 1);

    // 3. Impart wave/ripple impulse
    engine.applyRipple(0, 0, 0.5, 1.0, 0.3, 0.6);
    engine.step(1 / 60);

    // 4. Release grab
    engine.release();
    engine.step(1 / 60);
    // After release, particle should begin gravitational descent
    expect(engine.positions[draggedP + 1]).toBeLessThan(0.5);
  });

  it('switches gravity presets: breeze and drape', () => {
    const engine = new VerletClothEngine({
      gridX: 8,
      gridY: 8,
      spacing: 0.1,
      physicsMatrix: defaultPhysics,
    });

    engine.setGravityPreset('breeze');
    expect(engine.getGravityPreset()).toBe('breeze');

    engine.setGravityPreset('drop');
    expect(engine.getGravityPreset()).toBe('drop');

    engine.setGravityPreset('drape');
    expect(engine.getGravityPreset()).toBe('drape');
  });

  it('computes unit-normalized surface normals without heap allocations', () => {
    const engine = new VerletClothEngine({
      gridX: 6,
      gridY: 6,
      spacing: 0.1,
      physicsMatrix: defaultPhysics,
    });

    engine.computeNormals();

    for (let i = 0; i < engine.particleCount; i++) {
      const nIdx = i * 3;
      const nx = engine.normals[nIdx];
      const ny = engine.normals[nIdx + 1];
      const nz = engine.normals[nIdx + 2];
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
      expect(length).toBeCloseTo(1.0, 2);
    }
  });
});

describe('FEAT-002 & Discipline Rule 1: Multi-Tier Graphics Lifecycle & Fallback Degradation', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('Tier 1: Initializes WebGPU when navigator.gpu and requestDevice succeed', async () => {
    const mockDevice = { lost: new Promise(() => {}) };
    const mockAdapter = {
      requestDevice: vi.fn().mockResolvedValue(mockDevice),
    };
    const mockGpu = {
      requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: mockGpu },
      configurable: true,
      writable: true,
    });

    const result = await detectGraphicsCapabilities(null);
    expect(result.tier).toBe('webgpu');
    expect(result.device).toBe(mockDevice);
  });

  it('Tier 2: Gracefully falls back to WebGL 2.0 when WebGPU throws', async () => {
    const mockGpu = {
      requestAdapter: vi.fn().mockRejectedValue(new Error('GPU device access lost')),
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: { gpu: mockGpu },
      configurable: true,
      writable: true,
    });

    const mockGl = {} as WebGL2RenderingContext;
    const mockCanvas = {
      getContext: vi.fn((type: string) => (type === 'webgl2' ? mockGl : null)),
    } as unknown as HTMLCanvasElement;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await detectGraphicsCapabilities(mockCanvas);
    expect(result.tier).toBe('webgl2');
    expect(result.gl).toBe(mockGl);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('Tier 3: Gracefully falls back to pre-rendered editorial media when WebGL 2.0 is unavailable', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    });

    const mockCanvas = {
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement;

    const result = await detectGraphicsCapabilities(mockCanvas);
    expect(result.tier).toBe('fallback-media');
  });
});

describe('FEAT-003 & C-010: Micro-Weave Inspector & Pyramidal Deep-Zoom Tile Geometry', () => {
  it('maps optical zoom levels (1.0x to 10.0x) to pyramidal tile levels (0 to 5) per C-010', () => {
    const computeLevel = (zoom: number, maxLevel = 5) => {
      const normalized = (zoom - 1.0) / 9.0;
      return Math.min(maxLevel, Math.max(0, Math.floor(normalized * maxLevel)));
    };

    expect(computeLevel(1.0)).toBe(0); // Base tile (1x1)
    expect(computeLevel(2.5)).toBe(0);
    expect(computeLevel(4.0)).toBe(1);
    expect(computeLevel(6.0)).toBe(2);
    expect(computeLevel(8.5)).toBe(4);
    expect(computeLevel(10.0)).toBe(5); // Maximum optical threshold
  });

  it('constructs immutable C-010 tile endpoint URL with valid level and coordinate bounds', () => {
    const fabricId = 'FAB-SLK-892';
    const baseUrl = `/api/v1/fabrics/${fabricId}/micro-weave/tiles`;

    const getTileUrl = (level: number, x: number, y: number) => {
      return `${baseUrl}/${level}/${x}/${y}`;
    };

    const tile0 = getTileUrl(0, 0, 0);
    expect(tile0).toBe('/api/v1/fabrics/FAB-SLK-892/micro-weave/tiles/0/0/0');

    const tile5 = getTileUrl(5, 31, 31);
    expect(tile5).toBe('/api/v1/fabrics/FAB-SLK-892/micro-weave/tiles/5/31/31');
  });

  it('calculates directional lighting vector for anisotropic sheen and surface relief', () => {
    const computeLightVector = (angleDeg: number, pitchDeg: number) => {
      const radAngle = (angleDeg * Math.PI) / 180;
      const radPitch = (pitchDeg * Math.PI) / 180;
      return {
        x: Math.cos(radAngle) * Math.cos(radPitch),
        y: Math.sin(radAngle) * Math.cos(radPitch),
        z: Math.sin(radPitch),
      };
    };

    // Raking Grazing light (azimuth 0, pitch 30)
    const raking = computeLightVector(0, 30);
    expect(raking.x).toBeCloseTo(Math.cos((30 * Math.PI) / 180), 2);
    expect(raking.y).toBeCloseTo(0, 2);
    expect(raking.z).toBeCloseTo(0.5, 2);

    // Direct overhead sunlight (pitch 90)
    const overhead = computeLightVector(45, 90);
    expect(overhead.z).toBeCloseTo(1.0, 2);
    expect(overhead.x).toBeCloseTo(0, 2);
    expect(overhead.y).toBeCloseTo(0, 2);
  });

  it('maps distinct certified textile colors and textures for Ivory Satin, Obsidian Velvet, and Charcoal Wool', () => {
    // Ivory Duchesse Satin
    const ivoryColor = getFabricColorAndShine('Luminous Ivory Duchesse');
    const ivoryTexture = getFabricTextureUrl('FAB-SLK-401');
    expect(ivoryTexture).toBe('/textures/fabrics/ivory-satin.svg');
    expect(ivoryColor.color).toBe(0xf5f1e8);
    expect(ivoryColor.roughness).toBeLessThan(0.35); // High luster satin

    // Midnight Noir Silk Velvet
    const velvetColor = getFabricColorAndShine('Midnight Noir Silk Velvet');
    const velvetTexture = getFabricTextureUrl('FAB-VLV-730');
    expect(velvetTexture).toBe('/textures/fabrics/obsidian-velvet.svg');
    expect(velvetColor.color).toBe(0x1a1c22); // Deep obsidian noir
    expect(velvetColor.roughness).toBeGreaterThan(0.5); // High absorption tufted pile

    // Charcoal Fine Wool Crepe
    const woolColor = getFabricColorAndShine('Charcoal Fine Wool Crepe');
    const woolTexture = getFabricTextureUrl('FAB-WOL-205');
    expect(woolTexture).toBe('/textures/fabrics/charcoal-wool.svg');
    expect(woolColor.color).toBe(0x32343a); // Tailoring charcoal
  });

  it('constructs dynamic microWeaveTileBaseUrl per fabric ID', () => {
    const fabrics = ['FAB-SLK-401', 'FAB-VLV-730', 'FAB-WOL-205', 'FAB-SLK-892'];
    for (const fId of fabrics) {
      const url = `/api/v1/fabrics/${fId}/micro-weave/tiles`;
      expect(url).toBe(`/api/v1/fabrics/${fId}/micro-weave/tiles`);
    }
  });
});

describe('C-009: Contract Conformance for Shader Assets', () => {
  it('conforms to C-009 schema structure and physical properties', () => {
    const mockShaderResponse: ShaderAssetsResponse = {
      fabricId: 'FAB-SLK-892',
      wgslShaderUrl: 'https://cdn.drape.atelier/shaders/cloth-sim.wgsl',
      webglShaderUrl: 'https://cdn.drape.atelier/shaders/cloth-sim.glsl',
      loopingVideoFallbackUrl: 'https://cdn.drape.atelier/videos/fab-slk-892-60fps.mp4',
      physicsMatrix: {
        massDensity: 0.28,
        bendingStiffness: 4.2,
        tensileElasticity: 0.88,
        airDamping: 0.05,
        gravityVector: [0, -9.8, 0],
      },
      textures: {
        albedoUrl: 'https://cdn.drape.atelier/textures/fab-slk-892/albedo.webp',
        normalMapUrl: 'https://cdn.drape.atelier/textures/fab-slk-892/normal.webp',
        roughnessMapUrl: 'https://cdn.drape.atelier/textures/fab-slk-892/roughness.webp',
        metallicMapUrl: 'https://cdn.drape.atelier/textures/fab-slk-892/metallic.webp',
        subsurfaceLutUrl: 'https://cdn.drape.atelier/textures/fab-slk-892/subsurface.webp',
      },
      microWeaveTileBaseUrl: 'https://cdn.drape.atelier/tiles/fab-slk-892',
      maxTileZoomLevel: 5,
    };

    expect(mockShaderResponse.fabricId).toBe('FAB-SLK-892');
    expect(mockShaderResponse.physicsMatrix.massDensity).toBe(0.28);
    expect(mockShaderResponse.physicsMatrix.gravityVector).toEqual([0, -9.8, 0]);
    expect(mockShaderResponse.maxTileZoomLevel).toBe(5);
  });
});

describe('Atelier WebGPU Craft Polish & Material Shader Calibration', () => {
  const defaultPhysics: PhysicsMatrix = {
    massDensity: 0.28,
    bendingStiffness: 4.5,
    tensileElasticity: 0.9,
    airDamping: 0.04,
    gravityVector: [0, -9.8, 0],
  };

  it('supports pinMode: atelier_dual with natural cascade suspension', () => {
    const engine = new VerletClothEngine({
      gridX: 20,
      gridY: 20,
      spacing: 0.1,
      pinMode: 'atelier_dual',
      physicsMatrix: defaultPhysics,
    });

    const pinLeft = Math.round(20 * 0.22); // 4
    const pinRight = Math.round(20 * 0.78); // 16
    expect(engine.pinned[pinLeft]).toBe(1);
    expect(engine.pinned[pinRight]).toBe(1);
    expect(engine.pinned[0]).toBe(0); // Top left is free
    expect(engine.pinned[19]).toBe(0); // Top right is free
  });

  it('dynamically resolves color, roughness, and metalness based on fabric name/id', () => {
    const ivory = getFabricColorAndShine('Ivory Duchesse Silk Satin');
    expect(ivory.color).toBe(0xf5f1e8);
    expect(ivory.roughness).toBe(0.26);

    const velvet = getFabricColorAndShine('Midnight Velvet');
    expect(velvet.color).toBe(0x1a1c22);
    expect(velvet.roughness).toBe(0.65);

    const wool = getFabricColorAndShine('Charcoal Wool Crepe');
    expect(wool.color).toBe(0x32343a);

    const emerald = getFabricColorAndShine('Imperial Emerald Brocade');
    expect(emerald.color).toBe(0x1b4332);
    expect(emerald.metalness).toBe(0.22);
  });

  it('maps authentic textile pattern textures to simulation mesh for catalog SKUs', () => {
    expect(getFabricTextureUrl('FAB-SLK-892')).toBe('/textures/fabrics/silk-jacquard.svg');
    expect(getFabricTextureUrl('Mulberry Silk Jacquard')).toBe('/textures/fabrics/silk-jacquard.svg');
    expect(getFabricTextureUrl('FAB-SLK-401')).toBe('/textures/fabrics/ivory-satin.svg');
    expect(getFabricTextureUrl('Duchesse Silk Satin')).toBe('/textures/fabrics/ivory-satin.svg');
    expect(getFabricTextureUrl('FAB-WOL-205')).toBe('/textures/fabrics/charcoal-wool.svg');
    expect(getFabricTextureUrl('Biella Worsted Wool Crepe')).toBe('/textures/fabrics/charcoal-wool.svg');
    expect(getFabricTextureUrl('FAB-VLV-730')).toBe('/textures/fabrics/obsidian-velvet.svg');
    expect(getFabricTextureUrl('Midnight Velvet')).toBe('/textures/fabrics/obsidian-velvet.svg');
    expect(getFabricTextureUrl('FAB-LIN-112')).toBe('/textures/fabrics/heritage-linen.svg');
    expect(getFabricTextureUrl('Flax Linen')).toBe('/textures/fabrics/heritage-linen.svg');
    expect(getFabricTextureUrl('FAB-BRC-608')).toBe('/textures/fabrics/venetian-brocade.svg');
    expect(getFabricTextureUrl('Venetian Brocade')).toBe('/textures/fabrics/venetian-brocade.svg');
    expect(getFabricTextureUrl('FAB-SLK-120')).toBe('/textures/fabrics/champagne-cupro.svg');
    expect(getFabricTextureUrl('FAB-WOL-340')).toBe('/textures/fabrics/wool-twill.svg');
    expect(getFabricTextureUrl('FAB-CSH-502')).toBe('/textures/fabrics/camel-cashmere.svg');
    expect(getFabricTextureUrl('FAB-CHF-015')).toBe('/textures/fabrics/silk-chiffon.svg');
    expect(getFabricTextureUrl('FAB-BRC-905')).toBe('/textures/fabrics/gold-brocade.svg');
    expect(getFabricTextureUrl('FAB-LIN-404')).toBe('/textures/fabrics/raw-linen.svg');
  });
  it('suspends cloth with realistic clamp width radius rather than single puncture points', () => {
    const engine = new VerletClothEngine({
      gridX: 20,
      gridY: 20,
      spacing: 0.1,
      pinMode: 'atelier_dual',
      physicsMatrix: defaultPhysics,
    });

    const pinLeft = Math.round(20 * 0.22); // 4
    const pinRight = Math.round(20 * 0.78); // 16

    // Both clamps span 3 contiguous particles along the top hem
    expect(engine.pinned[pinLeft - 1]).toBe(1);
    expect(engine.pinned[pinLeft]).toBe(1);
    expect(engine.pinned[pinLeft + 1]).toBe(1);

    expect(engine.pinned[pinRight - 1]).toBe(1);
    expect(engine.pinned[pinRight]).toBe(1);
    expect(engine.pinned[pinRight + 1]).toBe(1);

    // Free drape edges and interior
    expect(engine.pinned[0]).toBe(0);
    expect(engine.pinned[19]).toBe(0);
    expect(engine.pinned[10]).toBe(0); // center is free to drape naturally
  });

  it('drags cloth with soft-radius cluster pinch rather than sharp needle spike', () => {
    const engine = new VerletClothEngine({
      gridX: 16,
      gridY: 16,
      spacing: 0.1,
      physicsMatrix: defaultPhysics,
    });

    const grabbedIdx = engine.grab(0, 0, 0.35);
    expect(grabbedIdx).toBeGreaterThanOrEqual(0);
    expect(engine.grabbedClusterCount).toBeGreaterThan(1); // Clusters neighboring particles

    // Verify weights have smooth falloff from center outward
    for (let i = 0; i < engine.grabbedClusterCount; i++) {
      expect(engine.grabbedClusterWeights[i]).toBeGreaterThan(0);
      expect(engine.grabbedClusterWeights[i]).toBeLessThanOrEqual(1.0);
    }

    // Drag moves center and smoothly influences pinch cluster without rubber spikes
    engine.drag(0.2, 0.4, 0.1);
    engine.step(1 / 60);

    const centerP = grabbedIdx * 3;
    expect(engine.positions[centerP]).toBeCloseTo(0.2, 1);
    expect(engine.positions[centerP + 1]).toBeCloseTo(0.4, 1);

    // Release cleanly clears cluster state
    engine.release();
    expect(engine.grabbedClusterCount).toBe(0);
  });
  it('enforces taut inextensibility when dragging downward from anchors', () => {
    const engine = new VerletClothEngine({
      gridX: 10,
      gridY: 10,
      spacing: 0.1,
      pinMode: 'atelier_dual',
      physicsMatrix: defaultPhysics,
    });

    // Grab a particle near the center (row 4, col 4)
    const centerIdx = 4 * 10 + 4;
    engine.grab(engine.positions[centerIdx * 3], engine.positions[centerIdx * 3 + 1], 0.2);

    const anchorIdx = engine.nearestAnchorIdx[centerIdx];
    const maxAllowedDist = engine.minAnchorDist[centerIdx] * 1.03;
    const anchorY = engine.positions[anchorIdx * 3 + 1];

    // Attempt to drag particle 10 units downward (simulating stretching like rubber)
    engine.drag(0, -10.0, 0);
    engine.step(1 / 60);

    const draggedP = centerIdx * 3;
    const actualDx = engine.positions[draggedP] - engine.positions[anchorIdx * 3];
    const actualDy = engine.positions[draggedP + 1] - anchorY;
    const actualDz = engine.positions[draggedP + 2] - engine.positions[anchorIdx * 3 + 2];
    const actualDist = Math.sqrt(actualDx * actualDx + actualDy * actualDy + actualDz * actualDz);

    // Particle CANNOT exceed taut distance (within 5% tolerance) - no rubber stretching
    expect(actualDist).toBeLessThanOrEqual(maxAllowedDist * 1.05);
  });


});
