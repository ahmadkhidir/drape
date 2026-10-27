/**
 * Drape Luxury Brand & Design System Tokens
 * Source of Truth: docs/Drape/branding.md
 * Permanent Spec Anchor: BRANDING-PALETTE
 */

export const brandTokens = {
  // Brand Luxury Anchors
  alabaster: '#FBF9F5',
  obsidian: '#11100F',
  gold: '#C5A059',
  ink: '#111318',

  // Primary Colors — 9-shade Couture Ink scale
  primary: {
    900: '#111318',
    800: '#1C1F26',
    700: '#282D37',
    600: '#3A414F',
    500: '#4F596C',
    400: '#707C94',
    300: '#9AA4B8',
    200: '#C9D0DD',
    100: '#EAEFF5',
  },

  // Neutral Colors — 9-shade Warm Ecru & Charcoal scale
  grey: {
    900: '#141312',
    800: '#262422',
    700: '#403D39',
    600: '#635F59',
    500: '#8C867D',
    400: '#B8B1A5',
    300: '#DCD6CC',
    200: '#EFECE6',
    100: '#F6F4F0',
    50: '#FBF9F5',
  },

  // Accent Colors — Spun Gold Metallic scale
  accent: {
    900: '#5E4B24',
    700: '#8C7136',
    500: '#C5A059',
    300: '#E0C792',
    100: '#F9F4EA',
  },

  // Semantic Colors — 5-shade scales
  semantic: {
    success: {
      900: '#14462B',
      500: '#287D4E',
      100: '#EAF7F0',
    },
    warning: {
      900: '#5A3807',
      500: '#A66B13',
      100: '#FCF5EA',
    },
    error: {
      900: '#5A1A1A',
      500: '#A83232',
      100: '#FBEFEF',
    },
    info: {
      900: '#1C3B5E',
      500: '#326AA5',
      100: '#EFF5FB',
    },
  },

  // Typography font families
  fonts: {
    display: ['Playfair Display', 'Didot', 'Georgia', 'serif'],
    sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
    mono: ['JetBrains Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
  },

  // Radii
  radii: {
    none: '0px',
    sm: '3px',
    md: '6px',
    lg: '12px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 3px rgba(20,19,18,0.04)',
    md: '0 6px 16px rgba(20,19,18,0.06)',
    lg: '0 16px 36px rgba(20,19,18,0.09)',
    xl: '0 28px 64px rgba(20,19,18,0.14)',
  },
} as const;

export type BrandTokens = typeof brandTokens;
