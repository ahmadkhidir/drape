'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ClothSandbox } from '../components/canvas/ClothSandbox';
import { MicroWeaveInspector } from '../components/canvas/MicroWeaveInspector';
import { BrandLogo } from '../components/brand/BrandLogo';

interface FabricItem {
  id: string;
  sku: string;
  name: string;
  millName: string;
  origin: string;
  fiberBreakdown: string;
  threadCount: string;
  gsm: number;
  widthInches: number;
  drapeCoefficient: number;
  stiffnessRating: number;
  pricePerYard: number;
  description: string;
  textureUrl: string;
  weaveType: string;
}

const FEATURED_BOLTS: FabricItem[] = [
  {
    id: 'DR-SLK-01',
    sku: 'FAB-SLK-401',
    name: 'Luminous Ivory Duchesse',
    millName: 'Taroni Seta',
    origin: 'Como, Italy',
    fiberBreakdown: '100% Silk Duchesse',
    threadCount: '480 TPI (280 Warp / 200 Weft)',
    gsm: 280,
    widthInches: 54,
    drapeCoefficient: 0.32,
    stiffnessRating: 6.8,
    pricePerYard: 145,
    description: 'Heavyweight satin with high bending stiffness, sculpted architectural drape, and lustrous sheen.',
    textureUrl: '/textures/fabrics/ivory-satin.svg',
    weaveType: 'Duchesse Satin Weave',
  },
  {
    id: 'DR-VLV-04',
    sku: 'FAB-VLV-730',
    name: 'Midnight Noir Silk Velvet',
    millName: 'Atelier de Soierie Lyonnaise',
    origin: 'Lyon, France',
    fiberBreakdown: '82% Rayon, 18% Mulberry Silk',
    threadCount: '360 TPI (Tufted Cut-Pile)',
    gsm: 360,
    widthInches: 52,
    drapeCoefficient: 0.78,
    stiffnessRating: 2.1,
    pricePerYard: 180,
    description: 'Dense directional tufted pile with anisotropic light absorption and fluid cascading folds.',
    textureUrl: '/textures/fabrics/obsidian-velvet.svg',
    weaveType: 'Tufted Cut-Pile Velvet Weave',
  },
  {
    id: 'DR-WOL-02',
    sku: 'FAB-WOL-205',
    name: 'Charcoal Fine Wool Crepe',
    millName: 'Lanificio di Biella',
    origin: 'Biella, Italy',
    fiberBreakdown: '100% Super 150s Worsted Wool',
    threadCount: '410 TPI (210 Warp / 200 Weft)',
    gsm: 240,
    widthInches: 58,
    drapeCoefficient: 0.54,
    stiffnessRating: 4.5,
    pricePerYard: 120,
    description: 'High-twist wool yarn providing crisp tailoring resilience, organic drape recovery, and breathable wear.',
    textureUrl: '/textures/fabrics/charcoal-wool.svg',
    weaveType: 'High-Twist Wool Crepe Weave',
  },
];

