'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FabricCatalogItem } from '../../lib/catalog-types';

interface FabricCardProps {
  fabric: FabricCatalogItem;
  onAddSwatch?: (fabric: FabricCatalogItem) => void;
}

/**
 * Editorial Luxury Fabric Swatch Card
 * Spec Anchor: screens/02-fabric-catalog.md, FEAT-001, C-007
 */
export const FabricCard: React.FC<FabricCardProps> = ({ fabric, onAddSwatch }) => {
  const [swatchAdded, setSwatchAdded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleSwatchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSwatchAdded(true);
    if (onAddSwatch) {
      onAddSwatch(fabric);
    }
    setTimeout(() => setSwatchAdded(false), 2400);
  };

  const isLowStock = fabric.isLowStock || fabric.remainingContinuousYards < 5.0;

  return (
    <div
      className="group relative flex flex-col justify-between overflow-hidden rounded-md border border-grey-300/80 dark:border-grey-700/80 bg-alabaster dark:bg-obsidian transition-all duration-300 hover:border-gold/60 hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`fabric-card-${fabric.id}`}
    >
      <Link href={`/fabric/${fabric.id}`} className="block focus:outline-none focus:ring-2 focus:ring-gold/50 rounded-t-md">
        {/* Tactile Macro Photography Viewport */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-grey-200 dark:bg-grey-800">
          {/* Fallback procedural luxury textile pattern if image url is local asset */}
          <div
            className={`absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out ${
              isHovered ? 'scale-105' : 'scale-100'
            }`}
            style={{
              backgroundImage: `radial-gradient(ellipse at top right, rgba(197,160,89,0.18), transparent 70%), url('${fabric.thumbnailUrl}')`,
              backgroundColor: '#1E2229',
            }}
            aria-label={`${fabric.name} macro weave texture`}
            role="img"
          >
            {/* Macro Weave Raking Light Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian/70 via-transparent to-black/20" />
          </div>

          {/* Top Badges: GSM Pill & Continuous Bolt Status */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
            {/* Certified GSM Pill */}
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-sm text-[11px] font-mono font-semibold tracking-wider bg-alabaster/90 dark:bg-obsidian/90 text-ink dark:text-alabaster backdrop-blur-md shadow-sm border border-grey-300/50 dark:border-grey-700/50"
              data-testid="gsm-badge"
            >
              {fabric.gsm} GSM
            </span>

            {/* Low Stock Warning or Continuous Yardage Badge */}
            {isLowStock ? (
              <span
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-sm text-[11px] font-sans font-semibold uppercase tracking-wider bg-semantic-warning-100 text-semantic-warning-900 border border-semantic-warning-500/40 shadow-sm"
                data-testid="low-stock-badge"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-semantic-warning-500 animate-pulse" />
                <span>Low Stock: {fabric.remainingContinuousYards} yds</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-sm text-[11px] font-sans font-medium tracking-wide bg-alabaster/80 dark:bg-obsidian/80 text-grey-700 dark:text-grey-300 backdrop-blur-md border border-grey-300/40 dark:border-grey-700/40"
                data-testid="continuous-yards-badge"
              >
                {fabric.remainingContinuousYards} yds continuous
              </span>
            )}
          </div>

          {/* Visual Hover Deformation / Fluidity Indicator */}
          <div className="absolute bottom-2 left-3 text-[10px] uppercase font-mono tracking-widest text-alabaster/80 drop-shadow-md">
            Drape Fluidity: {Math.round(fabric.drapeCoefficient * 100)}%
          </div>
        </div>

        {/* Textile Editorial Metadata */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-grey-600 dark:text-grey-400 uppercase tracking-widest font-sans">
              <span className="truncate">{fabric.millName}</span>
              <span className="font-mono text-[11px] font-semibold text-gold ml-2">
                {fabric.countryOfOrigin}
              </span>
            </div>

            <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-ink dark:text-alabaster group-hover:text-gold transition-colors duration-200">
              {fabric.name}
            </h3>

            <p className="mt-1 text-xs text-grey-600 dark:text-grey-400 line-clamp-1">
              {fabric.fiberBreakdown}
            </p>
          </div>

          {/* Pricing & Physical Roll Dimensions */}
          <div className="pt-3 border-t border-grey-300/50 dark:border-grey-700/50 flex items-baseline justify-between">
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-ink dark:text-alabaster">
                ${fabric.pricePerYard}
              </span>
              <span className="text-xs text-grey-600 dark:text-grey-400 font-sans ml-1">
                / yard
              </span>
            </div>
            <div className="text-[11px] font-mono text-grey-600 dark:text-grey-400">
              {fabric.widthInches}&quot; bolt width
            </div>
          </div>
        </div>
      </Link>

      {/* Action Footer: Order Swatch Box */}
      <div className="px-5 pb-5 pt-0">
        <button
          type="button"
          onClick={handleSwatchClick}
          className={`w-full py-2.5 px-3 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-200 flex items-center justify-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-gold/50 ${
            swatchAdded
              ? 'bg-semantic-success-500 text-alabaster'
              : 'border border-grey-300 dark:border-grey-700 text-ink dark:text-alabaster hover:border-gold hover:text-gold bg-grey-50 dark:bg-grey-900/40'
          }`}
          aria-label={`Add swatch box for ${fabric.name} ($25)`}
          data-testid={`add-swatch-btn-${fabric.id}`}
        >
          {swatchAdded ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>Swatch Added ($25)</span>
            </>
          ) : (
            <>
              <span>+ Order Swatch ($25)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
