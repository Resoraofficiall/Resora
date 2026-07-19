/**
 * RESORA — Currency Formatting Utility
 * Per Blueprint §1.3 (Single currency: INR) and §18.1 (Razorpay amounts
 * are in the smallest currency unit — paise — at the gateway boundary
 * only; everywhere else in the app, amounts are stored and displayed as
 * whole rupees, per the schemas in §6.2 which use plain numeric `amount`/
 * `price`/`total` fields with no explicit subunit scaling).
 *
 * Single source of truth for currency display — no component formats
 * currency ad hoc with template strings or manual toLocaleString calls.
 */

const INR_LOCALE = 'en-IN';

export interface FormatCurrencyOptions {
  /** Show the ₹ symbol. Defaults to true. */
  showSymbol?: boolean;
  /** Show two decimal places even for whole-rupee amounts. Defaults to false —
   *  Resora's luxury-restraint tone (§2.2) favors clean whole numbers where
   *  amounts don't carry paise precision. */
  showDecimals?: boolean;
}

/**
 * Formats a numeric rupee amount using Indian digit grouping
 * (e.g. 1,00,000 not 100,000), per §18.1's INR-only V1 scope.
 */
export function formatCurrency(amount: number, options: FormatCurrencyOptions = {}): string {
  const { showSymbol = true, showDecimals = false } = options;

  if (!Number.isFinite(amount)) {
    return showSymbol ? '₹—' : '—';
  }

  const formatted = new Intl.NumberFormat(INR_LOCALE, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);

  return formatted;
}

/**
 * Converts a rupee amount to paise (smallest unit) for Razorpay API calls
 * only (§18.1). This boundary conversion happens exclusively at the
 * payment-gateway integration point — see initiatePayment.ts — never in
 * UI-facing display code.
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Converts a paise amount (as received from Razorpay webhooks) back to
 * whole rupees for storage/display, per §6.2's plain-number schema
 * convention.
 */
export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

/**
 * Formats a percentage value (used for discount/tax display) consistently
 * — e.g. commission %, coupon %, tax rate.
 */
export function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) {
    return '—%';
  }
  return `${new Intl.NumberFormat(INR_LOCALE, {
    maximumFractionDigits: 2,
  }).format(value)}%`;
}
