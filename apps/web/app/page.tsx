import React from 'react';
import { ClothSandboxBoot } from '../components/canvas/ClothSandboxBoot';

export default function AtelierHomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface dark:bg-surface-dark transition-colors duration-300">
      {/* Atelier Luxury Header / Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-grey-300/60 dark:border-grey-700/60 bg-alabaster/80 dark:bg-obsidian/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          {/* Brand Mark & Monogram Lockup */}
          <div className="flex items-center space-x-3">
            {/* Sculptural D Monogram Ribbon */}
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-ink dark:bg-alabaster text-alabaster dark:text-ink font-display text-xl font-bold tracking-tight shadow-sm">
              D
            </div>
            <span className="font-display text-xl tracking-widest text-ink dark:text-alabaster uppercase font-semibold">
              DRAPE
            </span>
          </div>

          {/* Editorial Navigation */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium tracking-wide text-grey-700 dark:text-grey-300">
            <a href="#catalog" className="hover:text-gold transition-colors">
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
              href="#catalog"
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
                Experience luxury European textiles with real-time WebGPU cloth physics.
                Explore the gravitational cascade, micro-weave fiber nap, and bespoke fit
                of Como silks and Savile Row worsted wools before cutting.
              </p>

              {/* Action Hierarchy */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                <a
                  href="#catalog"
                  className="inline-flex justify-center items-center px-8 py-3.5 rounded-md text-sm font-semibold tracking-wide text-alabaster bg-ink hover:bg-primary-700 dark:bg-alabaster dark:text-ink dark:hover:bg-grey-200 shadow-md transition-all duration-200"
                >
                  Explore Catalog
                </a>
                <a
                  href="#neural-atelier"
                  className="inline-flex justify-center items-center px-8 py-3.5 rounded-md text-sm font-semibold tracking-wide text-ink dark:text-alabaster border border-grey-300 dark:border-grey-700 hover:border-gold hover:text-gold transition-all duration-200"
                >
                  How Neural Draping Works
                </a>
              </div>

              {/* Provenance Micro-Trust Signals */}
              <div className="pt-6 border-t border-grey-300/50 dark:border-grey-700/50 grid grid-cols-3 gap-4 text-xs text-grey-600 dark:text-grey-400 font-sans">
                <div>
                  <span className="block font-semibold text-ink dark:text-alabaster">100% Provenance</span>
                  <span>Direct European Mills</span>
                </div>
                <div>
                  <span className="block font-semibold text-ink dark:text-alabaster">60 FPS Simulation</span>
                  <span>WGSL WebGPU Compute</span>
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
                <ClothSandboxBoot
                  fabricName="Luminous Silk Duchesse"
                  gsm={280}
                  composition="100% Mulberry Silk"
                  weaveType="8-End Duchesse Satin"
                  drapeCoefficient={0.32}
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
              tensile resistance, and light refraction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="group rounded-lg border border-grey-300 dark:border-grey-700 bg-surface dark:bg-surface-dark overflow-hidden p-6 hover:shadow-md transition-shadow">
              <div className="h-44 rounded-md bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-obsidian border border-amber-200/50 dark:border-amber-900/30 flex items-center justify-center mb-6">
                <span className="font-display text-lg italic text-amber-800 dark:text-amber-200">
                  Mulberry Silk Duchesse
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-gold block mb-1">
                Como, Italy · SKU DR-SLK-01
              </span>
              <h3 className="font-display text-xl font-semibold text-ink dark:text-alabaster mb-2">
                Luminous Ivory Duchesse
              </h3>
              <p className="text-xs text-grey-600 dark:text-grey-400 mb-4 font-sans">
                Heavyweight satin with high bending stiffness, sculpted architectural drape, and lustrous sheen.
              </p>
              <div className="flex items-center justify-between text-xs pt-4 border-t border-grey-300/50 dark:border-grey-700/50 font-sans">
                <span className="font-medium text-ink dark:text-alabaster">280 GSM · 54″ Width</span>
                <span className="font-semibold text-gold">$145 / yard</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="group rounded-lg border border-grey-300 dark:border-grey-700 bg-surface dark:bg-surface-dark overflow-hidden p-6 hover:shadow-md transition-shadow">
              <div className="h-44 rounded-md bg-gradient-to-br from-neutral-800 to-black border border-neutral-700/50 flex items-center justify-center mb-6">
                <span className="font-display text-lg italic text-neutral-200">
                  Obsidian Cut-Pile Velvet
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-gold block mb-1">
                Lyon, France · SKU DR-VLV-04
              </span>
              <h3 className="font-display text-xl font-semibold text-ink dark:text-alabaster mb-2">
                Midnight Noir Silk Velvet
              </h3>
              <p className="text-xs text-grey-600 dark:text-grey-400 mb-4 font-sans">
                Dense directional tufted pile with anisotropic light absorption and fluid cascading folds.
              </p>
              <div className="flex items-center justify-between text-xs pt-4 border-t border-grey-300/50 dark:border-grey-700/50 font-sans">
                <span className="font-medium text-ink dark:text-alabaster">360 GSM · 52″ Width</span>
                <span className="font-semibold text-gold">$180 / yard</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="group rounded-lg border border-grey-300 dark:border-grey-700 bg-surface dark:bg-surface-dark overflow-hidden p-6 hover:shadow-md transition-shadow">
              <div className="h-44 rounded-md bg-gradient-to-br from-stone-200 to-stone-300 dark:from-stone-900/40 dark:to-obsidian border border-stone-300/50 dark:border-stone-800 flex items-center justify-center mb-6">
                <span className="font-display text-lg italic text-stone-800 dark:text-stone-300">
                  Super 150s Worsted Crepe
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-gold block mb-1">
                Biella, Italy · SKU DR-WOL-02
              </span>
              <h3 className="font-display text-xl font-semibold text-ink dark:text-alabaster mb-2">
                Charcoal Fine Wool Crepe
              </h3>
              <p className="text-xs text-grey-600 dark:text-grey-400 mb-4 font-sans">
                High-twist wool yarn providing crisp tailoring resilience, organic drape recovery, and breathable wear.
              </p>
              <div className="flex items-center justify-between text-xs pt-4 border-t border-grey-300/50 dark:border-grey-700/50 font-sans">
                <span className="font-medium text-ink dark:text-alabaster">240 GSM · 58″ Width</span>
                <span className="font-semibold text-gold">$120 / yard</span>
              </div>
            </div>
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
    </div>
  );
}
