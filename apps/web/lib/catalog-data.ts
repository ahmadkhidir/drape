/**
 * Drape Luxury Fabric Catalog Data & Client Service
 * Spec Anchors: C-007, C-008, FEAT-001, screens/02-fabric-catalog.md, screens/03-fabric-detail-view.md
 */

import {
  FabricCatalogItem,
  FabricDetail,
  CatalogResponse,
  CatalogFilterState,
  CatalogFacets,
} from './catalog-types';

/**
 * Curated Haute Couture Catalog Dataset
 * Permanent Spec Anchor: ASSETS.md (A-032..A-046) & C-007/C-008
 */
export const FALLBACK_FABRICS: FabricDetail[] = [
  {
    id: 'FAB-SLK-892',
    name: 'Mulberry Silk Jacquard',
    millName: 'Bevilacqua Tessuti',
    countryOfOrigin: 'IT',
    fiberBreakdown: '85% Mulberry Silk, 15% Metallic Lurex',
    fiberCategory: 'silk',
    weaveStructure: 'jacquard',
    occasion: 'black_tie',
    gsm: 320,
    widthInches: 54.0,
    rollWidthInches: 54.0,
    drapeCoefficient: 0.45,
    drapeFluidityCoefficient: 0.45,
    stiffnessRating: 6.5,
    stretchPercentage: 2.0,
    transparencyRating: 0.05,
    tearResistance: '48 N (warp) / 45 N (weft)',
    pricePerYard: 185.0,
    swatchPrice: 25.0,
    pbrTexturesUrl: '/api/v1/fabrics/FAB-SLK-892/shader-assets',
    thumbnailUrl: '/textures/fabrics/silk-jacquard.svg',
    normalMapUrl: '/textures/fabrics/silk-jacquard.svg',
    activeBolt: {
      id: 'bolt_901',
      dyeLotCode: 'LOT-2026-EMR-04',
      remainingContinuousYards: 14.5,
      isLowStock: false,
      warehouseLocation: 'RACK-B-04',
    },
    continuousBoltRolls: [
      {
        id: 'bolt_901',
        dyeLotCode: 'LOT-2026-EMR-04',
        remainingContinuousYards: 14.5,
        isLowStock: false,
        warehouseLocation: 'RACK-B-04',
      },
    ],
    careInstructions: {
      ironTemperatureMaxC: 110,
      dryCleanOnly: true,
      interliningRecommendation: 'Silk organza or lightweight hair canvas',
    },
    createdAt: '2026-10-27T10:00:00.000Z',
  },
  {
    id: 'FAB-SLK-401',
    name: 'Duchesse Silk Satin',
    millName: 'Taroni Seta',
    countryOfOrigin: 'IT',
    fiberBreakdown: '100% Silk Duchesse',
    fiberCategory: 'silk',
    weaveStructure: 'satin',
    occasion: 'bridal',
    gsm: 280,
    widthInches: 54.0,
    rollWidthInches: 54.0,
    drapeCoefficient: 0.72,
    drapeFluidityCoefficient: 0.72,
    stiffnessRating: 4.2,
    stretchPercentage: 1.5,
    transparencyRating: 0.0,
    tearResistance: '38 N (warp) / 36 N (weft)',
    pricePerYard: 145.0,
    swatchPrice: 25.0,
    pbrTexturesUrl: '/api/v1/fabrics/FAB-SLK-401/shader-assets',
    thumbnailUrl: '/textures/fabrics/ivory-satin.svg',
    normalMapUrl: '/textures/fabrics/ivory-satin.svg',
    activeBolt: {
      id: 'bolt_902',
      dyeLotCode: 'LOT-2026-IVR-01',
      remainingContinuousYards: 22.0,
      isLowStock: false,
      warehouseLocation: 'RACK-A-12',
    },
    continuousBoltRolls: [
      {
        id: 'bolt_902',
        dyeLotCode: 'LOT-2026-IVR-01',
        remainingContinuousYards: 22.0,
        isLowStock: false,
        warehouseLocation: 'RACK-A-12',
      },
    ],
    careInstructions: {
      ironTemperatureMaxC: 110,
      dryCleanOnly: true,
      interliningRecommendation: 'Fine silk habotai or cotton batiste',
    },
    createdAt: '2026-10-27T10:15:00.000Z',
  },
  {
    id: 'FAB-WOL-205',
    name: 'Biella Worsted Wool Crepe',
    millName: 'Lanificio Fratelli Cerruti',
    countryOfOrigin: 'IT',
    fiberBreakdown: '100% Super 150s Worsted Wool',
    fiberCategory: 'wool',
    weaveStructure: 'crepe',
    occasion: 'suiting',
    gsm: 290,
    widthInches: 60.0,
    rollWidthInches: 60.0,
    drapeCoefficient: 0.58,
    drapeFluidityCoefficient: 0.58,
    stiffnessRating: 5.0,
    stretchPercentage: 4.0,
    transparencyRating: 0.0,
    tearResistance: '52 N (warp) / 50 N (weft)',
    pricePerYard: 120.0,
    swatchPrice: 25.0,
    pbrTexturesUrl: '/api/v1/fabrics/FAB-WOL-205/shader-assets',
    thumbnailUrl: '/textures/fabrics/charcoal-wool.svg',
    normalMapUrl: '/textures/fabrics/charcoal-wool.svg',
    activeBolt: {
      id: 'bolt_903',
      dyeLotCode: 'LOT-2026-CHR-08',
      remainingContinuousYards: 18.75,
      isLowStock: false,
      warehouseLocation: 'RACK-C-02',
    },
    continuousBoltRolls: [
      {
        id: 'bolt_903',
        dyeLotCode: 'LOT-2026-CHR-08',
        remainingContinuousYards: 18.75,
        isLowStock: false,
        warehouseLocation: 'RACK-C-02',
      },
    ],
    careInstructions: {
      ironTemperatureMaxC: 150,
      dryCleanOnly: true,
      interliningRecommendation: 'Wool hair canvas and domette',
    },
    createdAt: '2026-10-27T10:30:00.000Z',
  },
  {
    id: 'FAB-VLV-730',
    name: 'Lyon Silk-Rayon Velvet',
    millName: 'Bouton Renaud',
    countryOfOrigin: 'FR',
    fiberBreakdown: '82% Viscose Rayon Pile, 18% Silk Base',
    fiberCategory: 'velvet',
    weaveStructure: 'plain',
    occasion: 'evening',
    gsm: 420,
    widthInches: 52.0,
    rollWidthInches: 52.0,
    drapeCoefficient: 0.65,
    drapeFluidityCoefficient: 0.65,
    stiffnessRating: 4.0,
    stretchPercentage: 1.0,
    transparencyRating: 0.0,
    tearResistance: '42 N (warp) / 40 N (weft)',
    pricePerYard: 160.0,
    swatchPrice: 25.0,
    pbrTexturesUrl: '/api/v1/fabrics/FAB-VLV-730/shader-assets',
    thumbnailUrl: '/textures/fabrics/obsidian-velvet.svg',
    normalMapUrl: '/textures/fabrics/obsidian-velvet.svg',
    activeBolt: {
      id: 'bolt_904',
      dyeLotCode: 'LOT-2026-OBS-11',
      remainingContinuousYards: 12.0,
      isLowStock: false,
      warehouseLocation: 'RACK-D-09',
    },
    continuousBoltRolls: [
      {
        id: 'bolt_904',
        dyeLotCode: 'LOT-2026-OBS-11',
        remainingContinuousYards: 12.0,
        isLowStock: false,
        warehouseLocation: 'RACK-D-09',
      },
    ],
    careInstructions: {
      ironTemperatureMaxC: 110,
      dryCleanOnly: true,
      interliningRecommendation: 'Needle-board steaming only; never press directly',
    },
    createdAt: '2026-10-27T10:45:00.000Z',
  },
  {
    id: 'FAB-LIN-112',
    name: 'Normandy Raw Slub Linen',
    millName: 'Libeco Lagae',
    countryOfOrigin: 'BE',
    fiberBreakdown: '100% Normandy Raw Flax Linen',
    fiberCategory: 'linen',
    weaveStructure: 'plain',
    occasion: 'daywear',
    gsm: 240,
    widthInches: 58.0,
    rollWidthInches: 58.0,
    drapeCoefficient: 0.38,
    drapeFluidityCoefficient: 0.38,
    stiffnessRating: 7.0,
    stretchPercentage: 0.5,
    transparencyRating: 0.15,
    tearResistance: '60 N (warp) / 58 N (weft)',
    pricePerYard: 85.0,
    swatchPrice: 25.0,
    pbrTexturesUrl: '/api/v1/fabrics/FAB-LIN-112/shader-assets',
    thumbnailUrl: '/textures/fabrics/heritage-linen.svg',
    normalMapUrl: '/textures/fabrics/heritage-linen.svg',
    activeBolt: {
      id: 'bolt_905',
      dyeLotCode: 'LOT-2026-FLX-05',
      remainingContinuousYards: 4.25, // < 5.0 yds -> Low Stock Trigger!
      isLowStock: true,
      warehouseLocation: 'RACK-E-01',
    },
    continuousBoltRolls: [
      {
        id: 'bolt_905',
        dyeLotCode: 'LOT-2026-FLX-05',
        remainingContinuousYards: 4.25,
        isLowStock: true,
        warehouseLocation: 'RACK-E-01',
      },
    ],
    careInstructions: {
      ironTemperatureMaxC: 200,
      dryCleanOnly: false,
      interliningRecommendation: 'Preshrunk lightweight linen or cotton lawn',
    },
    createdAt: '2026-10-27T11:00:00.000Z',
  },
  {
    id: 'FAB-BRC-608',
    name: 'Venetian Floral Gold Brocade',
    millName: 'Rubelli Venezia',
    countryOfOrigin: 'IT',
    fiberBreakdown: '60% Spun Silk, 40% Gilded Metal Weft',
    fiberCategory: 'brocade',
    weaveStructure: 'brocade',
    occasion: 'gala',
    gsm: 380,
    widthInches: 55.0,
    rollWidthInches: 55.0,
    drapeCoefficient: 0.32,
    drapeFluidityCoefficient: 0.32,
    stiffnessRating: 8.5,
    stretchPercentage: 0.0,
    transparencyRating: 0.0,
    tearResistance: '65 N (warp) / 62 N (weft)',
    pricePerYard: 240.0,
    swatchPrice: 25.0,
    pbrTexturesUrl: '/api/v1/fabrics/FAB-BRC-608/shader-assets',
    thumbnailUrl: '/textures/fabrics/venetian-brocade.svg',
    normalMapUrl: '/textures/fabrics/venetian-brocade.svg',
    activeBolt: {
      id: 'bolt_906',
      dyeLotCode: 'LOT-2026-GLD-02',
      remainingContinuousYards: 8.5,
      isLowStock: false,
      warehouseLocation: 'RACK-B-07',
    },
    continuousBoltRolls: [
      {
        id: 'bolt_906',
        dyeLotCode: 'LOT-2026-GLD-02',
        remainingContinuousYards: 8.5,
        isLowStock: false,
        warehouseLocation: 'RACK-B-07',
      },
    ],
    careInstructions: {
      ironTemperatureMaxC: 110,
      dryCleanOnly: true,
      interliningRecommendation: 'Fine cotton sateen underline with soft buckram support',
    },
    createdAt: '2026-10-27T11:15:00.000Z',
  },
  {
    id: 'FAB-SLK-120',
    name: 'Como Silk Chiffon Float',
    millName: 'Clerici Tessuto',
    countryOfOrigin: 'IT',
    fiberBreakdown: '100% Organzine Silk Crepe',
    fiberCategory: 'silk',
    weaveStructure: 'chiffon',
    occasion: 'bridal',
    gsm: 65,
    widthInches: 54.0,
    rollWidthInches: 54.0,
    drapeCoefficient: 0.95,
    drapeFluidityCoefficient: 0.95,
    stiffnessRating: 1.2,
    stretchPercentage: 3.5,
    transparencyRating: 0.85,
    tearResistance: '18 N (warp) / 16 N (weft)',
    pricePerYard: 110.0,
    swatchPrice: 25.0,
    pbrTexturesUrl: '/api/v1/fabrics/FAB-SLK-120/shader-assets',
    thumbnailUrl: '/textures/fabrics/champagne-cupro.svg',
    normalMapUrl: '/textures/fabrics/champagne-cupro.svg',
    activeBolt: {
      id: 'bolt_907',
      dyeLotCode: 'LOT-2026-WHT-03',
      remainingContinuousYards: 31.0,
      isLowStock: false,
      warehouseLocation: 'RACK-A-04',
    },
    continuousBoltRolls: [
      {
        id: 'bolt_907',
        dyeLotCode: 'LOT-2026-WHT-03',
        remainingContinuousYards: 31.0,
        isLowStock: false,
        warehouseLocation: 'RACK-A-04',
      },
    ],
    careInstructions: {
      ironTemperatureMaxC: 110,
      dryCleanOnly: true,
      interliningRecommendation: 'Self-fabric bias lining or fine silk tulle',
    },
    createdAt: '2026-10-27T11:30:00.000Z',
  },
  {
    id: 'FAB-WOL-340',
    name: 'Savile Row Heavy Wool Twill',
    millName: 'Holland & Sherry',
    countryOfOrigin: 'GB',
    fiberBreakdown: '100% British Wool Cheviot',
    fiberCategory: 'wool',
    weaveStructure: 'twill',
    occasion: 'suiting',
    gsm: 460,
    widthInches: 59.0,
    rollWidthInches: 59.0,
    drapeCoefficient: 0.40,
    drapeFluidityCoefficient: 0.40,
    stiffnessRating: 7.8,
    stretchPercentage: 2.0,
    transparencyRating: 0.0,
    tearResistance: '70 N (warp) / 68 N (weft)',
    pricePerYard: 195.0,
    swatchPrice: 25.0,
    pbrTexturesUrl: '/api/v1/fabrics/FAB-WOL-340/shader-assets',
    thumbnailUrl: '/textures/fabrics/camel-cashmere.svg',
    normalMapUrl: '/textures/fabrics/camel-cashmere.svg',
    activeBolt: {
      id: 'bolt_908',
      dyeLotCode: 'LOT-2026-NVY-09',
      remainingContinuousYards: 3.75, // < 5.0 yds -> Low Stock!
      isLowStock: true,
      warehouseLocation: 'RACK-C-05',
    },
    continuousBoltRolls: [
      {
        id: 'bolt_908',
        dyeLotCode: 'LOT-2026-NVY-09',
        remainingContinuousYards: 3.75,
        isLowStock: true,
        warehouseLocation: 'RACK-C-05',
      },
    ],
    careInstructions: {
      ironTemperatureMaxC: 160,
      dryCleanOnly: true,
      interliningRecommendation: 'Full canvas construction with horsehair chest piece',
    },
    createdAt: '2026-10-27T11:45:00.000Z',
  },
];

