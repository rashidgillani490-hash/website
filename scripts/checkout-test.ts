/**
 * Phase 6 — cart & Cash-on-Delivery checkout.
 *
 *   npm run checkout:test
 *
 * Exercises the whole flow against the LocalAdminRepo (same shape as the
 * Supabase backend):
 *
 *   cart maths → customer validation → payment registry → order pipeline
 *   (validate customer · validate products · validate stock · recalculate
 *   prices · unique order number · order · order items · customisation ·
 *   safe stock update) → confirmation payload → admin visibility.
 */

import { loadEnv } from "./_env.ts";
loadEnv();

import { LocalAdminRepo } from "../src/lib/admin/local-repo.ts";
import { resetLocalStore } from "../src/lib/admin/local-store.ts";
import { validateCheckoutCustomer } from "../src/lib/checkout/validation.ts";
import {
  isProvince,
  isValidMobile,
  isValidPostalCode,
  normalizeMobile,
  citiesForProvince,
} from "../src/lib/pakistan.ts";
import {
  getPaymentMethod,
  getEnabledPaymentMethods,
  getUpcomingPaymentMethods,
  DEFAULT_PAYMENT_METHOD,
} from "../src/lib/payments/registry.ts";
import { validateCoupon } from "../src/lib/coupons.ts";
import { shippingFor, DEFAULT_FREE_SHIPPING_THRESHOLD, DEFAULT_SHIPPING_FEE } from "../src/lib/commerce.ts";
import { cartSubtotal, cartCount, lineUnitPrice } from "../src/lib/store/cart.ts";
import type { CheckoutCustomerDetails } from "../src/lib/checkout/types.ts";
import type { CartItem } from "../src/lib/types.ts";
import type { CouponRecord } from "../src/lib/admin/records.ts";

const ENABLED_COD = { codEnabled: true };

/** Minimal, valid coupon fixture — tests override only what they're checking. */
function coupon(over: Partial<CouponRecord>): CouponRecord {
  return {
    id: "c1",
    code: "TESTCODE",
    description: null,
    discount_type: "fixed_amount",
    discount_value: 0,
    minimum_subtotal_cents: 0,
    max_redemptions: null,
    per_user_limit: 1,
    redeemed_count: 0,
    starts_at: null,
    expires_at: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...over,
  };
}
const NO_USAGE = { total: 0, byCustomer: 0 };

/* ------------------------------------------------------------- harness */

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
const rec = (name: string, ok: boolean, detail?: string) => {
  checks.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
};
async function expectThrow(fn: () => Promise<unknown>, label: string, match?: RegExp) {
  try {
    await fn();
    rec(label, false, "expected an error");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    rec(label, match ? match.test(msg) : true, match && !match.test(msg) ? msg : undefined);
  }
}
const section = (title: string) => console.log(`\n${title}\n${"-".repeat(title.length)}`);

const CUSTOMER: CheckoutCustomerDetails = {
  fullName: "Ayesha Khan",
  mobile: "0301 2345678",
  email: "Ayesha@Example.com",
  province: "Punjab",
  city: "Lahore",
  area: "DHA Phase 5",
  address: "House 12, Street 4, near Lalik Chowk",
  postalCode: "54792",
  notes: "Please call before delivery.",
};

