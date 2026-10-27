'use client';

import React from 'react';
import { CatalogFilterState, CatalogFacets } from '../../lib/catalog-types';

interface FilterSidebarProps {
  filters: CatalogFilterState;
  facets?: CatalogFacets;
  onFilterChange: (newFilters: Partial<CatalogFilterState>) => void;
  onResetFilters: () => void;
}

const FIBER_OPTIONS = [
  { value: 'all', label: 'All Fibers' },
  { value: 'silk', label: '100% Silk & Blends' },
  { value: 'wool', label: 'Virgin Worsted Wool' },
  { value: 'linen', label: 'Belgian Raw Linen' },
  { value: 'velvet', label: 'Silk-Rayon Velvet' },
  { value: 'brocade', label: 'Gilded Brocade' },
];

const WEAVE_OPTIONS = [
  { value: 'all', label: 'All Weaves' },
  { value: 'jacquard', label: 'Jacquard' },
  { value: 'satin', label: 'Duchesse Satin' },
  { value: 'crepe', label: 'Crepe' },
  { value: 'twill', label: 'Twill' },
  { value: 'plain', label: 'Plain Weave' },
  { value: 'chiffon', label: 'Chiffon' },
  { value: 'brocade', label: 'Brocade' },
];

const OCCASION_OPTIONS = [
  { value: 'all', label: 'All Occasions' },
  { value: 'gala', label: 'Gala & Black Tie' },
  { value: 'bridal', label: 'Bridal Couture' },
  { value: 'evening', label: 'Evening Cocktail' },
  { value: 'suiting', label: 'Bespoke Suiting' },
  { value: 'daywear', label: 'Daywear Luxury' },
];

/**
 * Editorial Desktop Multi-Faceted Filter Sidebar
 * Spec Anchor: screens/02-fabric-catalog.md, FEAT-001
 */
