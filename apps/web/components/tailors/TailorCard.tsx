'use client';

import React, { useState } from 'react';
import { TailorStudioItem, TailorStudioDetail } from './types';
import { formatCityName, findAlternativeSisterStudios } from './tailorApi';

export interface TailorCardProps {
  studio: TailorStudioItem;
  orderId?: string | null;
  onSelectForRouting: (studio: TailorStudioItem) => void;
  onSelectAlternativeStudio?: (studio: TailorStudioDetail) => void;
}

export function TailorCard({
  studio,
  orderId,
  onSelectForRouting,
  onSelectAlternativeStudio,
}: TailorCardProps) {
  const [showPortfolio, setShowPortfolio] = useState(false);

  const isWaitlisted = !studio.activeCapacity;
  const alternativeStudios = isWaitlisted
    ? findAlternativeSisterStudios(studio.id, studio.city)
    : [];

  const mainPhoto = studio.portfolioImages && studio.portfolioImages.length > 0
    ? studio.portfolioImages[0]
    : null;

  return (
    <article
      className="flex flex-col bg-[#1C1F26] border border-[#282D37] hover:border-[#C5A059]/60 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 relative group"
      data-testid={`tailor-card-${studio.id}`}
      aria-labelledby={`tailor-name-${studio.id}`}
    >
      {/* Studio Photography & Status Badges */}
      <div className="relative h-56 w-full bg-[#111318] overflow-hidden">
        {mainPhoto ? (
          <img
            src={mainPhoto}
            alt={`${studio.studioName} exterior atelier in ${formatCityName(studio.city)}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1C1F26] to-[#111318] p-6 text-center">
            <span className="font-serif text-2xl text-[#C5A059] tracking-wider mb-1">DRAPE</span>
            <span className="text-xs text-[#9AA4B8] uppercase tracking-widest">Accredited Atelier</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1F26] via-transparent to-black/40 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-auto">
          {studio.guildBadge ? (
            <span
              className="inline-flex items-center px-2.5 py-1 rounded bg-[#111318]/90 text-[#C5A059] text-[11px] font-medium tracking-wide border border-[#C5A059]/40 backdrop-blur-sm"
              title={studio.guildBadge}
            >
              <span className="mr-1.5 text-xs text-[#C5A059]" aria-hidden="true">
                ✦
              </span>
              <span className="truncate max-w-[170px]">{studio.guildBadge}</span>
            </span>
          ) : (
            <span />
          )}

          {isWaitlisted ? (
            <span
              className="inline-flex items-center px-2.5 py-1 rounded bg-[#A66B13] text-[#FCF5EA] text-xs font-semibold tracking-wider uppercase border border-[#FCF5EA]/30 shadow-sm"
              data-testid="waitlist-badge"
            >
              Waitlist Only
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#14462B]/90 text-[#EAF7F0] text-[11px] font-medium tracking-wide border border-[#287D4E]/40 backdrop-blur-sm">
              Commissions Open
            </span>
          )}
        </div>

        {/* City and Review Score Pill in Image Footer */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-[#FBF9F5] font-medium">
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#111318]/80 backdrop-blur-sm border border-[#3A414F]">
            📍 {formatCityName(studio.city)}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#111318]/80 backdrop-blur-sm border border-[#3A414F] text-[#C5A059]">
            ★ {studio.rating.toFixed(2)} ({studio.reviewCount})
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Studio & Master Cutter Heading */}
          <div className="mb-3">
            <h3
              id={`tailor-name-${studio.id}`}
              className="font-serif text-lg font-bold text-[#FBF9F5] leading-snug group-hover:text-[#C5A059] transition-colors"
            >
              {studio.studioName}
            </h3>
            <p className="text-xs text-[#C5A059] font-medium tracking-wide mt-0.5">
              Master Cutter: {studio.masterCutter}
            </p>
          </div>

          {/* Master Cutter Bio */}
          {studio.bio && (
            <p className="text-xs text-[#C9D0DD] line-clamp-2 mb-4 leading-relaxed font-light">
              {studio.bio}
            </p>
          )}

          {/* Specialties Pills */}
          <div className="flex flex-wrap gap-1.5 mb-4" aria-label="Atelier Specialties">
            {studio.specialties.map((spec) => (
              <span
                key={spec}
                className="px-2 py-0.5 rounded bg-[#282D37] text-[#9AA4B8] text-[11px] font-medium capitalize"
              >
                {spec}
              </span>
            ))}
          </div>

          {/* Metrics Grid: Turnaround & Labor Cost */}
          <div className="grid grid-cols-2 gap-2 py-3 px-3 bg-[#111318] rounded border border-[#282D37] mb-4 text-xs">
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-[#707C94]">
                Lead Time
              </span>
              <span className="font-semibold text-[#FBF9F5]">
                {studio.turnaroundWeeks} Weeks ({studio.leadTimeDays}d)
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-[#707C94]">
                Typical Labor
              </span>
              <span className="font-semibold text-[#C5A059]">
                {studio.averageLaborCostUSD
                  ? `$${studio.averageLaborCostUSD.toLocaleString()} USD`
                  : 'Bespoke Quote'}
              </span>
            </div>
          </div>

          {/* Featured Client Review Snippet */}
          {studio.verifiedReviews && studio.verifiedReviews.length > 0 && (
            <div className="mb-4 text-xs italic text-[#B8B1A5] bg-[#1C1F26] border-l-2 border-[#C5A059] pl-3 py-1">
              &ldquo;{studio.verifiedReviews[0].comment}&rdquo;
              <span className="block not-italic text-[10px] text-[#707C94] mt-0.5">
                — {studio.verifiedReviews[0].authorName}
              </span>
            </div>
          )}

          {/* Waitlist Notice & Sister Studio Recommendation */}
          {isWaitlisted && (
            <div className="mb-4 p-3 bg-[#5A3807]/30 border border-[#A66B13]/40 rounded text-xs text-[#FCF5EA]">
              <p className="font-semibold text-[#E0C792] mb-1">
                Seasonal Capacity Reached
              </p>
              <p className="text-[11px] text-[#DCD6CC] leading-relaxed mb-2">
                This atelier has currently paused immediate fabric intake.
                Estimated reopen in ~6 weeks.
              </p>
              {alternativeStudios.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#A66B13]/30">
                  <span className="block text-[10px] uppercase tracking-wider text-[#E0C792] font-medium mb-1">
                    Recommended Accredited Alternate:
                  </span>
                  {alternativeStudios.slice(0, 1).map((alt) => (
                    <button
                      key={alt.id}
                      type="button"
                      onClick={() => onSelectAlternativeStudio?.(alt)}
                      className="text-left w-full text-xs text-[#FBF9F5] hover:text-[#C5A059] font-medium underline underline-offset-2 transition-colors"
                    >
                      → {alt.studioName} (Master {alt.masterCutter})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Portfolio Lookbook Drawer/Modal */}
          {showPortfolio && studio.portfolioImages && studio.portfolioImages.length > 0 && (
            <div className="mb-4 p-3 bg-[#111318] rounded border border-[#282D37]">
              <span className="block text-[11px] uppercase tracking-wider text-[#C5A059] font-medium mb-2">
                Atelier Lookbook & Craftsmanship
              </span>
              <div className="grid grid-cols-2 gap-2">
                {studio.portfolioImages.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`${studio.studioName} portfolio plate ${i + 1}`}
                    className="w-full h-24 object-cover rounded border border-[#3A414F]"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#282D37] flex flex-col gap-2">
          {studio.portfolioImages && studio.portfolioImages.length > 1 && (
            <button
              type="button"
              onClick={() => setShowPortfolio(!showPortfolio)}
              className="text-xs text-[#9AA4B8] hover:text-[#C5A059] text-center transition-colors"
            >
              {showPortfolio ? 'Hide Atelier Portfolio ↑' : 'View Atelier Portfolio (2 plates) ↓'}
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectForRouting(studio)}
            className={`w-full py-2.5 px-4 rounded text-xs font-semibold tracking-wider uppercase transition-all duration-200 shadow-sm ${
              isWaitlisted
                ? 'bg-[#282D37] text-[#C9D0DD] hover:bg-[#3A414F] border border-[#3A414F]'
                : 'bg-[#C5A059] text-[#11100F] hover:bg-[#E0C792] hover:shadow-md'
            }`}
            aria-label={
              isWaitlisted
                ? `Join waitlist for ${studio.studioName}`
                : `Route Fabric to ${studio.studioName}`
            }
          >
            {isWaitlisted ? 'Join Atelier Waitlist' : 'Route Fabric to This Atelier'}
          </button>
        </div>
      </div>
    </article>
  );
}
