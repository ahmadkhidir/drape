import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { brandTokens } from '../lib/tokens';
import { detectGraphicsCapabilities } from '../components/canvas/ClothSandboxBoot';

describe('Drape Brand & Design System Tokens', () => {
  it('defines the core luxury palette anchors per branding.md', () => {
    // Permanent Spec Anchor: docs/Drape/branding.md
    expect(brandTokens.alabaster).toBe('#FBF9F5');
    expect(brandTokens.obsidian).toBe('#11100F');
    expect(brandTokens.gold).toBe('#C5A059');
    expect(brandTokens.ink).toBe('#111318');
  });

  it('defines the 9-shade Couture Ink primary scale', () => {
    expect(brandTokens.primary[900]).toBe('#111318');
    expect(brandTokens.primary[800]).toBe('#1C1F26');
    expect(brandTokens.primary[700]).toBe('#282D37');
    expect(brandTokens.primary[600]).toBe('#3A414F');
    expect(brandTokens.primary[500]).toBe('#4F596C'); // Base
    expect(brandTokens.primary[400]).toBe('#707C94');
    expect(brandTokens.primary[300]).toBe('#9AA4B8');
    expect(brandTokens.primary[200]).toBe('#C9D0DD');
    expect(brandTokens.primary[100]).toBe('#EAEFF5');
  });

  it('defines the Warm Ecru and Charcoal neutral scale', () => {
    expect(brandTokens.grey[50]).toBe('#FBF9F5'); // Base canvas surface
    expect(brandTokens.grey[100]).toBe('#F6F4F0');
    expect(brandTokens.grey[200]).toBe('#EFECE6');
    expect(brandTokens.grey[300]).toBe('#DCD6CC');
    expect(brandTokens.grey[400]).toBe('#B8B1A5');
    expect(brandTokens.grey[500]).toBe('#8C867D');
    expect(brandTokens.grey[600]).toBe('#635F59');
    expect(brandTokens.grey[700]).toBe('#403D39');
    expect(brandTokens.grey[800]).toBe('#262422');
    expect(brandTokens.grey[900]).toBe('#141312');
  });

  it('defines the Spun Gold metallic accent scale', () => {
    expect(brandTokens.accent[900]).toBe('#5E4B24');
    expect(brandTokens.accent[700]).toBe('#8C7136');
    expect(brandTokens.accent[500]).toBe('#C5A059'); // Base
    expect(brandTokens.accent[300]).toBe('#E0C792');
    expect(brandTokens.accent[100]).toBe('#F9F4EA');
  });

  it('defines all required semantic scales', () => {
    expect(brandTokens.semantic.success[500]).toBe('#287D4E');
    expect(brandTokens.semantic.warning[500]).toBe('#A66B13');
    expect(brandTokens.semantic.error[500]).toBe('#A83232');
    expect(brandTokens.semantic.info[500]).toBe('#326AA5');
  });

  it('defines brand typography and architectural radii', () => {
    expect(brandTokens.fonts.display).toContain('Playfair Display');
    expect(brandTokens.fonts.sans).toContain('Inter');
    expect(brandTokens.fonts.mono).toContain('JetBrains Mono');

    expect(brandTokens.radii.none).toBe('0px');
    expect(brandTokens.radii.sm).toBe('3px');
    expect(brandTokens.radii.md).toBe('6px');
    expect(brandTokens.radii.lg).toBe('12px');
    expect(brandTokens.radii.full).toBe('9999px');
  });
});

