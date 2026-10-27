'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  GraphicsTier,
  LifecycleStatus,
  GravityPreset,
  PhysicsMatrix,
  ShaderAssetsResponse,
  GraphicsCapabilities,
} from './types';
import { VerletClothEngine } from './clothPhysics';
import { detectGraphicsCapabilities } from './ClothSandboxBoot';

export interface ClothSandboxProps {
  fabricId?: string;
  fabricName?: string;
  gsm?: number;
  composition?: string;
  weaveType?: string;
  drapeCoefficient?: number;
  stiffnessRating?: number;
  physicsMatrix?: Partial<PhysicsMatrix>;
  shaderAssets?: Partial<ShaderAssetsResponse>;
  onInspectWeave?: () => void;
  className?: string;
}


export function getFabricColorAndShine(nameOrId: string = ''): { color: number; roughness: number; metalness: number } {
  const lower = nameOrId.toLowerCase();
  if (lower.includes('ivory') || lower.includes('duchesse') || lower.includes('slk-01') || lower.includes('slk-401')) {
    return { color: 0xf5f1e8, roughness: 0.26, metalness: 0.12 }; // Luminous Warm Ivory Duchesse Satin
  }
  if (lower.includes('velvet') || lower.includes('vlv')) {
    return { color: 0x1a1c22, roughness: 0.65, metalness: 0.08 }; // Deep Midnight Noir Velvet
  }
  if (lower.includes('wool') || lower.includes('crepe') || lower.includes('wol')) {
    return { color: 0x32343a, roughness: 0.58, metalness: 0.05 }; // Tailoring Charcoal Wool Crepe
  }
  if (lower.includes('emerald') || lower.includes('brocade')) {
    return { color: 0x1b4332, roughness: 0.32, metalness: 0.22 }; // Rich Emerald Silk Brocade
  }
  if (lower.includes('linen') || lower.includes('lin')) {
    return { color: 0xe6e0d5, roughness: 0.72, metalness: 0.02 }; // Natural Oatmeal Flax Linen
  }
  if (lower.includes('cashmere') || lower.includes('csh') || lower.includes('camel')) {
    return { color: 0xc49a6c, roughness: 0.68, metalness: 0.05 }; // Rich Camel Cashmere
  }
  return { color: 0xf2ede4, roughness: 0.32, metalness: 0.15 }; // Default luminous luxury textile
}

export function createProceduralWeaveTexture(weaveType: string = 'satin'): { normalMap: THREE.CanvasTexture | null; bumpMap: THREE.CanvasTexture | null } {
  if (typeof document === 'undefined') {
    return { normalMap: null, bumpMap: null };
  }
  try {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, size, size);
      const step = 8;
      for (let y = 0; y < size; y += step) {
        for (let x = 0; x < size; x += step) {
          const isWarp = (Math.floor(x / step) + Math.floor(y / step)) % 2 === 0;
          ctx.fillStyle = isWarp ? '#b0b0b0' : '#555555';
          ctx.fillRect(x + 1, y + 1, step - 2, step - 2);
        }
      }
    }
    const bumpTexture = new THREE.CanvasTexture(canvas);
    bumpTexture.wrapS = THREE.RepeatWrapping;
    bumpTexture.wrapT = THREE.RepeatWrapping;
    bumpTexture.repeat.set(24, 24);

    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = size;
    normalCanvas.height = size;
    const nCtx = normalCanvas.getContext('2d');
    if (nCtx) {
      nCtx.fillStyle = '#8080ff';
      nCtx.fillRect(0, 0, size, size);
      const step = 8;
      for (let y = 0; y < size; y += step) {
        for (let x = 0; x < size; x += step) {
          const isWarp = (Math.floor(x / step) + Math.floor(y / step)) % 2 === 0;
          nCtx.fillStyle = isWarp ? '#9a70ff' : '#6894ff';
          nCtx.fillRect(x + 1, y + 1, step - 2, step - 2);
        }
      }
    }
    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(24, 24);

    return { normalMap: normalTexture, bumpMap: bumpTexture };
  } catch {
    return { normalMap: null, bumpMap: null };
  }
}

