/**
 * Drape Master Tailor Directory & Concierge Handoff UI Unit & Component Tests
 * Permanent Spec Anchors:
 * - FEAT-010: "Send to Atelier" Concierge Handoff
 * - Screen 8: Master Tailor Directory (screens/08-master-tailor-directory.md)
 * - C-025: GET /api/v1/tailors
 * - C-026: GET /api/v1/tailors/:id
 * - C-027: POST /api/v1/orders/:id/route-tailor
 * - EVT-014: tailor_concierge_routed (analytics.md)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  TailorFilterBar,
  TailorCard,
  HandoffConfirmationModal,
  EmptyTailorState,
  NominateTailorModal,
  INITIAL_TAILOR_STUDIOS,
  CITIES,
  SPECIALTY_TABS,
  filterLocalTailors,
  findAlternativeSisterStudios,
  fetchTailors,
  fetchTailorById,
  routeOrderToTailor,
  emitTailorTelemetry,
  formatCityName,
  normalizeCityForApi,
  TailorStudioItem,
  TailorStudioDetail,
} from '../src/components/tailors';

describe('FEAT-010: Master Tailor Directory & Concierge Handoff UI', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network offline')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('C-025 / Local Tailor Directory Filtering & Data Model', () => {
    it('normalizes city names correctly for API query parameter and UI presentation', () => {
      expect(normalizeCityForApi('New York')).toBe('New_York');
      expect(normalizeCityForApi('London')).toBe('London');
      expect(formatCityName('New_York')).toBe('New York');
      expect(formatCityName('London')).toBe('London');
    });

    it('contains accredited master tailors across London, New York, Paris, Milan, and Lagos', () => {
      expect(INITIAL_TAILOR_STUDIOS.length).toBeGreaterThanOrEqual(6);
      const citiesInDataset = INITIAL_TAILOR_STUDIOS.map((s) => formatCityName(s.city));
      for (const city of CITIES) {
        expect(citiesInDataset).toContain(city);
      }
    });

    it('filters tailors dynamically by city multi-select', () => {
      const londonOnly = filterLocalTailors({ cities: ['London'] });
      expect(londonOnly.items.length).toBe(1);
      expect(londonOnly.items[0].studioName).toBe('Savile & Co. Bespoke Cutters');
      expect(londonOnly.items[0].city).toBe('London');

      const londonAndParis = filterLocalTailors({ cities: ['London', 'Paris'] });
      expect(londonAndParis.items.length).toBe(2);
      const cities = londonAndParis.items.map((s) => formatCityName(s.city));
      expect(cities).toContain('London');
      expect(cities).toContain('Paris');
    });

    it('filters tailors dynamically by garment specialty', () => {
      const bridalOnly = filterLocalTailors({ specialty: 'bridal' });
      expect(bridalOnly.items.length).toBeGreaterThan(0);
      for (const studio of bridalOnly.items) {
        expect(studio.specialties).toContain('bridal');
      }

      const suitingOnly = filterLocalTailors({ specialty: 'suiting' });
      expect(suitingOnly.items.length).toBeGreaterThan(0);
      for (const studio of suitingOnly.items) {
        expect(studio.specialties).toContain('suiting');
      }
    });

    it('filters tailors by turnaround lead time SLA', () => {
      const fastTurnaround = filterLocalTailors({ maxTurnaroundWeeks: 3 });
      expect(fastTurnaround.items.length).toBe(1);
      expect(fastTurnaround.items[0].studioName).toBe('Atelier Savile New York');
      expect(fastTurnaround.items[0].turnaroundWeeks).toBeLessThanOrEqual(3);
    });

    it('filters out waitlisted studios when acceptingCommissions is true', () => {
      const milanAll = filterLocalTailors({ cities: ['Milan'] });
      expect(milanAll.items.length).toBe(2);

      const milanAvailable = filterLocalTailors({
        cities: ['Milan'],
        acceptingCommissions: true,
      });
      expect(milanAvailable.items.length).toBe(1);
      expect(milanAvailable.items[0].studioName).toBe('Sartoria Brera Alta Moda');
      expect(milanAvailable.items[0].activeCapacity).toBe(true);
    });

    it('identifies alternative accredited sister ateliers in the same city when capacity is reached', () => {
      const waitlistedStudio = INITIAL_TAILOR_STUDIOS.find((s) => !s.activeCapacity);
      expect(waitlistedStudio).toBeDefined();
      expect(waitlistedStudio?.city).toBe('Milan');

      const alternatives = findAlternativeSisterStudios(
        waitlistedStudio!.id,
        waitlistedStudio!.city
      );
      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives[0].city).toBe('Milan');
      expect(alternatives[0].activeCapacity).toBe(true);
      expect(alternatives[0].studioName).toBe('Sartoria Brera Alta Moda');
    });

    it('returns empty result set when no accredited studios match the criteria', () => {
      const noResults = filterLocalTailors({
        cities: ['London'],
        specialty: 'traditional',
      });
      expect(noResults.items.length).toBe(0);
      expect(noResults.pagination.totalItems).toBe(0);
    });
  });

  describe('C-025 / C-026 Client API Resilience', () => {
    it('fetchTailors falls back smoothly to local seed data when offline', async () => {
      const res = await fetchTailors({ cities: ['Paris'] });
      expect(res.items.length).toBe(1);
      expect(res.items[0].studioName).toBe('Maison de Couture Saint-Honoré');
    });

    it('fetchTailors uses API when fetch succeeds', async () => {
      const mockItems: TailorStudioItem[] = [
        {
          id: 'test-id-1',
          studioName: 'Mock Atelier',
          masterCutter: 'Jean Mock',
          city: 'Paris',
          address: '1 Rue de Mock',
          specialties: ['bridal'],
          rating: 4.9,
          reviewCount: 10,
          turnaroundWeeks: 3,
          leadTimeDays: 21,
          activeCapacity: true,
          portfolioImages: [],
          guildBadge: 'Chambre Syndicale',
        },
      ];

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            items: mockItems,
            pagination: { totalItems: 1, totalPages: 1, currentPage: 1 },
          }),
        })
      );

      const res = await fetchTailors({ cities: ['Paris'] });
      expect(res.items.length).toBe(1);
      expect(res.items[0].studioName).toBe('Mock Atelier');
    });

    it('fetchTailorById retrieves full studio profile with verified reviews', async () => {
      const studio = await fetchTailorById('33333333-3333-4333-a333-333333333301');
      expect(studio).not.toBeNull();
      expect(studio?.masterCutter).toBe('Arthur Pendelton');
      expect(studio?.guildBadge).toBe('Savile Row Bespoke Association');
      expect(studio?.verifiedReviews.length).toBeGreaterThan(0);
    });
  });

  describe('C-027: Concierge Routing & EVT-014 Telemetry Dispatch', () => {
    it('routeOrderToTailor successfully returns dispatch record and booking confirmation', async () => {
      const result = await routeOrderToTailor('DRP-2027-442', {
        tailorStudioId: '33333333-3333-4333-a333-333333333301',
        consultationDatePreferred: '2026-11-15',
        specialInstructions: 'Double breasted cut with hand-stitched Milanese lapel',
      });

      expect(result.dispatchRecord.orderId).toBe('DRP-2027-442');
      expect(result.dispatchRecord.tailorStudioId).toBe(
        '33333333-3333-4333-a333-333333333301'
      );
      expect(result.dispatchRecord.status).toBe('dispatched');
      expect(result.dispatchRecord.carrierTrackingNumber).toContain('DHL-CONCIERGE-');
      expect(result.bookingConfirmation.consultationCalendarUrl).toContain('consultation?ref=DRP-2027-442');
    });

    it('routeOrderToTailor throws TAILOR_AT_CAPACITY when target atelier has reached capacity', async () => {
      const waitlistedId = '33333333-3333-4333-a333-333333333305'; // Sartoria Quadrilatero Milano
      await expect(
        routeOrderToTailor('DRP-2027-442', {
          tailorStudioId: waitlistedId,
        })
      ).rejects.toThrow('Selected studio has temporarily paused new commissions');
    });

    it('emitTailorTelemetry dispatches EVT-014 event with correct payload structure', () => {
      const evt = emitTailorTelemetry({
        order_id: 'DRP-2027-442',
        tailor_studio_id: '33333333-3333-4333-a333-333333333301',
        city: 'London',
      });

      expect(evt.event_name).toBe('tailor_concierge_routed');
      expect(evt.order_id).toBe('DRP-2027-442');
      expect(evt.tailor_studio_id).toBe('33333333-3333-4333-a333-333333333301');
      expect(evt.city).toBe('London');
      expect(evt.platform).toBe('web');
      expect(evt.app_version).toBe('0.1.0');
      expect(evt.event_id).toMatch(/^evt_/);
    });
  });

  describe('UI Component Presentation & Accessible Screen States', () => {
    it('renders TailorFilterBar with all declared cities and specialty tabs', () => {
      const html = renderToStaticMarkup(
        <TailorFilterBar
          selectedCities={['London']}
          onToggleCity={() => {}}
          onClearCities={() => {}}
          selectedSpecialty="suiting"
          onSelectSpecialty={() => {}}
          maxTurnaroundWeeks={4}
          onSelectTurnaround={() => {}}
          searchQuery=""
          onSearchChange={() => {}}
          showWaitlisted={true}
          onToggleShowWaitlisted={() => {}}
          onResetAll={() => {}}
          totalResultsCount={1}
        />
      );

      // Verify cities
      for (const city of CITIES) {
        expect(html).toContain(city);
      }
      // Verify specialty tabs (HTML-escaped for &)
      for (const tab of SPECIALTY_TABS) {
        const escaped = tab.label.replace(/&/g, '&amp;');
        expect(html).toContain(escaped);
      }
      // Verify search input
      expect(html).toContain('id="tailor-search"');
      // Verify turnaround selector
      expect(html).toContain('id="turnaround-filter"');
    });

    it('renders TailorCard for active atelier with guild credentials, photo, and pricing', () => {
      const studio = INITIAL_TAILOR_STUDIOS[0]; // Savile & Co London
      const html = renderToStaticMarkup(
        <TailorCard
          studio={studio}
          orderId="DRP-2027-442"
          onSelectForRouting={() => {}}
        />
      );

      expect(html).toContain('Savile &amp; Co. Bespoke Cutters');
      expect(html).toContain('Arthur Pendelton');
      expect(html).toContain('Savile Row Bespoke Association');
      expect(html).toContain('4 Weeks (28d)');
      expect(html).toContain('$2,200 USD');
      expect(html).toContain('Route Fabric to This Atelier');
      expect(html).toContain('Commissions Open');
    });

    it('renders TailorCard with Waitlist Only badge and sister atelier recommendation when at capacity', () => {
      const waitlistedStudio = INITIAL_TAILOR_STUDIOS.find((s) => !s.activeCapacity)!;
      const html = renderToStaticMarkup(
        <TailorCard
          studio={waitlistedStudio}
          orderId="DRP-2027-442"
          onSelectForRouting={() => {}}
        />
      );

      expect(html).toContain('Waitlist Only');
      expect(html).toContain('Seasonal Capacity Reached');
      expect(html).toContain('Join Atelier Waitlist');
      // Must recommend sister atelier in Milan (Sartoria Brera Alta Moda)
      expect(html).toContain('Recommended Accredited Alternate:');
      expect(html).toContain('Sartoria Brera Alta Moda');
    });

    it('renders HandoffConfirmationModal with white-glove logistics notes and form fields', () => {
      const studio = INITIAL_TAILOR_STUDIOS[1]; // Atelier Savile New York
      const html = renderToStaticMarkup(
        <HandoffConfirmationModal
          studio={studio}
          orderId="DRP-2027-442"
          onClose={() => {}}
        />
      );

      expect(html).toContain('Route Fabric to Atelier Savile New York');
      expect(html).toContain('Percival Vance');
      expect(html).toContain('740 Madison Ave, New York, NY 10065');
      expect(html).toContain('White-Glove Archival Logistics');
      expect(html).toContain('value="DRP-2027-442"');
      expect(html).toContain('Confirm Concierge Handoff');
    });

    it('renders EmptyTailorState with nomination invitation when city has no ateliers', () => {
      const html = renderToStaticMarkup(
        <EmptyTailorState
          cityName="Tokyo"
          onOpenNominateModal={() => {}}
          onResetFilters={() => {}}
        />
      );

      // Exact phrase from Screen 8 and FEAT-010 specification
      expect(html).toContain('No accredited ateliers in this city yet');
      expect(html).toContain('Tokyo');
      expect(html).toContain('Nominate a Master Tailor');
      expect(html).toContain('View All Accredited Ateliers');
    });

    it('renders NominateTailorModal with nomination fields and craftsmanship notes', () => {
      const html = renderToStaticMarkup(
        <NominateTailorModal
          initialCity="Berlin"
          onClose={() => {}}
        />
      );

      expect(html).toContain('Nominate a Master Tailor');
      expect(html).toContain('Master Cutter Name');
      expect(html).toContain('Atelier / Studio Name');
      expect(html).toContain('value="Berlin"');
      expect(html).toContain('Submit Nomination');
    });
  });
});