export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  facets,
  onFilterChange,
  onResetFilters,
}) => {
  const handleMinGsmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (!isNaN(val) && val <= filters.maxGsm) {
      onFilterChange({ minGsm: val, currentPage: 1 });
    }
  };

  const handleMaxGsmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (!isNaN(val) && val >= filters.minGsm) {
      onFilterChange({ maxGsm: val, currentPage: 1 });
    }
  };

  return (
    <aside
      className="w-full space-y-8 pr-4"
      aria-label="Fabric Filter Sidebar"
      data-testid="filter-sidebar"
    >
      {/* Header with Title and Reset */}
      <div className="flex items-center justify-between pb-4 border-b border-grey-300/60 dark:border-grey-700/60">
        <h2 className="font-display text-lg font-semibold tracking-wide text-ink dark:text-alabaster uppercase">
          Filter Textiles
        </h2>
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs font-sans font-medium text-grey-500 hover:text-gold transition-colors focus:outline-none focus:underline"
          data-testid="sidebar-reset-btn"
        >
          Reset All
        </button>
      </div>

      {/* 1. Fiber Composition */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-grey-700 dark:text-grey-300 font-sans">
          Fiber Category
        </h3>
        <div className="space-y-1.5" role="radiogroup" aria-label="Fiber Category">
          {FIBER_OPTIONS.map((opt) => {
            const isSelected =
              (filters.selectedFiber === null && opt.value === 'all') ||
              filters.selectedFiber === opt.value;
            const count =
              opt.value !== 'all' && facets?.fiberCounts
                ? facets.fiberCounts[opt.value]
                : undefined;

            return (
              <label
                key={opt.value}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-ink text-alabaster dark:bg-alabaster dark:text-ink font-semibold shadow-sm'
                    : 'text-grey-700 dark:text-grey-300 hover:bg-grey-200/60 dark:hover:bg-grey-800/60'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <input
                    type="radio"
                    name="fiberCategory"
                    value={opt.value}
                    checked={isSelected}
                    onChange={() =>
                      onFilterChange({
                        selectedFiber: opt.value === 'all' ? null : opt.value,
                        currentPage: 1,
                      })
                    }
                    className="sr-only"
                    data-testid={`fiber-radio-${opt.value}`}
                  />
                  <span>{opt.label}</span>
                </div>
                {count !== undefined && (
                  <span
                    className={`font-mono text-[10px] ${
                      isSelected
                        ? 'text-gold dark:text-accent-700 font-bold'
                        : 'text-grey-500'
                    }`}
                  >
                    ({count})
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* 2. Weight / GSM Slider (50–600 GSM per FEAT-001) */}
      <div className="space-y-4 pt-4 border-t border-grey-300/40 dark:border-grey-700/40">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-grey-700 dark:text-grey-300 font-sans">
            Fabric Weight (GSM)
          </h3>
          <span className="font-mono text-xs text-gold font-semibold" data-testid="gsm-range-display">
            {filters.minGsm} – {filters.maxGsm} GSM
          </span>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-grey-500 font-mono">
              <span>Min: {filters.minGsm}</span>
              <span>50 GSM</span>
            </div>
            <input
              type="range"
              min={50}
              max={600}
              step={10}
              value={filters.minGsm}
              onChange={handleMinGsmChange}
              className="w-full accent-gold cursor-pointer"
              aria-label="Minimum GSM slider"
              data-testid="min-gsm-slider"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-grey-500 font-mono">
              <span>Max: {filters.maxGsm}</span>
              <span>600 GSM</span>
            </div>
            <input
              type="range"
              min={50}
              max={600}
              step={10}
              value={filters.maxGsm}
              onChange={handleMaxGsmChange}
              className="w-full accent-gold cursor-pointer"
              aria-label="Maximum GSM slider"
              data-testid="max-gsm-slider"
            />
          </div>
        </div>
      </div>

      {/* 3. Weave Structure */}
      <div className="space-y-3 pt-4 border-t border-grey-300/40 dark:border-grey-700/40">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-grey-700 dark:text-grey-300 font-sans">
          Weave Structure
        </h3>
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Weave Structure">
          {WEAVE_OPTIONS.map((opt) => {
            const isSelected =
              (filters.selectedWeave === null && opt.value === 'all') ||
              filters.selectedWeave === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onFilterChange({
                    selectedWeave: opt.value === 'all' ? null : opt.value,
                    currentPage: 1,
                  })
                }
                className={`px-3 py-2 rounded-md text-xs text-left transition-colors border ${
                  isSelected
                    ? 'border-gold bg-gold/10 text-gold font-semibold'
                    : 'border-grey-300/60 dark:border-grey-700/60 text-grey-700 dark:text-grey-300 hover:border-grey-400'
                }`}
                data-testid={`weave-btn-${opt.value}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Occasion Tags */}
      <div className="space-y-3 pt-4 border-t border-grey-300/40 dark:border-grey-700/40">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-grey-700 dark:text-grey-300 font-sans">
          Occasion
        </h3>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Occasion Tags">
          {OCCASION_OPTIONS.map((opt) => {
            const isSelected =
              (filters.selectedOccasion === null && opt.value === 'all') ||
              filters.selectedOccasion === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onFilterChange({
                    selectedOccasion: opt.value === 'all' ? null : opt.value,
                    currentPage: 1,
                  })
                }
                className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                  isSelected
                    ? 'bg-ink text-alabaster dark:bg-alabaster dark:text-ink font-semibold'
                    : 'bg-grey-200/80 dark:bg-grey-800/80 text-grey-700 dark:text-grey-300 hover:bg-grey-300'
                }`}
                data-testid={`occasion-btn-${opt.value}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Continuous Yardage Availability */}
      <div className="space-y-3 pt-4 border-t border-grey-300/40 dark:border-grey-700/40">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-grey-700 dark:text-grey-300 font-sans">
            Continuous Bolt
          </h3>
          <span className="font-mono text-[11px] text-grey-500">
            {filters.minContinuousYards > 0
              ? `Min ${filters.minContinuousYards} yds`
              : 'Any length'}
          </span>
        </div>
        <select
          value={filters.minContinuousYards}
          onChange={(e) =>
            onFilterChange({
              minContinuousYards: Number(e.target.value),
              currentPage: 1,
            })
          }
          className="w-full px-3 py-2 text-xs rounded-md border border-grey-300 dark:border-grey-700 bg-alabaster dark:bg-obsidian text-ink dark:text-alabaster focus:outline-none focus:ring-1 focus:ring-gold"
          data-testid="continuous-yards-select"
        >
          <option value={0}>Any unbroken yardage</option>
          <option value={5}>At least 5.0 yards (Bespoke Suit)</option>
          <option value={10}>At least 10.0 yards (Evening Gown)</option>
          <option value={15}>At least 15.0 yards (Couture Train)</option>
        </select>
      </div>
    </aside>
  );
};
