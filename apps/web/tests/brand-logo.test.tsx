import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { BrandLogo } from '../components/brand/BrandLogo';

describe('BrandLogo & Official Brand Asset Presentation', () => {
  const brandDir = path.resolve(__dirname, '../public/brand');

  it('contains the official lockup and wordmark vector assets on disk (ASSETS.md A-007..A-010)', () => {
    const assets = [
      'lockup-horizontal.svg',
      'lockup-horizontal-dark.svg',
      'wordmark.svg',
      'wordmark-dark.svg',
      'monogram-gold.svg',
    ];
    for (const asset of assets) {
      const fullPath = path.join(brandDir, asset);
      expect(fs.existsSync(fullPath), `Asset file missing: ${asset}`).toBe(true);
      const content = fs.readFileSync(fullPath, 'utf8');
      expect(content).toContain('<svg');
      expect(content).toContain('</svg>');
    }
  });

  it('renders official horizontal lockup vectors in header mode (variant="lockup")', () => {
    const html = renderToStaticMarkup(<BrandLogo variant="lockup" size="md" asLink={false} />);

    // Must render both light and dark lockup vectors for theme toggling
    expect(html).toContain('src="/brand/lockup-horizontal.svg"');
    expect(html).toContain('src="/brand/lockup-horizontal-dark.svg"');
    expect(html).toContain('dark:hidden');
    expect(html).toContain('hidden dark:inline-block');
    expect(html).toContain('alt="DRAPE"');
  });

  it('renders official standalone wordmark vectors in footer/masthead mode (variant="wordmark")', () => {
    const html = renderToStaticMarkup(<BrandLogo variant="wordmark" size="sm" asLink={false} />);

    // Must render both light and dark wordmark vectors
    expect(html).toContain('src="/brand/wordmark.svg"');
    expect(html).toContain('src="/brand/wordmark-dark.svg"');
    expect(html).toContain('dark:hidden');
    expect(html).toContain('hidden dark:inline-block');
    expect(html).toContain('alt="DRAPE"');
  });

  it('renders standalone monogram emblem (variant="monogram")', () => {
    const htmlGold = renderToStaticMarkup(<BrandLogo variant="monogram" monogramVariant="gold" asLink={false} />);
    expect(htmlGold).toContain('src="/brand/monogram-gold.svg"');

    const htmlDark = renderToStaticMarkup(<BrandLogo variant="monogram" monogramVariant="dark" asLink={false} />);
    expect(htmlDark).toContain('src="/brand/monogram-dark.svg"');
  });

  it('wraps with accessible navigation anchor when asLink is true', () => {
    const html = renderToStaticMarkup(<BrandLogo variant="lockup" size="md" asLink={true} />);
    expect(html).toContain('href="/"');
    expect(html).toContain('aria-label="Drape Atelier Home"');
  });
});