export default function AtelierHomePage() {
  const [activeFabric, setActiveFabric] = useState<FabricItem>(FEATURED_BOLTS[0]);
  const [isMicroWeaveOpen, setIsMicroWeaveOpen] = useState<boolean>(false);
  const [inspectingFabric, setInspectingFabric] = useState<FabricItem>(FEATURED_BOLTS[0]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const handleOpenMicroWeave = (fabric: FabricItem) => {
    setInspectingFabric(fabric);
    setIsMicroWeaveOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface dark:bg-surface-dark transition-colors duration-300">
      {/* Atelier Luxury Header / Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-grey-300/60 dark:border-grey-700/60 bg-alabaster/80 dark:bg-obsidian/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Mark & Monogram Lockup */}
          <BrandLogo variant="lockup" size="md" />

          {/* Editorial Navigation */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium tracking-wide text-grey-700 dark:text-grey-300">
            <Link href="/catalog" className="hover:text-gold transition-colors">
              Fabric Catalog
            </Link>
            <Link href="/tailors" className="hover:text-gold transition-colors">
              Master Tailors
            </Link>
            <Link href="/wardrobe" className="hover:text-gold transition-colors">
              Digital Wardrobe
            </Link>
            <Link href="/fittings/new" className="hover:text-gold transition-colors">
              Neural Atelier
            </Link>
          </nav>

          {/* Atelier Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              type="button"
              className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-ink dark:text-alabaster border border-grey-300 dark:border-grey-700 rounded-md hover:border-gold hover:text-gold transition-all"
              aria-label="Toggle Soundscape Audio"
            >
              Sound: Off
            </button>
            <a
              href="/catalog"
              className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold uppercase tracking-wider text-alabaster bg-ink dark:bg-alabaster dark:text-ink rounded-md hover:bg-primary-700 dark:hover:bg-grey-200 transition-colors shadow-sm"
            >
              Explore Bolts
            </a>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-grey-700 dark:text-grey-300 hover:text-gold focus:outline-none"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <nav className="md:hidden border-t border-grey-300/60 dark:border-grey-700/60 bg-alabaster dark:bg-obsidian px-6 py-4 space-y-3 font-sans text-sm">
            <Link
              href="/catalog"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-grey-700 dark:text-grey-300 hover:text-gold py-1"
            >
              Fabric Catalog
            </Link>
            <Link
              href="/tailors"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-grey-700 dark:text-grey-300 hover:text-gold py-1"
            >
              Master Tailors
            </Link>
            <Link
              href="/wardrobe"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-grey-700 dark:text-grey-300 hover:text-gold py-1"
            >
              Digital Wardrobe
            </Link>
            <Link
              href="/fittings/new"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-grey-700 dark:text-grey-300 hover:text-gold py-1"
            >
              Neural Atelier
            </Link>
          </nav>
        )}
      </header>

      {/* Main Editorial Hero Section */}
      <main className="flex-1">
        <section className="relative px-4 sm:px-6 pt-8 sm:pt-12 pb-16 sm:pb-20 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Editorial Text Column */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
              <div className="inline-flex items-center space-x-2 text-xs font-semibold uppercase tracking-widest text-gold">
                <span className="h-px w-6 bg-gold" />
                <span>Haute Couture Digital Salon</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-ink dark:text-alabaster leading-[1.15]">
                The Sensory Digital Fabric Atelier
              </h1>

              <p className="font-sans text-base sm:text-lg text-grey-600 dark:text-grey-400 leading-relaxed max-w-xl">
                Immerse yourself in the world&apos;s most coveted European textiles.
                Experience the tactile weight of Como silk and the structured drape
                of Savile Row wools with lifelike fidelity before the first precision cut.
              </p>

              {/* Action Hierarchy */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                <Link
                  href="/catalog"
                  className="inline-flex justify-center items-center px-8 py-3.5 rounded-md text-sm font-semibold tracking-wide text-alabaster bg-ink hover:bg-primary-700 dark:bg-alabaster dark:text-ink dark:hover:bg-grey-200 shadow-md transition-all duration-200"
                >
                  Explore Catalog
                </Link>
                <Link
                  href="/fittings/new"
                  className="inline-flex justify-center items-center px-8 py-3.5 rounded-md text-sm font-semibold tracking-wide text-ink dark:text-alabaster border border-grey-300 dark:border-grey-700 hover:border-gold hover:text-gold transition-all duration-200"
                >
                  Try On in Neural Atelier
                </Link>
              </div>

              {/* Provenance Micro-Trust Signals */}
              <div className="pt-6 border-t border-grey-300/50 dark:border-grey-700/50 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs text-grey-600 dark:text-grey-400 font-sans">
                <div>
                  <span className="block font-semibold text-ink dark:text-alabaster">100% Provenance</span>
                  <span>Direct European Mills</span>
                </div>
                <div>
                  <span className="block font-semibold text-ink dark:text-alabaster">Kinetic Drape Fidelity</span>
                  <span>Continuous Fluid Motion</span>
                </div>
                <div>
                  <span className="block font-semibold text-ink dark:text-alabaster">Bespoke Accuracy</span>
                  <span>Millimeter Fit Calibration</span>
                </div>
              </div>
            </div>

            {/* Right Interactive WebGPU Canvas Column */}
            <div className="lg:col-span-7">
              <div className="relative rounded-lg overflow-hidden border border-grey-300/80 dark:border-grey-700/80 bg-obsidian shadow-lg">
                <div className="aspect-[4/3] sm:aspect-[16/10] w-full relative">
                  <ClothSandbox
                    fabricId={activeFabric.sku}
                    fabricName={activeFabric.name}
                    textureUrl={activeFabric.textureUrl}
                    gsm={activeFabric.gsm}
                    composition={activeFabric.fiberBreakdown}
                    weaveType={activeFabric.weaveType}
                    drapeCoefficient={activeFabric.drapeCoefficient}
                    stiffnessRating={activeFabric.stiffnessRating}
                    onInspectWeave={() => handleOpenMicroWeave(activeFabric)}
                    className="w-full h-full min-h-[380px] sm:min-h-[480px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Provenance Trust Banner */}
        <section id="provenance" className="border-y border-grey-300/60 dark:border-grey-700/60 bg-grey-100 dark:bg-grey-900/50 py-8 px-6">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-around gap-8 text-center text-xs tracking-widest uppercase font-semibold text-grey-600 dark:text-grey-400">
            <span>Como Silk Guild Certified</span>
            <span className="hidden md:inline text-gold">✦</span>
            <span>Biella Worsted Wool Consortium</span>
            <span className="hidden md:inline text-gold">✦</span>
            <span>Lyon Jacquard Archives</span>
            <span className="hidden md:inline text-gold">✦</span>
            <span>Savile Row Guild Approved</span>
          </div>
        </section>

        {/* Featured Luxury Swatches Rail */}
        <section id="catalog" className="py-20 px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-gold block mb-2">
                Curated Selection
              </span>
              <h2 className="font-display text-3xl font-semibold text-ink dark:text-alabaster">
                Featured Haute Couture Bolts
              </h2>
            </div>
            <p className="mt-4 md:mt-0 text-sm text-grey-600 dark:text-grey-400 max-w-md">
              Each textile is rigorously scanned and physically profiled for gravitational drape,
              tensile resistance, and light refraction. Click any bolt to calibrate the 3D physics simulator.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURED_BOLTS.map((fabric) => (
              <div
                key={fabric.id}
                className={`group rounded-lg border bg-surface dark:bg-surface-dark overflow-hidden p-6 transition-all cursor-pointer ${
                  activeFabric.id === fabric.id
                    ? 'border-gold shadow-md ring-1 ring-gold/40'
                    : 'border-grey-300 dark:border-grey-700 hover:shadow-md hover:border-grey-400'
                }`}
                onClick={() => setActiveFabric(fabric)}
              >
                <div
                  className="h-48 rounded-md border border-grey-300/50 dark:border-grey-800 mb-6 relative overflow-hidden bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.02]"
                  style={{
                    backgroundImage: `radial-gradient(ellipse at top right, rgba(197,160,89,0.22), transparent 70%), url('${fabric.textureUrl}')`,
                    backgroundColor: '#1E2229',
                  }}
                  role="img"
                  aria-label={`${fabric.name} authentic fabric swatch texture`}
                  data-testid={`swatch-preview-${fabric.sku}`}
                >
                  {/* Tactile Raking Light & Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian/75 via-transparent to-black/15 pointer-events-none" />

                  {/* Active in 3D Canvas Pill */}
                  {activeFabric.id === fabric.id && (
                    <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-obsidian/90 backdrop-blur-md border border-gold/60 text-gold text-[10px] uppercase tracking-wider font-semibold shadow-sm pointer-events-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Active in 3D</span>
                    </div>
                  )}

                  {/* Corner Swatch Actions */}
                  <div className="absolute bottom-2.5 right-2.5 flex items-center space-x-2">
                    <Link
                      href={`/fabrics/${fabric.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2.5 py-1 rounded bg-obsidian/80 hover:bg-ink text-alabaster hover:text-gold text-[10px] uppercase font-semibold tracking-wider transition-colors shadow-sm border border-grey-700 hover:border-gold"
                      aria-label={`View atelier dossier for ${fabric.name}`}
                    >
                      Dossier →
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenMicroWeave(fabric);
                      }}
                      className="px-2.5 py-1 rounded bg-obsidian/85 hover:bg-gold hover:text-ink text-alabaster text-[10px] uppercase font-semibold tracking-wider transition-colors shadow-sm border border-gold/40"
                      aria-label={`Inspect weave for ${fabric.name}`}
                    >
                      10x Weave
                    </button>
                  </div>
                </div>

                <span className="text-[10px] uppercase font-bold tracking-widest text-gold block mb-1">
                  {fabric.origin} · SKU {fabric.sku}
                </span>
                <h3 className="font-display text-xl font-semibold text-ink dark:text-alabaster mb-2">
                  {fabric.name}
                </h3>
                <p className="text-xs text-grey-600 dark:text-grey-400 mb-4 font-sans">
                  {fabric.description}
                </p>
                <div className="flex items-center justify-between text-xs pt-4 border-t border-grey-300/50 dark:border-grey-700/50 font-sans">
                  <span className="font-medium text-ink dark:text-alabaster">
                    {fabric.gsm} GSM · {fabric.widthInches}″ Width
                  </span>
                  <span className="font-semibold text-gold">${fabric.pricePerYard} / yard</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Atelier Editorial Footer */}
      <footer className="border-t border-grey-300 dark:border-grey-700 bg-alabaster dark:bg-obsidian py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-grey-600 dark:text-grey-400 font-sans">
          <div className="flex items-center space-x-3">
            <BrandLogo variant="wordmark" size="sm" asLink={false} />
            <span className="text-grey-400">·</span>
            <span>The Sensory Digital Fabric Atelier</span>
          </div>
          <p>© 2026 Drape Atelier. All rights reserved. Architectural and digital tailoring provenance.</p>
        </div>
      </footer>

      {/* Micro-Weave Inspector Modal Overlay (FEAT-003, C-010) */}
      <MicroWeaveInspector
        isOpen={isMicroWeaveOpen}
        onClose={() => setIsMicroWeaveOpen(false)}
        fabricId={inspectingFabric.sku}
        fabricName={inspectingFabric.name}
        millName={inspectingFabric.millName}
        fiberBreakdown={inspectingFabric.fiberBreakdown}
        threadCount={inspectingFabric.threadCount}
        gsm={inspectingFabric.gsm}
        textureUrl={inspectingFabric.textureUrl}
        weaveType={inspectingFabric.weaveType}
      />
    </div>
  );
}
