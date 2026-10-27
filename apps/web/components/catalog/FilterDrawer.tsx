'use client';

import React, { useEffect } from 'react';
import { CatalogFilterState, CatalogFacets } from '../../lib/catalog-types';
import { FilterSidebar } from './FilterSidebar';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: CatalogFilterState;
  facets?: CatalogFacets;
  onFilterChange: (newFilters: Partial<CatalogFilterState>) => void;
  onResetFilters: () => void;
  totalItems?: number;
}

/**
 * Mobile Slide-Over Filter Drawer
 * Spec Anchor: screens/02-fabric-catalog.md, FEAT-001, AGENTS.md Discipline 4
 */
export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  facets,
  onFilterChange,
  onResetFilters,
  totalItems,
}) => {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      aria-labelledby="filter-drawer-title"
      role="dialog"
      aria-modal="true"
      data-testid="filter-drawer"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-obsidian/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-alabaster dark:bg-obsidian border-l border-grey-300 dark:border-grey-700 shadow-xl flex flex-col">
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-grey-300/60 dark:border-grey-700/60">
            <h2
              id="filter-drawer-title"
              className="font-display text-lg font-semibold tracking-wide text-ink dark:text-alabaster uppercase"
            >
              Filter Collection
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-grey-500 hover:text-ink dark:hover:text-alabaster rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gold"
              aria-label="Close filters drawer"
              data-testid="filter-drawer-close-btn"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <FilterSidebar
              filters={filters}
              facets={facets}
              onFilterChange={onFilterChange}
              onResetFilters={onResetFilters}
            />
          </div>

          {/* Drawer Sticky Footer Action Bar */}
          <div className="p-6 border-t border-grey-300/60 dark:border-grey-700/60 bg-surface dark:bg-surface-dark flex items-center gap-3">
            <button
              type="button"
              onClick={onResetFilters}
              className="flex-1 py-3 px-4 rounded-md text-xs font-semibold uppercase tracking-wider border border-grey-300 dark:border-grey-700 text-ink dark:text-alabaster hover:border-gold transition-colors"
              data-testid="drawer-reset-btn"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-md text-xs font-semibold uppercase tracking-wider text-alabaster bg-ink dark:bg-alabaster dark:text-ink hover:bg-primary-700 dark:hover:bg-grey-200 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gold"
              data-testid="drawer-apply-btn"
            >
              Show {totalItems !== undefined ? `${totalItems} ` : ''}Results
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
