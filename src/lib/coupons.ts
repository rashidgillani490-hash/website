/**
 * Discount validation & pricing — the single authority on whether a coupon
 * can be used right now and what it's worth. `previewCouponAction` (server
 * action, storefront preview) and the order pipeline
 * (`src/lib/admin/order-calc.ts`, at the moment an order is actually placed)
 * both call `validateCoupon` with the same freshly-read `CouponRecord` and
 * freshly-counted redemptions — nothing here trusts anything the browser
 * sent, and the two callers can never disagree about whether a coupon is
 * valid because they run the same function.
 *
 * What this refuses, and why it matters:
 *   - expired / not-yet-started · `starts_at`/`expires_at` vs. `now`
 *   - inactive                  · `is_active`
 *   - below minimum order value · `minimum_subtotal_cents`
 *   - overuse (store-wide)      · `max_redemptions` vs. a fresh count of
 *                                 `coupon_usage` rows for this coupon
 *   - overuse (per customer)    · `per_user_limit` vs. a fresh count of that
 *                                 customer's own redemptions of this coupon
 *   - manipulated discounts     · the amount is always recomputed from the
 *                                 stored `discount_type`/`discount_value`
 *                                 against the server-computed subtotal —
 *                                 never from a number the client supplied
 */

import type { CouponRecord, DiscountTypeValue } from "@/lib/admin/records";

export type DiscountType = DiscountTypeValue;

export interface DiscountResult {
  code: string;
  discountType: DiscountType;
  /** Amount taken off the item subtotal (0 for free shipping). */
  discountCents: number;
  /** When true, shipping is waived by the coupon. */
  freeShipping: boolean;
  label: string;
}

export interface CouponUsageCounts {
  /** How many times this coupon has been redeemed, across every customer. */
  total: number;
  /** How many times THIS customer (by account id, or by email for a guest) has redeemed it. */
  byCustomer: number;
}

export interface CouponValidationContext {
  subtotalCents: number;
  shippingCents: number;
  usage: CouponUsageCounts;
  now?: Date;
}

const REASON_MESSAGES: Record<string, string> = {
  inactive: "That code isn't active.",
  not_started: "That code isn't active yet.",
  expired: "That code has expired.",
  below_minimum: "", // filled in with the actual minimum below
  store_limit_reached: "That code has reached its usage limit.",
  customer_limit_reached: "You've already used that code the maximum number of times.",
};

export function validateCoupon(
  coupon: CouponRecord,
  ctx: CouponValidationContext,
): { ok: true; result: DiscountResult } | { ok: false; reason: string; error: string } {
  const now = ctx.now ?? new Date();

  if (!coupon.is_active) {
    return { ok: false, reason: "inactive", error: REASON_MESSAGES.inactive };
  }
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return { ok: false, reason: "not_started", error: REASON_MESSAGES.not_started };
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    return { ok: false, reason: "expired", error: REASON_MESSAGES.expired };
  }
  if (ctx.subtotalCents < coupon.minimum_subtotal_cents) {
    return {
      ok: false,
      reason: "below_minimum",
      error: `Add more to reach the ${formatMinimum(coupon.minimum_subtotal_cents)} minimum for ${coupon.code}.`,
    };
  }
  if (coupon.max_redemptions !== null && ctx.usage.total >= coupon.max_redemptions) {
    return { ok: false, reason: "store_limit_reached", error: REASON_MESSAGES.store_limit_reached };
  }
  if (coupon.per_user_limit > 0 && ctx.usage.byCustomer >= coupon.per_user_limit) {
    return { ok: false, reason: "customer_limit_reached", error: REASON_MESSAGES.customer_limit_reached };
  }

  if (coupon.discount_type === "free_shipping") {
    return {
      ok: true,
      result: {
        code: coupon.code,
        discountType: "free_shipping",
        discountCents: 0,
        freeShipping: true,
        label: ctx.shippingCents > 0 ? `Free shipping (${coupon.code})` : `${coupon.code} applied`,
      },
    };
  }

  let discount =
    coupon.discount_type === "percentage"
      ? Math.round((ctx.subtotalCents * Math.min(100, Math.max(0, coupon.discount_value))) / 100)
      : Math.max(0, Math.round(coupon.discount_value));
  discount = Math.min(discount, ctx.subtotalCents); // never exceed the subtotal

  return {
    ok: true,
    result: {
      code: coupon.code,
      discountType: coupon.discount_type,
      discountCents: discount,
      freeShipping: false,
      label:
        coupon.discount_type === "percentage"
          ? `${coupon.discount_value}% off (${coupon.code})`
          : `Discount (${coupon.code})`,
    },
  };
}

function formatMinimum(cents: number): string {
  return `Rs ${cents.toLocaleString("en-PK")}`;
}
