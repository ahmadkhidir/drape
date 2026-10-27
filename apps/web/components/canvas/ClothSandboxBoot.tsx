'use client';

import React, { useEffect, useRef, useState } from 'react';

export type GraphicsTier = 'booting' | 'webgpu' | 'webgl2' | 'fallback-media';
export type LifecycleStatus = 'booting' | 'ready' | 'context-lost' | 'restoring' | 'error';

export interface GraphicsCapabilities {
  tier: 'webgpu' | 'webgl2' | 'fallback-media';
  adapter?: unknown;
  device?: unknown;
  gl?: WebGL2RenderingContext | null;
  error?: string;
}

/**
 * Probes browser graphics hardware to identify the highest available
 * real-time cloth simulation tier adhering to Discipline Rule 1.
 *
 * Tier 1: WebGPU (Next-gen compute shaders & particle integration)
 * Tier 2: WebGL 2.0 (Fragment/compute fallback simulation)
 * Tier 3: Editorial Photographic & Video Loop Fallback
 */
export async function detectGraphicsCapabilities(
  canvasCandidate?: HTMLCanvasElement | null
): Promise<GraphicsCapabilities> {
  // 1. Inspect WebGPU availability
  if (
    typeof navigator !== 'undefined' &&
    'gpu' in navigator &&
    typeof (navigator as unknown as { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu?.requestAdapter === 'function'
  ) {
    try {
      const gpu = (navigator as unknown as {
        gpu: {
          requestAdapter: () => Promise<{
            requestDevice: () => Promise<unknown>;
          } | null>;
        };
      }).gpu;

      const adapter = await gpu.requestAdapter();
      if (adapter) {
        const device = await adapter.requestDevice();
        if (device) {
          return { tier: 'webgpu', adapter, device };
        }
      }
    } catch (err) {
      // Automatic graceful degradation to WebGL 2.0 on device initialization failure
      const message = err instanceof Error ? err.message : String(err);
      console.warn('WebGPU initialization unavailable, degrading to WebGL 2.0:', message);
    }
  }

  // 2. Inspect WebGL 2.0 availability
  try {
    let testCanvas = canvasCandidate;
    if (!testCanvas && typeof document !== 'undefined') {
      testCanvas = document.createElement('canvas');
    }

    if (testCanvas && typeof testCanvas.getContext === 'function') {
      const gl = testCanvas.getContext('webgl2');
      if (gl) {
        return { tier: 'webgl2', gl };
      }
    }
  } catch (err) {
    console.warn('WebGL 2.0 inspection failed, degrading to editorial media tier:', err);
  }

  // 3. Fallback to pre-rendered video loops and static photography
  return { tier: 'fallback-media' };
}

export interface ClothSandboxBootProps {
  fabricName?: string;
  gsm?: number;
  composition?: string;
  weaveType?: string;
  drapeCoefficient?: number;
  className?: string;
}

export function ClothSandboxBoot({
  fabricName = 'Luminous Silk Duchesse',
  gsm = 280,
  composition = '100% Mulberry Silk',
  weaveType = '8-End Duchesse Satin',
  drapeCoefficient = 0.32,
  className = '',
}: ClothSandboxBootProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tier, setTier] = useState<GraphicsTier>('booting');
  const [status, setStatus] = useState<LifecycleStatus>('booting');
  const [statusMessage, setStatusMessage] = useState<string>('Initializing digital atelier canvas...');

  useEffect(() => {
    let isMounted = true;
    let activeDevice: { lost?: Promise<{ reason?: string; message?: string }> } | null = null;
    const canvas = canvasRef.current;

    async function initializeGraphics() {
      setStatus('booting');
      setStatusMessage('Inspecting graphics hardware for WebGPU compute support...');

      const result = await detectGraphicsCapabilities(canvas);
      if (!isMounted) return;

      if (result.tier === 'webgpu') {
        setTier('webgpu');
        setStatus('ready');
        setStatusMessage('WebGPU Acceleration Active: High-density cloth physics engaged.');

        // Bind device loss handler adhering to Discipline Rule 1
        const device = result.device as {
          lost?: Promise<{ reason?: string; message?: string }>;
        } | null;

        if (device && device.lost) {
          activeDevice = device;
          device.lost.then((info) => {
            if (!isMounted) return;
            setStatus('context-lost');
            setStatusMessage(
              `WebGPU Device Lost (${info?.reason || 'unspecified'}). Releasing resources and initiating recovery...`
            );
          });
        }
      } else if (result.tier === 'webgl2') {
        setTier('webgl2');
        setStatus('ready');
        setStatusMessage('WebGL 2.0 Fallback Active: Standard shader pipeline engaged.');
      } else {
        setTier('fallback-media');
        setStatus('ready');
        setStatusMessage('Editorial Media Mode Active: High-resolution static photography fallback.');
      }
    }

    initializeGraphics();

    // Context loss / restoration event listeners for WebGL
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      if (!isMounted) return;
      setStatus('context-lost');
      setStatusMessage('WebGL context lost. Pausing physics simulation loop...');
    };

    const handleContextRestored = () => {
      if (!isMounted) return;
      setStatus('restoring');
      setStatusMessage('WebGL context restored. Re-initializing simulation pipelines...');
      initializeGraphics();
    };

    if (canvas) {
      canvas.addEventListener('webglcontextlost', handleContextLost);
      canvas.addEventListener('webglcontextrestored', handleContextRestored);
    }

    return () => {
      isMounted = false;
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      }
      activeDevice = null;
    };
  }, []);

  return (
    <div
      className={`relative w-full h-full min-h-[420px] rounded-lg overflow-hidden border border-grey-300 dark:border-grey-700 bg-surface dark:bg-surface-dark transition-colors duration-300 ${className}`}
      data-testid="cloth-sandbox-container"
    >
      {/* Screen Reader Accessible Textile Specification (branding.md & WCAG 2.2 AA) */}
      <div className="sr-only" role="region" aria-label="Tactile fabric physics simulation">
        <p>
          Simulating {fabricName}, {composition}. Fabric density: {gsm} GSM. Weave construction: {weaveType}.
          Drape coefficient: {drapeCoefficient}.
        </p>
      </div>

      {/* ARIA Live Region for Operational State Broadcasting */}
      <div aria-live="polite" className="sr-only" data-testid="aria-live-status">
        {statusMessage}
      </div>

      {/* 3D Canvas for WebGPU / WebGL 2.0 rendering */}
      {tier !== 'fallback-media' && (
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            status === 'ready' ? 'opacity-100' : 'opacity-40'
          }`}
          data-testid="cloth-canvas"
          aria-label={`Interactive 3D cloth simulation canvas for ${fabricName}`}
        />
      )}

      {/* Fallback Editorial Photography & Video Loop presentation */}
      {tier === 'fallback-media' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-grey-100 to-grey-200 dark:from-grey-900 dark:to-obsidian text-center"
          data-testid="editorial-fallback"
        >
          <div className="w-16 h-16 mb-4 rounded-full border border-gold/40 flex items-center justify-center text-gold">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-display text-xl font-semibold text-ink dark:text-alabaster mb-2">
            Editorial Still Presentation
          </h3>
          <p className="text-sm text-grey-600 dark:text-grey-400 max-w-md font-sans">
            Hardware acceleration is currently unavailable. Viewing static high-resolution atelier
            photography for {fabricName} ({gsm} GSM, {weaveType}).
          </p>
        </div>
      )}

      {/* Operational State Overlay Badges */}
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
            ? 'Probing Hardware...'
            : 'Editorial Media'}
        </span>

        {status === 'context-lost' && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-semantic-error-900 text-alabaster border border-semantic-error-500">
            Context Lost · Recovering
          </span>
        )}
      </div>

      {/* Textile Physical Provenance Chip */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between p-3 rounded-md bg-alabaster/90 dark:bg-obsidian/90 backdrop-blur-md border border-grey-300 dark:border-grey-700 text-xs">
        <div>
          <span className="font-semibold text-ink dark:text-alabaster block">{fabricName}</span>
          <span className="text-grey-600 dark:text-grey-400">
            {composition} · {gsm} GSM · Drape: {drapeCoefficient}
          </span>
        </div>
        <span className="text-gold font-medium uppercase tracking-wider text-[10px]">
          Atelier Tested
        </span>
      </div>
    </div>
  );
}
