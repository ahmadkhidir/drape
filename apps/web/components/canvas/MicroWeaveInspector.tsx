'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DirectionalLightState } from './types';

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
}

export function MicroWeaveInspector({
  fabricId = 'FAB-SLK-892',
  fabricName = 'Emerald Architectural Silk Brocade',
  millName = 'Tessitura di Como',
  fiberBreakdown = '85% Mulberry Silk, 15% Metallic Lurex',
  threadCount = '420 TPI (240 Warp / 180 Weft)',
  gsm = 280,
  isOpen,
  onClose,
  microWeaveTileBaseUrl = `/api/v1/fabrics/FAB-SLK-892/micro-weave/tiles`,
  maxTileZoomLevel = 5,
}: MicroWeaveInspectorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Optical Zoom state (1.0x to 10.0x / 100% to 1000% per FEAT-003)
  const [zoom, setZoom] = useState<number>(2.5);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const lastPanStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Directional Lighting state
  const [lightState, setLightState] = useState<DirectionalLightState>({
    angleDeg: 45, // Azimuth 0..360
    pitchDeg: 35, // Pitch 15..90
    intensity: 1.3,
    specularPower: 48,
  });

  const [isLoadingTiles, setIsLoadingTiles] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>('Micro-weave optical viewport ready.');

  // Tile cache for C-010 deep-zoom pyramidal tiles
  const tileCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

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
   * Renders the microscopic weave structure, thread relief, and dynamic lighting.
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

    // 1. Draw Warp Yarns (Vertical yarns)
    for (let x = Math.floor(startX / yarnStep) * yarnStep; x <= endX; x += yarnStep) {
      const isLurexMetallic = Math.abs(x % (yarnStep * 4)) === 0; // Metallic thread accents

      // Yarn normal slope across cylinder
      const nx = -0.5;
      const ny = 0.0;
      const nz = 0.866;

      // Dot product for diffuse lighting
      const NdotL = Math.max(0.1, nx * lx + ny * ly + nz * lz);
      // Anisotropic highlight along yarn axis
      const tangentZ = 1.0;
      const TdotL = lz * tangentZ;
      const anisotropicSpecular = Math.pow(Math.max(0, 1 - TdotL * TdotL), lightState.specularPower / 8);

      const baseBrightness = isLurexMetallic ? 220 : 90;
      const r = Math.min(255, Math.floor(baseBrightness * NdotL * lightState.intensity + (isLurexMetallic ? anisotropicSpecular * 180 : anisotropicSpecular * 60)));
      const g = Math.min(255, Math.floor((isLurexMetallic ? baseBrightness * 0.85 : baseBrightness * 1.3) * NdotL * lightState.intensity));
      const b = Math.min(255, Math.floor((isLurexMetallic ? 60 : baseBrightness * 0.9) * NdotL * lightState.intensity));

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, startY, yarnStep * 0.88, endY - startY);

      // Microscopic fiber filigree line
      ctx.strokeStyle = `rgba(255, 255, 255, ${isLurexMetallic ? 0.35 : 0.08})`;
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      ctx.moveTo(x + yarnStep * 0.44, startY);
      ctx.lineTo(x + yarnStep * 0.44, endY);
      ctx.stroke();
    }

    // 2. Draw Weft Yarns (Horizontal yarns interweaving)
    for (let y = Math.floor(startY / yarnStep) * yarnStep; y <= endY; y += yarnStep) {
      const nx = 0.0;
      const ny = -0.6;
      const nz = 0.8;

      const NdotL = Math.max(0.1, nx * lx + ny * ly + nz * lz);
      const tangentX = 1.0;
      const TdotL = lx * tangentX;
      const anisotropicSpecular = Math.pow(Math.max(0, 1 - TdotL * TdotL), lightState.specularPower / 8);

      const r = Math.min(255, Math.floor(25 * NdotL * lightState.intensity + anisotropicSpecular * 40));
      const g = Math.min(255, Math.floor(75 * NdotL * lightState.intensity + anisotropicSpecular * 70));
      const b = Math.min(255, Math.floor(55 * NdotL * lightState.intensity + anisotropicSpecular * 45));

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
      ctx.fillRect(startX, y, endX - startX, yarnStep * 0.85);

      // Weft thread ridge shadow
      ctx.fillStyle = 'rgba(10, 10, 10, 0.45)';
      ctx.fillRect(startX, y + yarnStep * 0.85, endX - startX, yarnStep * 0.15);
    }

    ctx.restore();

    // 3. Draw Virtual Spotlight Indicator Overlay (Top Right HUD)
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
  }, [zoom, panOffset, lightState]);

  // Request tile according to C-010 specification
  useEffect(() => {
    if (!isOpen) return;
    const level = computePyramidLevel(zoom);
    const tileKey = `${fabricId}-${level}-0-0`;

    if (!tileCacheRef.current.has(tileKey)) {
      setIsLoadingTiles(true);
      const img = new Image();
      const tileUrl = `${microWeaveTileBaseUrl}/${level}/0/0`;

      img.onload = () => {
        tileCacheRef.current.set(tileKey, img);
        setIsLoadingTiles(false);
        setLoadError(null);
        drawMicroWeave();
      };
      img.onerror = () => {
        // Fallback to procedural micro-weave rendering
        setIsLoadingTiles(false);
        drawMicroWeave();
      };
      img.src = tileUrl;
    } else {
      drawMicroWeave();
    }
  }, [isOpen, zoom, fabricId, computePyramidLevel, microWeaveTileBaseUrl, drawMicroWeave]);

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
    setStatusAnnouncement(`Optical zoom set to ${clamped}x magnification.`);
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
    setStatusAnnouncement('Viewport reset to standard 2.5x magnification and raking light.');
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
              {fiberBreakdown} · {threadCount} · {gsm} GSM
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
            className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
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
              <span>Streaming C-010 Pyramidal Tiles...</span>
            </div>
          )}

          {loadError && (
            <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded bg-semantic-error-900/80 text-alabaster border border-semantic-error-500 text-xs">
              {loadError}
            </div>
          )}

          {/* Interactive Optical Zoom Pill (1x - 10x) */}
          <div className="absolute bottom-6 left-6 z-20 flex items-center space-x-3 px-4 py-2 rounded-full bg-obsidian/85 backdrop-blur-md border border-grey-700/80 shadow-lg">
            <span className="text-xs text-grey-400 font-medium">Zoom</span>
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.5)}
              className="w-7 h-7 rounded-full bg-grey-800 text-alabaster hover:bg-gold hover:text-ink text-sm font-bold flex items-center justify-center transition-colors"
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
              className="w-28 accent-gold cursor-pointer"
              aria-label="Microscopic Optical Zoom Slider"
              data-testid="zoom-slider"
            />
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.5)}
              className="w-7 h-7 rounded-full bg-grey-800 text-alabaster hover:bg-gold hover:text-ink text-sm font-bold flex items-center justify-center transition-colors"
              aria-label="Increase zoom"
            >
              +
            </button>
            <span className="font-mono text-xs text-gold font-semibold w-12 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>

          {/* Interactive Directional Lighting Bar (0..360° & Pitch) */}
          <div className="absolute bottom-6 right-6 z-20 flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 px-4 py-2 rounded-xl bg-obsidian/85 backdrop-blur-md border border-grey-700/80 shadow-lg text-xs">
            {/* Azimuth Rotation */}
            <div className="flex items-center space-x-2">
              <span className="text-grey-400">Light Angle</span>
              <input
                type="range"
                min="0"
                max="360"
                value={lightState.angleDeg}
                onChange={(e) => handleLightAngleChange(parseInt(e.target.value, 10))}
                className="w-24 accent-gold cursor-pointer"
                aria-label="Light Azimuth Rotation Slider"
                data-testid="light-angle-slider"
              />
              <span className="font-mono text-gold w-8">{lightState.angleDeg}°</span>
            </div>

            {/* Pitch Elevation */}
            <div className="flex items-center space-x-2">
              <span className="text-grey-400">Pitch</span>
              <input
                type="range"
                min="15"
                max="90"
                value={lightState.pitchDeg}
                onChange={(e) => handleLightPitchChange(parseInt(e.target.value, 10))}
                className="w-20 accent-gold cursor-pointer"
                aria-label="Light Pitch Elevation Slider"
                data-testid="light-pitch-slider"
              />
              <span className="font-mono text-gold w-8">{lightState.pitchDeg}°</span>
            </div>
          </div>
        </div>

        {/* Footer Technical Lighting Presets */}
        <div className="px-6 py-3 border-t border-grey-800 bg-obsidian/90 flex flex-wrap items-center justify-between text-xs text-grey-400">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-alabaster uppercase tracking-wider text-[10px]">
              Lighting Presets:
            </span>
            <button
              type="button"
              onClick={() => {
                setLightState({ angleDeg: 30, pitchDeg: 25, intensity: 1.4, specularPower: 48 });
                setStatusAnnouncement('Preset: Raking Grazing Light active.');
              }}
              className="px-2.5 py-1 rounded bg-grey-800 hover:bg-grey-700 text-alabaster transition-colors"
            >
              Raking Light (30°)
            </button>
            <button
              type="button"
              onClick={() => {
                setLightState({ angleDeg: 90, pitchDeg: 80, intensity: 1.2, specularPower: 32 });
                setStatusAnnouncement('Preset: Direct Studio Light active.');
              }}
              className="px-2.5 py-1 rounded bg-grey-800 hover:bg-grey-700 text-alabaster transition-colors"
            >
              Direct Studio (90°)
            </button>
            <button
              type="button"
              onClick={() => {
                setLightState({ angleDeg: 215, pitchDeg: 40, intensity: 1.6, specularPower: 64 });
                setStatusAnnouncement('Preset: Anisotropic Metallic Sheen active.');
              }}
              className="px-2.5 py-1 rounded bg-grey-800 hover:bg-grey-700 text-alabaster transition-colors"
            >
              Metallic Sheen (215°)
            </button>
          </div>

          <div className="mt-2 sm:mt-0 font-mono text-[11px] text-grey-500">
            Tile Resolution: Level {computePyramidLevel(zoom)} / {maxTileZoomLevel} · 256×256 WebP
          </div>
        </div>
      </div>
    </div>
  );
}
