'use client';

import React, { useState } from 'react';
import { ClothSandbox } from '../components/canvas/ClothSandbox';
import { MicroWeaveInspector } from '../components/canvas/MicroWeaveInspector';

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
}

const FEATURED_BOLTS: FabricItem[] = [
  {
    id: 'DR-SLK-01',
    sku: 'FAB-SLK-892',
    name: 'Luminous Ivory Duchesse',
    millName: 'Tessitura di Como',
    origin: 'Como, Italy',
    fiberBreakdown: '100% Mulberry Silk',
    threadCount: '480 TPI (280 Warp / 200 Weft)',
    gsm: 280,
    widthInches: 54,
    drapeCoefficient: 0.32,
    stiffnessRating: 6.8,
    pricePerYard: 145,
    description: 'Heavyweight satin with high bending stiffness, sculpted architectural drape, and lustrous sheen.',
  },
  {
    id: 'DR-VLV-04',
    sku: 'FAB-VLV-104',
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
  },
  {
    id: 'DR-WOL-02',
    sku: 'FAB-WOL-450',
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
  },
];

export default function AtelierHomePage() {
  const [activeFabric, setActiveFabric] = useState<FabricItem>(FEATURED_BOLTS[0]);
  const [isMicroWeaveOpen, setIsMicroWeaveOpen] = useState<boolean>(false);
  const [inspectingFabric, setInspectingFabric] = useState<FabricItem>(FEATURED_BOLTS[0]);

  const handleOpenMicroWeave = (fabric: FabricItem) => {
    setInspectingFabric(fabric);
    setIsMicroWeaveOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface dark:bg-surface-dark transition-colors duration-300">
      {/* Atelier Luxury Header / Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-grey-300/60 dark:border-grey-700/60 bg-alabaster/80 dark:bg-obsidian/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          {/* Brand Mark & Monogram Lockup */}
          <a href="/" className="flex items-center space-x-3">
            <img src="/brand/monogram-gold.svg" alt="Drape Atelier Monogram" className="h-8 w-8 object-contain" />
            <span className="font-display text-xl tracking-widest text-ink dark:text-alabaster uppercase font-semibold">
              DRAPE
            </span>
          </a>

          {/* Editorial Navigation */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium tracking-wide text-grey-700 dark:text-grey-300">
            <a href="/catalog" className="hover:text-gold transition-colors">
              Fabric Catalog
            </a>
            <a href="#neural-atelier" className="hover:text-gold transition-colors">
              Neural Atelier
            </a>
            <a href="#provenance" className="hover:text-gold transition-colors">
              Provenance
            </a>
            <a href="#wardrobe" className="hover:text-gold transition-colors">
              Digital Wardrobe
            </a>
          </nav>

          {/* Atelier Actions */}
          <div className="flex items-center space-x-4">
            <button
              type="button"
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ink dark:text-alabaster border border-grey-300 dark:border-grey-700 rounded-md hover:border-gold hover:text-gold transition-all"
              aria-label="Toggle Soundscape Audio"
            >
              Sound: Off
            </button>
            <a
              href="/catalog"
              className="inline-flex items-center px-4 py-2 text-xs font-semibold uppercase tracking-wider text-alabaster bg-ink dark:bg-alabaster dark:text-ink rounded-md hover:bg-primary-700 dark:hover:bg-grey-200 transition-colors shadow-sm"
            >
              Explore Bolts
            </a>
          </div>
        </div>
      </header>

      {/* Main Editorial Hero Section */}
      <main className="flex-1">
        <section className="relative px-6 pt-12 pb-20 lg:px-8 max-w-7xl mx-auto">
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
                Immerse yourself in the world's most coveted European textiles.
                Experience the tactile weight of Como silk and the structured drape
                of Savile Row wools with lifelike fidelity before the first precision cut.
              </p>

              {/* Action Hierarchy */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                <a
                  href="/catalog"
                  className="inline-flex justify-center items-center px-8 py-3.5 rounded-md text-sm font-semibold tracking-wide text-alabaster bg-ink hover:bg-primary-700 dark:bg-alabaster dark:text-ink dark:hover:bg-grey-200 shadow-md transition-all duration-200"
                >
                  Explore Catalog
                </a>
                <button
                  type="button"
                  onClick={() => handleOpenMicroWeave(activeFabric)}
                  className="inline-flex justify-center items-center px-8 py-3.5 rounded-md text-sm font-semibold tracking-wide text-ink dark:text-alabaster border border-grey-300 dark:border-grey-700 hover:border-gold hover:text-gold transition-all duration-200"
                >
                  Inspect Weave (10x Optical)
                </button>
              </div>

              {/* Provenance Micro-Trust Signals */}
              <div className="pt-6 border-t border-grey-300/50 dark:border-grey-700/50 grid grid-cols-3 gap-4 text-xs text-grey-600 dark:text-grey-400 font-sans">
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
              <div className="relative rounded-lg p-2 bg-gradient-to-tr from-gold/15 via-transparent to-ink/5 dark:from-gold/10 dark:to-alabaster/5">
                <ClothSandbox
                  fabricId={activeFabric.sku}
                  fabricName={activeFabric.name}
                  gsm={activeFabric.gsm}
                  composition={activeFabric.fiberBreakdown}
                  weaveType="Duchesse Satin Weave"
                  drapeCoefficient={activeFabric.drapeCoefficient}
                  stiffnessRating={activeFabric.stiffnessRating}
                  onInspectWeave={() => handleOpenMicroWeave(activeFabric)}
                  className="h-[520px] shadow-lg"
                />
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
                <div className="h-44 rounded-md bg-gradient-to-br from-amber-50 to-amber-100 dark:from-neutral-900 dark:to-obsidian border border-grey-300/40 dark:border-grey-800 flex items-center justify-center mb-6 relative overflow-hidden">
                  <span className="font-display text-lg italic text-ink dark:text-alabaster">
                    {fabric.name}
                  </span>
                  <div className="absolute bottom-2 right-2 flex space-x-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenMicroWeave(fabric);
                      }}
                      className="px-2 py-1 rounded bg-obsidian/80 hover:bg-gold hover:text-ink text-alabaster text-[10px] uppercase font-semibold tracking-wider transition-colors shadow-sm"
                      aria-label={`Inspect weave for ${fabric.name}`}
                    >
                      10x Weave
                    </button>
                  </div>
                </div>

                <span className="text-[10px] uppercase font-bold tracking-widest text-gold block mb-1">
                  {fabric.origin} · SKU {fabric.id}
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
            <span className="font-display text-lg font-semibold tracking-wider text-ink dark:text-alabaster">
              DRAPE
            </span>
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
      />
    </div>
  );
}
