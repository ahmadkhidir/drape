'use client';

/**
 * Interactive Before/After Split Slider & High-Resolution Fitting Viewer
 * Spec Anchors: Screen 05, FEAT-004, NFR-030
 */

import React, { useState, useRef, useCallback } from 'react';

interface BeforeAfterSliderProps {
  beforeImageUrl?: string | null;
  afterImageUrl: string;
  fabricName?: string;
  silhouetteName?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImageUrl,
  afterImageUrl,
  fabricName = 'Como Silk Brocade',
  silhouetteName = 'Corseted Mermaid Gown',
}) => {
  const [sliderPosition, setSliderPosition] = useState(50); // 0 to 100%
  const [isDragging, setIsDragging] = useState(false);
  const [lightingMode, setLightingMode] = useState<'daylight' | 'gala'>('daylight');
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Fallback before image: editorial raw textile bolt or customer baseline
  const effectiveBeforeImage =
    beforeImageUrl ||
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><rect width="100%" height="100%" fill="%231c1f26"/><pattern id="weave" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 20 L40 20 M20 0 L20 40" stroke="%23c5a059" stroke-width="0.8" opacity="0.3"/></pattern><rect width="100%" height="100%" fill="url(%23weave)"/><text x="50%" y="45%" text-anchor="middle" fill="%23fbf9f5" font-family="serif" font-size="28">RAW FABRIC BOLT</text><text x="50%" y="52%" text-anchor="middle" fill="%23c5a059" font-family="sans-serif" font-size="16" letter-spacing="3">100% ITALIAN SILK</text></svg>';

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedX = Math.max(0, Math.min(x, rect.width));
    const percent = (clampedX / rect.width) * 100;
    setSliderPosition(percent);
  }, []);

  const handlePointerDown = () => {
    setIsDragging(true);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
      const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomOrigin({
        x: Math.max(0, Math.min(xPercent, 100)),
        y: Math.max(0, Math.min(yPercent, 100)),
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSliderPosition((prev) => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight') {
      setSliderPosition((prev) => Math.min(100, prev + 5));
    }
  };

  return (
    <div className="space-y-4">
      {/* Editorial Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold uppercase tracking-wider text-grey-500 font-sans">
            Lighting:
          </span>
          <div className="inline-flex rounded-md border border-grey-300 dark:border-grey-700 p-0.5 bg-alabaster dark:bg-obsidian">
            <button
              type="button"
              onClick={() => setLightingMode('daylight')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                lightingMode === 'daylight'
                  ? 'bg-ink text-alabaster dark:bg-alabaster dark:text-ink'
                  : 'text-grey-600 dark:text-grey-400 hover:text-gold'
              }`}
            >
              Studio Daylight (5500K)
            </button>
            <button
              type="button"
              onClick={() => setLightingMode('gala')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                lightingMode === 'gala'
                  ? 'bg-ink text-alabaster dark:bg-alabaster dark:text-ink'
                  : 'text-grey-600 dark:text-grey-400 hover:text-gold'
              }`}
            >
              Evening Gala (2700K)
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsZoomed(!isZoomed)}
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded border text-xs font-medium transition-colors ${
              isZoomed
                ? 'border-gold text-gold bg-accent-100 dark:bg-accent-900/40'
                : 'border-grey-300 dark:border-grey-700 text-grey-600 dark:text-grey-400 hover:text-ink dark:hover:text-alabaster'
            }`}
          >
            <span>{isZoomed ? 'Zoom 2x (Active)' : 'Zoom Lens'}</span>
          </button>
        </div>
      </div>

      {/* Split Comparison Canvas Viewport */}
      <div
        ref={containerRef}
        tabIndex={0}
        role="slider"
        aria-label="Before and After Drape Comparison Slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(sliderPosition)}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        className={`relative w-full aspect-[3/4] max-h-[720px] rounded-lg overflow-hidden select-none cursor-ew-resize border border-grey-300 dark:border-grey-700 bg-obsidian shadow-lg focus:outline-none focus:ring-2 focus:ring-gold ${
          lightingMode === 'gala' ? 'brightness-95 sepia-[0.18]' : ''
        }`}
      >
        {/* Layer 1: "After" Draped Composite Garment (Full Viewport) */}
        <div
          className="absolute inset-0 w-full h-full transition-transform duration-100 ease-out"
          style={{
            transform: isZoomed ? 'scale(2.0)' : 'scale(1.0)',
            transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
          }}
        >
          <img
            src={afterImageUrl}
            alt={`Neural Draped ${silhouetteName} in ${fabricName}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 right-4 bg-obsidian/75 backdrop-blur-sm px-3 py-1 rounded text-[11px] font-mono uppercase tracking-wider text-gold border border-gold/40">
            Draped: {silhouetteName}
          </div>
        </div>

        {/* Layer 2: "Before" Raw Textile / Subject (Clipped by slider position) */}
        <div
          className="absolute inset-0 h-full overflow-hidden transition-transform duration-100 ease-out"
          style={{
            width: `${sliderPosition}%`,
            transform: isZoomed ? 'scale(2.0)' : 'scale(1.0)',
            transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
          }}
        >
          <div
            className="relative h-full"
            style={{
              width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
            }}
          >
            <img
              src={effectiveBeforeImage}
              alt="Raw Fabric Bolt and Baseline"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-obsidian/75 backdrop-blur-sm px-3 py-1 rounded text-[11px] font-mono uppercase tracking-wider text-alabaster border border-grey-600">
              Raw Bolt: {fabricName}
            </div>
          </div>
        </div>

        {/* Divider Line & Handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-alabaster shadow-[0_0_8px_rgba(0,0,0,0.8)] z-20 pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-9 w-9 rounded-full bg-alabaster text-ink border-2 border-gold flex items-center justify-center shadow-xl text-xs font-bold pointer-events-auto cursor-ew-resize">
            ⇄
          </div>
        </div>
      </div>

      {/* Caption helper */}
      <div className="flex justify-between text-[11px] text-grey-500 font-sans px-1">
        <span>← Drag left to reveal bespoke draped dress</span>
        <span>Drag right to compare raw textile bolt →</span>
      </div>
    </div>
  );
};
