'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SavedFitting } from './types';
import { triggerTailorPdfDownload } from './wardrobeApi';

interface FittingCardProps {
  fitting: SavedFitting;
  onViewMotion?: (fitting: SavedFitting) => void;
  onPdfDownloaded?: (fitting: SavedFitting) => void;
}

/**
 * Fitting Card Component
 * Spec Anchor: screens/09-digital-wardrobe.md, FEAT-009, CONTRACTS.md (C-017, C-028)
 */
export function FittingCard({
  fitting,
  onViewMotion,
  onPdfDownloaded,
}: FittingCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Download Tailor Spec PDF (C-017 & EVT-013)
  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const res = await triggerTailorPdfDownload({
        fittingId: fitting.id,
        silhouetteId: fitting.silhouetteId,
        orderNumber: `FIT-${fitting.id.slice(-6).toUpperCase()}`,
      });
      if (res.success) {
        setDownloadSuccess(true);
        if (onPdfDownloaded) {
          onPdfDownloaded(fitting);
        }
        setTimeout(() => setDownloadSuccess(false), 3000);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Generate / Copy Public Spec Dossier Link (C-018)
  const handleCopySpecLink = async () => {
    const specUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/specs/tok-${fitting.id}`
      : `/specs/tok-${fitting.id}`;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(specUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  // Swatch color approximation based on fabric name
  const getSwatchBg = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('emerald') || lower.includes('brocade')) return 'bg-emerald-900 border-emerald-700';
    if (lower.includes('charcoal') || lower.includes('wool')) return 'bg-stone-800 border-stone-600';
    if (lower.includes('satin') || lower.includes('duchesse')) return 'bg-amber-100 border-amber-300';
    if (lower.includes('velvet') || lower.includes('obsidian')) return 'bg-neutral-950 border-neutral-700';
    if (lower.includes('linen')) return 'bg-stone-200 border-stone-400';
    return 'bg-amber-800 border-amber-600';
  };

  const formattedDate = new Date(fitting.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const drapePercentage = Math.round(fitting.drapeScore * 100);

  return (
    <article
      data-testid={`fitting-card-${fitting.id}`}
      className="group relative flex flex-col bg-white rounded-xl border border-stone-200/90 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
    >
      {/* Top Media Area: Neural Garment Preview */}
      <div className="relative aspect-[3/4] w-full bg-stone-100 overflow-hidden">
        {/* Fallback & Neural Preview Image */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-stone-50 to-stone-200">
          <svg
            className="w-32 h-44 text-stone-300 drop-shadow-sm transition-transform duration-500 group-hover:scale-105"
            viewBox="0 0 100 140"
            fill="currentColor"
            aria-hidden="true"
          >
            {/* Mannequin / Silhouette stylized path */}
            <path d="M42 12 C42 8, 58 8, 58 12 L60 22 C68 28, 75 38, 70 55 C66 68, 62 76, 60 88 C56 104, 68 128, 72 135 L28 135 C32 128, 44 104, 40 88 C38 76, 34 68, 30 55 C25 38, 32 28, 40 22 Z" />
          </svg>

          {/* Neural cloth overlay badge */}
          <div className="absolute top-3 left-3 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-stone-900/80 backdrop-blur-sm text-stone-100 text-[11px] font-mono tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Neural Fit</span>
          </div>

          {/* Drape Score Confidence Badge */}
          <div
            title="Cloth Drape Physical Confidence Score"
            className="absolute top-3 right-3 px-2 py-0.5 rounded bg-white/90 backdrop-blur-sm text-stone-800 text-[11px] font-mono font-medium shadow-sm border border-stone-200"
          >
            {drapePercentage}% Fit
          </div>
        </div>

        {/* 360 Motion Video Indicator */}
        {fitting.hasMotionVideo && (
          <button
            onClick={() => onViewMotion?.(fitting)}
            data-testid={`motion-badge-${fitting.id}`}
            title="360° Looping Runway Walk Video Available"
            className="absolute bottom-3 right-3 flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-950/85 text-amber-200 text-xs font-sans font-medium backdrop-blur-sm hover:bg-amber-900 transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>360° Walk</span>
          </button>
        )}
      </div>

      {/* Card Body: Textile & Silhouette Metadata */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Swatch Chip & Fabric Label */}
          <div className="flex items-center space-x-2.5 mb-2">
            <div
              className={`w-4 h-4 rounded-full border shadow-inner shrink-0 ${getSwatchBg(fitting.fabricName)}`}
              title={fitting.fabricName}
            />
            <span className="text-xs font-mono uppercase tracking-wider text-stone-500 truncate">
              {fitting.fabricName}
            </span>
          </div>

          {/* Silhouette Name */}
          <h3 className="font-serif text-lg font-normal text-stone-900 tracking-tight leading-snug group-hover:text-amber-900 transition-colors">
            {fitting.silhouetteName}
          </h3>

          <p className="text-xs text-stone-400 font-mono mt-1">Saved on {formattedDate}</p>
        </div>

        {/* Action Buttons: Inspect 3D Drape, View 360° Walk, Download Tailor PDF */}
        <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Inspect 3D Drape */}
            <Link
              href={`/fittings/${fitting.id}`}
              data-testid={`inspect-drape-${fitting.id}`}
              className="inline-flex items-center justify-center py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium rounded transition-colors text-center"
            >
              Inspect 3D Drape
            </Link>

            {/* View 360° Walk */}
            <button
              type="button"
              onClick={() => onViewMotion?.(fitting)}
              data-testid={`view-motion-${fitting.id}`}
              className="inline-flex items-center justify-center py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium rounded transition-colors text-center"
            >
              View 360° Walk
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Download Tailor PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              data-testid={`download-pdf-${fitting.id}`}
              className={`inline-flex items-center justify-center py-2 px-3 rounded text-xs font-medium transition-colors ${
                downloadSuccess
                  ? 'bg-emerald-800 text-white'
                  : 'bg-stone-900 hover:bg-stone-800 text-stone-50'
              }`}
            >
              {isDownloading ? (
                <span className="flex items-center space-x-1">
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Exporting...</span>
                </span>
              ) : downloadSuccess ? (
                '✓ PDF Exported'
              ) : (
                'Download Tailor PDF'
              )}
            </button>

            {/* Share Public Spec Link */}
            <button
              type="button"
              onClick={handleCopySpecLink}
              data-testid={`share-spec-${fitting.id}`}
              className="inline-flex items-center justify-center py-2 px-3 border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-medium rounded transition-colors"
            >
              {copiedLink ? 'Link Copied' : 'Share Spec'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
