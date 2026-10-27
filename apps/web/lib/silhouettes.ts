/**
 * Architectural Garment Silhouette Presets
 * Spec Anchors: ASSETS.md (A-024..A-031), FEAT-004, C-011, Screen 04
 */

import { SilhouettePreset } from './fitting-types';

export const SILHOUETTE_PRESETS: SilhouettePreset[] = [
  {
    id: 'corseted_mermaid',
    assetId: 'A-024',
    name: 'Corseted Mermaid Gown',
    category: 'Couture Evening',
    description: 'Sculptural boned bodice contouring through the waist and hips, flaring into a dramatic dramatic bell hemline.',
    recommendedFabrics: ['Como Silk Jacquard', 'Heavy Silk Duchess Satin', 'Architectural Mikado'],
    svgPath: 'M50 15 C45 15, 38 28, 38 42 C38 58, 44 70, 42 82 C38 98, 20 120, 16 135 L84 135 C80 120, 62 98, 58 82 C56 70, 62 58, 62 42 C62 28, 55 15, 50 15 Z',
  },
  {
    id: 'grecian_bias_gown',
    assetId: 'A-025',
    name: 'Grecian Bias Slip Gown',
    category: 'Couture Evening',
    description: 'Effortless bias-cut cascade draped on the diagonal grain with fluid cowl neckline and low back curve.',
    recommendedFabrics: ['Fluid Silk Crepe de Chine', 'Mulberry Silk Charmeuse', 'Grecian Rayon Jersey'],
    svgPath: 'M40 18 L32 40 C34 65, 30 95, 26 135 L74 135 C70 95, 66 65, 68 40 L60 18 C55 24, 45 24, 40 18 Z',
  },
  {
    id: 'architectural_tuxedo',
    assetId: 'A-026',
    name: 'Structured Savile Row Tuxedo',
    category: 'Tailored Suiting',
    description: 'Sharp peak-lapel evening jacket with roped shoulders, horsehair canvas interlining, and straight trousers.',
    recommendedFabrics: ['Super 150s Worsted Wool', 'Barathea Silk Wool', 'Savile Row Flannel'],
    svgPath: 'M30 18 L20 40 L34 85 L28 135 L48 135 L48 88 L52 88 L52 135 L72 135 L66 85 L80 40 L70 18 L50 28 Z',
  },
  {
    id: 'ballgown_offshoulder',
    assetId: 'A-027',
    name: 'Off-Shoulder Ballgown',
    category: 'Bridal Architecture',
    description: 'Sculpted fold-over portrait collar framing the shoulders, supported by crinoline petticoats.',
    recommendedFabrics: ['Silk Zibeline', 'Lyon Silk Brocade', 'Architectural Organza'],
    svgPath: 'M25 25 C35 30, 65 30, 75 25 L65 55 C65 65, 75 80, 88 135 L12 135 C25 80, 35 65, 35 55 Z',
  },
  {
    id: 'asymmetric_cape_dress',
    assetId: 'A-028',
    name: 'Asymmetric Sculptural Cape Dress',
    category: 'Couture Evening',
    description: 'One-shoulder column gown juxtaposed with a billowing pleated cape wing suspended from the opposite shoulder.',
    recommendedFabrics: ['Double Silk Georgette', 'Liquid Metal Lamé', 'Como Habotai Silk'],
    svgPath: 'M35 15 L32 50 C32 80, 34 110, 32 135 L68 135 C68 100, 75 60, 90 40 C85 25, 75 20, 65 15 Z',
  },
  {
    id: 'high_neck_column',
    assetId: 'A-029',
    name: 'Minimalist High-Neck Column',
    category: 'Contemporary Minimalist',
    description: 'Sleek architectural sheath silhouette featuring a tailored mandarin mock neck and elongated vertical seams.',
    recommendedFabrics: ['Heavy Wool Crepe', 'Double Face Cashmere', 'Silk Cady'],
    svgPath: 'M44 14 L42 22 L36 45 C36 75, 37 105, 36 135 L64 135 C63 105, 64 75, 64 45 L58 22 L56 14 Z',
  },
  {
    id: 'tailored_blazer',
    assetId: 'A-030',
    name: 'Double-Breasted Couture Blazer',
    category: 'Tailored Suiting',
    description: 'Eight-button sartorial silhouette with defined pagoda shoulder line and deep dual side vents.',
    recommendedFabrics: ['Herringbone Tweed', 'Biella Flannel Cashmere', 'Structured Cotton Velvet'],
    svgPath: 'M28 20 L18 42 L26 95 L74 95 L82 42 L72 20 L50 32 Z',
  },
  {
    id: 'aline_slip',
    assetId: 'A-031',
    name: 'Bias-Cut A-Line Slip',
    category: 'Contemporary Minimalist',
    description: 'Clean mid-century A-line geometry suspended from spaghetti rouleau straps, grazing just above the floor.',
    recommendedFabrics: ['Washed Silk Charmeuse', 'Fine Belgian Linen', 'Viscose Twill'],
    svgPath: 'M42 16 L40 35 L26 135 L74 135 L60 35 L58 16 Z',
  },
];

export function getSilhouetteById(id: string): SilhouettePreset | undefined {
  return SILHOUETTE_PRESETS.find((preset) => preset.id === id);
}
