'use client';

import React, { useState, useEffect, useId } from 'react';
import {
  YardageCalculationRequest,
  YardageCalculationResponse,
  StandardSize,
} from '../../lib/checkoutTypes';
import { calculateYardage, snapToEighthYard } from '../../lib/checkoutApi';

export interface YardageCalculatorWidgetProps {
  fabricId?: string;
  fabricName?: string;
  initialSilhouetteId?: string;
  initialBoltWidthInches?: number;
  initialHeightCm?: number;
  remainingBoltYards?: number;
  isDirectionalNap?: boolean;
  onApplyYardage?: (yards: number, calculation: YardageCalculationResponse) => void;
  className?: string;
}

const SILHOUETTE_OPTIONS = [
  { id: 'corseted_mermaid', name: 'Floor-Length Mermaid Gown', description: 'Flared trumpet silhouette with corseted bodice' },
  { id: 'grecian_bias_gown', name: 'Grecian Bias Drape Gown', description: '45° true-bias fluid drape with cowl back' },
  { id: 'architectural_tuxedo', name: 'Architectural Tuxedo', description: 'Structured jacket canvas & pleated trousers' },
  { id: 'ballgown_offshoulder', name: 'Off-Shoulder Grand Ballgown', description: 'Full tiered voluminous skirt with gathering' },
  { id: 'cocktail_sheath', name: 'Knee-Length Cocktail Sheath', description: 'Classic tailored pencil silhouette' },
];

const STANDARD_SIZES: StandardSize[] = [
  'US_0', 'US_2', 'US_4', 'US_6', 'US_8', 'US_10', 'US_12',
  'US_14', 'US_16', 'US_18', 'US_20', 'US_22', 'US_24',
];

/**
 * Format decimal yards to mixed fractional notation (e.g. 4.250 -> 4 1/4 yds)
 */
export function formatFractionalYards(yards: number): string {
  const whole = Math.floor(yards);
  const remainder = Number((yards - whole).toFixed(3));

  let fraction = '';
  if (Math.abs(remainder - 0.125) < 0.01) fraction = '1/8';
  else if (Math.abs(remainder - 0.25) < 0.01) fraction = '1/4';
  else if (Math.abs(remainder - 0.375) < 0.01) fraction = '3/8';
  else if (Math.abs(remainder - 0.5) < 0.01) fraction = '1/2';
  else if (Math.abs(remainder - 0.625) < 0.01) fraction = '5/8';
  else if (Math.abs(remainder - 0.75) < 0.01) fraction = '3/4';
  else if (Math.abs(remainder - 0.875) < 0.01) fraction = '7/8';

  if (!fraction) {
    return `${yards.toFixed(3)} yds`;
  }
  return whole > 0 ? `${whole} ${fraction} yds (${yards.toFixed(3)} yd)` : `${fraction} yds (${yards.toFixed(3)} yd)`;
}

