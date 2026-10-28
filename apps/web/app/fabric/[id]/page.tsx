'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FabricDetail } from '../../../lib/catalog-types';
import { fetchFabric } from '../../../lib/catalog-data';
import { SensoryProfileRadar } from '../../../components/catalog/SensoryProfileRadar';
import { ClothSandbox } from '../../../components/canvas/ClothSandbox';
import { MicroWeaveInspector } from '../../../components/canvas/MicroWeaveInspector';
import { BrandLogo } from '../../../components/brand/BrandLogo';

/**
 * Screen 3: Fabric Detail View
 * Spec Anchor: screens/03-fabric-detail-view.md, FEAT-001, C-008
 */
export default function FabricDetailPage() {
  const params = useParams();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const fabricId = typeof rawId === 'string' ? decodeURIComponent(rawId) : '';

  const [fabric, setFabric] = useState<FabricDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [gravityMode, setGravityMode] = useState<'breeze' | 'drape'>('drape');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [swatchOrdered, setSwatchOrdered] = useState<boolean>(false);
  const [isMicroWeaveOpen, setIsMicroWeaveOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'3d' | 'macro'>('3d');

  useEffect(() => {
    async function loadDetail() {
      if (!fabricId) return;
      setIsLoading(true);
      setIsError(false);
      try {
        const data = await fetchFabric(fabricId);
        if (data) {
          setFabric(data);
        } else {
          setIsError(true);
        }
      } catch (_err) {
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadDetail();
  }, [fabricId]);

  const handleOrderSwatch = () => {
    setSwatchOrdered(true);
    setToastMessage(`Sample swatch added for ${fabric?.name || 'fabric'} ($25.00 credited toward bespoke orders).`);
    setTimeout(() => {
      setToastMessage(null);
      setSwatchOrdered(false);
    }, 4000);
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface dark:bg-surface-dark p-8 flex flex-col items-center justify-center space-y-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-gold/60 text-gold animate-spin font-display text-xl">
          ❖
        </div>
        <div className="text-center space-y-2">
          <h2 className="font-display text-xl font-semibold text-ink dark:text-alabaster">
            Calibrating Textile Physics...
          </h2>
          <p className="text-xs text-grey-500 font-sans tracking-wide">
            Loading certified weave parameters, PBR textures, and continuous warehouse bolt data.
          </p>
        </div>
      </div>
    );
  }

  // 2. 404 / Error State
  if (isError || !fabric) {
    return (
      <div className="min-h-screen bg-surface dark:bg-surface-dark flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="h-16 w-16 rounded-full bg-semantic-error-100 dark:bg-semantic-error-900/40 text-semantic-error-500 flex items-center justify-center text-2xl font-display">
          ✕
        </div>
        <h1 className="font-display text-3xl font-semibold text-ink dark:text-alabaster">
          Textile Archive Unavailable
        </h1>
        <p className="text-sm text-grey-600 dark:text-grey-400 max-w-md mx-auto">
          The requested textile SKU &quot;{fabricId}&quot; could not be located in the active atelier registry.
        </p>
        <Link
          href="/catalog"
          className="px-6 py-3 rounded-md text-xs font-semibold uppercase tracking-wider text-alabaster bg-ink dark:bg-alabaster dark:text-ink hover:bg-primary-700 transition-colors"
          data-testid="return-to-catalog-btn"
        >
          Return to Fabric Catalog
        </Link>
      </div>
    );
  }

  const isLowStock = fabric.activeBolt.isLowStock || fabric.activeBolt.remainingContinuousYards < 5.0;

  return (
    <div className="min-h-screen flex flex-col bg-surface dark:bg-surface-dark transition-colors duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-md shadow-xl bg-ink text-alabaster dark:bg-alabaster dark:text-ink border border-gold/40 flex items-center space-x-3 transition-all animate-bounce"
          data-testid="detail-toast"
        >
          <span className="text-gold font-display text-lg">❖</span>
          <span className="text-xs font-sans tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Atelier Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-grey-300/60 dark:border-grey-700/60 bg-alabaster/90 dark:bg-obsidian/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center space-x-6">
            <BrandLogo variant="lockup" size="md" />
            <Link href="/catalog" className="inline-flex items-center space-x-2 text-xs font-sans uppercase tracking-wider text-grey-600 dark:text-grey-400 hover:text-gold transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Catalog</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-2 text-xs font-sans uppercase tracking-wider text-grey-500">
            <Link href="/" className="hover:text-gold transition-colors">Atelier</Link>
            <span>/</span>
            <Link href="/catalog" className="hover:text-gold transition-colors">Catalog</Link>
            <span>/</span>
            <span className="text-ink dark:text-alabaster font-semibold">{fabric.name}</span>
          </nav>

          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-grey-200 dark:bg-grey-800 text-grey-700 dark:text-grey-300">
              {fabric.id}
            </span>
          </div>
        </div>
      </header>

      {/* Main Split-Screen Cinematic Detail Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column (60%): Interactive 3D WebGPU Viewport & Macro Photography */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative overflow-hidden rounded-md border border-grey-300/80 dark:border-grey-700/80 bg-obsidian shadow-lg">
              {/* Mode Switcher Tabs */}
              <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 bg-obsidian/80 backdrop-blur-md p-1 rounded border border-grey-700">
                <button
                  type="button"
                  onClick={() => setActiveTab('3d')}
                  className={`px-3 py-1 rounded text-[11px] font-sans uppercase tracking-wider font-semibold transition-colors ${
                    activeTab === '3d'
                      ? 'bg-gold text-obsidian shadow-sm'
                      : 'text-alabaster hover:text-gold'
                  }`}
                  data-testid="tab-3d"
                >
                  60 FPS WebGPU
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('macro')}
                  className={`px-3 py-1 rounded text-[11px] font-sans uppercase tracking-wider font-semibold transition-colors ${
                    activeTab === 'macro'
                      ? 'bg-gold text-obsidian shadow-sm'
                      : 'text-alabaster hover:text-gold'
                  }`}
                  data-testid="tab-macro"
                >
                  Macro Weave
                </button>
              </div>

              {/* Gravity Physics Toggle */}
              {activeTab === '3d' && (
                <div className="absolute top-4 right-4 z-20 flex items-center space-x-1.5 bg-obsidian/80 backdrop-blur-md p-1 rounded border border-grey-700 text-[11px] font-sans uppercase tracking-wider">
                  {(['breeze', 'drape'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setGravityMode(mode)}
                      className={`px-2.5 py-1 rounded capitalize transition-colors ${
                        gravityMode === mode
                          ? 'bg-alabaster text-ink font-semibold'
                          : 'text-grey-400 hover:text-alabaster'
                      }`}
                      data-testid={`gravity-${mode}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              )}

              {/* Canvas Viewport */}
              <div className="aspect-[4/3] sm:aspect-[16/10] w-full relative">
                {activeTab === '3d' ? (
                  <div className="w-full h-full relative">
                    <ClothSandbox
                      fabricId={fabric.id}
                      fabricName={fabric.name}
                      textureUrl={fabric.thumbnailUrl || fabric.normalMapUrl}
                      gsm={fabric.gsm}
                      composition={fabric.fiberBreakdown}
                      weaveType={fabric.weaveStructure}
                      drapeCoefficient={fabric.drapeCoefficient}
                      stiffnessRating={fabric.stiffnessRating}
                      className="w-full h-full min-h-[440px]"
                    />
                  </div>
                ) : (
                  <div
                    className="w-full h-full bg-cover bg-center flex items-end p-6"
                    style={{
                      backgroundImage: `url('${fabric.thumbnailUrl}'), radial-gradient(circle, #282D37 0%, #11100F 100%)`,
                      backgroundColor: '#1E2229',
                    }}
                    role="img"
                    aria-label={`${fabric.name} 10x microscopic weave inspection`}
                  >
                    <div className="p-4 rounded bg-obsidian/80 backdrop-blur-md border border-grey-700 text-alabaster max-w-sm space-y-1">
                      <span className="text-[10px] font-mono text-gold uppercase tracking-widest block">
                        Optical 10x Macro View
                      </span>
                      <p className="text-xs font-sans leading-relaxed text-grey-300">
                        Inspecting selvage weave density, thread count, and raking light luster across {fabric.fiberBreakdown}.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Viewport Micro-Footer */}
              <div className="p-3 bg-[#11100F] border-t border-grey-800 flex items-center justify-between text-[11px] font-mono text-grey-400">
                <span>Interactive Fabric Simulation: Active</span>
                <span className="text-gold">Verlet Spring Model</span>
              </div>
            </div>

            {/* Sensory Profile Radar */}
            <SensoryProfileRadar fabric={fabric} />
          </div>

          {/* Right Column (40%): Editorial Textile Dossier & Purchasing */}
          <div className="lg:col-span-5 space-y-8">
            {/* Header Titles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-sans uppercase tracking-widest text-grey-500">
                <span className="font-semibold text-gold">{fabric.millName}</span>
                <span className="font-mono text-xs">{fabric.countryOfOrigin} Heritage Mill</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink dark:text-alabaster leading-tight">
                {fabric.name}
              </h1>

              <p className="text-sm text-grey-600 dark:text-grey-400 font-sans leading-relaxed">
                {fabric.fiberBreakdown}. Precision milled in {fabric.countryOfOrigin} for bespoke couture, gala wear, and sculptural silhouettes.
              </p>
            </div>

            {/* Price & Swatch Sample Block */}
            <div className="p-6 rounded-md border border-grey-300/80 dark:border-grey-700/80 bg-alabaster dark:bg-obsidian space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs uppercase font-sans tracking-wider text-grey-500 block">
                    Bespoke Yardage
                  </span>
                  <span className="font-display text-3xl font-bold text-ink dark:text-alabaster">
                    ${fabric.pricePerYard}
                  </span>
                  <span className="text-xs text-grey-600 dark:text-grey-400 ml-1">
                    / continuous yard
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase font-sans tracking-wider text-grey-500 block">
                    Sample Swatch Box
                  </span>
                  <span className="font-display text-xl font-semibold text-gold">
                    ${fabric.swatchPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Swatch Sample Action */}
              <button
                type="button"
                onClick={handleOrderSwatch}
                className={`w-full py-3 px-4 rounded-md text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-gold ${
                  swatchOrdered
                    ? 'bg-semantic-success-500 text-alabaster'
                    : 'border border-gold text-gold hover:bg-gold hover:text-obsidian'
                }`}
                data-testid="detail-order-swatch-btn"
              >
                <span>{swatchOrdered ? 'Swatch Box Added ✓' : 'Order Swatch Box ($25.00)'}</span>
              </button>
              <p className="text-[11px] text-grey-500 text-center font-sans">
                Sample swatch cost is 100% credited toward your subsequent custom cut order.
              </p>
            </div>

            {/* Warehouse Continuous Bolt Inventory Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-ink dark:text-alabaster">
                  Warehouse Continuous Bolt
                </h3>
                {isLowStock ? (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-[11px] font-sans font-semibold uppercase tracking-wider bg-semantic-warning-100 text-semantic-warning-900 border border-semantic-warning-500/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-semantic-warning-500 animate-pulse" />
                    <span>Low Stock Warning</span>
                  </span>
                ) : (
                  <span className="text-xs font-mono text-semantic-success-500 font-semibold">
                    In Stock & Verified
                  </span>
                )}
              </div>

              <div className="overflow-hidden rounded-md border border-grey-300/80 dark:border-grey-700/80 bg-alabaster dark:bg-obsidian">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-grey-100 dark:bg-grey-800 text-grey-600 dark:text-grey-400 uppercase text-[10px] tracking-wider border-b border-grey-300 dark:border-grey-700">
                    <tr>
                      <th className="px-4 py-2.5">Roll Identifier</th>
                      <th className="px-4 py-2.5">Dye-Lot Code</th>
                      <th className="px-4 py-2.5 text-right">Continuous Yardage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-grey-200 dark:divide-grey-800">
                    <tr>
                      <td className="px-4 py-3 font-mono text-ink dark:text-alabaster">
                        {fabric.activeBolt.id}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-gold" data-testid="dye-lot-code">
                        {fabric.activeBolt.dyeLotCode}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-ink dark:text-alabaster" data-testid="remaining-continuous-yards">
                        {fabric.activeBolt.remainingContinuousYards} yds
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {isLowStock && (
                <div className="p-3 rounded-md bg-semantic-warning-100/60 dark:bg-semantic-warning-900/30 border border-semantic-warning-500/40 text-xs text-semantic-warning-900 dark:text-semantic-warning-100 font-sans leading-relaxed">
                  <strong>Notice:</strong> Only {fabric.activeBolt.remainingContinuousYards} unbroken linear yards remain on this certified dye-lot. Bespoke commissions requiring longer cuts may require split-bolt coordination.
                </div>
              )}
            </div>

            {/* Certified Care Instructions */}
            <div className="p-5 rounded-md border border-grey-300/80 dark:border-grey-700/80 bg-alabaster dark:bg-obsidian space-y-3 font-sans text-xs">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-ink dark:text-alabaster">
                Atelier Care & Tailoring Guide
              </h3>
              <div className="grid grid-cols-2 gap-3 text-grey-600 dark:text-grey-400">
                <div>
                  <span className="block font-medium text-ink dark:text-alabaster">Ironing</span>
                  <span>Max {fabric.careInstructions.ironTemperatureMaxC}°C</span>
                </div>
                <div>
                  <span className="block font-medium text-ink dark:text-alabaster">Cleaning</span>
                  <span>{fabric.careInstructions.dryCleanOnly ? 'Specialist Dry Clean Only' : 'Delicate Hand Launder'}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-grey-200 dark:border-grey-800 text-grey-600 dark:text-grey-400">
                <span className="block font-medium text-ink dark:text-alabaster">Recommended Interlining</span>
                <span>{fabric.careInstructions.interliningRecommendation}</span>
              </div>
            </div>

            {/* Integrated Primary Action Buttons */}
            <div className="space-y-3 pt-2">
              {/* Primary: Try On in Neural Atelier */}
              <Link
                href={`/atelier/neural-fitting?fabricId=${fabric.id}`}
                className="w-full py-4 px-6 rounded-md text-xs font-semibold uppercase tracking-widest text-alabaster bg-ink dark:bg-alabaster dark:text-ink hover:bg-primary-700 dark:hover:bg-grey-200 transition-colors shadow-md flex items-center justify-center space-x-2"
                data-testid="try-on-neural-atelier-cta"
              >
                <span>Try On in Neural Atelier</span>
                <span className="text-gold">→</span>
              </Link>

              {/* Secondary: Test Drape in Sandbox */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('3d');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full py-3.5 px-6 rounded-md text-xs font-semibold uppercase tracking-wider border border-grey-300 dark:border-grey-700 text-ink dark:text-alabaster hover:border-gold hover:text-gold transition-colors flex items-center justify-center space-x-2"
                data-testid="test-drape-sandbox-cta"
              >
                <span>Test Drape in Sandbox</span>
              </button>

              {/* Tertiary: Order Swatch / Custom Yardage */}
              <Link
                href={`/checkout?fabricId=${fabric.id}&boltId=${fabric.activeBolt.id}`}
                className="w-full py-3.5 px-6 rounded-md text-xs font-semibold uppercase tracking-wider text-center text-grey-700 dark:text-grey-300 hover:text-gold block transition-colors"
                data-testid="order-yardage-link"
              >
                Order Swatch / Custom Yardage →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
