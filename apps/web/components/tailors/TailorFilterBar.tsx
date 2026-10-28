'use client';

import React from 'react';
import { TailorCity, TailorSpecialty } from './types';
import { CITIES, SPECIALTY_TABS } from './tailorApi';

export interface TailorFilterBarProps {
  selectedCities: TailorCity[];
  onToggleCity: (city: TailorCity) => void;
  onClearCities: () => void;
  selectedSpecialty?: TailorSpecialty;
  onSelectSpecialty: (specialty?: TailorSpecialty) => void;
  maxTurnaroundWeeks?: number;
  onSelectTurnaround: (weeks?: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  showWaitlisted: boolean;
  onToggleShowWaitlisted: (show: boolean) => void;
  onResetAll: () => void;
  totalResultsCount: number;
}

export function TailorFilterBar({
  selectedCities,
  onToggleCity,
  onClearCities,
  selectedSpecialty,
  onSelectSpecialty,
  maxTurnaroundWeeks,
  onSelectTurnaround,
  searchQuery,
  onSearchChange,
  showWaitlisted,
  onToggleShowWaitlisted,
  onResetAll,
  totalResultsCount,
}: TailorFilterBarProps) {
  const hasActiveFilters =
    selectedCities.length > 0 ||
    selectedSpecialty !== undefined ||
    maxTurnaroundWeeks !== undefined ||
    !showWaitlisted ||
    searchQuery.trim().length > 0;

  return (
    <div
      className="bg-[#111318]/95 dark:bg-[#11100F] border border-[#282D37] rounded-lg p-5 mb-8 shadow-md backdrop-blur-md text-[#FBF9F5]"
      role="search"
      aria-label="Atelier Filter Controls"
    >
      {/* Top Row: Search and Quick Count */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#282D37]">
        <div className="relative flex-1 max-w-md">
          <label htmlFor="tailor-search" className="sr-only">
            Search master tailors, cutters, or guilds
          </label>
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#707C94]">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            id="tailor-search"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search master cutter, atelier name, or guild..."
            className="w-full pl-10 pr-4 py-2 bg-[#1C1F26] border border-[#3A414F] rounded-md text-sm text-[#FBF9F5] placeholder-[#707C94] focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-colors"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-[#9AA4B8]">
            {totalResultsCount} {totalResultsCount === 1 ? 'Atelier Found' : 'Accredited Ateliers'}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetAll}
              className="text-xs text-[#C5A059] hover:text-[#E0C792] underline underline-offset-4 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Specialty Tabs */}
      <div className="pt-4 pb-4 border-b border-[#282D37]">
        <div className="text-xs uppercase tracking-wider text-[#9AA4B8] mb-2 font-medium">
          Garment Specialty
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Specialty Selection">
          <button
            type="button"
            role="tab"
            aria-selected={selectedSpecialty === undefined}
            onClick={() => onSelectSpecialty(undefined)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all ${
              selectedSpecialty === undefined
                ? 'bg-[#C5A059] text-[#11100F] shadow-sm font-semibold'
                : 'bg-[#1C1F26] text-[#C9D0DD] hover:bg-[#282D37] border border-[#3A414F]'
            }`}
          >
            All Specialties
          </button>
          {SPECIALTY_TABS.map((tab) => {
            const isSelected = selectedSpecialty === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSelectSpecialty(isSelected ? undefined : tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all ${
                  isSelected
                    ? 'bg-[#C5A059] text-[#11100F] shadow-sm font-semibold'
                    : 'bg-[#1C1F26] text-[#C9D0DD] hover:bg-[#282D37] border border-[#3A414F]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 3: City Multi-Select and Turnaround Controls */}
      <div className="pt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* City Filter */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-[#9AA4B8] font-medium">
              Metropolitan Centers
            </span>
            {selectedCities.length > 0 && (
              <button
                type="button"
                onClick={onClearCities}
                className="text-xs text-[#9AA4B8] hover:text-[#FBF9F5] transition-colors"
              >
                All Cities
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="City Filter Multi-select">
            {CITIES.map((city) => {
              const isSelected = selectedCities.includes(city);
              return (
                <button
                  key={city}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onToggleCity(city)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#282D37] text-[#C5A059] border border-[#C5A059]'
                      : 'bg-[#1C1F26] text-[#C9D0DD] border border-[#3A414F] hover:border-[#707C94]'
                  }`}
                >
                  <span>{city}</span>
                  {isSelected && (
                    <span className="text-[#C5A059] font-bold" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Turnaround & Commission Options */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label
              htmlFor="turnaround-filter"
              className="block text-xs uppercase tracking-wider text-[#9AA4B8] font-medium mb-1"
            >
              Turnaround SLA
            </label>
            <select
              id="turnaround-filter"
              value={maxTurnaroundWeeks ?? ''}
              onChange={(e) =>
                onSelectTurnaround(e.target.value ? Number(e.target.value) : undefined)
              }
              className="bg-[#1C1F26] border border-[#3A414F] text-[#FBF9F5] text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-[#C5A059]"
            >
              <option value="">Any Lead Time</option>
              <option value="2">Max 2 Weeks (Express)</option>
              <option value="3">Max 3 Weeks</option>
              <option value="4">Max 4 Weeks (Standard)</option>
              <option value="6">Max 6 Weeks</option>
            </select>
          </div>

          <div className="pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#C9D0DD] select-none">
              <input
                type="checkbox"
                checked={showWaitlisted}
                onChange={(e) => onToggleShowWaitlisted(e.target.checked)}
                className="rounded border-[#3A414F] bg-[#1C1F26] text-[#C5A059] focus:ring-[#C5A059]"
              />
              <span>Include Waitlisted Ateliers</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
