'use client';

import React from 'react';

export interface EmptyTailorStateProps {
  cityName?: string;
  onOpenNominateModal: () => void;
  onResetFilters: () => void;
}

export function EmptyTailorState({
  cityName,
  onOpenNominateModal,
  onResetFilters,
}: EmptyTailorStateProps) {
  return (
    <div
      className="text-center py-16 px-6 bg-[#1C1F26] border border-[#282D37] rounded-lg my-8 max-w-2xl mx-auto shadow-sm"
      role="region"
      aria-label="Filtered Empty Results"
      data-testid="empty-tailors-state"
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#111318] border border-[#3A414F] flex items-center justify-center text-[#C5A059]">
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>

      <span className="text-xs uppercase tracking-widest text-[#C5A059] font-medium">
        Network Curation in Progress
      </span>

      <h3 className="font-serif text-2xl font-bold text-[#FBF9F5] mt-1 mb-2">
        No accredited ateliers in this city yet
      </h3>

      <p className="text-sm text-[#9AA4B8] max-w-md mx-auto mb-8 leading-relaxed">
        {cityName
          ? `Our master cutter guild is currently auditing artisanal bespoke studios in ${cityName}.`
          : 'No ateliers matched your active combination of metropolitan location, turnaround SLA, and specialties.'}
        {' '}If you know a distinguished cutter or couture atelier adhering to highest standards, nominate them below.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={onOpenNominateModal}
          className="w-full sm:w-auto px-6 py-2.5 rounded bg-[#C5A059] text-[#11100F] font-semibold text-xs uppercase tracking-wider hover:bg-[#E0C792] transition-colors shadow-md"
          data-testid="nominate-tailor-button"
        >
          Nominate a Master Tailor
        </button>
        <button
          type="button"
          onClick={onResetFilters}
          className="w-full sm:w-auto px-6 py-2.5 rounded border border-[#3A414F] text-[#FBF9F5] font-medium text-xs hover:bg-[#282D37] transition-colors"
        >
          View All Accredited Ateliers
        </button>
      </div>
    </div>
  );
}