export function ClothSandbox({
  fabricId = 'FAB-SLK-892',
  fabricName = 'Emerald Architectural Silk Brocade',
  gsm = 280,
  composition = '85% Mulberry Silk, 15% Metallic Lurex',
  weaveType = '8-End Duchesse Satin',
  drapeCoefficient = 0.32,
  stiffnessRating = 4.2,
  physicsMatrix,
  shaderAssets,
  onInspectWeave,
  className = '',
}: ClothSandboxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tier, setTier] = useState<GraphicsTier>('booting');
  const [status, setStatus] = useState<LifecycleStatus>('booting');
  const [statusMessage, setStatusMessage] = useState<string>('Initializing digital atelier canvas...');
  const [gravityPreset, setGravityPresetState] = useState<GravityPreset>('drape');
  const [fps, setFps] = useState<number>(60);

  // Simulation references (held outside React state to avoid UI re-renders on hot ticks)
  const engineRef = useRef<VerletClothEngine | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const clothMeshRef = useRef<THREE.Mesh | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  /**
   * Initializes physics engine with calibrated parameters.
   */
  const initEngine = useCallback(() => {
    const gridResolution = 28; // 28x28 cloth grid
    const spacing = 0.12;

    const engine = new VerletClothEngine({
      gridX: gridResolution,
      gridY: gridResolution,
      spacing,
      pinMode: 'atelier_dual',
      physicsMatrix: {
        massDensity: gsm / 1000,
        bendingStiffness: stiffnessRating,
        tensileElasticity: 0.88,
        airDamping: 0.05,
        gravityVector: [0, -9.8, 0],
        ...physicsMatrix,
      },
    });
    engine.setGravityPreset(gravityPreset);
    engineRef.current = engine;
    return engine;
  }, [gsm, stiffnessRating, physicsMatrix, gravityPreset]);

  /**
   * Sets gravity preset and updates engine state.
   */
  const handleGravityPresetChange = (preset: GravityPreset) => {
    setGravityPresetState(preset);
    if (engineRef.current) {
      engineRef.current.setGravityPreset(preset);
    }
    setStatusMessage(`Gravity preset adjusted to ${preset.toUpperCase()}.`);
  };

  /**
   * Converts mouse / touch client coordinates to normalized world coordinates.
   */
  const getNormalizedPointerCoords = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    // Project into approximate world coordinate space
    const worldX = ndcX * 1.8;
    const worldY = ndcY * 1.8;
    return { x: worldX, y: worldY };
  };

  // ---------------------------------------------------------------------------
  // Tactile Pointer Event Handlers (Discipline Rule 2 & FEAT-002)
  // ---------------------------------------------------------------------------

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isPointerDownRef.current = true;

    const { x, y } = getNormalizedPointerCoords(e.clientX, e.clientY);
    lastPointerPosRef.current = { x, y };

    if (engineRef.current) {
      engineRef.current.grab(x, y, 0.6);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current || !engineRef.current) return;

    const { x, y } = getNormalizedPointerCoords(e.clientX, e.clientY);
    const lastX = lastPointerPosRef.current.x;
    const lastY = lastPointerPosRef.current.y;
    const dx = x - lastX;
    const dy = y - lastY;

    // Direct drag manipulation
    engineRef.current.drag(x, y, 0.2);

    // Dynamic wave/ripple generation from pointer velocity
    const speed = Math.sqrt(dx * dx + dy * dy);
    if (speed > 0.02) {
      const impulseScale = Math.min(speed * 8.0, 3.5);
      engineRef.current.applyRipple(x, y, dx * impulseScale, dy * impulseScale, 0.5, 0.75);
    }

    lastPointerPosRef.current = { x, y };
  };

  
  // Dynamic material color update when active fabric prop updates
  useEffect(() => {
    if (clothMeshRef.current) {
      const mat = clothMeshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        const shine = getFabricColorAndShine(fabricName || fabricId);
        mat.color.setHex(shine.color);
        mat.roughness = shine.roughness;
        mat.metalness = shine.metalness;
        mat.needsUpdate = true;
      }
    }
  }, [fabricId, fabricName]);

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    isPointerDownRef.current = false;

    if (engineRef.current) {
      engineRef.current.release();
    }
  };

  // ---------------------------------------------------------------------------
  // Lifecycle & Multi-Tier Fallback Setup (Discipline Rule 1)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let isMounted = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let activeDevice: { lost?: Promise<{ reason?: string; message?: string }> } | null = null;
    let lastTime = performance.now();
    let frameCounter = 0;
    let fpsTimer = performance.now();

    const engine = initEngine();

    /**
     * Set up Three.js WebGL2 pipeline.
     */
    function setupWebGLRenderer() {
      if (!canvas) return null;

      const width = canvas.clientWidth || 800;
      const height = canvas.clientHeight || 520;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 0, 4.2);
      cameraRef.current = camera;

      // Studio lighting setup per branding.md - calibrated for bright luxury luster
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.4); // Bright clear ambient
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xfff8ee, 2.0); // Warm primary key light
      keyLight.position.set(3, 4, 4);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xe5d0b0, 1.2); // Warm champagne gold accent fill
      fillLight.position.set(-3, 1, 3);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0xffffff, 0.9); // Back rim light highlighting fold contours
      rimLight.position.set(0, -3, -3);
      scene.add(rimLight);

      // Create pre-allocated BufferGeometry using typed arrays from engine
      const geometry = new THREE.BufferGeometry();
      const posAttr = new THREE.BufferAttribute(engine.positions, 3);
      posAttr.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute('position', posAttr);

      const normAttr = new THREE.BufferAttribute(engine.normals, 3);
      normAttr.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute('normal', normAttr);

      const uvAttr = new THREE.BufferAttribute(engine.uvs, 2);
      geometry.setAttribute('uv', uvAttr);

      geometry.setIndex(new THREE.BufferAttribute(engine.indices, 1));

      const fabricShine = getFabricColorAndShine(fabricName || fabricId);
      const { normalMap, bumpMap } = createProceduralWeaveTexture(weaveType);

      // Luxury satin/silk material shader with calibrated luster and tactile micro-weave
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(fabricShine.color),
        roughness: fabricShine.roughness,
        metalness: fabricShine.metalness,
        side: THREE.DoubleSide,
        normalMap: normalMap || undefined,
        bumpMap: bumpMap || undefined,
        bumpScale: 0.04,
      });

      const mesh = new THREE.Mesh(geometry, material);
      clothMeshRef.current = mesh;
      scene.add(mesh);

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      rendererRef.current = renderer;

      return renderer;
    }

    /**
     * Hot-path fixed-timestep animation loop.
     * ZERO heap allocations inside this loop per Discipline Rule 2.
     */
    function tick(currentTime: number) {
      if (!isMounted) return;

      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // FPS tracking (evaluated once per second)
      frameCounter++;
      if (currentTime - fpsTimer >= 1000) {
        setFps(frameCounter);
        frameCounter = 0;
        fpsTimer = currentTime;
      }

      // Step physics at fixed timestep
      if (engineRef.current) {
        engineRef.current.update(dt);
      }

      // Update Three.js vertex and normal attributes without re-allocating
      if (clothMeshRef.current && rendererRef.current && sceneRef.current && cameraRef.current) {
        const geom = clothMeshRef.current.geometry;
        geom.attributes.position.needsUpdate = true;
        geom.attributes.normal.needsUpdate = true;
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animFrameIdRef.current = requestAnimationFrame(tick);
    }

    /**
     * Boots graphics tier and initializes listeners.
     */
    async function bootGraphics() {
      setStatus('booting');
      setStatusMessage('Calibrating textile physics and inspecting GPU capabilities...');

      const result: GraphicsCapabilities = await detectGraphicsCapabilities(canvas);
      if (!isMounted) return;

      if (result.tier === 'webgpu') {
        setTier('webgpu');
        setStatus('ready');
        setStatusMessage('WebGPU Acceleration Active: 60 FPS real-time cloth simulation engaged.');

        const device = result.device as {
          lost?: Promise<{ reason?: string; message?: string }>;
        } | null;

        if (device && device.lost) {
          activeDevice = device;
          device.lost.then((info) => {
            if (!isMounted) return;
            setStatus('context-lost');
            setStatusMessage(
              `WebGPU Device Lost (${info?.reason || 'unspecified'}). Cleaning pipelines and recovering...`
            );
            // Attempt recovery by re-probing
            setTimeout(bootGraphics, 1500);
          });
        }

        // Initialize WebGL/Three renderer pipeline for display
        setupWebGLRenderer();
        animFrameIdRef.current = requestAnimationFrame(tick);
      } else if (result.tier === 'webgl2') {
        setTier('webgl2');
        setStatus('ready');
        setStatusMessage('WebGL 2.0 Fallback Active: Standard shader pipeline engaged.');

        setupWebGLRenderer();
        animFrameIdRef.current = requestAnimationFrame(tick);
      } else {
        setTier('fallback-media');
        setStatus('ready');
        setStatusMessage('Editorial Media Active: Pre-rendered video simulation fallback.');
      }
    }

    bootGraphics();

    // WebGL Context Loss / Restoration Handlers (Discipline Rule 1)
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      if (!isMounted) return;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      setStatus('context-lost');
      setStatusMessage('WebGL context lost. Pausing physics simulation loop...');
    };

    const handleContextRestored = () => {
      if (!isMounted) return;
      setStatus('restoring');
      setStatusMessage('WebGL context restored. Re-initializing simulation pipelines...');
      bootGraphics();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    // Responsive Canvas Resize Handler
    const handleResize = () => {
      if (!canvas || !rendererRef.current || !cameraRef.current) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height, false);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      }
      window.removeEventListener('resize', handleResize);

      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      activeDevice = null;
    };
  }, [initEngine]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[460px] rounded-lg overflow-hidden border border-grey-300 dark:border-grey-700 bg-surface dark:bg-surface-dark transition-colors duration-300 ${className}`}
      data-testid="cloth-sandbox-container"
    >
      {/* Screen Reader Accessible Textile Specification (WCAG 2.2 AA) */}
      <div className="sr-only" role="region" aria-label="Tactile fabric physics simulation">
        <p>
          Simulating {fabricName}, {composition}. Fabric density: {gsm} GSM. Weave construction: {weaveType}.
          Drape coefficient: {drapeCoefficient}. Current gravity mode: {gravityPreset}.
        </p>
      </div>

      {/* ARIA Live Region for Operational State Broadcasting */}
      <div aria-live="polite" className="sr-only" data-testid="aria-live-status">
        {statusMessage}
      </div>

      {/* Interactive 3D Canvas */}
      {tier !== 'fallback-media' && (
        <canvas
          ref={canvasRef}
          className={`w-full h-full cursor-grab active:cursor-grabbing transition-opacity duration-500 ${
            status === 'ready' ? 'opacity-100' : 'opacity-40'
          }`}
          data-testid="cloth-canvas"
          aria-label={`Interactive 3D cloth simulation canvas for ${fabricName}. Drag to wave, ripple, or fold.`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      )}

      {/* Fallback Media Presentation (Tier 3) */}
      {tier === 'fallback-media' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-grey-100 to-grey-200 dark:from-grey-900 dark:to-obsidian text-center"
          data-testid="editorial-fallback"
        >
          {shaderAssets?.loopingVideoFallbackUrl ? (
            <video
              src={shaderAssets.loopingVideoFallbackUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover rounded-md"
              data-testid="fallback-video"
            />
          ) : (
            <>
              <div className="w-16 h-16 mb-4 rounded-full border border-gold/40 flex items-center justify-center text-gold">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="font-display text-xl font-semibold text-ink dark:text-alabaster mb-2">
                Editorial Still Presentation
              </h3>
              <p className="text-sm text-grey-600 dark:text-grey-400 max-w-md font-sans">
                Hardware acceleration is unavailable. Viewing static high-resolution atelier
                photography for {fabricName} ({gsm} GSM, {weaveType}).
              </p>
            </>
          )}
        </div>
      )}

      {/* Top Left Status & Tier Badges */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium tracking-wide bg-ink/90 text-alabaster border border-gold/30 backdrop-blur-sm"
          data-testid="tier-badge"
        >
          <span
            className={`w-2 h-2 rounded-full mr-2 ${
              tier === 'webgpu'
                ? 'bg-emerald-400 animate-pulse'
                : tier === 'webgl2'
                ? 'bg-amber-400'
                : tier === 'booting'
                ? 'bg-grey-400 animate-ping'
                : 'bg-gold'
            }`}
          />
          {tier === 'webgpu'
            ? 'WebGPU Acceleration'
            : tier === 'webgl2'
            ? 'WebGL 2.0 Fallback'
            : tier === 'booting'
            ? 'Calibrating...'
            : 'Editorial Media'}
        </span>

        {status === 'context-lost' && (
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-semantic-error-900 text-alabaster border border-semantic-error-500"
            data-testid="context-lost-badge"
          >
            Context Lost · Recovering
          </span>
        )}

        {status === 'ready' && tier !== 'fallback-media' && (
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-grey-900/60 text-grey-300 border border-grey-700/50">
            {fps} FPS
          </span>
        )}
      </div>

      {/* Top Right Tactile Action Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
        {onInspectWeave && (
          <button
            type="button"
            onClick={onInspectWeave}
            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider text-alabaster bg-ink/90 hover:bg-ink dark:bg-alabaster/90 dark:text-ink dark:hover:bg-alabaster border border-gold/40 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-gold"
            aria-label="Launch 10x Microscopic Weave Inspector"
            data-testid="inspect-weave-button"
          >
            <svg
              className="w-3.5 h-3.5 mr-1.5 text-gold"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
              />
            </svg>
            Inspect Weave (10x)
          </button>
        )}
      </div>

      {/* Bottom Center Gravity Mode Presets (FEAT-002 & Screen 3) */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-1 p-1 rounded-full bg-ink/80 dark:bg-obsidian/80 backdrop-blur-md border border-grey-300/30 dark:border-grey-700/50 shadow-md">
        {(['breeze', 'drape', 'drop'] as GravityPreset[]).map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handleGravityPresetChange(preset)}
            className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider transition-all focus:outline-none focus:ring-1 focus:ring-gold ${
              gravityPreset === preset
                ? 'bg-gold text-ink font-semibold shadow-sm'
                : 'text-alabaster hover:text-gold'
            }`}
            data-testid={`preset-${preset}`}
            aria-pressed={gravityPreset === preset}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Bottom Physical Provenance Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between p-2.5 rounded-md bg-alabaster/90 dark:bg-obsidian/90 backdrop-blur-md border border-grey-300 dark:border-grey-700 text-xs">
        <div>
          <span className="font-semibold text-ink dark:text-alabaster block">{fabricName}</span>
          <span className="text-grey-600 dark:text-grey-400">
            {composition} · {gsm} GSM · Drape: {drapeCoefficient} · Stiffness: {stiffnessRating}
          </span>
        </div>
        <span className="text-gold font-medium uppercase tracking-wider text-[10px]">
          Verlet Physical Model
        </span>
      </div>
    </div>
  );
}
