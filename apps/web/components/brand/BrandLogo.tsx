/* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import Link from 'next/link';

export interface BrandLogoProps {
  /**
   * Presentation variant:
   * - 'lockup': Official unified horizontal lockup asset (lockup-horizontal.svg / lockup-horizontal-dark.svg)
   * - 'wordmark': Official standalone serif wordmark asset (wordmark.svg / wordmark-dark.svg)
   * - 'monogram': Standalone monogram vector asset (monogram-gold.svg / monogram.svg / monogram-dark.svg)
   */
  variant?: 'lockup' | 'wordmark' | 'monogram';
  /**
   * Monogram color variant (only used when variant === 'monogram')
   */
  monogramVariant?: 'gold' | 'default' | 'dark';
  /**
   * Visual size preset
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to wrap in an accessible Next.js Link pointing to '/'
   */
  asLink?: boolean;
  className?: string;
  wordmarkClassName?: string;
  testId?: string;
}

/**
 * Drape Official Haute Couture Brand Logo & Masthead Component
 * Spec Anchors: docs/Drape/branding.md, ASSETS.md (A-007..A-010)
 *
 * Uses official vector assets:
 * - Header lockup: /brand/lockup-horizontal.svg & /brand/lockup-horizontal-dark.svg
 * - Editorial wordmark: /brand/wordmark.svg & /brand/wordmark-dark.svg
 * - Monogram emblem: /brand/monogram-gold.svg, /brand/monogram.svg, /brand/monogram-dark.svg
 */
export function BrandLogo({
  variant = 'lockup',
  monogramVariant = 'gold',
  size = 'md',
  asLink = true,
  className = '',
  wordmarkClassName = '',
  testId = 'brand-logo',
}: BrandLogoProps) {
  const heightClass = size === 'sm' ? 'h-6' : size === 'lg' ? 'h-10' : 'h-8';
  const wordmarkHeightClass = size === 'sm' ? 'h-5' : size === 'lg' ? 'h-8' : 'h-6';

  const monogramSrc =
    monogramVariant === 'gold'
      ? '/brand/monogram-gold.svg'
      : monogramVariant === 'dark'
      ? '/brand/monogram-dark.svg'
      : '/brand/monogram.svg';

  const content = (
    <span className={`inline-flex items-center ${className}`} data-testid={testId}>
      {/* 1. Official Horizontal Lockup (A-007 / A-008) for Headers & Mastheads */}
      {variant === 'lockup' && (
        <>
          <img
            src="/brand/lockup-horizontal.svg"
            alt="DRAPE"
            className={`${heightClass} w-auto object-contain dark:hidden`}
            data-testid="brand-lockup-light"
          />
          <img
            src="/brand/lockup-horizontal-dark.svg"
            alt="DRAPE"
            className={`${heightClass} w-auto object-contain hidden dark:inline-block`}
            data-testid="brand-lockup-dark"
          />
        </>
      )}

      {/* 2. Official Standalone Wordmark (A-009 / A-010) for Footers & Editorial Spreads */}
      {variant === 'wordmark' && (
        <>
          <img
            src="/brand/wordmark.svg"
            alt="DRAPE"
            className={`${wordmarkHeightClass} w-auto object-contain dark:hidden ${wordmarkClassName}`}
            data-testid="brand-wordmark-light"
          />
          <img
            src="/brand/wordmark-dark.svg"
            alt="DRAPE"
            className={`${wordmarkHeightClass} w-auto object-contain hidden dark:inline-block ${wordmarkClassName}`}
            data-testid="brand-wordmark-dark"
          />
        </>
      )}

      {/* 3. Standalone Monogram Mark (A-001..A-003) */}
      {variant === 'monogram' && (
        <img
          src={monogramSrc}
          alt="Drape Atelier Monogram"
          className={`${heightClass} w-auto object-contain`}
          data-testid="brand-monogram"
        />
      )}
    </span>
  );

  if (asLink) {
    return (
      <Link
        href="/"
        className="inline-flex items-center group focus:outline-none focus:ring-2 focus:ring-gold/50 rounded"
        aria-label="Drape Atelier Home"
      >
        {content}
      </Link>
    );
  }

  return content;
}
