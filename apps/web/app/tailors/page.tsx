'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { SoundscapeToggle } from '@/components/audio/SoundscapeToggle';
import {
  TailorCity,
  TailorSpecialty,
  TailorStudioItem,
  TailorStudioDetail,
  TailorFilterBar,
  TailorCard,
  HandoffConfirmationModal,
  EmptyTailorState,
  NominateTailorModal,
  fetchTailors,
  formatCityName,
} from '@/components/tailors';

/**
 * Loading Skeleton Grid for Master Tailor Directory
 */
function TailorGridSkeleton() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      data-testid="tailor-grid-skeleton"
      aria-label="Loading ateliers"
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="bg-[#1C1F26] border border-[#282D37] rounded-lg overflow-hidden animate-pulse flex flex-col h-[520px]"
        >
          <div className="h-56 bg-[#282D37]" />
          <div className="p-5 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-5 bg-[#282D37] rounded w-3/4" />
              <div className="h-3 bg-[#282D37] rounded w-1/2" />
              <div className="h-10 bg-[#282D37] rounded w-full" />
              <div className="flex gap-2">
                <div className="h-5 bg-[#282D37] rounded w-16" />
                <div className="h-5 bg-[#282D37] rounded w-20" />
              </div>
            </div>
            <div className="h-10 bg-[#282D37] rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Inner Directory View that consumes Search Params
 */
