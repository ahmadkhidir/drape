'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import YardageCalculatorWidget, { formatFractionalYards } from '../../components/checkout/YardageCalculatorWidget';
import BoltReservationTimer from '../../components/checkout/BoltReservationTimer';
import StripeElementsForm from '../../components/checkout/StripeElementsForm';
import {
  Currency,
  CheckoutCartItem,
  ShippingAddress,
  RecipientContact,
  TailorRouting,
  CreatePaymentIntentRequest,
  CreateOrderRequest,
  YardageCalculationResponse,
} from '../../lib/checkoutTypes';
import { createPaymentIntent, createOrder } from '../../lib/checkoutApi';


import { formatPrice } from '../../lib/currency';
import { BrandLogo } from '../../components/brand/BrandLogo';

const MASTER_TAILOR_STUDIOS = [
  { id: 'tailor_savile_row', name: 'Atelier Savile Row & Co.', city: 'London, UK', leadTime: '3-5 business days' },
  { id: 'tailor_milan_couture', name: 'Sartoria Milano Alta Moda', city: 'Milan, Italy', leadTime: '4-6 business days' },
  { id: 'tailor_paris_atelier', name: 'Maison Laurent Haute Couture', city: 'Paris, France', leadTime: '3-5 business days' },
  { id: 'tailor_lagos_bespoke', name: 'Deola Sagoe Bespoke Studio', city: 'Lagos, Nigeria', leadTime: '5-7 business days' },
];

