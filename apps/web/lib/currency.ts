import { Currency } from './checkoutTypes';

/**
 * Currency exchange rates relative to USD base
 * Spec: Task #37 (USD: 1.0, EUR: 0.92, GBP: 0.79, NGN: 1600.0)
 */
export const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1600.0,
};

/**
 * Converts and formats a USD price into the target currency with proper locale notation.
 */
export function formatPrice(amountInUsd: number, cur: Currency): string {
  const rate = EXCHANGE_RATES[cur] || 1.0;
  const converted = amountInUsd * rate;
  if (cur === 'NGN') {
    return `₦${Math.round(converted).toLocaleString('en-US')}`;
  }
  if (cur === 'EUR') {
    return `€${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (cur === 'GBP') {
    return `£${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
