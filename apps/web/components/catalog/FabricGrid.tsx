'use client';

import React from 'react';
import { FabricCatalogItem, CatalogPagination } from '../../lib/catalog-types';
import { FabricCard } from './FabricCard';

interface FabricGridProps {
  items: FabricCatalogItem[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  onResetFilters?: () => void;
  onAddSwatch?: (fabric: FabricCatalogItem) => void;
  pagination?: CatalogPagination;
  onPageChange?: (page: number) => void;
}

/**
 * Editorial Multi-Column Luxury Fabric Catalog Grid
 * Spec Anchor: screens/02-fabric-catalog.md, FEAT-001, AGENTS.md Discipline 4
 */
export const FabricGrid: React.FC<FabricGridProps> = ({
  items,
  isLoading,
  isError,
  errorMessage = 'Unable to load collection from the atelier archive.',
  onRetry,
  onResetFilters,
  onAddSwatch,
  pagination,
  onPageChange,
}) => {
  // 1. Loading Skeleton State: 9 Warm Ecru Pulsing Cards (screens/02-fabric-catalog.md)
  if (isLoading) {
    return (
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        data-testid="catalog-loading-skeleton"
        aria-busy="true"
        aria-label="Loading luxury textiles"
      >
        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="flex flex-col overflow-hidden rounded-md border border-grey-300/40 dark:border-grey-700/40 bg-alabaster dark:bg-obsidian animate-pulse"
          >
            {/* Swatch Skeleton Viewport */}
            <div className="aspect-[4/3] w-full bg-grey-200/80 dark:bg-grey-800/80 relative">
              <div className="absolute top-3 left-3 w-16 h-5 rounded-sm bg-grey-300/60 dark:bg-grey-700/60" />
              <div className="absolute top-3 right-3 w-24 h-5 rounded-sm bg-grey-300/60 dark:bg-grey-700/60" />
            </div>

            {/* Content Skeleton */}
            <div className="p-5 space-y-3">
              <div className="flex justify-between">
                <div className="h-3 w-28 bg-grey-300/60 dark:bg-grey-700/60 rounded" />
                <div className="h-3 w-8 bg-grey-300/60 dark:bg-grey-700/60 rounded" />
              </div>
              <div className="h-5 w-48 bg-grey-300/80 dark:bg-grey-700/80 rounded" />
              <div className="h-3 w-36 bg-grey-300/50 dark:bg-grey-700/50 rounded" />

              <div className="pt-3 border-t border-grey-200 dark:border-grey-800 flex justify-between items-center">
                <div className="h-6 w-20 bg-grey-300/70 dark:bg-grey-700/70 rounded" />
                <div className="h-3 w-20 bg-grey-300/50 dark:bg-grey-700/50 rounded" />
              </div>
            </div>

            <div className="px-5 pb-5">
              <div className="h-9 w-full bg-grey-200 dark:bg-grey-800 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 2. Error Boundary State with Retry Action (screens/02-fabric-catalog.md)
  if (isError) {
    return (
      <div
        className="rounded-md border border-semantic-error-500/30 bg-semantic-error-100/30 dark:bg-semantic-error-900/20 p-12 text-center my-6"
        data-testid="catalog-error-state"
        role="alert"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-semantic-error-100 text-semantic-error-500 dark:bg-semantic-error-900">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="mt-4 font-display text-2xl font-semibold text-ink dark:text-alabaster">
          Unable to Load Collection
        </h3>
        <p className="mt-2 text-sm text-grey-600 dark:text-grey-400 max-w-md mx-auto">
          {errorMessage}
        </p>
        {onRetry && (
          <div className="mt-6">
            <button
              type="button"
              onClick={onRetry}
              className="px-6 py-2.5 rounded-md text-xs font-semibold uppercase tracking-wider text-alabaster bg-ink dark:bg-alabaster dark:text-ink hover:bg-primary-700 dark:hover:bg-grey-200 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
              data-testid="catalog-retry-btn"
            >
              Retry Connection
            </button>
          </div>
        )}
      </div>
    );
  }

  // 3. Empty Results State (screens/02-fabric-catalog.md)
  if (!items || items.length === 0) {
    return (
      <div
        className="rounded-md border border-grey-300/80 dark:border-grey-700/80 bg-alabaster dark:bg-obsidian p-16 text-center my-6"
        data-testid="catalog-empty-state"
      >
        {/* Architectural Empty Mark */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-sm border border-gold/40 text-gold mb-6 font-display text-2xl">
          ❖
        </div>
        <h3 className="font-display text-2xl font-semibold text-ink dark:text-alabaster">
          No textiles match this exact combination
        </h3>
        <p className="mt-3 text-sm text-grey-600 dark:text-grey-400 max-w-lg mx-auto leading-relaxed">
          We could not locate any active bolts matching all selected parameters.
          Try relaxing your GSM constraints (e.g. extending weight bounds) or removing weave structure restrictions.
        </p>
        {onResetFilters && (
          <div className="mt-8">
            <button
              type="button"
              onClick={onResetFilters}
              className="px-6 py-3 rounded-md text-xs font-semibold uppercase tracking-wider text-alabaster bg-ink dark:bg-alabaster dark:text-ink hover:bg-primary-700 dark:hover:bg-grey-200 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
              data-testid="reset-filters-btn"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>
    );
  }

  // 4. Populated Grid with Pagination (screens/02-fabric-catalog.md)
  return (
    <div className="space-y-10" data-testid="catalog-grid">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {items.map((fabric) => (
          <FabricCard
            key={fabric.id}
            fabric={fabric}
            onAddSwatch={onAddSwatch}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <nav
          className="pt-8 border-t border-grey-300/60 dark:border-grey-700/60 flex items-center justify-between"
          aria-label="Fabric Catalog Pagination"
          data-testid="catalog-pagination"
        >
          {/* Previous Page Button */}
          <button
            type="button"
            disabled={pagination.currentPage <= 1}
            onClick={() => onPageChange && onPageChange(pagination.currentPage - 1)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider border border-grey-300 dark:border-grey-700 text-ink dark:text-alabaster hover:border-gold hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            data-testid="pagination-prev-btn"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Previous</span>
          </button>

          {/* Page Indicators */}
          <div className="hidden sm:flex items-center space-x-2">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange && onPageChange(pageNum)}
                aria-current={pagination.currentPage === pageNum ? 'page' : undefined}
                className={`w-9 h-9 rounded-md text-xs font-mono font-semibold transition-colors ${
                  pagination.currentPage === pageNum
                    ? 'bg-ink dark:bg-alabaster text-alabaster dark:text-ink shadow-sm'
                    : 'text-grey-700 dark:text-grey-300 hover:bg-grey-200 dark:hover:bg-grey-800'
                }`}
                data-testid={`pagination-page-${pageNum}`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <div className="sm:hidden text-xs font-mono text-grey-600 dark:text-grey-400">
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>

          {/* Next Page Button */}
          <button
            type="button"
            disabled={pagination.currentPage >= pagination.totalPages}
            onClick={() => onPageChange && onPageChange(pagination.currentPage + 1)}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider border border-grey-300 dark:border-grey-700 text-ink dark:text-alabaster hover:border-gold hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            data-testid="pagination-next-btn"
          >
            <span>Next</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </nav>
      )}
    </div>
  );
};