export default function CheckoutPage() {
  const router = useRouter();

  // Currency selection (USD, EUR, GBP, NGN)
  const [currency, setCurrency] = useState<Currency>('USD');

  // Cart state
  const [cartItems, setCartItems] = useState<CheckoutCartItem[]>([
    {
      fabricId: 'FAB-SLK-892',
      fabricName: 'Imperial Emerald Silk Brocade',
      millName: 'Tessitura Luigi Bevilacqua',
      colorName: 'Imperial Emerald / Gold Thread',
      boltId: 'bolt_901',
      dyeLotCode: 'LOT-2026-EMR-04',
      yardsCut: 4.25,
      pricePerYard: 120.0,
      isSwatchBox: false,
    },
  ]);

  // Active lock token
  const [activeLockId, setActiveLockId] = useState<string>('lock_initial_901');

  // Customer Contact
  const [contact, setContact] = useState<RecipientContact>({
    fullName: 'Amara Okafor',
    email: 'amara.okafor@drape-atelier.com',
    phone: '+44 20 7946 0912',
  });

  // Shipping Destination
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    street: '72 Grosvenor Street, Mayfair',
    city: 'London',
    postalCode: 'W1K 3LF',
    country: 'GB',
  });

  // Shipping Method
  const [shippingMethod, setShippingMethod] = useState<'express_dhl' | 'white_glove'>('express_dhl');
  const shippingCost = shippingMethod === 'express_dhl' ? 35.0 : 65.0;

  // Concierge Master Tailor Routing Toggle
  const [shipToMasterTailor, setShipToMasterTailor] = useState(false);
  const [selectedTailorId, setSelectedTailorId] = useState(MASTER_TAILOR_STUDIOS[0].id);
  const [tailorConciergeNotes, setTailorConciergeNotes] = useState('');

  // Automatic $25 Swatch presentation credit deduction
  const [hasQualifyingSwatchOrder] = useState(true);
  const [applySwatchCredit, setApplySwatchCredit] = useState(true);
  const swatchCreditValue = applySwatchCredit && hasQualifyingSwatchOrder ? 25.0 : 0.0;

  // Mandatory Non-Returnable cut disclaimer
  const [acknowledgedDisclaimer, setAcknowledgedDisclaimer] = useState(false);

  // Yardage widget expander
  const [showYardageWidget, setShowYardageWidget] = useState(false);

  // Submission / Error state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [formValidationErrors, setFormValidationErrors] = useState<Record<string, string>>({});

  // Computed totals
  const subtotal = cartItems.reduce(
    (acc, item) => acc + (item.isSwatchBox ? 25.0 : item.yardsCut * item.pricePerYard),
    0
  );
  const netSubtotal = Math.max(0, subtotal - swatchCreditValue);
  const taxRate = 0.0825;
  const estimatedTax = Number((netSubtotal * taxRate).toFixed(2));
  const grandTotal = Number((netSubtotal + shippingCost + estimatedTax).toFixed(2));

  // Currency symbol helper
  const currencySymbol = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    NGN: '₦',
  }[currency];

  // Callback when YardageCalculator updates
  const handleApplyYardageFromWidget = (yards: number, calculation: YardageCalculationResponse) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.fabricId === calculation.activeBoltId || item.fabricId === 'FAB-SLK-892'
          ? { ...item, yardsCut: yards, boltId: calculation.activeBoltId }
          : item
      )
    );
    setShowYardageWidget(false);
  };

  // Order submission flow
  const handleAuthorizeAndPlaceOrder = async (paymentCardDetails?: {
    cardNumber: string;
    cardExp: string;
    cardCvc: string;
    postalCode: string;
  }) => {
    const errors: Record<string, string> = {};

    if (!contact.fullName.trim()) errors.fullName = 'Full Name is required.';
    if (!contact.email.trim() || !contact.email.includes('@')) errors.email = 'Valid email required.';
    if (!contact.phone.trim()) errors.phone = 'Phone number is required.';
    if (!shippingAddress.street.trim()) errors.street = 'Street address is required.';
    if (!shippingAddress.city.trim()) errors.city = 'City is required.';
    if (!shippingAddress.postalCode.trim()) errors.postalCode = 'Postal code is required.';
    if (!acknowledgedDisclaimer) {
      errors.disclaimer = 'You must acknowledge that custom-cut continuous yardage is non-returnable.';
    }

    if (Object.keys(errors).length > 0) {
      setFormValidationErrors(errors);
      setSubmissionError('Please resolve required form fields before placing your atelier order.');
      return;
    }

    setFormValidationErrors({});
    setSubmissionError(null);
    setIsSubmitting(true);

    try {
      // Step 1: Create Stripe PaymentIntent (C-021)
      const intentReq: CreatePaymentIntentRequest = {
        currency,
        items: cartItems.map((item) => ({
          fabricId: item.fabricId,
          boltId: item.boltId,
          yardsCut: item.yardsCut,
          isSwatchBox: item.isSwatchBox,
          lockId: activeLockId,
        })),
        applySwatchCredit,
      };

      const intentRes = await createPaymentIntent(intentReq);

      // Step 2: Finalize Order (C-022)
      const tailorRoutingData: TailorRouting | null = shipToMasterTailor
        ? {
            tailorStudioId: selectedTailorId,
            studioName: MASTER_TAILOR_STUDIOS.find((s) => s.id === selectedTailorId)?.name,
            conciergeNotes: tailorConciergeNotes,
          }
        : null;

      const orderReq: CreateOrderRequest = {
        idempotencyKey: `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        paymentIntentId: intentRes.paymentIntentId,
        items: cartItems.map((item) => ({
          fabricId: item.fabricId,
          boltId: item.boltId,
          lockId: activeLockId,
          yardsCut: item.yardsCut,
          isSwatchBox: item.isSwatchBox,
        })),
        acknowledgedNonReturnableCut: acknowledgedDisclaimer,
        shippingAddress,
        recipientContact: contact,
        tailorRouting: tailorRoutingData,
      };

      const { order } = await createOrder(orderReq);

      // Transition to Order Confirmation screen (Screen 07)
      router.push(`/orders/${order.id}/confirmation`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment authorization failed. Please try again.';
      setSubmissionError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-alabaster py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-grey-200 mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-widest text-accent-700 font-semibold font-mono">
                Private Salon • Atelier Checkout • Certified Vault Security
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display text-primary-900 font-normal">
              Continuous Cut Yardage & Atelier Checkout
            </h1>
          </div>

          {/* Multi-Currency Selector */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-grey-200 shadow-xs">
            <span className="text-xs text-grey-500 font-mono">Currency:</span>
            <div className="flex items-center gap-1">
              {(['USD', 'EUR', 'GBP', 'NGN'] as Currency[]).map((cur) => (
                <button
                  type="button"
                  key={cur}
                  onClick={() => setCurrency(cur)}
                  className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                    currency === cur
                      ? 'bg-primary-900 text-alabaster font-bold'
                      : 'text-grey-600 hover:bg-grey-100'
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Global Submission Error Alert */}
        {submissionError && (
          <div
            className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-900 text-xs flex items-start justify-between shadow-xs"
            role="alert"
          >
            <div className="flex items-start gap-2">
              <span className="text-red-600 font-bold text-sm">✕</span>
              <div>
                <strong className="font-semibold">Checkout Error:</strong>
                <p className="mt-0.5">{submissionError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSubmissionError(null)}
              className="text-red-700 hover:text-red-900 text-sm font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Two-Column Luxury Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (60%): Shipping & Payment Coordinates */}
          <div className="lg:col-span-7 space-y-6">
            {/* Customer Contact */}
            <section className="bg-white p-6 rounded-lg border border-grey-200 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-grey-100 mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-900">
                  1. Client Identity & Contact
                </h2>
                <span className="text-xs text-grey-500 font-mono">Encrypted Dossier</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="chk-fullname" className="block text-xs font-semibold text-grey-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="chk-fullname"
                    type="text"
                    value={contact.fullName}
                    onChange={(e) => setContact({ ...contact, fullName: e.target.value })}
                    className={`w-full text-xs rounded-md border px-3 py-2 text-primary-900 focus:ring-1 focus:ring-accent-500 ${
                      formValidationErrors.fullName ? 'border-red-400 bg-red-50/20' : 'border-grey-300'
                    }`}
                  />
                  {formValidationErrors.fullName && (
                    <p className="text-[11px] text-red-600 mt-1">{formValidationErrors.fullName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="chk-email" className="block text-xs font-semibold text-grey-700 mb-1">
                    Email Address (For Dossier & Receipt)
                  </label>
                  <input
                    id="chk-email"
                    type="email"
                    value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    className={`w-full text-xs rounded-md border px-3 py-2 text-primary-900 focus:ring-1 focus:ring-accent-500 ${
                      formValidationErrors.email ? 'border-red-400 bg-red-50/20' : 'border-grey-300'
                    }`}
                  />
                  {formValidationErrors.email && (
                    <p className="text-[11px] text-red-600 mt-1">{formValidationErrors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="chk-phone" className="block text-xs font-semibold text-grey-700 mb-1">
                    Phone Number (Courier Dispatch Coordination)
                  </label>
                  <input
                    id="chk-phone"
                    type="tel"
                    value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    className={`w-full text-xs rounded-md border px-3 py-2 text-primary-900 focus:ring-1 focus:ring-accent-500 ${
                      formValidationErrors.phone ? 'border-red-400 bg-red-50/20' : 'border-grey-300'
                    }`}
                  />
                  {formValidationErrors.phone && (
                    <p className="text-[11px] text-red-600 mt-1">{formValidationErrors.phone}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Shipping Destination */}
            <section className="bg-white p-6 rounded-lg border border-grey-200 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-grey-100 mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-900">
                  2. Shipping Destination
                </h2>
                <span className="text-xs text-grey-500 font-mono">Archival Cedar Crate</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3">
                  <label htmlFor="chk-street" className="block text-xs font-semibold text-grey-700 mb-1">
                    Street Address & Suite
                  </label>
                  <input
                    id="chk-street"
                    type="text"
                    value={shippingAddress.street}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                    className={`w-full text-xs rounded-md border px-3 py-2 text-primary-900 focus:ring-1 focus:ring-accent-500 ${
                      formValidationErrors.street ? 'border-red-400 bg-red-50/20' : 'border-grey-300'
                    }`}
                  />
                  {formValidationErrors.street && (
                    <p className="text-[11px] text-red-600 mt-1">{formValidationErrors.street}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="chk-city" className="block text-xs font-semibold text-grey-700 mb-1">
                    City
                  </label>
                  <input
                    id="chk-city"
                    type="text"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    className={`w-full text-xs rounded-md border px-3 py-2 text-primary-900 focus:ring-1 focus:ring-accent-500 ${
                      formValidationErrors.city ? 'border-red-400 bg-red-50/20' : 'border-grey-300'
                    }`}
                  />
                  {formValidationErrors.city && (
                    <p className="text-[11px] text-red-600 mt-1">{formValidationErrors.city}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="chk-postal" className="block text-xs font-semibold text-grey-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    id="chk-postal"
                    type="text"
                    value={shippingAddress.postalCode}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                    className={`w-full text-xs rounded-md border px-3 py-2 text-primary-900 focus:ring-1 focus:ring-accent-500 ${
                      formValidationErrors.postalCode ? 'border-red-400 bg-red-50/20' : 'border-grey-300'
                    }`}
                  />
                  {formValidationErrors.postalCode && (
                    <p className="text-[11px] text-red-600 mt-1">{formValidationErrors.postalCode}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="chk-country" className="block text-xs font-semibold text-grey-700 mb-1">
                    Country
                  </label>
                  <select
                    id="chk-country"
                    value={shippingAddress.country}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                    className="w-full text-xs rounded-md border border-grey-300 px-3 py-2 bg-white text-primary-900 focus:ring-1 focus:ring-accent-500"
                  >
                    <option value="GB">United Kingdom (GB)</option>
                    <option value="US">United States (US)</option>
                    <option value="FR">France (FR)</option>
                    <option value="IT">Italy (IT)</option>
                    <option value="NG">Nigeria (NG)</option>
                  </select>
                </div>
              </div>

              {/* Concierge Master Tailor Routing Option */}
              <div className="mt-5 p-3.5 rounded-md bg-surface border border-grey-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shipToMasterTailor}
                    onChange={(e) => setShipToMasterTailor(e.target.checked)}
                    className="mt-0.5 rounded text-accent-600 focus:ring-accent-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-primary-900 block">
                      Concierge Routing: Ship Directly to an Accredited Master Tailor
                    </span>
                    <span className="text-[11px] text-grey-600 leading-relaxed block mt-0.5">
                      Drape will dispatch your continuous yardage directly to an accredited atelier partner along with your
                      digital Technical Tailor Dossier blueprint.
                    </span>
                  </div>
                </label>

                {shipToMasterTailor && (
                  <div className="mt-3 pt-3 border-t border-grey-200/80 space-y-3">
                    <div>
                      <label htmlFor="select-tailor" className="block text-[11px] font-semibold text-grey-700 mb-1">
                        Select Partner Atelier Studio
                      </label>
                      <select
                        id="select-tailor"
                        value={selectedTailorId}
                        onChange={(e) => setSelectedTailorId(e.target.value)}
                        className="w-full text-xs rounded border border-grey-300 px-2.5 py-1.5 bg-white text-primary-900 font-mono"
                      >
                        {MASTER_TAILOR_STUDIOS.map((studio) => (
                          <option key={studio.id} value={studio.id}>
                            {studio.name} ({studio.city} • Lead time: {studio.leadTime})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="tailor-notes" className="block text-[11px] font-semibold text-grey-700 mb-1">
                        Concierge Tailoring Instructions (Optional)
                      </label>
                      <textarea
                        id="tailor-notes"
                        rows={2}
                        placeholder="e.g., Target fitting on Nov 15th; client requests high-armhole cut."
                        value={tailorConciergeNotes}
                        onChange={(e) => setTailorConciergeNotes(e.target.value)}
                        className="w-full text-xs rounded border border-grey-300 px-2.5 py-1.5 bg-white text-primary-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Shipping Method Options */}
              <div className="mt-4 pt-3 border-t border-grey-100">
                <span className="block text-xs font-semibold uppercase tracking-wider text-grey-700 mb-2">
                  Shipping Method
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setShippingMethod('express_dhl')}
                    className={`p-3 rounded-md border cursor-pointer transition-all ${
                      shippingMethod === 'express_dhl'
                        ? 'border-accent-500 bg-accent-100/40 text-primary-900'
                        : 'border-grey-200 bg-white text-grey-700 hover:bg-grey-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>DHL Express Worldwide</span>
                      <span>{formatPrice(35.0, currency)}</span>
                    </div>
                    <p className="text-[11px] text-grey-500 mt-0.5">2-3 Business Days • Temperature controlled</p>
                  </div>

                  <div
                    onClick={() => setShippingMethod('white_glove')}
                    className={`p-3 rounded-md border cursor-pointer transition-all ${
                      shippingMethod === 'white_glove'
                        ? 'border-accent-500 bg-accent-100/40 text-primary-900'
                        : 'border-grey-200 bg-white text-grey-700 hover:bg-grey-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>White-Glove Courier</span>
                      <span>{formatPrice(65.0, currency)}</span>
                    </div>
                    <p className="text-[11px] text-grey-500 mt-0.5">Hand-delivered in bespoke cedar trunk</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Payment Section: Stripe Elements */}
            <section className="bg-white p-6 rounded-lg border border-grey-200 shadow-xs">
              <div className="pb-3 border-b border-grey-100 mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-900">
                  3. Secure Atelier Payment
                </h2>
              </div>

              <StripeElementsForm
                currency={currency}
                totalAmount={grandTotal}
                isSubmitting={isSubmitting}
                errorMessage={submissionError}
                onPaymentSubmit={(card) => handleAuthorizeAndPlaceOrder(card)}
              />
            </section>
          </div>

          {/* Right Column (40%): Sticky Order Summary & Bolt Reservation */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
            {/* 15-Minute Continuous Bolt Reservation Timer */}
            <BoltReservationTimer
              boltId="bolt_901"
              requestedYards={cartItems[0]?.yardsCut || 4.25}
              initialLockId={activeLockId}
              onLockAcquired={(lock) => setActiveLockId(lock.lockId)}
              onLockRenewed={(lock) => setActiveLockId(lock.lockId)}
            />

            {/* Order Review Card */}
            <div className="bg-white p-6 rounded-lg border border-grey-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-grey-100">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary-900">
                  Order Review & Cut Specs
                </h3>
                <span className="text-xs text-accent-700 font-mono font-medium">1 Line Item</span>
              </div>

              {/* Line Items List */}
              <div className="space-y-3">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-surface rounded-md border border-grey-200/80 text-xs space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-primary-900 text-sm">{item.fabricName}</h4>
                        <p className="text-[11px] text-grey-600">{item.millName}</p>
                      </div>
                      <span className="font-mono font-semibold text-primary-900 text-sm">
                        {formatPrice(item.isSwatchBox ? 25.0 : item.yardsCut * item.pricePerYard, currency)}

                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-grey-200/60 font-mono text-[11px]">
                      <div>
                        <span className="text-grey-500">Cut Specification:</span>
                        <p className="font-semibold text-primary-900">
                          {formatFractionalYards(item.yardsCut)}
                        </p>
                      </div>
                      <div>
                        <span className="text-grey-500">Certified Dye Lot:</span>
                        <p className="font-semibold text-accent-800">{item.dyeLotCode}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-grey-500 pt-1">
                      <span>Warehouse Bolt: {item.boltId}</span>
                      <span>Cedar Crate Packaging: Included</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Toggle Yardage Calculator Drawer */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowYardageWidget(!showYardageWidget)}
                  className="w-full text-xs text-accent-700 hover:text-accent-900 font-semibold py-2 px-3 bg-accent-100/50 rounded border border-accent-200 flex items-center justify-between transition-colors"
                >
                  <span>📐 Adjust Silhouette / Yardage Calculator</span>
                  <span>{showYardageWidget ? '▲ Hide' : '▼ Expand'}</span>
                </button>

                {showYardageWidget && (
                  <div className="mt-3">
                    <YardageCalculatorWidget
                      remainingBoltYards={18.5}
                      initialBoltWidthInches={54}
                      onApplyYardage={handleApplyYardageFromWidget}
                    />
                  </div>
                )}
              </div>

              {/* Swatch Credit Deduction Box */}
              {hasQualifyingSwatchOrder && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applySwatchCredit}
                      onChange={(e) => setApplySwatchCredit(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-semibold text-emerald-900">
                        Automatic {formatPrice(25.0, currency)} Swatch Presentation Credit
                      </span>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        Your previous Imperial Emerald swatch card order credit is automatically applied to this full bolt
                        cut.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Mandatory Non-Returnable Disclaimer Checkbox */}
              <div
                className={`p-3.5 rounded-md border text-xs ${
                  formValidationErrors.disclaimer
                    ? 'border-red-400 bg-red-50/30'
                    : 'border-amber-200 bg-amber-50/40'
                }`}
              >
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    id="disclaimer-checkbox"
                    checked={acknowledgedDisclaimer}
                    onChange={(e) => {
                      setAcknowledgedDisclaimer(e.target.checked);
                      if (formValidationErrors.disclaimer) {
                        setFormValidationErrors((prev) => ({ ...prev, disclaimer: '' }));
                      }
                    }}
                    className="mt-0.5 rounded text-primary-900 focus:ring-primary-900"
                  />
                  <div>
                    <span className="font-semibold text-primary-900 block">
                      Non-Returnable Continuous Cut Yardage Acknowledgment (Required)
                    </span>
                    <p className="text-[11px] text-grey-700 mt-0.5 leading-relaxed">
                      I understand and explicitly agree that continuous fabric yardage severed to order from certified
                      warehouse bolts is irreversible and strictly non-returnable once cut.
                    </p>
                  </div>
                </label>
                {formValidationErrors.disclaimer && (
                  <p className="text-[11px] text-red-600 mt-1 font-semibold">{formValidationErrors.disclaimer}</p>
                )}
              </div>

              {/* Pricing Breakdown */}
              <div className="pt-3 border-t border-grey-200 space-y-2 text-xs">
                <div className="flex justify-between text-grey-600">
                  <span>Continuous Cut Yardage Subtotal</span>
                  <span className="font-mono">{formatPrice(subtotal, currency)}</span>
                </div>

                {applySwatchCredit && hasQualifyingSwatchOrder && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Swatch Box Presentation Credit</span>
                    <span className="font-mono">−{formatPrice(swatchCreditValue, currency)}</span>
                  </div>
                )}

                <div className="flex justify-between text-grey-600">
                  <span>Shipping ({shippingMethod === 'express_dhl' ? 'DHL Express' : 'White-Glove'})</span>
                  <span className="font-mono">{formatPrice(shippingCost, currency)}</span>
                </div>

                <div className="flex justify-between text-grey-600">
                  <span>Estimated VAT / Duties (8.25%)</span>
                  <span className="font-mono">{formatPrice(estimatedTax, currency)}</span>
                </div>

                <div className="flex justify-between text-base font-display font-semibold text-primary-900 pt-2 border-t border-grey-200">
                  <span>Total Due</span>
                  <span className="font-mono text-lg">{formatPrice(grandTotal, currency)} {currency}</span>
                </div>
              </div>

              {/* Primary Authorization CTA */}
              <button
                type="button"
                id="btn-place-order"
                disabled={isSubmitting}
                onClick={() => handleAuthorizeAndPlaceOrder()}
                className="w-full py-3.5 px-4 bg-primary-900 text-alabaster rounded-md text-xs font-semibold uppercase tracking-widest hover:bg-primary-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-alabaster/30 border-t-alabaster rounded-full animate-spin" />
                    <span>Authorizing Atelier Cut...</span>
                  </>
                ) : (
                  <span>
                    Authorize & Place Order — {formatPrice(grandTotal, currency)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
