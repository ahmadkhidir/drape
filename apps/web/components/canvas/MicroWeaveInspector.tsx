/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { DirectionalLightState } from './types';
import { getFabricColorAndShine, getFabricTextureUrl } from './fabricVisuals';

export interface MicroWeaveInspectorProps {
  fabricId?: string;
  fabricName?: string;
  millName?: string;
  fiberBreakdown?: string;
  threadCount?: string;
  gsm?: number;
  isOpen: boolean;
  onClose: () => void;
  microWeaveTileBaseUrl?: string;
  maxTileZoomLevel?: number;
  textureUrl?: string;
  weaveType?: string;
}

/**
 * Drape Micro-Weave Inspector with Dynamic Directional Raking Light
 * Spec Anchors: FEAT-003, C-010, screens/03-fabric-detail-view.md
 *
 * Calibrates 10x optical magnification, authentic fabric colors and weave structures,
 * high-resolution pattern overlays, and real-time anisotropic sheen responding to spotlight azimuth & pitch.
 */
export function MicroWeaveInspector({
  fabricId = 'FAB-SLK-401',
  fabricName = 'Luminous Ivory Duchesse',
  millName = 'Tessitura di Como',
  fiberBreakdown = '100% Mulberry Silk',
  threadCount = '480 TPI (280 Warp / 200 Weft)',
  gsm = 280,
  isOpen,
  onClose,
  microWeaveTileBaseUrl,
  maxTileZoomLevel = 5,
  textureUrl,
  weaveType,
}: MicroWeaveInspectorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Optical Zoom state (1.0x to 10.0x / 100% to 1000% per FEAT-003)
  const [zoom, setZoom] = useState<number>(2.5);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const lastPanStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Directional Lighting state (Azimuth 0..360°, Pitch 15..90°)
  const [lightState, setLightState] = useState<DirectionalLightState>({
    angleDeg: 45, // Azimuth 0..360
    pitchDeg: 35, // Pitch 15..90
    intensity: 1.3,
    specularPower: 48,
  });

  const [isLoadingTiles, setIsLoadingTiles] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>(
    `Micro-weave optical viewport for ${fabricName} ready.`
  );

  // Deep-zoom pyramidal tiles and pattern cache
  const tileCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Dynamically resolve tile base URL per C-010
  const effectiveTileBaseUrl = useMemo(() => {
    return microWeaveTileBaseUrl || `/api/v1/fabrics/${fabricId}/micro-weave/tiles`;
  }, [microWeaveTileBaseUrl, fabricId]);

  // Dynamically resolve fabric texture asset URL
  const resolvedTextureUrl = useMemo(() => {
    return textureUrl || getFabricTextureUrl(fabricId || fabricName) || '/textures/fabrics/ivory-satin.svg';
  }, [textureUrl, fabricId, fabricName]);

  // Certified fabric color and physical sheen parameters
  const fabricAesthetics = useMemo(() => {
    return getFabricColorAndShine(fabricName || fabricId);
  }, [fabricName, fabricId]);

  // Escape key handler to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  /**
   * Calculates pyramidal tile level from zoom scale (0 to maxTileZoomLevel).
   * Level 0 = 1x, Level 5 = 10x max threshold.
   */
  const computePyramidLevel = useCallback(
    (currentZoom: number): number => {
      const normalized = (currentZoom - 1.0) / 9.0; // 0 to 1
      const level = Math.floor(normalized * maxTileZoomLevel);
      return Math.min(maxTileZoomLevel, Math.max(0, level));
    },
    [maxTileZoomLevel]
  );

  /**
   * Renders the microscopic weave structure, thread relief, authentic fabric color, and dynamic lighting.
   */
  const drawMicroWeave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear viewport with deep obsidian background
    ctx.fillStyle = '#11100F';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 + panOffset.x, height / 2 + panOffset.y);
    ctx.scale(zoom, zoom);

    // Compute 3D light vector from azimuth and pitch
    const radAngle = (lightState.angleDeg * Math.PI) / 180;
    const radPitch = (lightState.pitchDeg * Math.PI) / 180;
    const lx = Math.cos(radAngle) * Math.cos(radPitch);
    const ly = Math.sin(radAngle) * Math.cos(radPitch);
    const lz = Math.sin(radPitch);

    // Grid size calibrated by zoom
    const yarnStep = 18; // Base spacing for warp and weft yarns
    const extent = Math.max(width, height) / zoom + 80;

    const startX = -extent;
    const endX = extent;
    const startY = -extent;
    const endY = extent;

    // Extract certified RGB base tone
    const colorInt = fabricAesthetics.color;
    const baseR = (colorInt >> 16) & 0xff;
    const baseG = (colorInt >> 8) & 0xff;
    const baseB = colorInt & 0xff;

    // Analyze weave structure
    const desc = `${weaveType || ''} ${fabricName || ''} ${fabricId || ''} ${fiberBreakdown || ''}`.toLowerCase();
    const isVelvet = desc.includes('velvet') || desc.includes('vlv');
    const isCrepe = desc.includes('crepe') || desc.includes('wool') || desc.includes('wol');
    const isJacquardOrBrocade = desc.includes('jacquard') || desc.includes('brocade') || desc.includes('lurex');
    const isLinen = desc.includes('linen') || desc.includes('lin') || desc.includes('flax');
    const isSatin = desc.includes('satin') || desc.includes('duchesse') || (!isVelvet && !isCrepe && !isJacquardOrBrocade && !isLinen);

    // 1. Draw base high-resolution fabric texture swatch pattern if available
    const textureImg = tileCacheRef.current.get(`texture-${fabricId}`);
    if (textureImg && textureImg.complete && textureImg.naturalWidth > 0) {
      try {
        const pattern = ctx.createPattern(textureImg, 'repeat');
        if (pattern) {
          ctx.save();
          ctx.globalAlpha = 0.42;
          ctx.fillStyle = pattern;
          ctx.fillRect(startX, startY, endX - startX, endY - startY);
          ctx.restore();
        }
      } catch {
        // Fallback gracefully
      }
    }

    // 2. Draw Warp Yarns (Vertical yarns)
    for (let x = Math.floor(startX / yarnStep) * yarnStep; x <= endX; x += yarnStep) {
      const isLurexMetallic = isJacquardOrBrocade && Math.abs(x % (yarnStep * 4)) === 0;

      // Yarn normal slope across cylinder
      const nx = -0.5;
      const ny = 0.0;
      const nz = 0.866;

      // Dot product for diffuse lighting
      const NdotL = Math.max(0.12, nx * lx + ny * ly + nz * lz);

      // Anisotropic highlight along yarn axis
      const tangentZ = 1.0;
      const TdotL = lz * tangentZ;
      const anisotropicSpecular = Math.pow(Math.max(0, 1 - TdotL * TdotL), lightState.specularPower / (isSatin ? 6 : 10));

      let r: number, g: number, b: number;

      if (isLurexMetallic) {
        // Spun gold lurex filament
        r = Math.min(255, Math.floor(215 * NdotL * lightState.intensity + anisotropicSpecular * 180));
        g = Math.min(255, Math.floor(180 * NdotL * lightState.intensity + anisotropicSpecular * 140));
        b = Math.min(255, Math.floor(70 * NdotL * lightState.intensity + anisotropicSpecular * 50));
      } else if (isSatin) {
        // Luminous satin weave with long warp floats and high luster
        r = Math.min(255, Math.floor(baseR * 0.92 * NdotL * lightState.intensity + anisotropicSpecular * 115));
        g = Math.min(255, Math.floor(baseG * 0.92 * NdotL * lightState.intensity + anisotropicSpecular * 115));
        b = Math.min(255, Math.floor(baseB * 0.92 * NdotL * lightState.intensity + anisotropicSpecular * 110));
      } else if (isVelvet) {
        // Deep tufted pile absorption
        r = Math.min(255, Math.floor(baseR * 0.88 * NdotL * lightState.intensity + anisotropicSpecular * 40));
        g = Math.min(255, Math.floor(baseG * 0.88 * NdotL * lightState.intensity + anisotropicSpecular * 40));
        b = Math.min(255, Math.floor(baseB * 0.88 * NdotL * lightState.intensity + anisotropicSpecular * 40));
      } else if (isCrepe) {
        // High-twist pebbled crepe texture
        r = Math.min(255, Math.floor(baseR * 0.95 * NdotL * lightState.intensity + anisotropicSpecular * 30));
        g = Math.min(255, Math.floor(baseG * 0.95 * NdotL * lightState.intensity + anisotropicSpecular * 30));
        b = Math.min(255, Math.floor(baseB * 0.95 * NdotL * lightState.intensity + anisotropicSpecular * 30));
      } else {
        // Heritage linen / wool twill / cupro
        r = Math.min(255, Math.floor(baseR * 0.90 * NdotL * lightState.intensity + anisotropicSpecular * 55));
        g = Math.min(255, Math.floor(baseG * 0.90 * NdotL * lightState.intensity + anisotropicSpecular * 55));
        b = Math.min(255, Math.floor(baseB * 0.90 * NdotL * lightState.intensity + anisotropicSpecular * 50));
      }

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, startY, yarnStep * 0.88, endY - startY);

      // Microscopic fiber filigree line
      ctx.strokeStyle = `rgba(255, 255, 255, ${isLurexMetallic ? 0.35 : isSatin ? 0.16 : 0.08})`;
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      ctx.moveTo(x + yarnStep * 0.44, startY);
      ctx.lineTo(x + yarnStep * 0.44, endY);
      ctx.stroke();

      // Velvet tuft micro-ringlets
      if (isVelvet) {
        ctx.fillStyle = `rgba(${r + 20}, ${g + 20}, ${b + 20}, 0.25)`;
        for (let ty = Math.floor(startY / yarnStep) * yarnStep; ty <= endY; ty += yarnStep * 1.5) {
          ctx.beginPath();
          ctx.arc(x + yarnStep * 0.44, ty, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 3. Draw Weft Yarns (Horizontal yarns interweaving)
    for (let y = Math.floor(startY / yarnStep) * yarnStep; y <= endY; y += yarnStep) {
      const nx = 0.0;
      const ny = -0.6;
      const nz = 0.8;

      const NdotL = Math.max(0.1, nx * lx + ny * ly + nz * lz);
      const tangentX = 1.0;
      const TdotL = lx * tangentX;
      const anisotropicSpecular = Math.pow(Math.max(0, 1 - TdotL * TdotL), lightState.specularPower / (isSatin ? 6 : 10));

      const weftFactor = isSatin ? 0.76 : 0.88;
      const r = Math.min(255, Math.floor(baseR * weftFactor * NdotL * lightState.intensity + anisotropicSpecular * 40));
      const g = Math.min(255, Math.floor(baseG * weftFactor * NdotL * lightState.intensity + anisotropicSpecular * 40));
      const b = Math.min(255, Math.floor(baseB * weftFactor * NdotL * lightState.intensity + anisotropicSpecular * 40));

      ctx.fillStyle = isSatin ? `rgba(${r}, ${g}, ${b}, 0.72)` : `rgba(${r}, ${g}, ${b}, 0.88)`;
      ctx.fillRect(startX, y, endX - startX, yarnStep * 0.85);

      // Weft thread ridge shadow
      ctx.fillStyle = 'rgba(10, 10, 10, 0.45)';
      ctx.fillRect(startX, y + yarnStep * 0.85, endX - startX, yarnStep * 0.15);
    }

    ctx.restore();

    // 4. Draw Virtual Spotlight Indicator Overlay (Top Right HUD)
    const hudSize = 72;
    const hudX = width - hudSize - 24;
    const hudY = 24;

    ctx.save();
    ctx.beginPath();
    ctx.arc(hudX + hudSize / 2, hudY + hudSize / 2, hudSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(17, 19, 24, 0.75)';
    ctx.fill();
    ctx.strokeStyle = '#C5A059';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Compass marks
    ctx.strokeStyle = 'rgba(197, 160, 89, 0.3)';
    ctx.beginPath();
    ctx.moveTo(hudX + hudSize / 2, hudY);
    ctx.lineTo(hudX + hudSize / 2, hudY + hudSize);
    ctx.moveTo(hudX, hudY + hudSize / 2);
    ctx.lineTo(hudX + hudSize, hudY + hudSize / 2);
    ctx.stroke();

    // Spotlight vector ray
    const puckRadius = (hudSize / 2 - 8) * Math.cos(radPitch);
    const puckX = hudX + hudSize / 2 + Math.cos(radAngle) * puckRadius;
    const puckY = hudY + hudSize / 2 + Math.sin(radAngle) * puckRadius;

    ctx.beginPath();
    ctx.moveTo(hudX + hudSize / 2, hudY + hudSize / 2);
    ctx.lineTo(puckX, puckY);
    ctx.strokeStyle = '#C5A059';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(puckX, puckY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#C5A059';
    ctx.fill();
    ctx.restore();
  }, [zoom, panOffset, lightState, fabricAesthetics, weaveType, fabricName, fabricId, fiberBreakdown]);

  // Load and cache high-resolution fabric texture swatch
  useEffect(() => {
    if (!isOpen || !resolvedTextureUrl || typeof window === 'undefined') return;
    const cacheKey = `texture-${fabricId}`;

    if (!tileCacheRef.current.has(cacheKey)) {
      const img = new Image();
      img.onload = () => {
        tileCacheRef.current.set(cacheKey, img);
        drawMicroWeave();
      };
      img.onerror = () => {
        drawMicroWeave();
      };
      img.src = resolvedTextureUrl;
    } else {
      drawMicroWeave();
    }
  }, [isOpen, resolvedTextureUrl, fabricId, drawMicroWeave]);

  // Request pyramidal tile according to C-010 specification
  useEffect(() => {
    if (!isOpen) return;
    const level = computePyramidLevel(zoom);
    const tileKey = `${fabricId}-${level}-0-0`;

    if (!tileCacheRef.current.has(tileKey)) {
      setIsLoadingTiles(true);
      const img = new Image();
      const tileUrl = `${effectiveTileBaseUrl}/${level}/0/0`;

      img.onload = () => {
        tileCacheRef.current.set(tileKey, img);
        setIsLoadingTiles(false);
        setLoadError(null);
        drawMicroWeave();
      };
      img.onerror = () => {
        // Fallback to calibrated procedural micro-weave rendering
        setIsLoadingTiles(false);
        drawMicroWeave();
      };
      img.src = tileUrl;
    } else {
      drawMicroWeave();
    }
  }, [isOpen, zoom, fabricId, computePyramidLevel, effectiveTileBaseUrl, drawMicroWeave]);

  useEffect(() => {
    if (isOpen) {
      drawMicroWeave();
    }
  }, [isOpen, drawMicroWeave]);

  // Handle pointer drag for panning viewport
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsPanning(true);
    lastPanStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - lastPanStartRef.current.x,
      y: e.clientY - lastPanStartRef.current.y,
    });
  };

  const handlePointerUp = () => {
    setIsPanning(false);
  };

  // Zoom controls (Capped between 1.0x and 10.0x per FEAT-003)
  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.min(10.0, Math.max(1.0, parseFloat(newZoom.toFixed(1))));
    setZoom(clamped);
    setStatusAnnouncement(`Optical zoom set to ${clamped}x magnification for ${fabricName}.`);
  };

  const handleLightAngleChange = (angle: number) => {
    setLightState((prev) => ({ ...prev, angleDeg: angle }));
    setStatusAnnouncement(`Spotlight rotation set to ${angle} degrees.`);
  };

  const handleLightPitchChange = (pitch: number) => {
    setLightState((prev) => ({ ...prev, pitchDeg: pitch }));
  };

  const resetView = () => {
    setZoom(2.5);
    setPanOffset({ x: 0, y: 0 });
    setLightState({ angleDeg: 45, pitchDeg: 35, intensity: 1.3, specularPower: 48 });
    setStatusAnnouncement(`Viewport reset to standard 2.5x magnification and raking light for ${fabricName}.`);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="micro-weave-title"
      aria-describedby="micro-weave-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/95 backdrop-blur-xl p-4 sm:p-6 lg:p-8 animate-fadeIn"
      data-testid="micro-weave-modal"
    >
      {/* ARIA Live Region */}
      <div aria-live="polite" className="sr-only" data-testid="micro-weave-status">
        {statusAnnouncement}
      </div>

      <div className="relative w-full max-w-6xl h-[88vh] flex flex-col rounded-lg border border-gold/30 bg-surface-dark overflow-hidden shadow-2xl">
        {/* Header Dossier Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-grey-800 bg-obsidian/90">
          <div>
            <div className="flex items-center space-x-2 text-gold text-xs uppercase tracking-widest font-semibold">
              <span>10x Optical Microscopic Lens</span>
              <span>✦</span>
              <span>{millName}</span>
            </div>
            <h2
              id="micro-weave-title"
              className="font-display text-2xl font-semibold text-alabaster tracking-tight mt-0.5"
            >
              {fabricName}
            </h2>
            <p id="micro-weave-desc" className="text-xs text-grey-400 font-sans mt-0.5">
              {fiberBreakdown} · {threadCount} · {gsm} GSM · {weaveType || 'Bespoke Weave'}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={resetView}
              className="px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider text-grey-300 hover:text-gold border border-grey-700 hover:border-gold transition-colors focus:outline-none focus:ring-1 focus:ring-gold"
            >
              Reset View
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-grey-400 hover:text-alabaster hover:bg-grey-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gold min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close Microscopic Inspector"
              data-testid="close-modal-button"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Central Inspection Viewport */}
        <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={960}
            height={560}
            className="w-full h-full object-contain cursor-grab active:cursor-grabbing touch-none" style={{ touchAction: 'none' }}
            data-testid="micro-weave-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />

          {/* Loading indicator for high-res tile downloads */}
          {isLoadingTiles && (
            <div
              className="absolute top-4 left-4 z-20 flex items-center space-x-2 px-3 py-1.5 rounded-full bg-ink/80 border border-gold/40 text-gold text-xs backdrop-blur-md"
              data-testid="tile-loading-indicator"
            >
              <span className="w-2 h-2 rounded-full bg-gold animate-ping" />
              <span>Streaming Micro-Weave Tiles...</span>
            </div>
          )}

          {loadError && (
            <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded bg-semantic-error-900/80 text-alabaster border border-semantic-error-500 text-xs">
              {loadError}
            </div>
          )}

          {/* Interactive Optical Zoom Pill (1x - 10x) */}
          <div className="absolute bottom-16 sm:bottom-6 left-3 sm:left-6 z-20 flex items-center space-x-2 sm:space-x-3 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-obsidian/90 backdrop-blur-md border border-grey-700/80 shadow-lg text-xs">
            <span className="text-[10px] sm:text-xs text-grey-400 font-medium">Zoom</span>
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.5)}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-grey-800 text-alabaster hover:bg-gold hover:text-ink text-xs sm:text-sm font-bold flex items-center justify-center transition-colors"
              aria-label="Decrease zoom"
            >
              −
            </button>
            <input
              type="range"
              min="1.0"
              max="10.0"
              step="0.1"
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="w-20 sm:w-28 accent-gold cursor-pointer"
              aria-label="Microscopic Optical Zoom Slider"
              data-testid="zoom-slider"
            />
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.5)}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-grey-800 text-alabaster hover:bg-gold hover:text-ink text-xs sm:text-sm font-bold flex items-center justify-center transition-colors"
              aria-label="Increase zoom"
            >
              +
            </button>
            <span className="font-mono text-[10px] sm:text-xs text-gold font-semibold w-9 sm:w-12 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>

          {/* Interactive Directional Lighting Bar (0..360° & Pitch) */}
          <div className="absolute bottom-3 sm:bottom-6 right-3 sm:right-6 z-20 flex items-center space-x-2 sm:space-x-4 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-obsidian/90 backdrop-blur-md border border-grey-700/80 shadow-lg text-[10px] sm:text-xs">
            {/* Azimuth Rotation */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span className="text-grey-400">Angle</span>
              <input
                type="range"
                min="0"
                max="360"
                value={lightState.angleDeg}
                onChange={(e) => handleLightAngleChange(parseInt(e.target.value, 10))}
                className="w-16 sm:w-24 accent-gold cursor-pointer"
                aria-label="Light Azimuth Rotation Slider"
                data-testid="light-angle-slider"
              />
              <span className="font-mono text-gold w-7 sm:w-8 text-right">{lightState.angleDeg}°</span>
            </div>

            {/* Pitch Elevation */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span className="text-grey-400">Pitch</span>
              <input
                type="range"
                min="15"
                max="90"
                value={lightState.pitchDeg}
                onChange={(e) => handleLightPitchChange(parseInt(e.target.value, 10))}
                className="w-14 sm:w-20 accent-gold cursor-pointer"
                aria-label="Light Pitch Elevation Slider"
                data-testid="light-pitch-slider"
              />
              <span className="font-mono text-gold w-7 sm:w-8 text-right">{lightState.pitchDeg}°</span>
            </div>
          </div>
        </div>

        {/* Footer Specification Strip */}
        <div className="px-6 py-3 border-t border-grey-800 bg-obsidian/90 flex flex-wrap items-center justify-between text-[11px] font-mono text-grey-400">
          <div className="flex items-center space-x-4">
            <span>SKU: <strong className="text-alabaster">{fabricId}</strong></span>
            <span>·</span>
            <span>Weave: <strong className="text-alabaster">{weaveType || 'Authentic Interlace'}</strong></span>
            <span>·</span>
            <span>Photometric Relief: <strong className="text-gold">Active</strong></span>
          </div>
          <div className="flex items-center space-x-2 text-grey-500">
            <span>Verlet Micro-Ray Projection</span>
            <span>✦</span>
            <span>Subsurface Anisotropic Shader</span>
          </div>
        </div>
      </div>
    </div>
  );
}
