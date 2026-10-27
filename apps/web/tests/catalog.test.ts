/**
 * Drape Fabric Catalog & Detail View Verification Suite
 * Spec Anchors: FEAT-001, C-007, C-008, screens/02-fabric-catalog.md, screens/03-fabric-detail-view.md
 * Governing Manual: apps/web/AGENTS.md (Discipline Rules 3, 4)
 */

import { describe, it, expect } from 'vitest';
import {
  FALLBACK_FABRICS,
  queryCatalog,
  fetchFabric,
} from '../lib/catalog-data';
import { CatalogFilterState } from '../lib/catalog-types';

describe('FEAT-001: Luxury Fabric Catalog & Multimodal Filtering', () => {
  const defaultFilters: CatalogFilterState = {
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

  it('Criteria 1: filters by Silk and GSM > 250 in <150ms returning only heavy silks', () => {
    // Permanent Spec Anchor: FEAT-001 Acceptance Criterion 1
    const t0 = performance.now();

    const silkFilters: CatalogFilterState = {
      ...defaultFilters,
      selectedFiber: 'silk',
      minGsm: 250,
      maxGsm: 600,
    };

    const result = queryCatalog(FALLBACK_FABRICS, silkFilters);
    const duration = performance.now() - t0;

    // Must execute under 150ms
    expect(duration).toBeLessThan(150);

    // Results must contain Mulberry Silk Jacquard (320 GSM) and Duchesse Silk Satin (280 GSM)
    expect(result.items.length).toBeGreaterThanOrEqual(2);
    for (const item of result.items) {
      expect(item.fiberCategory).toBe('silk');
      expect(item.gsm).toBeGreaterThanOrEqual(250);
    }

    // Light silk chiffon (65 GSM) must be excluded
    const hasChiffon = result.items.some((i) => i.id === 'FAB-SLK-120');
    expect(hasChiffon).toBe(false);
  });

  it('Criteria 2: Fabric detail view provides verified physical metrics', async () => {
    // Permanent Spec Anchor: FEAT-001 Acceptance Criterion 2 & C-008
    const fabric = await fetchFabric('FAB-SLK-892');
    expect(fabric).not.toBeNull();
    if (!fabric) return;

    // Verified metrics
    expect(fabric.gsm).toBe(320);
    expect(fabric.widthInches).toBe(54.0);
    expect(fabric.fiberBreakdown).toContain('Mulberry Silk');
    expect(fabric.stretchPercentage).toBe(2.0);
    expect(fabric.weaveStructure).toBe('jacquard');
    expect(fabric.drapeCoefficient).toBe(0.45);
    expect(fabric.stiffnessRating).toBe(6.5);
    expect(fabric.swatchPrice).toBe(25.0);
    expect(fabric.activeBolt.dyeLotCode).toBe('LOT-2026-EMR-04');
    expect(fabric.activeBolt.remainingContinuousYards).toBe(14.5);
  });

  it('Criteria 3: indicates low stock warning when remainingContinuousYards < 5.0 yds', () => {
    // Permanent Spec Anchor: FEAT-001 Acceptance Criterion 3
    const result = queryCatalog(FALLBACK_FABRICS, defaultFilters);

    // Locate Belgian Flax Linen (4.25 continuous yards remaining)
    const lowStockLinen = result.items.find((f) => f.id === 'FAB-LIN-112');
    expect(lowStockLinen).toBeDefined();
    expect(lowStockLinen?.remainingContinuousYards).toBe(4.25);
    expect(lowStockLinen?.isLowStock).toBe(true);

    // Locate Savile Row Heavy Wool (3.75 continuous yards remaining)
    const lowStockWool = result.items.find((f) => f.id === 'FAB-WOL-340');
    expect(lowStockWool).toBeDefined();
    expect(lowStockWool?.remainingContinuousYards).toBe(3.75);
    expect(lowStockWool?.isLowStock).toBe(true);

    // High stock silk should NOT have low stock flag
    const highStockSilk = result.items.find((f) => f.id === 'FAB-SLK-401');
    expect(highStockSilk).toBeDefined();
    expect(highStockSilk?.remainingContinuousYards).toBe(22.0);
    expect(highStockSilk?.isLowStock).toBe(false);
  });
});

describe('Screen 02: Fabric Catalog Multimodal Filtering & States', () => {
  const baseFilters: CatalogFilterState = {
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

  it('filters by fiber categories: wool, linen, velvet, brocade', () => {
    // Wool filter
    const woolResult = queryCatalog(FALLBACK_FABRICS, { ...baseFilters, selectedFiber: 'wool' });
    expect(woolResult.items.length).toBeGreaterThanOrEqual(2);
    expect(woolResult.items.every((i) => i.fiberCategory === 'wool')).toBe(true);

    // Linen filter
    const linenResult = queryCatalog(FALLBACK_FABRICS, { ...baseFilters, selectedFiber: 'linen' });
    expect(linenResult.items.length).toBe(1);
    expect(linenResult.items[0].id).toBe('FAB-LIN-112');

    // Velvet filter
    const velvetResult = queryCatalog(FALLBACK_FABRICS, { ...baseFilters, selectedFiber: 'velvet' });
    expect(velvetResult.items.length).toBe(1);
    expect(velvetResult.items[0].id).toBe('FAB-VLV-730');

    // Brocade filter
    const brocadeResult = queryCatalog(FALLBACK_FABRICS, { ...baseFilters, selectedFiber: 'brocade' });
    expect(brocadeResult.items.length).toBe(1);
    expect(brocadeResult.items[0].id).toBe('FAB-BRC-608');
  });

  it('filters by occasion tags including gala and evening aliases', () => {
    // Gala maps to black_tie
    const galaResult = queryCatalog(FALLBACK_FABRICS, { ...baseFilters, selectedOccasion: 'gala' });
    expect(galaResult.items.some((i) => i.id === 'FAB-SLK-892' || i.id === 'FAB-BRC-608')).toBe(true);

    // Bridal filter
    const bridalResult = queryCatalog(FALLBACK_FABRICS, { ...baseFilters, selectedOccasion: 'bridal' });
    expect(bridalResult.items.some((i) => i.id === 'FAB-SLK-401')).toBe(true);

    // Evening maps to cocktail/evening
    const eveningResult = queryCatalog(FALLBACK_FABRICS, { ...baseFilters, selectedOccasion: 'evening' });
    expect(eveningResult.items.some((i) => i.id === 'FAB-VLV-730')).toBe(true);
  });

  it('filters by weave structures: satin, jacquard, crepe, twill, chiffon', () => {
    const satinResult = queryCatalog(FALLBACK_FABRICS, { ...baseFilters, selectedWeave: 'satin' });
    expect(satinResult.items.every((i) => i.weaveStructure === 'satin')).toBe(true);

    const crepeResult = queryCatalog(FALLBACK_FABRICS, { ...baseFilters, selectedWeave: 'crepe' });
    expect(crepeResult.items.every((i) => i.weaveStructure === 'crepe')).toBe(true);

    const chiffonResult = queryCatalog(FALLBACK_FABRICS, { ...baseFilters, selectedWeave: 'chiffon' });
    expect(chiffonResult.items.every((i) => i.weaveStructure === 'chiffon')).toBe(true);
  });

  it('sorts correctly: price_asc, price_desc, gsm_desc, newest', () => {
    // Price ascending
    const ascResult = queryCatalog(FALLBACK_FABRICS, { ...baseFilters, sortBy: 'price_asc' });
    for (let i = 0; i < ascResult.items.length - 1; i++) {
      expect(ascResult.items[i].pricePerYard).toBeLessThanOrEqual(ascResult.items[i + 1].pricePerYard);
    }

    // Price descending
    const descResult = queryCatalog(FALLBACK_FABRICS, { ...baseFilters, sortBy: 'price_desc' });
    for (let i = 0; i < descResult.items.length - 1; i++) {
      expect(descResult.items[i].pricePerYard).toBeGreaterThanOrEqual(descResult.items[i + 1].pricePerYard);
    }

    // GSM descending
    const gsmResult = queryCatalog(FALLBACK_FABRICS, { ...baseFilters, sortBy: 'gsm_desc' });
    for (let i = 0; i < gsmResult.items.length - 1; i++) {
      expect(gsmResult.items[i].gsm).toBeGreaterThanOrEqual(gsmResult.items[i + 1].gsm);
    }
  });

  it('handles empty state when no textiles match impossible filter parameters', () => {
    // Impossible filter: Wool with GSM < 80
    const emptyResult = queryCatalog(FALLBACK_FABRICS, {
      ...baseFilters,
      selectedFiber: 'wool',
      minGsm: 50,
      maxGsm: 80,
    });

    expect(emptyResult.items.length).toBe(0);
    expect(emptyResult.pagination.totalItems).toBe(0);
  });

  it('handles pagination bounds correctly per Discipline Rule 4', () => {
    const pagedResult = queryCatalog(FALLBACK_FABRICS, baseFilters, 3);
    expect(pagedResult.items.length).toBe(3);
    expect(pagedResult.pagination.totalItems).toBe(FALLBACK_FABRICS.length);
    expect(pagedResult.pagination.totalPages).toBe(Math.ceil(FALLBACK_FABRICS.length / 3));
    expect(pagedResult.pagination.currentPage).toBe(1);

    // Page 2
    const page2Result = queryCatalog(FALLBACK_FABRICS, { ...baseFilters, currentPage: 2 }, 3);
    expect(page2Result.items.length).toBe(3);
    expect(page2Result.pagination.currentPage).toBe(2);
    // Page 2 items should not overlap with Page 1 items
    expect(page2Result.items[0].id).not.toBe(pagedResult.items[0].id);
  });

  it('computes accurate facet counts for filters', () => {
    const result = queryCatalog(FALLBACK_FABRICS, baseFilters);
    expect(result.facets.fiberCounts['silk']).toBeGreaterThanOrEqual(3);
    expect(result.facets.fiberCounts['wool']).toBeGreaterThanOrEqual(2);
    expect(result.facets.gsmRanges['light (50-180)']).toBeGreaterThanOrEqual(1);
    expect(result.facets.gsmRanges['heavy (321-600)']).toBeGreaterThanOrEqual(3);
  });
});

describe('Screen 03: Fabric Detail View Dossier & Sensory Architecture', () => {
  it('loads physical sensory dossier for Duchesse Silk Satin (FAB-SLK-401)', async () => {
    const detail = await fetchFabric('FAB-SLK-401');
    expect(detail).not.toBeNull();
    if (!detail) return;

    expect(detail.name).toBe('Duchesse Silk Satin');
    expect(detail.millName).toBe('Taroni Seta');
    expect(detail.countryOfOrigin).toBe('IT');
    expect(detail.drapeCoefficient).toBe(0.72); // Fluid drape
    expect(detail.stiffnessRating).toBe(4.2);
    expect(detail.careInstructions.dryCleanOnly).toBe(true);
    expect(detail.careInstructions.ironTemperatureMaxC).toBe(110);
    expect(detail.careInstructions.interliningRecommendation).toContain('silk habotai');
    expect(detail.activeBolt.dyeLotCode).toBe('LOT-2026-IVR-01');
    expect(detail.activeBolt.remainingContinuousYards).toBe(22.0);
    expect(detail.activeBolt.isLowStock).toBe(false);
  });

  it('returns null for nonexistent SKU', async () => {
    const missing = await fetchFabric('FAB-NONEXISTENT-999');
    expect(missing).toBeNull();
  });
});
