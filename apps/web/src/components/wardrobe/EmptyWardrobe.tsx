'use client';

import React from 'react';
import Link from 'next/link';

interface EmptyWardrobeProps {
  onExploreTextiles?: () => void;
}

/**
 * Empty Wardrobe State Component
 * Spec Anchor: screens/09-digital-wardrobe.md, ASSETS.md (Empty Wardrobe Artwork)
 *
 * Declared Asset Direction:
 * "An antique wooden tailor valet stand holding a clean brass hanger in an airy, sunlit Parisian studio."
 */
export function EmptyWardrobe({ onExploreTextiles }: EmptyWardrobeProps) {
  return (
    <div
      data-testid="empty-wardrobe"
      className="flex flex-col items-center justify-center py-16 px-4 sm:px-6 lg:px-8 text-center max-w-2xl mx-auto"
    >
      {/* Declared Empty Wardrobe Artwork: Valet Stand & Clean Brass Hanger */}
      <div
        className="relative w-56 h-56 sm:w-64 sm:h-64 mb-8 flex items-center justify-center rounded-2xl bg-gradient-to-b from-stone-50 via-white to-stone-100 border border-stone-200/80 shadow-inner group overflow-hidden"
        aria-label="An antique wooden tailor valet stand holding a clean brass hanger in an airy, sunlit Parisian studio"
        role="img"
      >
        {/* Soft studio ambient light backdrop */}
        <div className="absolute inset-0 bg-radial from-amber-100/40 via-stone-100/20 to-transparent pointer-events-none" />

        {/* Tailor Valet Stand & Brass Hanger Vector Illustration */}
        <svg
          viewBox="0 0 200 200"
          className="w-44 h-44 sm:w-48 sm:h-48 drop-shadow-sm text-stone-700 transition-transform duration-700 group-hover:scale-105"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Parisian Atelier Window Light Rays */}
          <path
            d="M20 10 L80 190 M50 10 L110 190 M80 10 L140 190"
            stroke="#e7e5e4"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            className="opacity-40"
          />

          {/* Antique Wooden Valet Stand Base */}
          <path d="M70 185 L130 185" stroke="#78350f" strokeWidth="4" />
          <path d="M100 185 L100 95" stroke="#78350f" strokeWidth="4" />
          <path d="M85 185 L100 165 L115 185" stroke="#78350f" strokeWidth="2.5" />

          {/* Turned Wood Finial & Trouser Bar */}
          <circle cx="100" cy="95" r="4" fill="#92400e" stroke="#78350f" strokeWidth="1.5" />
          <line x1="75" y1="120" x2="125" y2="120" stroke="#92400e" strokeWidth="3" />

          {/* Clean Brass Hanger Hook */}
          <path
            d="M100 70 C100 62, 108 55, 114 59 C119 63, 114 72, 100 77"
            stroke="#d97706"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Contoured Brass Shoulder Hanger */}
          <path
            d="M60 92 C75 82, 90 77, 100 77 C110 77, 125 82, 140 92"
            stroke="#d97706"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <line x1="64" y1="92" x2="136" y2="92" stroke="#d97706" strokeWidth="2" />

          {/* Subtle Atelier Measuring Tape Ribbon */}
          <path
            d="M102 96 C106 110, 98 125, 104 140 C107 148, 105 158, 107 165"
            stroke="#c2410c"
            strokeWidth="1.5"
            strokeDasharray="2 3"
            className="opacity-75"
          />
        </svg>

        {/* Brass Emblem Pill */}
        <div className="absolute bottom-3 px-3 py-1 bg-stone-900/90 backdrop-blur text-amber-200 text-[10px] font-mono tracking-widest uppercase rounded-full shadow">
          Atelier Valet
        </div>
      </div>

      {/* Declared Headline */}
      <h2
        data-testid="empty-wardrobe-headline"
        className="text-2xl sm:text-3xl font-serif font-light text-stone-900 tracking-tight mb-3"
      >
        Your wardrobe is awaiting its first commission
      </h2>

      {/* Editorial Guidance */}
      <p className="text-stone-600 text-sm sm:text-base leading-relaxed mb-8 max-w-lg font-sans">
        Every bespoke wardrobe begins with extraordinary cloth. Select from heritage Italian silk brocades,
        Savile Row worsted wools, and liquid satins to simulate your first neural fitting or commission cut yardage.
      </p>

      {/* Declared CTA Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <Link
          href="/catalog"
          onClick={onExploreTextiles}
          data-testid="explore-textiles-cta"
          className="inline-flex items-center justify-center px-8 py-3.5 bg-stone-900 text-stone-50 text-xs font-semibold tracking-widest uppercase rounded-md shadow-md hover:bg-stone-800 transition-colors duration-200 border border-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        >
          <span>Explore Textiles</span>
          <svg
            className="w-4 h-4 ml-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>

        <Link
          href="/fitting"
          className="inline-flex items-center justify-center px-6 py-3.5 bg-white text-stone-800 text-xs font-semibold tracking-widest uppercase rounded-md border border-stone-300 hover:border-stone-400 hover:bg-stone-50 transition-colors duration-200"
        >
          Simulate 3D Fitting
        </Link>
      </div>
    </div>
  );
}
