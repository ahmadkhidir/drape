/**
 * Drape Fabric Catalog Type Definitions
 * Spec Anchors: C-007, C-008, FEAT-001, screens/02-fabric-catalog.md, screens/03-fabric-detail-view.md
 */

export type FiberCategory = 'silk' | 'wool' | 'linen' | 'cotton' | 'blend' | 'velvet' | 'brocade';
export type WeaveStructure = 'twill' | 'satin' | 'jacquard' | 'crepe' | 'plain' | 'brocade' | 'chiffon';
export type OccasionType = 'black_tie' | 'bridal' | 'daywear' | 'cocktail' | 'suiting' | 'gala' | 'evening';
export type CatalogSortOption = 'featured' | 'price_asc' | 'price_desc' | 'gsm_desc' | 'gsm_asc' | 'newest';

export interface ActiveBolt {
  id: string;
  dyeLotCode: string;
  remainingContinuousYards: number;
  isLowStock: boolean;
  warehouseLocation?: string;
}

export interface CareInstructions {
  ironTemperatureMaxC: number;
  dryCleanOnly: boolean;
  interliningRecommendation: string;
}

export interface FabricCatalogItem {
  id: string; // e.g. "FAB-SLK-892"
  name: string;
  millName: string;
  countryOfOrigin: string; // ISO 3166-1 alpha-2, e.g. "IT"
  fiberBreakdown: string;
  fiberCategory?: FiberCategory;
  weaveStructure?: WeaveStructure;
  occasion?: OccasionType;
  gsm: number;
  widthInches: number;
  drapeCoefficient: number; // 0.0=rigid, 1.0=liquid fluid
  stiffnessRating: number; // 0.0 to 10.0
  pricePerYard: number; // USD
  remainingContinuousYards: number;
  isLowStock: boolean; // true when remainingContinuousYards < 5.0
  thumbnailUrl: string;
  normalMapUrl: string;
}

export interface CatalogPagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface CatalogFacets {
  fiberCounts: Record<string, number>;
  weaveCounts: Record<string, number>;
  gsmRanges: Record<string, number>;
}

export interface CatalogResponse {
  items: FabricCatalogItem[];
  pagination: CatalogPagination;
  facets: CatalogFacets;
}

export interface FabricDetail {
  id: string;
  name: string;
  millName: string;
  countryOfOrigin: string;
  fiberBreakdown: string;
  fiberCategory?: FiberCategory;
  weaveStructure?: WeaveStructure;
  occasion?: OccasionType;
  gsm: number;
  widthInches: number;
  rollWidthInches?: number;
  drapeCoefficient: number;
  drapeFluidityCoefficient?: number;
  stiffnessRating: number;
  stretchPercentage: number;
  transparencyRating: number;
  tearResistance?: string;
  pricePerYard: number;
  swatchPrice: number; // $25.00
  pbrTexturesUrl: string;
  thumbnailUrl?: string;
  normalMapUrl?: string;
  activeBolt: ActiveBolt;
  continuousBoltRolls?: ActiveBolt[];
  careInstructions: CareInstructions;
  createdAt?: string;
}

export interface CatalogFilterState {
  searchQuery: string;
  selectedFiber: string | null; // e.g. "silk", "wool", "linen", "velvet", "brocade"
  minGsm: number;
  maxGsm: number;
  selectedWeave: string | null; // e.g. "twill", "satin", "jacquard", "crepe"
  selectedOccasion: string | null; // e.g. "gala", "bridal", "evening", "daywear", "suiting"
  minContinuousYards: number;
  sortBy: CatalogSortOption;
  currentPage: number;
}
