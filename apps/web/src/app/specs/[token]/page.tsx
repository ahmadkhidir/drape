'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BrandLogo } from '@/components/brand/BrandLogo';
import {
  PublicSpecDossier,
  fetchPublicSpec,
  triggerTailorPdfDownload,
  recordTelemetryEvent,
  FALLBACK_PUBLIC_SPEC,
} from '../../../components/wardrobe';

/**
 * Screen: Public Master Tailor Technical Specification Dossier
 * Spec Anchor: docs/Drape/features/FEAT-009.md, CONTRACTS.md (C-018, C-017), docs/Drape/analytics.md (EVT-013)
 *
 * Dedicated clean, non-editable read-only technical dossier portal for external master tailors
 * accessible via secure, single-use cryptographic token without requiring a Drape account.
 */
export default function PublicSpecDossierPage() {
  const params = useParams();
  const specToken = (params?.token as string) || 'tok-default';

  const [spec, setSpec] = useState<PublicSpecDossier | null>(
    specToken === 'invalid' || specToken === 'expired' ? null : FALLBACK_PUBLIC_SPEC
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    specToken === 'invalid' || specToken === 'expired' ? 'This technical spec link is invalid or has expired.' : null
  );
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMessage(null);

    fetchPublicSpec(specToken)
      .then((data) => {
        if (!isCancelled) {
          setSpec(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setErrorMessage(
            err instanceof Error
              ? err.message.replace('SPEC_TOKEN_NOT_FOUND: ', '')
              : 'This technical specification link is invalid or has expired.'
          );
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [specToken]);

  // Handle PDF Export by Tailor (C-017 + EVT-013)
  const handleDownloadTailorPdf = async () => {
    if (!spec) return;
    setIsDownloadingPdf(true);
    try {
      // Emit EVT-013 Telemetry
      recordTelemetryEvent({
        order_id: spec.orderNumber,
        silhouette_id: spec.silhouetteName.toLowerCase().replace(/\s+/g, '_'),
        export_format: 'pdf',
      });

      const res = await triggerTailorPdfDownload({
        orderNumber: spec.orderNumber,
        silhouetteId: spec.silhouetteName,
      });

      if (res.success) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-10 bg-stone-200 rounded w-1/3 mx-auto" />
          <div className="h-6 bg-stone-200 rounded w-1/2 mx-auto" />
          <div className="h-72 bg-stone-200 rounded-xl" />
          <div className="h-56 bg-stone-200 rounded-xl" />
        </div>
      </div>
    );
  }

  // Error State: Invalid or Expired Spec Token
  if (errorMessage || !spec) {
    return (
      <div className="min-h-screen bg-stone-50 py-16 px-4 flex items-center justify-center">
        <div
          data-testid="spec-error-state"
          className="max-w-md w-full bg-white p-8 rounded-2xl border border-stone-200 shadow-md text-center"
        >
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 text-xl">
            ⚠️
          </div>
          <h2 className="text-xl font-serif font-semibold text-stone-900 mb-2">
            Specification Unavailable
          </h2>
          <p className="text-xs text-stone-600 mb-6 font-sans leading-relaxed">
            {errorMessage || 'This technical tailor specification dossier link is invalid, revoked, or has expired.'}
          </p>
          <p className="text-[11px] font-mono text-stone-400 mb-6">
            Please request a fresh handoff token from the client or atelier concierge.
          </p>
          <Link
            href="/"
            className="inline-block py-2.5 px-6 bg-stone-900 text-stone-50 rounded text-xs font-semibold uppercase tracking-wider hover:bg-stone-800 transition-colors"
          >
            Return to Drape Atelier
          </Link>
        </div>
      </div>
    );
  }

  const formattedExpiry = new Date(spec.expiresAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      data-testid="public-spec-dossier"
      className="min-h-screen bg-stone-100/70 text-stone-900 font-sans selection:bg-amber-100 selection:text-amber-900 pb-16"
    >
      {/* Top Banner: Master Tailor Read-Only Protocol Bar */}
      <div className="bg-stone-900 text-stone-300 px-4 py-2 text-xs font-mono border-b border-stone-800">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-semibold text-amber-200">MASTER TAILOR HANDOFF PORTAL</span>
            <span className="text-stone-500">•</span>
            <span>Non-Editable Read-Only Technical Dossier</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-stone-400">
            <span>Token: {specToken.slice(0, 10)}...</span>
            <span>Valid through {formattedExpiry}</span>
          </div>
        </div>
      </div>

      {/* Main Dossier Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Document Header Card */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-stone-100">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <BrandLogo variant="wordmark" size="sm" asLink={false} />
                <span className="text-xs font-mono uppercase tracking-widest text-stone-400">
                  Technical Tailoring Specification
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-normal text-stone-900 tracking-tight">
                {spec.silhouetteName}
              </h1>
              <div className="text-xs font-mono text-stone-500 mt-1">
                Client: <span className="font-semibold text-stone-800">{spec.customerFirstName}</span> | Commission #{' '}
                <span className="font-semibold text-stone-800" data-testid="spec-order-number">
                  {spec.orderNumber}
                </span>
              </div>
            </div>

            {/* Guild Certification & PDF Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md text-[11px] font-mono text-amber-900 flex items-center space-x-1.5">
                <span>🏅</span>
                <span>International Textile Guild Standard</span>
              </div>

              <button
                type="button"
                onClick={handleDownloadTailorPdf}
                disabled={isDownloadingPdf}
                data-testid="dossier-download-pdf-btn"
                className={`py-2 px-4 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm ${
                  downloadSuccess
                    ? 'bg-emerald-800 text-white'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-50'
                }`}
              >
                {isDownloadingPdf ? (
                  'Exporting Vector PDF...'
                ) : downloadSuccess ? (
                  '✓ PDF Downloaded'
                ) : (
                  'Download Vector PDF'
                )}
              </button>
            </div>
          </div>

          {/* Grid Layout: Visual Fitting Preview & Core Textile Specs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
            {/* Left Column: Neural Drape Render Preview */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="relative w-full aspect-[3/4] rounded-xl bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center shadow-inner">
                {/* Fallback Mannequin / Render Preview */}
                <div className="absolute inset-0 bg-gradient-to-b from-stone-50 to-stone-200 flex items-center justify-center">
                  <svg
                    className="w-40 h-56 text-stone-300 drop-shadow-sm"
                    viewBox="0 0 100 140"
                    fill="currentColor"
                  >
                    <path d="M42 12 C42 8, 58 8, 58 12 L60 22 C68 28, 75 38, 70 55 C66 68, 62 76, 60 88 C56 104, 68 128, 72 135 L28 135 C32 128, 44 104, 40 88 C38 76, 34 68, 30 55 C25 38, 32 28, 40 22 Z" />
                  </svg>
                  <div className="absolute bottom-4 inset-x-4 p-2 bg-stone-900/80 backdrop-blur-sm rounded text-center text-[11px] font-mono text-stone-200">
                    High-Res Neural Fitting Reference
                  </div>
                </div>
              </div>
              <p className="text-[11px] font-mono text-stone-400 mt-2 text-center">
                Simulation rendered at 4K resolution using calibrated PBR material coefficients.
              </p>
            </div>

            {/* Right Column: Physical Textile Specifications (FEAT-009 AC-2) */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-widest text-stone-400 mb-3">
                  1. Physical Textile Specification
                </h3>
                <div className="bg-stone-50 rounded-xl p-5 border border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <span className="text-stone-500 block">Textile Name & SKU</span>
                    <span className="font-serif text-sm font-medium text-stone-900 block mt-0.5">
                      {spec.fabric.name}
                    </span>
                    <span className="font-mono text-[11px] text-stone-400">{spec.fabric.sku}</span>
                  </div>

                  <div>
                    <span className="text-stone-500 block">Mill Provenance</span>
                    <span className="font-serif text-sm font-medium text-stone-900 block mt-0.5" data-testid="spec-mill-name">
                      {spec.fabric.millName}
                    </span>
                    <span className="font-mono text-[11px] text-stone-400">
                      Country of Origin: {spec.fabric.countryOfOrigin}
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-stone-500 block">Fiber Composition Breakdown</span>
                    <span className="font-serif text-sm text-stone-900 block mt-0.5" data-testid="spec-fiber-breakdown">
                      {spec.fabric.fiberBreakdown}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-500 block">Areal Density / Weight</span>
                    <span className="font-mono text-sm font-medium text-stone-900 block mt-0.5" data-testid="spec-gsm">
                      {spec.fabric.gsm} GSM
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-500 block">Bolt Cut Width</span>
                    <span className="font-mono text-sm font-medium text-stone-900 block mt-0.5" data-testid="spec-bolt-width">
                      {spec.fabric.widthInches}&quot; ({(spec.fabric.widthInches * 2.54).toFixed(1)} cm)
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-500 block">Warehouse Dye Lot Code</span>
                    <span className="font-mono text-sm font-medium text-stone-900 block mt-0.5" data-testid="spec-dye-lot">
                      {spec.fabric.dyeLotCode}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-500 block">Continuous Yardage Ordered</span>
                    <span className="font-mono text-sm font-medium text-stone-900 block mt-0.5" data-testid="spec-yardage">
                      {spec.yardageOrdered} yards ({(spec.yardageOrdered * 0.9144).toFixed(2)} m)
                    </span>
                  </div>
                </div>
              </div>

              {/* Atelier Technical Tailoring Notes */}
              <div>
                <h3 className="text-xs font-mono uppercase tracking-widest text-stone-400 mb-3">
                  2. Atelier Construction & Care Directives
                </h3>
                <div className="bg-stone-50 rounded-xl p-5 border border-stone-200 space-y-3 text-xs">
                  <div className="flex items-start justify-between">
                    <span className="text-stone-500">Pressing / Ironing Temp:</span>
                    <span className="font-mono font-medium text-stone-900">
                      Max {spec.technicalNotes.pressingTemperatureC}°C (Low to Medium Silk Setting)
                    </span>
                  </div>

                  <div className="flex items-start justify-between">
                    <span className="text-stone-500">Steam Application:</span>
                    <span className="font-mono font-medium text-stone-900">
                      {spec.technicalNotes.steamPermitted ? 'Permitted (Indirect)' : 'Prohibited (Dry Iron Only)'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                    <span className="text-stone-500 shrink-0">Interlining Pairing:</span>
                    <span className="font-serif text-stone-900 sm:text-right">
                      {spec.technicalNotes.interliningType}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                    <span className="text-stone-500 shrink-0">Needle & Thread Spec:</span>
                    <span className="font-mono text-stone-900 sm:text-right">
                      {spec.technicalNotes.needleSizeRecommendation}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calculated Cutting Layout & Grainline Alignment Diagram (FEAT-009 AC-2) */}
        <div
          data-testid="cutting-layout-card"
          className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-4 border-b border-stone-100">
            <div>
              <h3 className="text-base font-serif font-normal text-stone-900">
                3. Precision Cutting Layout & Grainline Orientation
              </h3>
              <p className="text-xs text-stone-500 font-sans mt-0.5">
                Calculated marker layout for {spec.yardageOrdered} yards on {spec.fabric.widthInches}&quot; bolt width.
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs font-mono">
              <span className="inline-flex items-center">
                <span className="w-2.5 h-2.5 bg-amber-600 rounded-sm mr-1.5" />
                <span>0° Straight Grain</span>
              </span>
              <span className="inline-flex items-center">
                <span className="w-2.5 h-2.5 bg-purple-600 rounded-sm mr-1.5" />
                <span>45° True Bias</span>
              </span>
            </div>
          </div>

          {/* Interactive SVG Cutting Marker Visualization */}
          <div
            data-testid="grainline-diagram"
            className="w-full bg-stone-900 rounded-xl p-4 sm:p-6 overflow-x-auto shadow-inner"
          >
            <div className="min-w-[640px]">
              {/* Bolt dimensions bar */}
              <div className="flex justify-between text-[11px] font-mono text-stone-400 mb-2">
                <span>0.0 yd (Bolt Selvage Top)</span>
                <span>Bolt Width: {spec.fabric.widthInches} Inches (Warp Grain &rarr;)</span>
                <span>{spec.yardageOrdered} yds (Cut End)</span>
              </div>

              {/* Cutting Marker SVG */}
              <svg
                viewBox="0 0 640 180"
                className="w-full h-44 bg-stone-950 border border-stone-800 rounded-lg"
                fill="none"
              >
                {/* Selvage Edges */}
                <line x1="0" y1="10" x2="640" y2="10" stroke="#78716c" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="170" x2="640" y2="170" stroke="#78716c" strokeWidth="1" strokeDasharray="3 3" />

                {/* Panel 1: Front Bodice (Straight Grain 0°) */}
                <rect x="20" y="25" width="110" height="130" rx="4" fill="#292524" stroke="#d97706" strokeWidth="1.5" />
                <line x1="75" y1="35" x2="75" y2="145" stroke="#d97706" strokeWidth="2" strokeDasharray="4 2" />
                <polygon points="75,32 72,40 78,40" fill="#d97706" />
                <polygon points="75,148 72,140 78,140" fill="#d97706" />
                <text x="75" y="85" textAnchor="middle" fill="#fef3c7" fontSize="10" fontFamily="monospace">
                  Front Bodice (0°)
                </text>

                {/* Panel 2: Back Bodice (Straight Grain 0°) */}
                <rect x="145" y="25" width="110" height="130" rx="4" fill="#292524" stroke="#d97706" strokeWidth="1.5" />
                <line x1="200" y1="35" x2="200" y2="145" stroke="#d97706" strokeWidth="2" strokeDasharray="4 2" />
                <polygon points="200,32 197,40 203,40" fill="#d97706" />
                <polygon points="200,148 197,140 203,140" fill="#d97706" />
                <text x="200" y="85" textAnchor="middle" fill="#fef3c7" fontSize="10" fontFamily="monospace">
                  Back Bodice (0°)
                </text>

                {/* Panel 3: Mermaid Skirt Flare 1 (True Bias 45°) */}
                <rect x="270" y="25" width="160" height="130" rx="4" fill="#2e1065" stroke="#c084fc" strokeWidth="1.5" />
                <line x1="290" y1="140" x2="410" y2="40" stroke="#c084fc" strokeWidth="2" strokeDasharray="4 2" />
                <polygon points="412,38 404,41 409,47" fill="#c084fc" />
                <polygon points="288,142 296,139 291,133" fill="#c084fc" />
                <text x="350" y="85" textAnchor="middle" fill="#f3e8ff" fontSize="10" fontFamily="monospace">
                  Skirt Flare A (45° Bias)
                </text>

                {/* Panel 4: Mermaid Skirt Flare 2 (True Bias 45°) */}
                <rect x="445" y="25" width="175" height="130" rx="4" fill="#2e1065" stroke="#c084fc" strokeWidth="1.5" />
                <line x1="465" y1="140" x2="600" y2="40" stroke="#c084fc" strokeWidth="2" strokeDasharray="4 2" />
                <polygon points="602,38 594,41 599,47" fill="#c084fc" />
                <polygon points="463,142 471,139 466,133" fill="#c084fc" />
                <text x="532" y="85" textAnchor="middle" fill="#f3e8ff" fontSize="10" fontFamily="monospace">
                  Skirt Flare B (45° Bias)
                </text>
              </svg>

              <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-stone-400">
                <span>Interlining Allowance: 0.375 yds included in yield</span>
                <span>Warp Direction &rarr; | Weft &uarr;&darr;</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