export const YardageCalculatorWidget: React.FC<YardageCalculatorWidgetProps> = ({
  fabricId = 'FAB-SLK-892',
  fabricName = 'Imperial Emerald Silk Brocade',
  initialSilhouetteId = 'corseted_mermaid',
  initialBoltWidthInches = 54,
  initialHeightCm = 172,
  remainingBoltYards = 18.5,
  isDirectionalNap = false,
  onApplyYardage,
  className = '',
}) => {
  const idPrefix = useId();
  const [silhouetteId, setSilhouetteId] = useState(initialSilhouetteId);
  const [boltWidthInches, setBoltWidthInches] = useState(initialBoltWidthInches);
  const [heightCm, setHeightCm] = useState<number>(initialHeightCm);
  const [useCustomMeasurements, setUseCustomMeasurements] = useState(false);
  const [standardSize, setStandardSize] = useState<StandardSize>('US_6');

  // Custom anatomical inputs
  const [bustCm, setBustCm] = useState<number>(90);
  const [waistCm, setWaistCm] = useState<number>(72);
  const [hipCm, setHipCm] = useState<number>(98);
  const [trainInches, setTrainInches] = useState<number>(0);

  // Live calculation result state
  const [calculation, setCalculation] = useState<YardageCalculationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeYardage, setActiveYardage] = useState<number>(4.25);

  // Recalculate on any parameter change (C-016)
  useEffect(() => {
    let isCancelled = false;
    const req: YardageCalculationRequest = {
      silhouetteId,
      fabricId,
      heightCm,
      boltWidthInches,
      customTrainLengthInches: trainInches > 0 ? trainInches : undefined,
      ...(useCustomMeasurements
        ? {
            bustCircumferenceCm: bustCm,
            waistCircumferenceCm: waistCm,
            hipCircumferenceCm: hipCm,
          }
        : { standardSize }),
    };

    setIsLoading(true);
    calculateYardage(req)
      .then((res) => {
        if (!isCancelled) {
          setCalculation(res);
          setActiveYardage(res.recommendedYards);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    silhouetteId,
    fabricId,
    heightCm,
    boltWidthInches,
    trainInches,
    useCustomMeasurements,
    bustCm,
    waistCm,
    hipCm,
    standardSize,
  ]);

  // Stepper handlers enforcing 0.125 increments
  const handleStepYardage = (delta: number) => {
    setActiveYardage((prev) => {
      const next = Math.max(0.125, snapToEighthYard(prev + delta));
      return next;
    });
  };

  const handleManualYardageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      setActiveYardage(snapToEighthYard(val));
    }
  };

  return (
    <div
      className={`rounded-lg border border-grey-200 bg-white p-6 shadow-md transition-all ${className}`}
      aria-labelledby={`${idPrefix}-calculator-title`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-grey-100 gap-2">
        <div>
          <span className="text-xs uppercase tracking-widest text-accent-700 font-semibold font-mono">
            FEAT-007 • Algorithmic Cutting Estimator
          </span>
          <h3 id={`${idPrefix}-calculator-title`} className="text-xl font-display text-primary-900 font-medium">
            Yardage & Cutting Layout Calculator
          </h3>
          <p className="text-xs text-grey-600 mt-0.5">
            Precision 1/8th-yard tailoring estimate calibrated to bolt grain & silhouette geometry.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 bg-surface-secondary text-grey-700 rounded-sm font-mono border border-grey-200">
            Active Bolt: {calculation?.activeBoltId || 'bolt_901'}
          </span>
          {calculation?.isDirectionalNap && (
            <span className="text-xs px-2 py-1 bg-amber-50 text-amber-800 rounded-sm font-medium border border-amber-200">
              One-Way Nap Required
            </span>
          )}
        </div>
      </div>

      {/* Grid Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Left Column: Silhouettes & Measurements */}
        <div className="space-y-4">
          {/* Silhouette Selection */}
          <div>
            <label htmlFor={`${idPrefix}-silhouette`} className="block text-xs font-semibold uppercase tracking-wider text-grey-700 mb-1">
              Garment Silhouette
            </label>
            <select
              id={`${idPrefix}-silhouette`}
              value={silhouetteId}
              onChange={(e) => setSilhouetteId(e.target.value)}
              className="w-full text-sm rounded-md border border-grey-300 bg-white px-3 py-2 text-primary-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              {SILHOUETTE_OPTIONS.map((sil) => (
                <option key={sil.id} value={sil.id}>
                  {sil.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bolt Width */}
          <div>
            <label htmlFor={`${idPrefix}-bolt-width`} className="block text-xs font-semibold uppercase tracking-wider text-grey-700 mb-1">
              Warehouse Bolt Width
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[45, 54, 60].map((width) => (
                <button
                  type="button"
                  key={width}
                  onClick={() => setBoltWidthInches(width)}
                  className={`py-2 text-xs font-medium rounded-md border transition-all ${
                    boltWidthInches === width
                      ? 'border-accent-500 bg-accent-100 text-accent-900 font-semibold'
                      : 'border-grey-200 bg-white text-grey-700 hover:bg-grey-50'
                  }`}
                >
                  {width}&quot; Wide
                </button>
              ))}
            </div>
          </div>

          {/* Sizing Mode Switcher */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-grey-700">
                Measurement Protocol
              </span>
              <button
                type="button"
                onClick={() => setUseCustomMeasurements(!useCustomMeasurements)}
                className="text-xs text-accent-700 hover:text-accent-900 underline font-medium"
              >
                {useCustomMeasurements ? 'Switch to Standard Sizing' : 'Enter Custom Measurements'}
              </button>
            </div>

            {useCustomMeasurements ? (
              <div className="grid grid-cols-2 gap-3 p-3 bg-surface rounded-md border border-grey-200">
                <div>
                  <label htmlFor={`${idPrefix}-height`} className="block text-[11px] text-grey-600 mb-1">
                    Height (cm)
                  </label>
                  <input
                    id={`${idPrefix}-height`}
                    type="number"
                    min="120"
                    max="220"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="w-full text-xs rounded border border-grey-300 px-2.5 py-1.5 focus:ring-1 focus:ring-accent-500"
                  />
                </div>
                <div>
                  <label htmlFor={`${idPrefix}-bust`} className="block text-[11px] text-grey-600 mb-1">
                    Bust Circumference (cm)
                  </label>
                  <input
                    id={`${idPrefix}-bust`}
                    type="number"
                    min="60"
                    max="180"
                    value={bustCm}
                    onChange={(e) => setBustCm(Number(e.target.value))}
                    className="w-full text-xs rounded border border-grey-300 px-2.5 py-1.5 focus:ring-1 focus:ring-accent-500"
                  />
                </div>
                <div>
                  <label htmlFor={`${idPrefix}-waist`} className="block text-[11px] text-grey-600 mb-1">
                    Waist Circumference (cm)
                  </label>
                  <input
                    id={`${idPrefix}-waist`}
                    type="number"
                    min="50"
                    max="160"
                    value={waistCm}
                    onChange={(e) => setWaistCm(Number(e.target.value))}
                    className="w-full text-xs rounded border border-grey-300 px-2.5 py-1.5 focus:ring-1 focus:ring-accent-500"
                  />
                </div>
                <div>
                  <label htmlFor={`${idPrefix}-hips`} className="block text-[11px] text-grey-600 mb-1">
                    Hip Circumference (cm)
                  </label>
                  <input
                    id={`${idPrefix}-hips`}
                    type="number"
                    min="70"
                    max="190"
                    value={hipCm}
                    onChange={(e) => setHipCm(Number(e.target.value))}
                    className="w-full text-xs rounded border border-grey-300 px-2.5 py-1.5 focus:ring-1 focus:ring-accent-500"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-surface rounded-md border border-grey-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor={`${idPrefix}-standard-size`} className="text-xs text-grey-700">
                    Standard Couture Size
                  </label>
                  <select
                    id={`${idPrefix}-standard-size`}
                    value={standardSize}
                    onChange={(e) => setStandardSize(e.target.value as StandardSize)}
                    className="text-xs rounded border border-grey-300 px-2.5 py-1.5 bg-white font-mono"
                  >
                    {STANDARD_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor={`${idPrefix}-height-std`} className="text-xs text-grey-700">
                    Height (cm)
                  </label>
                  <input
                    id={`${idPrefix}-height-std`}
                    type="number"
                    min="120"
                    max="220"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="w-24 text-xs rounded border border-grey-300 px-2 py-1 text-right font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Custom Train Length */}
          <div>
            <label htmlFor={`${idPrefix}-train`} className="block text-xs font-semibold uppercase tracking-wider text-grey-700 mb-1">
              Cathedral Train Extension (Inches)
            </label>
            <div className="flex items-center gap-3">
              <input
                id={`${idPrefix}-train`}
                type="range"
                min="0"
                max="72"
                step="6"
                value={trainInches}
                onChange={(e) => setTrainInches(Number(e.target.value))}
                className="w-full accent-accent-500 cursor-pointer"
              />
              <span className="text-xs font-mono w-14 text-right text-grey-800">
                {trainInches}&quot;
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Cutting Layout SVG & Yield Breakdown */}
        <div className="flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-grey-700">
                Cutting Marker Diagram (Interactive Nest)
              </span>
              <span className="text-[11px] text-grey-500 font-mono">
                Bolt Width: {boltWidthInches}&quot;
              </span>
            </div>

            {/* SVG Visualizer Canvas */}
            <div className="relative w-full h-48 rounded-md border border-grey-300 bg-surface overflow-hidden p-2 flex items-center justify-center">
              <svg
                viewBox="0 0 320 180"
                className="w-full h-full"
                aria-label="Fabric cutting layout diagram showing nested pattern pieces and grainlines"
              >
                {/* Bolt Selvage Boundaries */}
                <rect
                  x="5"
                  y="5"
                  width="310"
                  height="170"
                  fill="#F6F4F0"
                  stroke="#C9D0DD"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                {/* Selvage edge labels */}
                <text x="10" y="16" fill="#8C867D" fontSize="8" fontFamily="monospace">
                  Top Selvage Edge (Grainline 0°)
                </text>
                <text x="10" y="170" fill="#8C867D" fontSize="8" fontFamily="monospace">
                  Bottom Selvage Edge ({boltWidthInches}&quot;)
                </text>

                {/* Render Cutting Pattern Panels */}
                {calculation?.cuttingLayout.panels.map((panel, idx) => {
                  const colors = ['#C5A059', '#3A414F', '#4F596C', '#707C94'];
                  const panelColor = colors[idx % colors.length];
                  const x = panel.x ?? 15 + idx * 72;
                  const y = panel.y ?? 24 + (idx % 2) * 45;
                  const w = Math.min(65, Math.max(40, panel.widthInches * 0.9));
                  const h = Math.min(70, Math.max(35, panel.lengthYards * 45));

                  return (
                    <g key={idx} className="cursor-pointer group">
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        rx="3"
                        fill={panelColor}
                        fillOpacity="0.15"
                        stroke={panelColor}
                        strokeWidth="1.2"
                      />
                      {/* Grainline Marker line with arrows */}
                      <line
                        x1={x + w / 2}
                        y1={y + 6}
                        x2={x + w / 2}
                        y2={y + h - 6}
                        stroke={panelColor}
                        strokeWidth="1"
                        strokeDasharray={panel.grainlineAngleDegrees > 0 ? '3 3' : 'none'}
                        transform={
                          panel.grainlineAngleDegrees > 0
                            ? `rotate(${panel.grainlineAngleDegrees} ${x + w / 2} ${y + h / 2})`
                            : undefined
                        }
                      />
                      <polygon
                        points={`${x + w / 2 - 3},${y + 10} ${x + w / 2 + 3},${y + 10} ${x + w / 2},${y + 6}`}
                        fill={panelColor}
                      />
                      <polygon
                        points={`${x + w / 2 - 3},${y + h - 10} ${x + w / 2 + 3},${y + h - 10} ${x + w / 2},${y + h - 6}`}
                        fill={panelColor}
                      />
                      {/* Label */}
                      <text
                        x={x + 4}
                        y={y + 14}
                        fill="#111318"
                        fontSize="7"
                        fontWeight="600"
                        fontFamily="sans-serif"
                      >
                        {panel.name.length > 12 ? panel.name.slice(0, 11) + '..' : panel.name}
                      </text>
                      <text
                        x={x + 4}
                        y={y + 23}
                        fill="#635F59"
                        fontSize="6"
                        fontFamily="monospace"
                      >
                        {panel.grainlineAngleDegrees}° grain
                      </text>
                    </g>
                  );
                })}

                {/* Cutting Boundary Marker */}
                <line x1="280" y1="5" x2="280" y2="175" stroke="#C5A059" strokeWidth="1.5" strokeDasharray="5 3" />
                <text x="272" y="95" fill="#8C7136" fontSize="7" fontFamily="monospace" transform="rotate(-90 272 95)">
                  Continuous Cut Boundary
                </text>
              </svg>

              {isLoading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex items-center justify-center">
                  <span className="text-xs font-mono text-grey-800 animate-pulse">Calculating layout...</span>
                </div>
              )}
            </div>

            {/* Split Bolt Warning Banner */}
            {calculation?.isSplitBoltWarning && (
              <div className="mt-2 p-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <span className="font-bold text-amber-700">⚠️ Split-Bolt Alert:</span>
                <span>
                  Recommended cut ({activeYardage} yds) exceeds current continuous bolt length (
                  {calculation.remainingContinuousYardsOnBolt} yds). Accept a split cut or switch to sister roll.
                </span>
              </div>
            )}
          </div>

          {/* Stepper & Action Card */}
          <div className="bg-surface p-4 rounded-md border border-grey-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-grey-600 block">
                  Recommended Continuous Cut
                </span>
                <span className="text-lg font-display font-semibold text-primary-900">
                  {formatFractionalYards(activeYardage)}
                </span>
                <div className="text-[11px] text-grey-500 mt-0.5">
                  Includes {calculation?.safetyMarginYards ?? 0.375} yd safety margin for atelier fitting
                </div>
              </div>

              {/* 1/8th-Yard Precision Fractional Stepper */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-md border border-grey-300 shadow-xs">
                <button
                  type="button"
                  aria-label="Decrease yardage by 1/8 yard"
                  onClick={() => handleStepYardage(-0.125)}
                  disabled={activeYardage <= 0.125}
                  className="w-8 h-8 flex items-center justify-center rounded text-grey-700 hover:bg-grey-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                >
                  −
                </button>
                <input
                  type="number"
                  step="0.125"
                  min="0.125"
                  value={activeYardage}
                  onChange={handleManualYardageChange}
                  className="w-16 text-center text-xs font-mono font-medium text-primary-900 focus:outline-none"
                  aria-label="Precision fractional cut length in yards"
                />
                <button
                  type="button"
                  aria-label="Increase yardage by 1/8 yard"
                  onClick={() => handleStepYardage(0.125)}
                  className="w-8 h-8 flex items-center justify-center rounded text-grey-700 hover:bg-grey-100 font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Apply Button */}
            {onApplyYardage && calculation && (
              <button
                type="button"
                onClick={() => onApplyYardage(activeYardage, { ...calculation, recommendedYards: activeYardage })}
                className="w-full mt-3 py-2 px-4 rounded-md bg-primary-900 text-alabaster text-xs uppercase tracking-widest font-semibold hover:bg-primary-800 transition-colors shadow-xs"
              >
                Apply {formatFractionalYards(activeYardage)} to Order
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default YardageCalculatorWidget;