/**
 * Maps high-level occasion terminology to backend schema tags.
 * e.g. "gala" -> "black_tie", "evening" -> "cocktail"
 */
function normalizeOccasion(occasion: string): string {
  const normalized = occasion.toLowerCase().trim();
  if (normalized === 'gala') return 'black_tie';
  if (normalized === 'evening') return 'cocktail';
  return normalized;
}

/**
 * In-memory search & faceted filtering engine (<150ms latency per FEAT-001)
 */
export function queryCatalog(
  fabrics: FabricDetail[],
  filters: CatalogFilterState,
  limit: number = 12
): CatalogResponse {
  const query = filters.searchQuery.toLowerCase().trim();
  const selectedFiber = filters.selectedFiber ? filters.selectedFiber.toLowerCase().trim() : null;
  const selectedWeave = filters.selectedWeave ? filters.selectedWeave.toLowerCase().trim() : null;
  const selectedOccasion = filters.selectedOccasion ? normalizeOccasion(filters.selectedOccasion) : null;

  const filtered = fabrics.filter((fabric) => {
    // 1. Text search
    if (query) {
      const matchName = fabric.name.toLowerCase().includes(query);
      const matchMill = fabric.millName.toLowerCase().includes(query);
      const matchFiber = fabric.fiberBreakdown.toLowerCase().includes(query);
      const matchId = fabric.id.toLowerCase().includes(query);
      const matchOccasion = fabric.occasion?.toLowerCase().replace(/_/g, ' ').includes(query) ?? false;
      const matchWeave = fabric.weaveStructure?.toLowerCase().includes(query) ?? false;
      if (!matchName && !matchMill && !matchFiber && !matchId && !matchOccasion && !matchWeave) {
        return false;
      }
    }

    // 2. Fiber filter
    if (selectedFiber && selectedFiber !== 'all') {
      const cat = fabric.fiberCategory?.toLowerCase();
      // Special allowance: brocade can match category or weave
      if (selectedFiber === 'brocade' && (cat === 'brocade' || fabric.weaveStructure === 'brocade')) {
        // match allowed
      } else if (cat !== selectedFiber) {
        return false;
      }
    }

    // 3. Weave structure filter
    if (selectedWeave && selectedWeave !== 'all') {
      if (fabric.weaveStructure?.toLowerCase() !== selectedWeave) {
        return false;
      }
    }

    // 4. Occasion filter
    if (selectedOccasion && selectedOccasion !== 'all') {
      const normOccasion = normalizeOccasion(fabric.occasion || '');
      if (normOccasion !== selectedOccasion && fabric.occasion !== selectedOccasion) {
        return false;
      }
    }

    // 5. GSM Range
    if (fabric.gsm < filters.minGsm || fabric.gsm > filters.maxGsm) {
      return false;
    }

    // 6. Continuous yardage availability minimum
    if (filters.minContinuousYards > 0) {
      if (fabric.activeBolt.remainingContinuousYards < filters.minContinuousYards) {
        return false;
      }
    }

    return true;
  });

  // Calculate facets across full matching set (before pagination)
  const fiberCounts: Record<string, number> = {};
  const weaveCounts: Record<string, number> = {};
  const gsmRanges: Record<string, number> = {
    'light (50-180)': 0,
    'medium (181-320)': 0,
    'heavy (321-600)': 0,
  };

  for (const f of fabrics) {
    if (f.fiberCategory) {
      fiberCounts[f.fiberCategory] = (fiberCounts[f.fiberCategory] || 0) + 1;
    }
    if (f.weaveStructure) {
      weaveCounts[f.weaveStructure] = (weaveCounts[f.weaveStructure] || 0) + 1;
    }
    if (f.gsm <= 180) {
      gsmRanges['light (50-180)']++;
    } else if (f.gsm <= 320) {
      gsmRanges['medium (181-320)']++;
    } else {
      gsmRanges['heavy (321-600)']++;
    }
  }

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    switch (filters.sortBy) {
      case 'price_asc':
        return a.pricePerYard - b.pricePerYard;
      case 'price_desc':
        return b.pricePerYard - a.pricePerYard;
      case 'gsm_desc':
        return b.gsm - a.gsm;
      case 'gsm_asc':
        return a.gsm - b.gsm;
      case 'newest':
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case 'featured':
      default:
        // Featured luxury default: descending price then descending GSM
        return b.pricePerYard !== a.pricePerYard
          ? b.pricePerYard - a.pricePerYard
          : b.gsm - a.gsm;
    }
  });

  // Pagination
  const totalItems = sorted.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const currentPage = Math.max(1, Math.min(filters.currentPage, totalPages));
  const startIndex = (currentPage - 1) * limit;
  const paginatedItems = sorted.slice(startIndex, startIndex + limit);

  const items: FabricCatalogItem[] = paginatedItems.map((f) => ({
    id: f.id,
    name: f.name,
    millName: f.millName,
    countryOfOrigin: f.countryOfOrigin,
    fiberBreakdown: f.fiberBreakdown,
    fiberCategory: f.fiberCategory,
    weaveStructure: f.weaveStructure,
    occasion: f.occasion,
    gsm: f.gsm,
    widthInches: f.widthInches,
    drapeCoefficient: f.drapeCoefficient,
    stiffnessRating: f.stiffnessRating,
    pricePerYard: f.pricePerYard,
    remainingContinuousYards: f.activeBolt.remainingContinuousYards,
    isLowStock: f.activeBolt.remainingContinuousYards < 5.0,
    thumbnailUrl: f.thumbnailUrl || '/textures/fabrics/silk-jacquard.svg',
    normalMapUrl: f.normalMapUrl || '/textures/fabrics/silk-jacquard.svg',
  }));

  return {
    items,
    pagination: {
      totalItems,
      totalPages,
      currentPage,
      limit,
    },
    facets: {
      fiberCounts,
      weaveCounts,
      gsmRanges,
    },
  };
}

