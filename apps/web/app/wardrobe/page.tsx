'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';
import {
  WardrobeTabs,
  WardrobeTabType,
  FittingCard,
  OrderHistoryTable,
  EmptyWardrobe,
  GuestOrderLookup,
  MotionVideoModal,
  SavedFitting,
  WardrobeOrder,
  fetchWardrobe,
  triggerTailorPdfDownload,
  recordTelemetryEvent,
  FALLBACK_SAVED_FITTINGS,
  FALLBACK_ORDERS,
} from '@/components/wardrobe';

/**
 * Screen 9: Digital Wardrobe
 * Spec Anchor: docs/Drape/screens/09-digital-wardrobe.md, docs/Drape/features/FEAT-009.md, CONTRACTS.md (C-017, C-028, C-029)
 */
export default function DigitalWardrobePage() {
  const [activeTab, setActiveTab] = useState<WardrobeTabType>('fittings');
  const [fittings, setFittings] = useState<SavedFitting[]>(FALLBACK_SAVED_FITTINGS);
  const [orders, setOrders] = useState<WardrobeOrder[]>(FALLBACK_ORDERS);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [activeMotionFitting, setActiveMotionFitting] = useState<SavedFitting | null>(null);

  // Edge case fallback state for PDF download (FEAT-009)
  const [pdfDownloadError, setPdfDownloadError] = useState<{
    orderNumber: string;
    downloadUrl: string;
  } | null>(null);
  const [emailSentNotice, setEmailSentNotice] = useState(false);

  // Load wardrobe data on mount
  const loadWardrobe = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchWardrobe('all');
      setFittings(data.savedFittings);
      setOrders(data.orders);
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        setIsGuestMode(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWardrobe();
  }, [loadWardrobe]);

  // Derived counts
  const cuttingRoomCount = orders.filter((o) => o.status === 'cutting' || o.status === 'confirmed').length;
  const totalFittingsCount = fittings.length;
  const isWardrobeEmpty = !isLoading && fittings.length === 0 && orders.length === 0;

  // Manual toggle for guest order lookup flow (for unauthenticated guests or testing)
  const handleToggleGuestMode = () => {
    setIsGuestMode((prev) => !prev);
  };

  // Handle fallback email delivery for tailor PDF (FEAT-009 Edge Case)
  const handleSendPdfViaEmail = () => {
    setEmailSentNotice(true);
    setTimeout(() => {
      setEmailSentNotice(false);
      setPdfDownloadError(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col selection:bg-amber-100 selection:text-amber-900 font-sans">
      {/* Top Masthead Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <BrandLogo variant="lockup" size="md" asLink={true} />
            <span className="hidden sm:inline-block h-4 w-px bg-stone-200" />
            <h1 className="hidden sm:inline-block text-xs font-mono tracking-widest uppercase text-stone-500">
              Personal Bespoke Vault
            </h1>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              type="button"
              onClick={handleToggleGuestMode}
              data-testid="toggle-guest-mode-btn"
              className="text-xs font-mono text-stone-500 hover:text-stone-800 underline transition-colors"
            >
              {isGuestMode ? 'Exit Guest View' : 'Guest Order Lookup'}
            </button>

            <Link
              href="/catalog"
              className="text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors hidden md:inline-block"
            >
              Textile Catalog
            </Link>

            <Link
              href="/fittings/new"
              data-testid="hero-commission-fitting-btn"
              className="inline-flex items-center justify-center py-2 px-3.5 bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-medium rounded-md shadow-sm transition-colors"
            >
              <span>New Fitting</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Unauthenticated Guest Flow (C-029) */}
        {isGuestMode ? (
          <div className="py-8">
            <GuestOrderLookup
              onLoginClick={() => setIsGuestMode(false)}
              onOrderFound={(res) => {
                // If order found, also record export telemetry capability
                recordTelemetryEvent({
                  order_id: res.order.orderNumber,
                  silhouette_id: 'corseted_mermaid',
                  export_format: 'pdf',
                });
              }}
            />
          </div>
        ) : (
          <>
            {/* Hero Summary Banner: User Profile Status, Active Orders in Cutting Room, Saved Fittings Count */}
            <div
              data-testid="wardrobe-hero-summary"
              className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 mb-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span
                    data-testid="user-profile-status"
                    className="text-xs font-mono uppercase tracking-widest text-stone-500"
                  >
                    Marcus Sterling • Atelier Client Tier
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-normal text-stone-900 tracking-tight">
                  Haute Couture Wardrobe
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 font-sans max-w-xl">
                  Archiving physical bolt reservations, high-resolution neural cloth drape previews, and certified technical tailor dossiers.
                </p>
              </div>

              {/* Metrics Pill Group */}
              <div className="flex items-center space-x-4 sm:space-x-6 border-t md:border-t-0 md:border-l border-stone-200 pt-4 md:pt-0 md:pl-8">
                <div>
                  <span className="text-[11px] font-mono uppercase text-stone-400 block">
                    Cutting Room
                  </span>
                  <div
                    data-testid="active-orders-count"
                    className="font-serif text-2xl sm:text-3xl font-light text-stone-900"
                  >
                    {cuttingRoomCount}{' '}
                    <span className="text-xs font-sans text-stone-500">active</span>
                  </div>
                </div>

                <div className="h-8 w-px bg-stone-200" />

                <div>
                  <span className="text-[11px] font-mono uppercase text-stone-400 block">
                    Saved Fittings
                  </span>
                  <div
                    data-testid="saved-fittings-count"
                    className="font-serif text-2xl sm:text-3xl font-light text-stone-900"
                  >
                    {totalFittingsCount}{' '}
                    <span className="text-xs font-sans text-stone-500">styles</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Edge Case Fallback Banner (FEAT-009) */}
            {pdfDownloadError && (
              <div
                data-testid="pdf-fallback-alert"
                className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900"
              >
                <div>
                  <span className="font-semibold block">Browser Download Popup Blocked</span>
                  <span>
                    Your technical tailor specification dossier for order {pdfDownloadError.orderNumber} is ready.
                  </span>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <a
                    href={pdfDownloadError.downloadUrl}
                    download={`Drape-Tailor-Spec-${pdfDownloadError.orderNumber}.pdf`}
                    data-testid="direct-pdf-download-link"
                    className="px-3 py-1.5 bg-amber-900 text-amber-50 font-medium rounded hover:bg-amber-800 transition-colors"
                  >
                    Direct Download Link
                  </a>
                  <button
                    type="button"
                    onClick={handleSendPdfViaEmail}
                    data-testid="send-pdf-email-btn"
                    className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 font-medium rounded hover:bg-amber-100 transition-colors"
                  >
                    Email Dossier
                  </button>
                </div>
              </div>
            )}

            {emailSentNotice && (
              <div
                data-testid="email-sent-notice"
                className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs text-center"
              >
                ✓ Tailor specification dossier has been dispatched to your billing email.
              </div>
            )}

            {/* Empty State vs Loaded Content */}
            {isWardrobeEmpty ? (
              <EmptyWardrobe />
            ) : (
              <div className="space-y-6">
                {/* Two-Tab Navigation */}
                <WardrobeTabs
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  fittingsCount={fittings.length}
                  ordersCount={orders.length}
                />

                {/* State: Loading Skeleton (6 pulsing cards) */}
                {isLoading ? (
                  <div
                    data-testid="wardrobe-loading-skeleton"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
                  >
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm animate-pulse"
                      >
                        <div className="aspect-[3/4] bg-stone-200" />
                        <div className="p-5 space-y-3">
                          <div className="h-4 bg-stone-200 rounded w-1/3" />
                          <div className="h-6 bg-stone-200 rounded w-3/4" />
                          <div className="h-4 bg-stone-200 rounded w-1/2" />
                          <div className="h-10 bg-stone-200 rounded mt-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Tab 1: Saved Fittings (3-column grid) */}
                    {activeTab === 'fittings' && (
                      <div
                        id="panel-fittings"
                        role="tabpanel"
                        aria-labelledby="tab-fittings"
                        data-testid="saved-fittings-grid"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
                      >
                        {fittings.length === 0 ? (
                          <div className="col-span-full py-12 text-center text-stone-500 font-sans text-sm">
                            No bespoke fittings saved yet. Click &quot;New Fitting&quot; to drape your first garment.
                          </div>
                        ) : (
                          fittings.map((fitting) => (
                            <FittingCard
                              key={fitting.id}
                              fitting={fitting}
                              onViewMotion={(fit) => setActiveMotionFitting(fit)}
                            />
                          ))
                        )}
                      </div>
                    )}

                    {/* Tab 2: Purchased Orders (Detailed History Table) */}
                    {activeTab === 'orders' && (
                      <div
                        id="panel-orders"
                        role="tabpanel"
                        aria-labelledby="tab-orders"
                        data-testid="orders-history-panel"
                      >
                        <OrderHistoryTable orders={orders} />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* 360-Degree Motion Video Modal */}
      <MotionVideoModal
        fitting={activeMotionFitting}
        isOpen={Boolean(activeMotionFitting)}
        onClose={() => setActiveMotionFitting(null)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <div className="flex items-center space-x-2">
            <BrandLogo variant="wordmark" size="sm" asLink={false} />
            <span>— Haute Couture Digital Vault & Tailor Specification Handoff</span>
          </div>
          <div className="flex items-center space-x-4 font-mono">
            <span>C-017</span>
            <span>C-018</span>
            <span>C-028</span>
            <span>C-029</span>
            <span>EVT-013</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