async function main() {
  resetLocalStore();
  const repo = new LocalAdminRepo();

  /* =================================================== 1 · geography */
  section("Pakistan geography & contact rules");
  rec("province list accepts a real province", isProvince("Sindh"));
  rec("province list rejects a foreign one", !isProvince("California"));
  rec("cities resolve per province", citiesForProvince("Sindh").includes("Karachi"));
  rec("unknown province yields no city list", citiesForProvince("Nowhere").length === 0);
  rec("mobile: 0301 2345678 accepted", isValidMobile("0301 2345678"));
  rec("mobile: +92 form normalises to local", normalizeMobile("+923012345678") === "03012345678");
  rec("mobile: landline rejected", !isValidMobile("042 35678901"));
  rec("mobile: too short rejected", !isValidMobile("03012345"));
  rec("postal code: 5 digits accepted", isValidPostalCode("54792"));
  rec("postal code: 4 digits rejected", !isValidPostalCode("5479"));

  /* ============================================ 2 · customer validation */
  section("Checkout customer validation (server-side)");
  const good = validateCheckoutCustomer(CUSTOMER);
  rec("valid customer passes", good.ok);
  rec("mobile normalised for storage", good.value?.mobile === "03012345678");
  rec("email lower-cased for storage", good.value?.email === "ayesha@example.com");
  rec("notes preserved", good.value?.notes === "Please call before delivery.");

  const bad = validateCheckoutCustomer({
    fullName: "A",
    mobile: "12345",
    email: "nope",
    province: "Texas",
    city: "",
    area: "",
    address: "short",
    postalCode: "1",
    notes: "x".repeat(600),
  });
  rec("every bad field is reported", !bad.ok && Object.keys(bad.errors).length === 9, `${Object.keys(bad.errors).length} errors`);
  rec("no value returned for an invalid customer", bad.value === undefined);
  rec("empty submission rejected", !validateCheckoutCustomer(null).ok);

  /* =============================================== 3 · cart arithmetic */
  section("Cart arithmetic");
  const mk = (over: Partial<CartItem>): CartItem => ({
    lineId: Math.random().toString(36).slice(2),
    productId: "p1",
    slug: "s",
    name: "N",
    image: "",
    sku: "SKU-50",
    ml: 50,
    unitPrice: 10000,
    quantity: 1,
    stock: 10,
    customization: null,
    ...over,
  });
  const plain = mk({ quantity: 2 });
  const personalised = mk({
    quantity: 1,
    customization: {
      selection: { text: "Ayesha" },
      deltaCents: 2500,
      breakdown: [],
      summary: 'Engraved "Ayesha"',
    } as CartItem["customization"],
  });
  rec("line unit price includes the personalisation surcharge", lineUnitPrice(personalised) === 12500);
  rec("plain line unit price is the variant price", lineUnitPrice(plain) === 10000);
  rec("cart count sums quantities", cartCount([plain, personalised]) === 3);
  rec("subtotal sums qty × unit price", cartSubtotal([plain, personalised]) === 32500);
  rec("empty cart subtotal is 0", cartSubtotal([]) === 0);

  rec("shipping: flat fee under the threshold", shippingFor(5000) === DEFAULT_SHIPPING_FEE);
  rec("shipping: free at the threshold", shippingFor(DEFAULT_FREE_SHIPPING_THRESHOLD) === 0);
  rec("shipping: free above the threshold", shippingFor(DEFAULT_FREE_SHIPPING_THRESHOLD + 1) === 0);
  rec("shipping: nothing to ship costs nothing", shippingFor(0) === 0);

  /* ==================================================== 4 · discounts */
  section("Discounts — validateCoupon");
  const pct = validateCoupon(
    coupon({ discount_type: "percentage", discount_value: 10 }),
    { subtotalCents: 30000, shippingCents: 0, usage: NO_USAGE },
  );
  rec("percentage coupon computes 10%", pct.ok && pct.result.discountCents === 3000);

  const fixed = validateCoupon(
    coupon({ discount_type: "fixed_amount", discount_value: 2500, minimum_subtotal_cents: 20000 }),
    { subtotalCents: 25000, shippingCents: 350, usage: NO_USAGE },
  );
  rec("fixed coupon takes its amount off", fixed.ok && fixed.result.discountCents === 2500);

  const belowMin = validateCoupon(
    coupon({ discount_type: "fixed_amount", discount_value: 2500, minimum_subtotal_cents: 20000 }),
    { subtotalCents: 5000, shippingCents: 350, usage: NO_USAGE },
  );
  rec("coupon below its minimum is refused", !belowMin.ok && belowMin.reason === "below_minimum");

  const freeShip = validateCoupon(
    coupon({ discount_type: "free_shipping" }),
    { subtotalCents: 5000, shippingCents: 350, usage: NO_USAGE },
  );
  rec(
    "free-shipping coupon waives shipping only",
    freeShip.ok && freeShip.result.freeShipping && freeShip.result.discountCents === 0,
  );

  const huge = validateCoupon(
    coupon({ discount_type: "fixed_amount", discount_value: 999999 }),
    { subtotalCents: 10000, shippingCents: 0, usage: NO_USAGE },
  );
  rec("discount can never exceed the subtotal", huge.ok && huge.result.discountCents === 10000);

  const inactive = validateCoupon(coupon({ is_active: false }), {
    subtotalCents: 10000,
    shippingCents: 0,
    usage: NO_USAGE,
  });
  rec("an inactive coupon is refused", !inactive.ok && inactive.reason === "inactive");

  const notYetStarted = validateCoupon(
    coupon({ starts_at: new Date(Date.now() + 86_400_000).toISOString() }),
    { subtotalCents: 10000, shippingCents: 0, usage: NO_USAGE },
  );
  rec("a not-yet-started coupon is refused", !notYetStarted.ok && notYetStarted.reason === "not_started");

  const expired = validateCoupon(
    coupon({ expires_at: new Date(Date.now() - 86_400_000).toISOString() }),
    { subtotalCents: 10000, shippingCents: 0, usage: NO_USAGE },
  );
  rec("an expired coupon is refused", !expired.ok && expired.reason === "expired");

  const storeLimitReached = validateCoupon(coupon({ max_redemptions: 5 }), {
    subtotalCents: 10000,
    shippingCents: 0,
    usage: { total: 5, byCustomer: 0 },
  });
  rec(
    "a store-wide usage limit stops a 6th redemption",
    !storeLimitReached.ok && storeLimitReached.reason === "store_limit_reached",
  );
  const storeLimitStillOk = validateCoupon(coupon({ max_redemptions: 5 }), {
    subtotalCents: 10000,
    shippingCents: 0,
    usage: { total: 4, byCustomer: 0 },
  });
  rec("the redemption right before the limit still succeeds", storeLimitStillOk.ok);

  const customerLimitReached = validateCoupon(coupon({ per_user_limit: 1 }), {
    subtotalCents: 10000,
    shippingCents: 0,
    usage: { total: 1, byCustomer: 1 },
  });
  rec(
    "a per-customer usage limit stops reuse by the same customer",
    !customerLimitReached.ok && customerLimitReached.reason === "customer_limit_reached",
  );
  const otherCustomerStillOk = validateCoupon(coupon({ per_user_limit: 1 }), {
    subtotalCents: 10000,
    shippingCents: 0,
    usage: { total: 1, byCustomer: 0 },
  });
  rec("the same coupon still works for a different customer", otherCustomerStillOk.ok);

  const manipulated = validateCoupon(coupon({ discount_type: "percentage", discount_value: 10 }), {
    subtotalCents: 10000,
    shippingCents: 0,
    // A tampered client can send whatever `discountCents` it likes elsewhere —
    // `validateCoupon` never reads a client-supplied amount, only the stored
    // discount_type/discount_value against the server-computed subtotal.
    usage: NO_USAGE,
  });
  rec(
    "the discount is always recomputed from the stored value, never accepted from a caller",
    manipulated.ok && manipulated.result.discountCents === 1000,
  );

  /* ============================================== 5 · payment registry */
  section("Payment methods");
  const cod = getPaymentMethod("cod")!;
  rec("COD is the default method", DEFAULT_PAYMENT_METHOD === "cod");
  rec("COD is the only enabled method today", getEnabledPaymentMethods(ENABLED_COD).map((m) => m.id).join() === "cod");
  rec("COD settles offline", cod.settlesOnline === false);
  rec("COD orders start pending / unpaid", cod.initialOrderStatus === "pending" && cod.initialPaymentStatus === "unpaid");
  rec("COD needs no payment payload", cod.validatePayload(null).ok);
  rec("other Pakistani methods are registered but disabled", getUpcomingPaymentMethods(ENABLED_COD).length >= 3);
  rec(
    "future methods carry their own payload rules",
    getPaymentMethod("jazzcash")!.validatePayload({}).ok === false &&
      getPaymentMethod("jazzcash")!.validatePayload({ jazzcashMobile: "03001234567" }).ok === true,
  );
  rec("unknown method id resolves to nothing", getPaymentMethod("crypto") === null);

  rec(
    "COD disappears from the enabled list when the admin turns it off",
    getEnabledPaymentMethods({ codEnabled: false }).length === 0,
  );
  rec(
    "COD then shows up as unavailable rather than enabled",
    getUpcomingPaymentMethods({ codEnabled: false }).some((m) => m.id === "cod"),
  );
  rec(
    "getPaymentMethod refuses COD outright when the setting is off",
    getPaymentMethod("cod", { codEnabled: false }) === null,
  );
  rec(
    "getPaymentMethod without a settings argument still resolves COD for display purposes",
    getPaymentMethod("cod")?.id === "cod",
  );

  /* ============================================ 6 · the order pipeline */
  section("Order pipeline — Cash on Delivery");
  const list = await repo.listProducts({ pageSize: 2 });
  const productId = list.items[0].id;
  const detail = (await repo.getProduct(productId))!;
  const variant = detail.variants.find((v) => v.is_default) ?? detail.variants[0];
  const sku = variant.sku;
  const unitPrice = variant.price_cents;
  const stockBefore = variant.stock_quantity;

  const order1 = await repo.createOrder({
    customer: CUSTOMER,
    paymentMethod: "cod",
    lines: [{ productId, variantSku: sku, quantity: 2 }],
  });

  rec("order number matches ML-#####", /^ML-\d{5}$/.test(order1.orderNumber), order1.orderNumber);
  rec("subtotal recalculated from the catalogue", order1.subtotalCents === unitPrice * 2, `${order1.subtotalCents}`);
  rec("shipping recalculated server-side", order1.shippingCents === shippingFor(order1.subtotalCents));
  rec(
    "total = subtotal − discount + shipping",
    order1.totalCents === order1.subtotalCents - order1.discountCents + order1.shippingCents,
  );
  rec("payment method recorded as COD", order1.paymentMethod === "cod");
  rec("payment status starts unpaid", order1.paymentStatus === "unpaid");
  rec("order status starts pending", order1.status === "pending");
  rec("placedAt is an ISO timestamp", !Number.isNaN(Date.parse(order1.placedAt)));

  // Confirmation payload — everything the confirmation screen renders.
  rec("confirmation carries the customer's address", order1.customer.city === "Lahore" && order1.customer.province === "Punjab");
  rec("confirmation address is the normalised one", order1.customer.mobile === "03012345678");
  rec("confirmation lists the products", order1.items.length === 1 && order1.items[0].quantity === 2);
  rec("confirmation shows size per line", /ml$/.test(order1.items[0].variantLabel));
  rec("confirmation line total is qty × unit", order1.items[0].lineTotalCents === unitPrice * 2);

  // Persisted rows.
  const stored = (await repo.getOrder(order1.orderId))!;
  rec("order row created", stored.order.order_number === order1.orderNumber);
  rec("order items created", stored.items.length === 1 && stored.items[0].sku === sku);
  rec("delivery address persisted structurally", (stored.order.shipping_address as Record<string, unknown>).country === "Pakistan");
  rec("order note persisted", stored.order.customer_note === "Please call before delivery.");
  rec("currency is PKR", stored.order.currency === "PKR");

  // Stock.
  const afterOrder = (await repo.getProduct(productId))!.variants.find((v) => v.sku === sku)!;
  rec("stock decremented by the ordered quantity", afterOrder.stock_quantity === stockBefore - 2, `${stockBefore} → ${afterOrder.stock_quantity}`);

  /* ---------------------------------------------- unique order numbers */
  const order2 = await repo.createOrder({
    customer: CUSTOMER,
    paymentMethod: "cod",
    lines: [{ productId, variantSku: sku, quantity: 1 }],
  });
  rec("each order gets a distinct number", order1.orderNumber !== order2.orderNumber, `${order1.orderNumber} / ${order2.orderNumber}`);
  const numbers = (await repo.listOrders()).items.map((o) => o.order_number);
  rec("order numbers are unique across the store", new Set(numbers).size === numbers.length);

  /* -------------------------------------------------- customisation */
  section("Personalised lines");
  const custProduct = (await repo.getProduct(productId))!;
  await repo.updateProduct(productId, {
    customization: {
      enabled: true,
      allowText: true,
      textMaxLength: 12,
      textPriceCents: 2500,
      allowImage: false,
      imagePriceCents: 0,
      bottleOptions: [{ id: "frosted", label: "Frosted glass", priceCents: 3000 }],
      packagingOptions: [],
    } as unknown as Record<string, unknown>,
  });
  const custVariant = custProduct.variants.find((v) => v.sku === sku)!;
  const order3 = await repo.createOrder({
    customer: CUSTOMER,
    paymentMethod: "cod",
    lines: [
      {
        productId,
        variantSku: sku,
        quantity: 1,
        customization: {
          text: "Ayesha",
          bottleOptionId: "frosted",
          // A tampered client trying to set its own price:
          deltaCents: -99999,
        } as never,
      },
    ],
  });
  const expectedDelta = 2500 + 3000;
  rec(
    "customisation surcharge is priced by the server, not the client",
    order3.subtotalCents === custVariant.price_cents + expectedDelta,
    `${order3.subtotalCents}`,
  );
  const stored3 = (await repo.getOrder(order3.orderId))!;
  rec("customisation saved against the order item", stored3.items[0].customization?.price_delta_cents === expectedDelta);
  rec("customisation summary reaches the confirmation", !!order3.items[0].customization?.summary);
  rec("unit price row stays the plain variant price", stored3.items[0].unit_price_cents === custVariant.price_cents);

  /* ----------------------------------------------------- coupon path */
  section("Coupons applied by the order pipeline");
  const order4 = await repo.createOrder({
    customer: CUSTOMER,
    paymentMethod: "cod",
    couponCode: "discovery10", // lower case on purpose
    lines: [{ productId, variantSku: sku, quantity: 1 }],
  });
  rec("coupon resolved case-insensitively", order4.discountCode === "DISCOVERY10");
  rec("discount recomputed server-side", order4.discountCents === Math.round(order4.subtotalCents * 0.1), `${order4.discountCents}`);
  rec("discounted total is consistent", order4.totalCents === order4.subtotalCents - order4.discountCents + order4.shippingCents);

  const order5 = await repo.createOrder({
    customer: CUSTOMER,
    paymentMethod: "cod",
    couponCode: "NOT-REAL",
    lines: [{ productId, variantSku: sku, quantity: 1 }],
  });
  rec("an invalid coupon is dropped, not fatal", order5.discountCents === 0 && order5.discountCode === null);

  /* --------------------------------------------------------- guards */
  section("Server-side guards");
  await expectThrow(
    () => repo.createOrder({ customer: CUSTOMER, paymentMethod: "cod", lines: [] }),
    "empty order rejected",
  );
  await expectThrow(
    () =>
      repo.createOrder({
        customer: { ...CUSTOMER, province: "Texas" },
        paymentMethod: "cod",
        lines: [{ productId, variantSku: sku, quantity: 1 }],
      }),
    "non-Pakistani province rejected",
    /province/i,
  );
  await expectThrow(
    () =>
      repo.createOrder({
        customer: { ...CUSTOMER, mobile: "12345" },
        paymentMethod: "cod",
        lines: [{ productId, variantSku: sku, quantity: 1 }],
      }),
    "invalid mobile rejected",
    /mobile/i,
  );
  await expectThrow(
    () =>
      repo.createOrder({
        customer: CUSTOMER,
        paymentMethod: "jazzcash",
        lines: [{ productId, variantSku: sku, quantity: 1 }],
      }),
    "a disabled payment method is refused",
    /payment method/i,
  );
  await expectThrow(
    () =>
      repo.createOrder({
        customer: CUSTOMER,
        paymentMethod: "crypto" as never,
        lines: [{ productId, variantSku: sku, quantity: 1 }],
      }),
    "an unknown payment method is refused",
  );
  await expectThrow(
    () =>
      repo.createOrder({
        customer: CUSTOMER,
        paymentMethod: "cod",
        lines: [{ productId: "does-not-exist", variantSku: sku, quantity: 1 }],
      }),
    "unknown product rejected",
    /Unknown product/i,
  );
  await expectThrow(
    () =>
      repo.createOrder({
        customer: CUSTOMER,
        paymentMethod: "cod",
        lines: [{ productId, variantSku: "NO-SUCH-SKU", quantity: 1 }],
      }),
    "unknown bottle size rejected",
    /bottle size/i,
  );

  /* ---------------------------------------------------- stock safety */
  section("Stock validation & safe updates");
  const live = (await repo.getProduct(productId))!.variants.find((v) => v.sku === sku)!;
  const ordersBefore = (await repo.listOrders()).total;

  await expectThrow(
    () =>
      repo.createOrder({
        customer: CUSTOMER,
        paymentMethod: "cod",
        lines: [{ productId, variantSku: sku, quantity: live.stock_quantity + 1 }],
      }),
    "ordering more than stock is refused",
    /left|out of stock/i,
  );

  // Two lines of the same variant are counted together against stock.
  await expectThrow(
    () =>
      repo.createOrder({
        customer: CUSTOMER,
        paymentMethod: "cod",
        lines: [
          { productId, variantSku: sku, quantity: live.stock_quantity },
          { productId, variantSku: sku, quantity: 1, customization: { text: "Extra" } as never },
        ],
      }),
    "two lines sharing a variant are summed against stock",
    /left|out of stock/i,
  );

  const afterFailures = (await repo.getProduct(productId))!.variants.find((v) => v.sku === sku)!;
  rec("a refused order leaves stock untouched", afterFailures.stock_quantity === live.stock_quantity);
  rec("a refused order creates no order row", (await repo.listOrders()).total === ordersBefore);

  // Draining stock exactly is allowed, and the next order then fails.
  const drain = await repo.createOrder({
    customer: CUSTOMER,
    paymentMethod: "cod",
    lines: [{ productId, variantSku: sku, quantity: live.stock_quantity }],
  });
  rec("ordering the exact remaining stock succeeds", !!drain.orderNumber);
  const emptied = (await repo.getProduct(productId))!.variants.find((v) => v.sku === sku)!;
  rec("stock reaches exactly zero", emptied.stock_quantity === 0, `${emptied.stock_quantity}`);
  await expectThrow(
    () =>
      repo.createOrder({
        customer: CUSTOMER,
        paymentMethod: "cod",
        lines: [{ productId, variantSku: sku, quantity: 1 }],
      }),
    "a sold-out variant can't be ordered",
    /out of stock/i,
  );

  /* ------------------------------------- server action layer (storefront) */
  section("Server actions (what the browser actually calls)");
  const actions = await import("../src/app/(site)/actions.ts");

  const fresh = (await repo.listProducts({ pageSize: 5 })).items.find(
    (p) => p.total_stock > 2 && p.id !== productId,
  )!;
  const freshDetail = (await repo.getProduct(fresh.id))!;
  const freshVariant = freshDetail.variants.find((v) => v.stock_quantity > 2)!;

  const sync = await actions.syncCartAction([
    {
      lineId: "line-1",
      slug: freshDetail.product.slug,
      sku: freshVariant.sku,
      quantity: 1,
      customization: null,
    },
    { lineId: "line-2", slug: freshDetail.product.slug, sku: "GHOST-SKU", quantity: 1 },
    { lineId: "line-3", slug: "no-such-fragrance", sku: "X", quantity: 1 },
  ]);
  const l1 = sync.lines.find((l) => l.lineId === "line-1")!;
  rec("cart sync: healthy line reported ok", l1.status === "ok");
  rec("cart sync: price comes from the catalogue", l1.unitPrice === freshVariant.price_cents);
  rec("cart sync: live stock returned", l1.stock === freshVariant.stock_quantity);
  rec("cart sync: every bottle size offered for switching", (l1.sizes?.length ?? 0) === freshDetail.variants.length);
  rec("cart sync: delisted size flagged", sync.lines.find((l) => l.lineId === "line-2")?.status === "size-unavailable");
  rec("cart sync: missing product flagged", sync.lines.find((l) => l.lineId === "line-3")?.status === "unavailable");
  rec("cart sync: issues surfaced to the shopper", sync.hasIssues && sync.lines.some((l) => !!l.message));

  const overStock = await actions.syncCartAction([
    {
      lineId: "line-4",
      slug: freshDetail.product.slug,
      sku: freshVariant.sku,
      quantity: freshVariant.stock_quantity + 5,
    },
  ]);
  rec("cart sync: over-stock quantity is capped, not accepted", overStock.lines[0].status === "reduced");
  rec("cart sync: cap equals live stock", overStock.lines[0].maxQuantity === freshVariant.stock_quantity);

  const couponOk = await actions.previewCouponAction("DISCOVERY10", 30000);
  rec("coupon preview: valid code priced", couponOk.ok && couponOk.discountCents === 3000);
  const couponBad = await actions.previewCouponAction("NOPE", 30000);
  rec("coupon preview: invalid code refused", !couponBad.ok);

  const placed = await actions.createOrderAction({
    customer: CUSTOMER,
    paymentMethod: "cod",
    lines: [{ productId: fresh.id, variantSku: freshVariant.sku, quantity: 1 }],
  });
  rec("place order action succeeds", placed.ok && !!placed.confirmation);
  rec("place order action returns a confirmation number", /^ML-\d{5}$/.test(placed.confirmation?.orderNumber ?? ""));

  const rejected = await actions.createOrderAction({
    customer: { ...CUSTOMER, postalCode: "1", mobile: "abc" },
    paymentMethod: "cod",
    lines: [{ productId: fresh.id, variantSku: freshVariant.sku, quantity: 1 }],
  });
  rec("place order action returns field errors, not a throw", !rejected.ok && !!rejected.fieldErrors?.postalCode && !!rejected.fieldErrors?.mobile);

  const wrongMethod = await actions.createOrderAction({
    customer: CUSTOMER,
    paymentMethod: "easypaisa",
    lines: [{ productId: fresh.id, variantSku: freshVariant.sku, quantity: 1 }],
  });
  rec("place order action refuses a disabled payment method", !wrongMethod.ok);

  const soldOut = await actions.createOrderAction({
    customer: CUSTOMER,
    paymentMethod: "cod",
    lines: [{ productId: fresh.id, variantSku: freshVariant.sku, quantity: 9999 }],
  });
  rec("place order action reports stock problems in plain language", !soldOut.ok && /stock|left/i.test(soldOut.message ?? ""));

  /* ------------------------------------------------ admin visibility */
  section("Admin visibility");
  const adminList = (await repo.listOrders()).items;
  const row = adminList.find((o) => o.id === order3.orderId);
  rec("orders appear in the admin list", !!row);
  rec("admin list shows the payment method", row?.payment_method === "cod");
  rec("admin list shows the payment status", row?.payment_status === "unpaid");
  rec("admin list counts personalised lines", row?.personalised_count === 1);
  rec("admin list carries the customer email", row?.email === "ayesha@example.com");
  await repo.setOrderStatus(order1.orderId, "shipped");
  rec("staff can advance the order status", (await repo.getOrder(order1.orderId))!.order.status === "shipped");

  resetLocalStore();

  /* ------------------------------------------------------------ summary */
  const failed = checks.filter((c) => !c.ok);
  console.log("\n=======================================");
  console.log(`${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`));
    process.exit(1);
  }
  console.log("Cart + Cash-on-Delivery checkout verified end to end.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