/**
 * Primary catalog fetcher with graceful local fallback per FEAT-001
 */
export async function fetchCatalog(
  filters: CatalogFilterState,
  limit: number = 12
): Promise<CatalogResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_CORE_API_URL || '';
  const searchParams = new URLSearchParams();

  if (filters.searchQuery) searchParams.set('query', filters.searchQuery);
  if (filters.selectedFiber && filters.selectedFiber !== 'all') {
    searchParams.set('fiber', filters.selectedFiber);
  }
  if (filters.minGsm > 50) searchParams.set('minGsm', filters.minGsm.toString());
  if (filters.maxGsm < 600) searchParams.set('maxGsm', filters.maxGsm.toString());
  if (filters.selectedWeave && filters.selectedWeave !== 'all') {
    searchParams.set('weave', filters.selectedWeave);
  }
  if (filters.selectedOccasion && filters.selectedOccasion !== 'all') {
    searchParams.set('occasion', normalizeOccasion(filters.selectedOccasion));
  }
  if (filters.minContinuousYards > 0) {
    searchParams.set('minContinuousYards', filters.minContinuousYards.toString());
  }
  searchParams.set('sort', filters.sortBy);
  searchParams.set('page', filters.currentPage.toString());
  searchParams.set('limit', limit.toString());

  try {
    const res = await fetch(`${baseUrl}/api/v1/fabrics?${searchParams.toString()}`, {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      return data as CatalogResponse;
    }
  } catch (_err) {
    // Graceful offline / network failure fallback per FEAT-001
  }

  // Return locally filtered cached catalog
  return queryCatalog(FALLBACK_FABRICS, filters, limit);
}

/**
 * Fetch a single fabric detail record with fallback
 */
export async function fetchFabric(id: string): Promise<FabricDetail | null> {
  const baseUrl = process.env.NEXT_PUBLIC_CORE_API_URL || '';
  try {
    const res = await fetch(`${baseUrl}/api/v1/fabrics/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      return (await res.json()) as FabricDetail;
    }
  } catch (_err) {
    // Offline / fallback
  }

  const found = FALLBACK_FABRICS.find(
    (f) => f.id.toLowerCase() === id.toLowerCase()
  );
  return found || null;
}
