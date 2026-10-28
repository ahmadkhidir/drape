'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import Link from 'next/link';
import {
  CatalogFilterState,
  CatalogSortOption,
  FabricCatalogItem,
  CatalogPagination,
  CatalogFacets,
} from '../../lib/catalog-types';
import { fetchCatalog } from '../../lib/catalog-data';
import { FabricGrid } from '../../components/catalog/FabricGrid';
import { FilterSidebar } from '../../components/catalog/FilterSidebar';
import { FilterDrawer } from '../../components/catalog/FilterDrawer';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { SoundscapeToggle } from '../../components/audio/SoundscapeToggle';

const INITIAL_FILTERS: CatalogFilterState = {
  searchQuery: '',
  selectedFiber: null,
  minGsm: 50,
  maxGsm: 600,
  selectedWeave: null,
  selectedOccasion: null,
  minContinuousYards: 0,
  sortBy: 'featured',
  currentPage: 1,
};

/**
 * Screen 2: Fabric Catalog
 * Spec Anchor: screens/02-fabric-catalog.md, FEAT-001, C-007
 */
export default function FabricCatalogPage() {
  const [filters, setFilters] = useState<CatalogFilterState>(INITIAL_FILTERS);
  const [items, setItems] = useState<FabricCatalogItem[]>([]);
  const [pagination, setPagination] = useState<CatalogPagination>({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 12,
  });
  const [facets, setFacets] = useState<CatalogFacets | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [, startTransition] = useTransition();

  // Load catalog items with debounced query
  const loadData = useCallback(async (currentFilters: CatalogFilterState) => {
    setIsLoading(true);
    setIsError(false);
    try {
      const result = await fetchCatalog(currentFilters);
      setItems(result.items);
      setPagination(result.pagination);
      setFacets(result.facets);
    } catch (err: unknown) {
      setIsError(true);
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to connect to the atelier catalog.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        loadData(filters);
      });
    }, 120);

    return () => clearTimeout(timer);
  }, [filters, loadData]);

  const handleFilterChange = (newFilters: Partial<CatalogFilterState>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      currentPage: newFilters.currentPage ?? 1,
    }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const handleAddSwatch = (fabric: FabricCatalogItem) => {
    setToastMessage(`Swatch sample added for ${fabric.name} ($25.00 credited toward bespoke orders).`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  // Count active filters (for mobile badge & active chips)
  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];

  if (filters.searchQuery) {
    activeChips.push({
      key: 'search',
      label: `"${filters.searchQuery}"`,
      onRemove: () => handleFilterChange({ searchQuery: '' }),
    });
  }
  if (filters.selectedFiber && filters.selectedFiber !== 'all') {
    activeChips.push({
      key: 'fiber',
      label: `Fiber: ${filters.selectedFiber.toUpperCase()}`,
      onRemove: () => handleFilterChange({ selectedFiber: null }),
    });
  }
  if (filters.minGsm > 50 || filters.maxGsm < 600) {
    activeChips.push({
      key: 'gsm',
      label: `${filters.minGsm} – ${filters.maxGsm} GSM`,
      onRemove: () => handleFilterChange({ minGsm: 50, maxGsm: 600 }),
    });
  }
  if (filters.selectedWeave && filters.selectedWeave !== 'all') {
    activeChips.push({
      key: 'weave',
      label: `Weave: ${filters.selectedWeave.toUpperCase()}`,
      onRemove: () => handleFilterChange({ selectedWeave: null }),
    });
  }
  if (filters.selectedOccasion && filters.selectedOccasion !== 'all') {
    activeChips.push({
      key: 'occasion',
      label: `Occasion: ${filters.selectedOccasion.replace(/_/g, ' ').toUpperCase()}`,
      onRemove: () => handleFilterChange({ selectedOccasion: null }),
    });
  }
  if (filters.minContinuousYards > 0) {
    activeChips.push({
      key: 'continuous',
      label: `Min ${filters.minContinuousYards} Continuous Yds`,
      onRemove: () => handleFilterChange({ minContinuousYards: 0 }),
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface dark:bg-surface-dark transition-colors duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-md shadow-xl bg-ink text-alabaster dark:bg-alabaster dark:text-ink border border-gold/40 flex items-center space-x-3 transition-all animate-bounce"
          data-testid="catalog-toast"
        >
          <span className="text-gold font-display text-lg">❖</span>
          <span className="text-xs font-sans tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Atelier Luxury Header */}
      <header className="sticky top-0 z-40 w-full border-b border-grey-300/60 dark:border-grey-700/60 bg-alabaster/90 dark:bg-obsidian/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          {/* Brand Monogram */}
          <BrandLogo variant="lockup" size="md" />

          {/* Quick Breadcrumbs */}
          <nav className="hidden md:flex items-center space-x-2 text-xs font-sans uppercase tracking-wider text-grey-500">
            <Link href="/" className="hover:text-gold transition-colors">
              Atelier
            </Link>
            <span>/</span>
            <span className="text-ink dark:text-alabaster font-semibold">
              Fabric Catalog
            </span>
          </nav>

          {/* Header Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <SoundscapeToggle />
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="lg:hidden inline-flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider border border-grey-300 dark:border-grey-700 text-ink dark:text-alabaster hover:border-gold"
              data-testid="mobile-filters-trigger-header"
            >
              <span>Filters</span>
              {activeChips.length > 0 && (
                <span className="h-4 w-4 rounded-full bg-gold text-obsidian text-[10px] font-mono flex items-center justify-center font-bold">
                  {activeChips.length}
                </span>
              )}
            </button>
            <Link
              href="/"
              className="text-xs font-sans uppercase tracking-wider text-grey-600 dark:text-grey-400 hover:text-gold transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Editorial Sub-Banner */}
      <section className="border-b border-grey-300/40 dark:border-grey-700/40 bg-alabaster dark:bg-obsidian py-10 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 text-xs font-semibold uppercase tracking-widest text-gold">
              <span className="h-px w-6 bg-gold" />
              <span>Haute Couture Textile Archive</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-ink dark:text-alabaster">
              Curated European Fabrics
            </h1>
            <p className="text-sm text-grey-600 dark:text-grey-400 font-sans max-w-2xl leading-relaxed">
              Explore Como mulberry silks, Biella super worsted wools, and Lyon velvets with verified physical GSM weights, continuous bolt availability, and real-time drape physics.
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="block font-display text-2xl font-bold text-ink dark:text-alabaster" data-testid="total-skus-count">
                {pagination.totalItems}
              </span>
              <span className="text-[11px] font-sans uppercase tracking-wider text-grey-500">
                Active Bolts
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Interactive Catalog Workplace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-8 py-8 space-y-6">
        {/* Top Control Bar: Search Input, Mobile Drawer Pill, Sorting Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-md border border-grey-300/60 dark:border-grey-700/60 bg-alabaster dark:bg-obsidian">
          {/* Real-Time Search Query Input */}
          <div className="relative flex-1 max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-grey-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) =>
                handleFilterChange({ searchQuery: e.target.value, currentPage: 1 })
              }
              placeholder="Search by fiber, mill, occasion (e.g. 'black tie', 'Como Silk')..."
              className="w-full pl-9 pr-4 py-2 text-xs font-sans rounded-md border border-grey-300 dark:border-grey-700 bg-surface dark:bg-surface-dark text-ink dark:text-alabaster focus:outline-none focus:ring-1 focus:ring-gold"
              data-testid="catalog-search-input"
              aria-label="Search fabric catalog"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => handleFilterChange({ searchQuery: '', currentPage: 1 })}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-grey-400 hover:text-ink dark:hover:text-alabaster"
                aria-label="Clear search input"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* Mobile Filter Pill Trigger */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="lg:hidden flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider border border-grey-300 dark:border-grey-700 text-ink dark:text-alabaster hover:border-gold transition-colors"
              data-testid="mobile-filters-pill"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filters ({activeChips.length})</span>
            </button>

            {/* Sorting Dropdown */}
            <div className="flex items-center space-x-2">
              <label htmlFor="catalog-sort" className="hidden sm:inline text-xs font-sans text-grey-500 whitespace-nowrap">
                Sort by:
              </label>
              <select
                id="catalog-sort"
                value={filters.sortBy}
                onChange={(e) =>
                  handleFilterChange({
                    sortBy: e.target.value as CatalogSortOption,
                    currentPage: 1,
                  })
                }
                className="px-3 py-2 text-xs font-sans rounded-md border border-grey-300 dark:border-grey-700 bg-surface dark:bg-surface-dark text-ink dark:text-alabaster focus:outline-none focus:ring-1 focus:ring-gold"
                data-testid="catalog-sort-select"
              >
                <option value="featured">Featured Curations</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="gsm_desc">Weight: Heaviest to Lightest</option>
                <option value="gsm_asc">Weight: Lightest to Heaviest</option>
                <option value="newest">Newest Additions</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips Pill Bar */}
        {activeChips.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 pt-1 pb-2"
            data-testid="active-filter-chips"
            aria-label="Active Filters"
          >
            <span className="text-xs text-grey-500 font-sans font-medium mr-1">
              Active Filters:
            </span>
            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-sans bg-grey-200 dark:bg-grey-800 text-ink dark:text-alabaster border border-grey-300 dark:border-grey-700"
                data-testid={`active-chip-${chip.key}`}
              >
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="text-grey-500 hover:text-ink dark:hover:text-alabaster ml-1"
                  aria-label={`Remove filter: ${chip.label}`}
                >
                  ✕
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-gold hover:underline ml-2"
              data-testid="clear-all-chips-btn"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Editorial Split Workspace: Sidebar (Left 25%) + Grid (Right 75%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Left Sticky Sidebar */}
          <div className="hidden lg:block lg:col-span-3 sticky top-24">
            <FilterSidebar
              filters={filters}
              facets={facets}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
            />
          </div>

          {/* Main Fabric Grid */}
          <div className="col-span-1 lg:col-span-9">
            <FabricGrid
              items={items}
              isLoading={isLoading}
              isError={isError}
              errorMessage={errorMessage}
              onRetry={() => loadData(filters)}
              onResetFilters={handleResetFilters}
              onAddSwatch={handleAddSwatch}
              pagination={pagination}
              onPageChange={(page) => handleFilterChange({ currentPage: page })}
            />
          </div>
        </div>
      </main>

      {/* Mobile Slide-over Filter Drawer */}
      <FilterDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        filters={filters}
        facets={facets}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        totalItems={pagination.totalItems}
      />
    </div>
  );
}