function TailorsDirectoryContent() {
  const searchParams = useSearchParams();
  const orderIdFromUrl = searchParams ? searchParams.get('order_id') : null;

  // Filter States
  const [selectedCities, setSelectedCities] = useState<TailorCity[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<TailorSpecialty | undefined>();
  const [maxTurnaroundWeeks, setMaxTurnaroundWeeks] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showWaitlisted, setShowWaitlisted] = useState(true);

  // Data & Lifecycle States
  const [studios, setStudios] = useState<TailorStudioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [activeRoutingStudio, setActiveRoutingStudio] = useState<TailorStudioItem | null>(null);
  const [isNominateModalOpen, setIsNominateModalOpen] = useState(false);

  // Load Tailors with applied filters
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchTailors({
      cities: selectedCities.length > 0 ? selectedCities : undefined,
      specialty: selectedSpecialty,
      maxTurnaroundWeeks,
      acceptingCommissions: showWaitlisted ? undefined : true,
      searchQuery: searchQuery.trim() || undefined,
    })
      .then((res) => {
        if (isMounted) {
          setStudios(res.items);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load master tailor directory.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCities, selectedSpecialty, maxTurnaroundWeeks, showWaitlisted, searchQuery]);

  // City toggle handlers
  const handleToggleCity = (city: TailorCity) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  const handleClearCities = () => {
    setSelectedCities([]);
  };

  const handleResetAll = () => {
    setSelectedCities([]);
    setSelectedSpecialty(undefined);
    setMaxTurnaroundWeeks(undefined);
    setSearchQuery('');
    setShowWaitlisted(true);
  };

  // Alternative studio selection from card or modal
  const handleSelectAlternativeStudio = (altStudio: TailorStudioDetail) => {
    setActiveRoutingStudio(altStudio);
  };

  const activeCityDisplay = useMemo(() => {
    if (selectedCities.length === 1) return selectedCities[0];
    if (selectedCities.length > 1) return selectedCities.join(', ');
    return undefined;
  }, [selectedCities]);

  return (
    <div className="min-h-screen bg-[#111318] text-[#FBF9F5] selection:bg-[#C5A059] selection:text-[#11100F]">
      {/* Top Navigation Bar */}
      <header className="border-b border-[#282D37] bg-[#111318]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <BrandLogo variant="lockup" size="md" asLink={true} />
            <span className="hidden sm:inline-block h-6 w-px bg-[#282D37]" />
            <span className="hidden sm:inline-block text-xs uppercase tracking-widest text-[#9AA4B8]">
              Concierge Atelier Network
            </span>
          </div>

          <nav className="flex items-center gap-4 text-xs font-medium">
            <SoundscapeToggle />
            <Link
              href="/catalog"
              className="text-[#C9D0DD] hover:text-[#C5A059] transition-colors"
            >
              Textile Catalog
            </Link>
            <Link
              href="/checkout"
              className="text-[#C9D0DD] hover:text-[#C5A059] transition-colors"
            >
              Checkout
            </Link>
            {orderIdFromUrl && (
              <span className="px-2.5 py-1 rounded bg-[#282D37] text-[#C5A059] border border-[#C5A059]/40 font-mono text-[11px]">
                Order: {orderIdFromUrl}
              </span>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Masthead */}
      <section className="relative py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-b border-[#282D37]/60">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C1F26] border border-[#3A414F] text-xs text-[#C5A059] mb-4">
            <span className="text-xs">✦</span>
            <span>Accredited Couture Dressmakers & Savile Row Master Cutters</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#FBF9F5] mb-4 leading-tight">
            Master Tailor Directory
          </h1>
          <p className="text-sm sm:text-base text-[#9AA4B8] leading-relaxed font-light">
            Route your purchased cut yardage directly to a vetted master tailor with your
            digital pattern specification dossier attached. Enjoy white-glove archival delivery
            and streamlined bespoke fitting appointments across London, Paris, New York, Milan, and Lagos.
          </p>
        </div>

        {/* Active Order Handoff Banner */}
        {orderIdFromUrl && (
          <div
            className="mt-6 p-4 rounded-lg bg-[#282D37]/80 border border-[#C5A059]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
            data-testid="order-handoff-banner"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#111318] flex items-center justify-center text-[#C5A059] border border-[#C5A059]/40">
                📦
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-[#C5A059] font-semibold">
                  Concierge Handoff Active
                </span>
                <span className="text-xs text-[#FBF9F5] font-medium">
                  Routing cut yardage for Order <code className="font-mono text-[#C5A059]">{orderIdFromUrl}</code>
                </span>
              </div>
            </div>
            <span className="text-xs text-[#9AA4B8]">
              Select an atelier below to confirm direct workshop delivery
            </span>
          </div>
        )}
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Filter Bar */}
        <TailorFilterBar
          selectedCities={selectedCities}
          onToggleCity={handleToggleCity}
          onClearCities={handleClearCities}
          selectedSpecialty={selectedSpecialty}
          onSelectSpecialty={setSelectedSpecialty}
          maxTurnaroundWeeks={maxTurnaroundWeeks}
          onSelectTurnaround={setMaxTurnaroundWeeks}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showWaitlisted={showWaitlisted}
          onToggleShowWaitlisted={setShowWaitlisted}
          onResetAll={handleResetAll}
          totalResultsCount={studios.length}
        />

        {/* Directory Grid States */}
        {isLoading ? (
          <TailorGridSkeleton />
        ) : error ? (
          <div
            className="p-8 text-center bg-[#5A1A1A]/30 border border-[#A83232] rounded-lg my-8"
            role="alert"
          >
            <h3 className="font-serif text-lg font-bold text-[#FBEFEF] mb-2">
              Unable to Load Master Tailors
            </h3>
            <p className="text-xs text-[#DCD6CC] mb-4">{error}</p>
            <button
              type="button"
              onClick={handleResetAll}
              className="px-5 py-2 rounded bg-[#C5A059] text-[#11100F] text-xs font-semibold uppercase tracking-wider hover:bg-[#E0C792]"
            >
              Retry
            </button>
          </div>
        ) : studios.length === 0 ? (
          <EmptyTailorState
            cityName={activeCityDisplay}
            onOpenNominateModal={() => setIsNominateModalOpen(true)}
            onResetFilters={handleResetAll}
          />
        ) : (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            data-testid="tailors-grid"
          >
            {studios.map((studio) => (
              <TailorCard
                key={studio.id}
                studio={studio}
                orderId={orderIdFromUrl}
                onSelectForRouting={(s) => setActiveRoutingStudio(s)}
                onSelectAlternativeStudio={handleSelectAlternativeStudio}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {activeRoutingStudio && (
        <HandoffConfirmationModal
          studio={activeRoutingStudio}
          orderId={orderIdFromUrl}
          onClose={() => setActiveRoutingStudio(null)}
          onAlternativeSelected={handleSelectAlternativeStudio}
        />
      )}

      {isNominateModalOpen && (
        <NominateTailorModal
          initialCity={activeCityDisplay || ''}
          onClose={() => setIsNominateModalOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-[#282D37] mt-20 py-8 text-center text-xs text-[#707C94]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 DRAPE Atelier Inc. All master tailors independently accredited.</p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setIsNominateModalOpen(true)}
              className="hover:text-[#C5A059] transition-colors"
            >
              Nominate an Atelier
            </button>
            <Link href="/catalog" className="hover:text-[#C5A059] transition-colors">
              Fabric Catalog
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Master Tailor Directory Route Component (/tailors)
 * Wrapped in Suspense per Next.js useSearchParams requirements.
 */
export default function MasterTailorDirectoryPage() {
  return (
    <Suspense fallback={<TailorGridSkeleton />}>
      <TailorsDirectoryContent />
    </Suspense>
  );
}
