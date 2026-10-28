'use client';

import React, { useState } from 'react';
import {
  TailorStudioItem,
  RouteTailorResponse,
  RouteOrderToTailorRequest,
  TailorStudioDetail,
} from './types';
import {
  routeOrderToTailor,
  emitTailorTelemetry,
  formatCityName,
  findAlternativeSisterStudios,
} from './tailorApi';

export interface HandoffConfirmationModalProps {
  studio: TailorStudioItem;
  orderId: string | null;
  onClose: () => void;
  onAlternativeSelected?: (studio: TailorStudioDetail) => void;
}

export function HandoffConfirmationModal({
  studio,
  orderId: initialOrderId,
  onClose,
  onAlternativeSelected,
}: HandoffConfirmationModalProps) {
  const [orderId, setOrderId] = useState(initialOrderId || '');
  const [consultationDate, setConsultationDate] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitlistDate, setWaitlistDate] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<RouteTailorResponse | null>(null);

  const isWaitlisted = !studio.activeCapacity;
  const alternativeStudios = isWaitlisted || waitlistDate
    ? findAlternativeSisterStudios(studio.id, studio.city)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) {
      setError('Please provide an active Drape order number (e.g. DRP-2027-442).');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setWaitlistDate(null);

    const payload: RouteOrderToTailorRequest = {
      tailorStudioId: studio.id,
      consultationDatePreferred: consultationDate || undefined,
      specialInstructions: specialInstructions.trim() || undefined,
    };

    try {
      // 1. Submit to C-027
      const result = await routeOrderToTailor(orderId.trim(), payload);
      setConfirmation(result);

      // 2. Emit EVT-014 Telemetry Event per analytics.md
      emitTailorTelemetry({
        order_id: orderId.trim(),
        tailor_studio_id: studio.id,
        city: formatCityName(studio.city),
      });
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string; waitlistEstimatedDate?: string };
      if (e.code === 'TAILOR_AT_CAPACITY') {
        setError(
          e.message ||
            'Selected studio has temporarily paused new commissions. Please select an alternate atelier.'
        );
        setWaitlistDate(e.waitlistEstimatedDate || 'in ~6 weeks');
      } else {
        setError(e.message || 'Routing order to tailor failed. Please retry.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
    >
      <div className="relative w-full max-w-xl bg-[#111318] border border-[#282D37] rounded-lg shadow-2xl p-6 sm:p-8 text-[#FBF9F5] my-8 animate-fadeIn">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#707C94] hover:text-[#FBF9F5] p-2 rounded-full focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          aria-label="Close dialog"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!confirmation ? (
          /* Form State */
          <div>
            <div className="border-b border-[#282D37] pb-4 mb-6">
              <span className="text-xs uppercase tracking-widest text-[#C5A059] font-medium">
                Concierge Handoff & Spec Routing
              </span>
              <h2 id="modal-headline" className="font-serif text-2xl font-bold text-[#FBF9F5] mt-1">
                Route Fabric to {studio.studioName}
              </h2>
              <p className="text-xs text-[#9AA4B8] mt-1">
                Master Cutter: {studio.masterCutter} • {formatCityName(studio.city)}
              </p>
            </div>

            {/* Atelier Verification Snapshot */}
            <div className="bg-[#1C1F26] border border-[#282D37] rounded p-4 mb-6 text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[#9AA4B8]">Studio Address:</span>
                <span className="text-[#FBF9F5] font-medium text-right">{studio.address}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#9AA4B8]">Turnaround SLA:</span>
                <span className="text-[#FBF9F5] font-medium">{studio.turnaroundWeeks} Weeks Lead Time</span>
              </div>
              {studio.guildBadge && (
                <div className="flex items-center justify-between">
                  <span className="text-[#9AA4B8]">Accreditation:</span>
                  <span className="text-[#C5A059] font-medium">{studio.guildBadge}</span>
                </div>
              )}
            </div>

            {/* White Glove Explainer */}
            <div className="mb-6 p-3 bg-[#282D37]/40 rounded border border-[#3A414F] text-xs text-[#C9D0DD] leading-relaxed">
              <p className="font-semibold text-[#FBF9F5] mb-1">
                ✦ White-Glove Archival Logistics
              </p>
              Your cut yardage will be dispatched directly to this atelier in archival cedar packaging.
              The tailor's studio portal will immediately receive your digital pattern dossier, grainline marker
              diagram, and 3D neural drape render.
            </div>

            {/* Error / Capacity Warning */}
            {error && (
              <div
                className="mb-6 p-4 bg-[#5A1A1A]/40 border border-[#A83232] rounded text-xs text-[#FBEFEF]"
                role="alert"
                data-testid="routing-error-alert"
              >
                <p className="font-semibold text-[#FBEFEF] mb-1">{error}</p>
                {waitlistDate && (
                  <p className="text-[#DCD6CC] mt-1">
                    Estimated availability: {waitlistDate}. You may join the waitlist or choose a sister studio.
                  </p>
                )}
                {alternativeStudios.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#A83232]/40">
                    <span className="block font-medium text-[#C5A059] mb-1.5">
                      Accredited Alternate Atelier in {formatCityName(studio.city)}:
                    </span>
                    {alternativeStudios.slice(0, 1).map((alt) => (
                      <button
                        key={alt.id}
                        type="button"
                        onClick={() => {
                          onAlternativeSelected?.(alt);
                          onClose();
                        }}
                        className="text-left w-full text-xs text-[#FBF9F5] hover:text-[#C5A059] underline underline-offset-2 transition-colors font-medium"
                      >
                        → Switch to {alt.studioName} (Master {alt.masterCutter})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="order-id" className="block text-xs uppercase tracking-wider text-[#9AA4B8] font-medium mb-1">
                  Drape Order Reference <span className="text-[#A83232]">*</span>
                </label>
                <input
                  id="order-id"
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g. DRP-2027-442 or Order UUID"
                  required
                  className="w-full px-3.5 py-2 bg-[#1C1F26] border border-[#3A414F] rounded text-sm text-[#FBF9F5] placeholder-[#707C94] focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label
                  htmlFor="consultation-date"
                  className="block text-xs uppercase tracking-wider text-[#9AA4B8] font-medium mb-1"
                >
                  Preferred Atelier Consultation Date (Optional)
                </label>
                <input
                  id="consultation-date"
                  type="date"
                  value={consultationDate}
                  onChange={(e) => setConsultationDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#1C1F26] border border-[#3A414F] rounded text-sm text-[#FBF9F5] focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label
                  htmlFor="special-instructions"
                  className="block text-xs uppercase tracking-wider text-[#9AA4B8] font-medium mb-1"
                >
                  Special Tailoring Notes or Fitting Instructions (Optional, max 1000 chars)
                </label>
                <textarea
                  id="special-instructions"
                  rows={3}
                  maxLength={1000}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Please leave extra seam allowance along waistline for bridal corset boning..."
                  className="w-full px-3.5 py-2 bg-[#1C1F26] border border-[#3A414F] rounded text-sm text-[#FBF9F5] placeholder-[#707C94] focus:outline-none focus:border-[#C5A059] resize-none"
                />
                <span className="block text-right text-[10px] text-[#707C94] mt-1">
                  {specialInstructions.length}/1000
                </span>
              </div>

              <div className="pt-4 border-t border-[#282D37] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded text-xs font-medium text-[#C9D0DD] hover:text-[#FBF9F5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded bg-[#C5A059] text-[#11100F] font-semibold text-xs uppercase tracking-wider hover:bg-[#E0C792] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                  data-testid="submit-routing-button"
                >
                  {isSubmitting ? 'Routing to Atelier...' : 'Confirm Concierge Handoff'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Success Confirmed State */
          <div className="text-center py-4 animate-fadeIn" data-testid="routing-confirmation-view">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#14462B] flex items-center justify-center text-[#287D4E] border border-[#287D4E]/40">
              <svg className="w-6 h-6 text-[#EAF7F0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <span className="text-xs uppercase tracking-widest text-[#C5A059] font-medium">
              Concierge Handoff Confirmed
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#FBF9F5] mt-1 mb-2">
              Dispatched to {confirmation.dispatchRecord.studioName}
            </h2>
            <p className="text-xs text-[#9AA4B8] max-w-md mx-auto mb-6 leading-relaxed">
              Your fabric order and digital technical spec dossier have been successfully linked.
              Archival packaging will be routed with tracking code below.
            </p>

            {/* Dispatch Record Card */}
            <div className="bg-[#1C1F26] border border-[#282D37] rounded p-5 mb-6 text-xs text-left space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#282D37]">
                <span className="text-[#9AA4B8]">Carrier Tracking:</span>
                <span className="font-mono text-[#C5A059] font-semibold">
                  {confirmation.dispatchRecord.carrierTrackingNumber}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#282D37]">
                <span className="text-[#9AA4B8]">Estimated Atelier Arrival:</span>
                <span className="text-[#FBF9F5] font-medium">
                  {confirmation.bookingConfirmation.estimatedAtelierArrivalDate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#9AA4B8]">Digital Specification:</span>
                <a
                  href={confirmation.dispatchRecord.digitalSpecUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#C5A059] hover:underline"
                >
                  View Tailor Spec Dossier ↗
                </a>
              </div>
            </div>

            {/* Primary Action: Book Calendar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <a
                href={confirmation.bookingConfirmation.consultationCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-2.5 rounded bg-[#C5A059] text-[#11100F] font-semibold text-xs uppercase tracking-wider hover:bg-[#E0C792] transition-colors shadow-md text-center"
              >
                Book Atelier Fitting Calendar ↗
              </a>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded border border-[#3A414F] text-[#FBF9F5] font-medium text-xs hover:bg-[#282D37] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
