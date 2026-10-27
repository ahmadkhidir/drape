import type { Config } from 'tailwindcss';
import { brandTokens } from './lib/tokens';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Luxury Palette Anchors
        alabaster: brandTokens.alabaster,
        obsidian: brandTokens.obsidian,
        gold: brandTokens.gold,
        ink: brandTokens.ink,

        // Scales
        primary: brandTokens.primary,
        grey: brandTokens.grey,
        accent: brandTokens.accent,
        semantic: brandTokens.semantic,

        // Semantic Role Mappings from branding.md
        surface: {
          DEFAULT: brandTokens.grey[50], // Warm Ecru
          secondary: brandTokens.grey[100],
          dark: brandTokens.grey[900], // Velvet Noir
        },
      },
      fontFamily: {
        display: ['var(--font-playfair)', ...brandTokens.fonts.display],
        sans: ['var(--font-inter)', ...brandTokens.fonts.sans],
        mono: ['var(--font-mono)', ...brandTokens.fonts.mono],
      },
      borderRadius: {
        none: brandTokens.radii.none,
        sm: brandTokens.radii.sm,
        md: brandTokens.radii.md,
        lg: brandTokens.radii.lg,
        full: brandTokens.radii.full,
      },
      boxShadow: {
        none: brandTokens.shadows.none,
        sm: brandTokens.shadows.sm,
        md: brandTokens.shadows.md,
        lg: brandTokens.shadows.lg,
        xl: brandTokens.shadows.xl,
      },
    },
  },
  plugins: [],
};

export default config;
