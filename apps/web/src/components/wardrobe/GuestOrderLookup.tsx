'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { lookupGuestOrder, triggerTailorPdfDownload } from './wardrobeApi';
import { GuestLookupResponse } from './types';

interface GuestOrderLookupProps {
  onOrderFound?: (res: GuestLookupResponse) => void;
  onLoginClick?: () => void;
}

/**
 * Guest Order Lookup Form Component
 * Spec Anchor: screens/09-digital-wardrobe.md, CONTRACTS.md (C-029, C-017)
 */
export function GuestOrderLookup({ onOrderFound, onLoginClick }: GuestOrderLookupProps) {
  const [orderNumber, setOrderNumber] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuestLookupResponse | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOrderNumber = orderNumber.trim();
    const cleanEmail = billingEmail.trim();

    if (!cleanOrderNumber || !cleanEmail) {
      setError('Please provide both your order number and billing email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await lookupGuestOrder({
        orderNumber: cleanOrderNumber,
        billingEmail: cleanEmail,
      });
      setResult(data);
      if (onOrderFound) {
        onOrderFound(data);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.replace('ORDER_LOOKUP_FAILED: ', '').replace('VALIDATION_FAILED: ', '')
          : 'Unable to locate order with provided details.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!result?.order) return;
    setIsDownloadingPdf(true);
    try {
      await triggerTailorPdfDownload({
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        token: result.oneTimeAccessToken,
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div
      data-testid="guest-order-lookup"
      className="max-w-xl mx-auto bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm"
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-100 text-stone-700 mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h3 className="font-serif text-xl sm:text-2xl text-stone-900 font-normal">
          Guest Order Lookup
        </h3>
        <p className="text-stone-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
          Commissioned cloth as an atelier guest? Enter your order reference and billing email to access your cutting specs.
        </p>
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="lookup-order-number"
              className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1"
            >
              Order Number
            </label>
            <input
              id="lookup-order-number"
              data-testid="input-order-number"
              type="text"
              placeholder="e.g. DRP-2027-442"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-stone-300 rounded-md font-mono text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900"
              required
            />
          </div>

          <div>
            <label
              htmlFor="lookup-billing-email"
              className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1"
            >
              Billing Email Address
            </label>
            <input
              id="lookup-billing-email"
              data-testid="input-billing-email"
              type="email"
              placeholder="client@atelier.luxury"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-stone-300 rounded-md text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900"
              required
            />
          </div>

          {error && (
            <div
              data-testid="lookup-error-message"
              className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start space-x-2"
            >
              <span className="shrink-0 font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="submit-guest-lookup"
            className="w-full py-3 bg-stone-900 text-stone-50 text-xs font-semibold uppercase tracking-widest rounded-md hover:bg-stone-800 transition-colors duration-150 disabled:opacity-50"
          >
            {isSubmitting ? 'Retrieving Commission...' : 'Retrieve Commission Spec'}
          </button>
        </form>
      ) : (
        /* Retrieved Order Result View */
        <div data-testid="guest-order-result" className="space-y-5 animate-fadeIn">
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <span className="text-[11px] font-mono uppercase text-stone-400">Order</span>
                <div className="font-mono font-medium text-stone-900 text-base">
                  {result.order.orderNumber}
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-100 text-amber-800">
                {result.order.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 text-xs">
              <div>
                <span className="text-stone-500 block">Textile</span>
                <span className="font-serif text-stone-900 text-sm font-normal">
                  {result.order.fabricName}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block">Cut Yardage</span>
                <span className="font-mono text-stone-900 text-sm font-medium">
                  {result.order.yardsCut} yds
                </span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              data-testid="guest-download-spec-pdf"
              className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download Tailor Spec PDF'}</span>
            </button>

            {result.order.carrierTrackingUrl && (
              <a
                href={result.order.carrierTrackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-4 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-medium rounded-md transition-colors text-center block"
              >
                Track Physical Shipment
              </a>
            )}

            <button
              type="button"
              onClick={() => setResult(null)}
              className="w-full text-center text-xs text-stone-500 hover:text-stone-800 pt-1"
            >
              Look up another order
            </button>
          </div>
        </div>
      )}

      {/* Alternative Login Link */}
      <div className="mt-6 pt-5 border-t border-stone-100 text-center text-xs text-stone-500">
        <span>Already have an Atelier account? </span>
        <button
          type="button"
          onClick={onLoginClick}
          className="text-stone-900 underline font-medium hover:text-stone-700"
        >
          Sign in to view all fittings
        </button>
      </div>
    </div>
  );
}
