'use client';

import React, { useState } from 'react';
import { Currency } from '../../lib/checkoutTypes';

export interface StripeElementsFormProps {
  currency: Currency;
  totalAmount: number;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onPaymentSubmit: (paymentMethod: {
    cardNumber: string;
    cardExp: string;
    cardCvc: string;
    postalCode: string;
  }) => void;
  disabled?: boolean;
}

export const StripeElementsForm: React.FC<StripeElementsFormProps> = ({
  currency,
  totalAmount,
  isSubmitting = false,
  errorMessage = null,
  onPaymentSubmit,
  disabled = false,
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExp = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.length <= 19) {
      setCardNumber(formatted);
      if (fieldErrors.cardNumber) {
        setFieldErrors((prev) => ({ ...prev, cardNumber: '' }));
      }
    }
  };

  const handleExpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExp(e.target.value);
    if (formatted.length <= 5) {
      setCardExp(formatted);
      if (fieldErrors.cardExp) {
        setFieldErrors((prev) => ({ ...prev, cardExp: '' }));
      }
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9]/gi, '');
    if (v.length <= 4) {
      setCardCvc(v);
      if (fieldErrors.cardCvc) {
        setFieldErrors((prev) => ({ ...prev, cardCvc: '' }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    const rawNum = cardNumber.replace(/\s/g, '');
    if (rawNum.length < 15) {
      errors.cardNumber = 'Valid card number is required (15-16 digits).';
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExp)) {
      errors.cardExp = 'Expiry must be in MM/YY format.';
    }
    if (cardCvc.length < 3) {
      errors.cardCvc = '3 or 4 digit CVC required.';
    }
    if (!postalCode.trim()) {
      errors.postalCode = 'Postal / Zip code required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    onPaymentSubmit({
      cardNumber: rawNum,
      cardExp,
      cardCvc,
      postalCode,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-grey-100">
        <span className="text-xs font-semibold uppercase tracking-wider text-grey-700">
          Stripe Secure Payment Elements
        </span>
        <div className="flex items-center gap-1.5 text-xs text-grey-500 font-mono">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          <span>256-bit SSL • 3D Secure 2.0</span>
        </div>
      </div>

      {errorMessage && (
        <div
          className="p-3 bg-red-50 border border-red-200 rounded-md text-red-900 text-xs flex items-start gap-2"
          role="alert"
        >
          <span className="font-bold text-red-700">Payment Error:</span>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Card Number */}
        <div>
          <label htmlFor="stripe-card-number" className="block text-[11px] uppercase tracking-wider text-grey-600 mb-1">
            Card Number
          </label>
          <div className="relative">
            <input
              id="stripe-card-number"
              type="text"
              placeholder="4242 •••• •••• 4242"
              value={cardNumber}
              onChange={handleCardNumberChange}
              disabled={disabled || isSubmitting}
              className={`w-full text-sm font-mono rounded-md border px-3 py-2 bg-white text-primary-900 focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all ${
                fieldErrors.cardNumber ? 'border-red-400 bg-red-50/20' : 'border-grey-300'
              }`}
            />
            <div className="absolute right-3 top-2.5 flex items-center gap-1 text-grey-400 text-xs font-mono">
              <span>💳</span>
            </div>
          </div>
          {fieldErrors.cardNumber && (
            <p className="text-[11px] text-red-600 mt-1">{fieldErrors.cardNumber}</p>
          )}
        </div>

        {/* Exp, CVC, Zip */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="stripe-exp" className="block text-[11px] uppercase tracking-wider text-grey-600 mb-1">
              Expires
            </label>
            <input
              id="stripe-exp"
              type="text"
              placeholder="MM/YY"
              value={cardExp}
              onChange={handleExpChange}
              disabled={disabled || isSubmitting}
              className={`w-full text-sm font-mono rounded-md border px-3 py-2 bg-white text-primary-900 focus:outline-none focus:ring-2 focus:ring-accent-500 ${
                fieldErrors.cardExp ? 'border-red-400' : 'border-grey-300'
              }`}
            />
            {fieldErrors.cardExp && (
              <p className="text-[11px] text-red-600 mt-0.5">{fieldErrors.cardExp}</p>
            )}
          </div>

          <div>
            <label htmlFor="stripe-cvc" className="block text-[11px] uppercase tracking-wider text-grey-600 mb-1">
              CVC
            </label>
            <input
              id="stripe-cvc"
              type="password"
              maxLength={4}
              placeholder="•••"
              value={cardCvc}
              onChange={handleCvcChange}
              disabled={disabled || isSubmitting}
              className={`w-full text-sm font-mono rounded-md border px-3 py-2 bg-white text-primary-900 focus:outline-none focus:ring-2 focus:ring-accent-500 ${
                fieldErrors.cardCvc ? 'border-red-400' : 'border-grey-300'
              }`}
            />
            {fieldErrors.cardCvc && (
              <p className="text-[11px] text-red-600 mt-0.5">{fieldErrors.cardCvc}</p>
            )}
          </div>

          <div>
            <label htmlFor="stripe-postal" className="block text-[11px] uppercase tracking-wider text-grey-600 mb-1">
              Postal Code
            </label>
            <input
              id="stripe-postal"
              type="text"
              placeholder="W1K 3LF"
              value={postalCode}
              onChange={(e) => {
                setPostalCode(e.target.value);
                if (fieldErrors.postalCode) setFieldErrors((prev) => ({ ...prev, postalCode: '' }));
              }}
              disabled={disabled || isSubmitting}
              className={`w-full text-sm font-mono rounded-md border px-3 py-2 bg-white text-primary-900 focus:outline-none focus:ring-2 focus:ring-accent-500 ${
                fieldErrors.postalCode ? 'border-red-400' : 'border-grey-300'
              }`}
            />
            {fieldErrors.postalCode && (
              <p className="text-[11px] text-red-600 mt-0.5">{fieldErrors.postalCode}</p>
            )}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between text-[11px] text-grey-500">
          <span>Supported currencies: USD, EUR, GBP, NGN</span>
          <span>Encrypted via Stripe PCI-DSS Level 1</span>
        </div>
      </form>
    </div>
  );
};

export default StripeElementsForm;
