/**
 * Shared commerce constants & rules — used by the client cart AND the
 * server-side order calculation (which never trusts client totals).
 *
 * The store ships within Pakistan; amounts are whole PKR (see src/lib/money.ts).
 *
 * Shipping fee, free-shipping threshold and whether Cash on Delivery is
 * offered are all admin-controlled (Admin → Settings → Store settings,
 * `src/lib/admin/records.ts`'s `CommerceSettings` + `getCommerceSettings()` in
 * `src/lib/cms.ts`). The constants below are only the bootstrap defaults —
 * used until an admin saves settings, and as safe fallbacks if a settings read
 * ever fails.
 */

import { CURRENCY } from "@/lib/money";

export const DEFAULT_CURRENCY = CURRENCY; // "PKR"

/** Bootstrap default flat nationwide courier fee (PKR), until an admin sets one. */
export const DEFAULT_SHIPPING_FEE = 350;
/** Bootstrap default free-shipping threshold (PKR), until an admin sets one. */
export const DEFAULT_FREE_SHIPPING_THRESHOLD = 20000;

// Kept for backwards-compatible imports.
export const FLAT_SHIPPING_FEE = DEFAULT_SHIPPING_FEE;
export const FREE_SHIPPING_THRESHOLD = DEFAULT_FREE_SHIPPING_THRESHOLD;
export const SHIPPING_FLAT = DEFAULT_SHIPPING_FEE;

export interface CommerceSettings {
  /** Flat nationwide courier fee, in whole PKR. */
  shippingFeeCents: number;
  /** Orders at or above this subtotal ship free, in whole PKR. */
  freeShippingThresholdCents: number;
  /** Whether Cash on Delivery is currently offered at checkout. */
  codEnabled: boolean;
}

export const DEFAULT_COMMERCE_SETTINGS: CommerceSettings = {
  shippingFeeCents: DEFAULT_SHIPPING_FEE,
  freeShippingThresholdCents: DEFAULT_FREE_SHIPPING_THRESHOLD,
  codEnabled: true,
};

/**
 * Pure — takes the currently-effective fee/threshold explicitly rather than
 * reaching for a global, so both the client (reading from
 * `useCommerceSettings`) and the server (reading from `getCommerceSettings()`)
 * can call it with whatever is actually configured right now.
 */
export function shippingFor(
  subtotal: number,
  feeCents: number = DEFAULT_SHIPPING_FEE,
  thresholdCents: number = DEFAULT_FREE_SHIPPING_THRESHOLD,
): number {
  if (subtotal <= 0) return 0;
  return subtotal >= thresholdCents ? 0 : Math.max(0, feeCents);
}