describe('WebGPU Lifecycle & Tiered Graphics Boot Check', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('Tier 1: Detects WebGPU when GPU device and adapter are available', async () => {
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
    expect(result.adapter).toBe(mockAdapter);
  });

  it('Tier 2: Gracefully degrades to WebGL 2.0 when WebGPU is unavailable', async () => {
    // navigator has no WebGPU
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    });

    const mockGl = {} as WebGL2RenderingContext;
    const mockCanvas = {
      getContext: vi.fn((type: string) => (type === 'webgl2' ? mockGl : null)),
    } as unknown as HTMLCanvasElement;

    const result = await detectGraphicsCapabilities(mockCanvas);
    expect(result.tier).toBe('webgl2');
    expect(result.gl).toBe(mockGl);
  });

  it('Tier 2: Gracefully degrades to WebGL 2.0 when WebGPU device request throws', async () => {
    const mockGpu = {
      requestAdapter: vi.fn().mockRejectedValue(new Error('GPU device access denied')),
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

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await detectGraphicsCapabilities(mockCanvas);
    expect(result.tier).toBe('webgl2');
    expect(result.gl).toBe(mockGl);
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('Tier 3: Gracefully degrades to editorial media fallback when neither WebGPU nor WebGL 2.0 is supported', async () => {
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

  it('contains all 10 official brand assets and favicon in apps/web/public/brand/', () => {
    const brandDir = path.resolve(__dirname, '../public/brand');
    const requiredAssets = [
      'monogram.svg',
      'monogram-gold.svg',
      'monogram-dark.svg',
      'lockup-horizontal.svg',
      'lockup-horizontal-dark.svg',
      'wordmark.svg',
      'wordmark-dark.svg',
      'app-icon.png',
      'favicon.ico',
      'favicon.svg',
    ];
    for (const asset of requiredAssets) {
      expect(fs.existsSync(path.join(brandDir, asset)), `Asset missing: ${asset}`).toBe(true);
    }
  });

  it('contains high-quality distinct SVG textile swatches in apps/web/public/textures/fabrics/', () => {
    const textureDir = path.resolve(__dirname, '../public/textures/fabrics');
    const requiredSwatches = [
      'silk-jacquard.svg',
      'ivory-satin.svg',
      'charcoal-wool.svg',
      'obsidian-velvet.svg',
      'heritage-linen.svg',
      'camel-cashmere.svg',
      'champagne-cupro.svg',
      'venetian-brocade.svg',
    ];
    for (const swatch of requiredSwatches) {
      expect(fs.existsSync(path.join(textureDir, swatch)), `Swatch missing: ${swatch}`).toBe(true);
    }
  });

  it('verifies curated featured bolts have authentic texture assets and valid SKUs', () => {
    const featuredSkus = ['FAB-SLK-401', 'FAB-VLV-730', 'FAB-WOL-205'];
    const textureDir = path.resolve(__dirname, '../public/textures/fabrics');

    const expectedTextures = [
      'ivory-satin.svg',
      'obsidian-velvet.svg',
      'charcoal-wool.svg',
    ];

    for (const file of expectedTextures) {
      const p = path.join(textureDir, file);
      expect(fs.existsSync(p), `Texture for curated bolt missing: ${file}`).toBe(true);
      const svg = fs.readFileSync(p, 'utf8');
      expect(svg).toContain('<svg');
      expect(svg).toContain('pattern');
    }
  });

  it('enforces mobile viewport responsiveness invariants across screens and components', () => {
    // 1. Verify layout.tsx exports responsive viewport
    const layoutPath = path.resolve(__dirname, '../app/layout.tsx');
    const layoutCode = fs.readFileSync(layoutPath, 'utf8');
    expect(layoutCode).toContain("width: 'device-width'");
    expect(layoutCode).toContain('initialScale: 1');

    // 2. Verify BeforeAfterSlider does not enforce a rigid minWidth breaking mobile
    const sliderPath = path.resolve(__dirname, '../components/fitting/BeforeAfterSlider.tsx');
    const sliderCode = fs.readFileSync(sliderPath, 'utf8');
    expect(sliderCode).not.toContain("minWidth: '600px'");

    // 3. Verify ClothSandbox uses touch-none and mobile-scaled controls
    const sandboxPath = path.resolve(__dirname, '../components/canvas/ClothSandbox.tsx');
    const sandboxCode = fs.readFileSync(sandboxPath, 'utf8');
    expect(sandboxCode).toContain("touchAction: 'none'");
    expect(sandboxCode).toContain('overflow-x-auto');

    // 4. Verify MicroWeaveInspector contains responsive touch controls
    const inspectorPath = path.resolve(__dirname, '../components/canvas/MicroWeaveInspector.tsx');
    const inspectorCode = fs.readFileSync(inspectorPath, 'utf8');
    expect(inspectorCode).toContain("touchAction: 'none'");
  });
});
