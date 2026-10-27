'use client';

import React from 'react';
import { FabricDetail } from '../../lib/catalog-types';

interface SensoryProfileRadarProps {
  fabric: FabricDetail;
}

/**
 * Editorial Sensory Profile Radar & Physical Metrics Dossier
 * Spec Anchor: screens/03-fabric-detail-view.md, FEAT-001, C-008
 */
export const SensoryProfileRadar: React.FC<SensoryProfileRadarProps> = ({ fabric }) => {
  // Normalize parameters to 0..1 scale for the 5-point radar polygon:
  // 1. Drape Fluidity (0..1)
  const drapeNorm = Math.min(1, Math.max(0, fabric.drapeCoefficient));
  // 2. Structural Stiffness (0..10 -> 0..1)
  const stiffnessNorm = Math.min(1, Math.max(0, fabric.stiffnessRating / 10));
  // 3. Weight / GSM (50..600 -> 0..1)
  const gsmNorm = Math.min(1, Math.max(0, (fabric.gsm - 50) / 550));
  // 4. Elastic Stretch (0..20% -> 0..1)
  const stretchNorm = Math.min(1, Math.max(0, fabric.stretchPercentage / 15));
  // 5. Opacity (1 - transparency)
  const opacityNorm = Math.min(1, Math.max(0, 1 - fabric.transparencyRating));

  // Compute 5 polygon vertices in SVG coordinate space (center 120, 120; radius 90)
  const center = 120;
  const radius = 80;
  const metrics = [
    { label: 'Fluidity', val: drapeNorm },
    { label: 'Stiffness', val: stiffnessNorm },
    { label: 'Weight', val: gsmNorm },
    { label: 'Elasticity', val: stretchNorm },
    { label: 'Opacity', val: opacityNorm },
  ];

  const points = metrics
    .map((m, idx) => {
      const angle = (Math.PI * 2 * idx) / metrics.length - Math.PI / 2;
      const r = radius * Math.max(0.15, m.val);
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const gridCircles = [0.25, 0.5, 0.75, 1.0];

  return (
    <div
      className="rounded-md border border-grey-300/80 dark:border-grey-700/80 bg-alabaster dark:bg-obsidian p-6 space-y-6"
      data-testid="sensory-profile-radar"
    >
      <div className="flex items-center justify-between border-b border-grey-300/50 dark:border-grey-700/50 pb-3">
        <h3 className="font-display text-base font-semibold tracking-wide text-ink dark:text-alabaster uppercase">
          Sensory & Physical Profile
        </h3>
        <span className="font-mono text-xs text-gold font-semibold tracking-wider uppercase">
          Verified Mill Spec
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
        {/* SVG Radar Chart */}
        <div className="sm:col-span-6 flex justify-center">
          <div className="relative w-60 h-60">
            <svg
              viewBox="0 0 240 240"
              className="w-full h-full overflow-visible"
              aria-label="Sensory Profile Radar Chart"
              role="img"
            >
              {/* Background Concentric Grid Circles */}
              {gridCircles.map((factor, i) => (
                <polygon
                  key={`grid-${i}`}
                  points={metrics
                    .map((_, idx) => {
                      const angle = (Math.PI * 2 * idx) / metrics.length - Math.PI / 2;
                      const r = radius * factor;
                      const x = center + r * Math.cos(angle);
                      const y = center + r * Math.sin(angle);
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={factor < 1 ? '3 3' : undefined}
                  className="text-grey-300/70 dark:text-grey-700/70"
                  strokeWidth="1"
                />
              ))}

              {/* Axis lines */}
              {metrics.map((_, idx) => {
                const angle = (Math.PI * 2 * idx) / metrics.length - Math.PI / 2;
                const x = center + radius * Math.cos(angle);
                const y = center + radius * Math.sin(angle);
                return (
                  <line
                    key={`axis-${idx}`}
                    x1={center}
                    y1={center}
                    x2={x}
                    y2={y}
                    stroke="currentColor"
                    className="text-grey-300/60 dark:text-grey-700/60"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Plotted Textile Radar Shape */}
              <polygon
                points={points}
                className="fill-gold/25 stroke-gold"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />

              {/* Plotted Vertex Dots */}
              {metrics.map((m, idx) => {
                const angle = (Math.PI * 2 * idx) / metrics.length - Math.PI / 2;
                const r = radius * Math.max(0.15, m.val);
                const x = center + r * Math.cos(angle);
                const y = center + r * Math.sin(angle);
                return (
                  <circle
                    key={`dot-${idx}`}
                    cx={x}
                    cy={y}
                    r="3.5"
                    className="fill-gold stroke-alabaster dark:stroke-obsidian"
                    strokeWidth="1.5"
                  />
                );
              })}

              {/* Axis Labels */}
              {metrics.map((m, idx) => {
                const angle = (Math.PI * 2 * idx) / metrics.length - Math.PI / 2;
                const labelR = radius + 18;
                const x = center + labelR * Math.cos(angle);
                const y = center + labelR * Math.sin(angle);
                return (
                  <text
                    key={`label-${idx}`}
                    x={x}
                    y={y + 3}
                    textAnchor="middle"
                    className="fill-grey-600 dark:fill-grey-400 text-[10px] font-sans font-semibold tracking-wider uppercase"
                  >
                    {m.label}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Sensory Numeric Readouts */}
        <div className="sm:col-span-6 space-y-3 font-sans text-xs">
          <div className="flex items-center justify-between p-2 rounded bg-grey-100/70 dark:bg-grey-800/40">
            <span className="text-grey-600 dark:text-grey-400 font-medium">Drape Fluidity</span>
            <span className="font-mono font-bold text-ink dark:text-alabaster" data-testid="fluidity-value">
              {Math.round(fabric.drapeCoefficient * 100)}% (
              {fabric.drapeCoefficient > 0.65 ? 'Liquid' : fabric.drapeCoefficient > 0.45 ? 'Cascading' : 'Architectural'}
              )
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-grey-100/70 dark:bg-grey-800/40">
            <span className="text-grey-600 dark:text-grey-400 font-medium">Bending Stiffness</span>
            <span className="font-mono font-bold text-ink dark:text-alabaster" data-testid="stiffness-value">
              {fabric.stiffnessRating.toFixed(1)} / 10.0
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-grey-100/70 dark:bg-grey-800/40">
            <span className="text-grey-600 dark:text-grey-400 font-medium">Certified Weight</span>
            <span className="font-mono font-bold text-ink dark:text-alabaster" data-testid="certified-gsm-value">
              {fabric.gsm} GSM ({Math.round(fabric.gsm * 0.0295 * 10) / 10} oz/yd²)
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-grey-100/70 dark:bg-grey-800/40">
            <span className="text-grey-600 dark:text-grey-400 font-medium">Usable Roll Width</span>
            <span className="font-mono font-bold text-ink dark:text-alabaster" data-testid="roll-width-value">
              {fabric.widthInches}&quot; ({Math.round(fabric.widthInches * 2.54)} cm)
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-grey-100/70 dark:bg-grey-800/40">
            <span className="text-grey-600 dark:text-grey-400 font-medium">Tensile / Tear Strength</span>
            <span className="font-mono font-semibold text-ink dark:text-alabaster" data-testid="tear-resistance-value">
              {fabric.tearResistance || '45 N warp / 42 N weft'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-grey-100/70 dark:bg-grey-800/40">
            <span className="text-grey-600 dark:text-grey-400 font-medium">Mechanical Stretch</span>
            <span className="font-mono font-semibold text-ink dark:text-alabaster">
              {fabric.stretchPercentage}% warp / weft
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
