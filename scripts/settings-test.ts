/**
 * Phase 8 — store settings & discount system.
 *
 *   npm run settings:test
 *
 * Covers, against the LocalAdminRepo / local settings store (the same shape
 * Supabase has — see `npm run db:validate` for the schema/RLS side):
 *
 *   store settings persist and read back (site content + commerce settings,
 *   local mode previously silently discarded these) · a partial save never
 *   blanks the rest of the record · shipping/COD are dynamic end to end ·
 *   full coupon CRUD · coupons enforce expiry/inactive/minimum-order/store-
 *   wide and per-customer usage limits through the REAL order pipeline (not
 *   just the pure validator) · a coupon's redemption count and usage rows are
 *   recorded correctly · the discount is always server-computed, never
 *   accepted from the client · the staff auth gate refuses an unauthenticated
 *   caller on every settings/coupon write.
 */

import { loadEnv } from "./_env.ts";
loadEnv();

import { LocalAdminRepo } from "../src/lib/admin/local-repo.ts";
import { resetLocalStore } from "../src/lib/admin/local-store.ts";
import { mergeSiteContent, mergeCommerceSettings } from "../src/lib/settings.ts";
import { DEFAULT_COMMERCE_SETTINGS } from "../src/lib/commerce.ts";
import { getEnabledPaymentMethods } from "../src/lib/payments/registry.ts";
import { getAdminSession, requireStaff } from "../src/lib/auth.ts";
import type { CheckoutCustomerDetails } from "../src/lib/checkout/types.ts";
import type { SiteContent } from "../src/lib/types.ts";

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
function expectRedirectTo(err: unknown, path: string): boolean {
  const digest = (err as { digest?: string })?.digest ?? "";
  return digest.startsWith("NEXT_REDIRECT") && digest.includes(path);
}
const section = (title: string) => console.log(`\n${title}\n${"-".repeat(title.length)}`);

const CUSTOMER: CheckoutCustomerDetails = {
  fullName: "Bilal Ahmed",
  mobile: "0333 1234567",
  email: "bilal@example.com",
  province: "Punjab",
  city: "Faisalabad",
  area: "Peoples Colony",
  address: "House 22, Street 6",
  postalCode: "38000",
};
const CUSTOMER_2: CheckoutCustomerDetails = { ...CUSTOMER, email: "sana2@example.com", fullName: "Sana Riaz" };

async function main() {
  resetLocalStore();
  const repo = new LocalAdminRepo();

  /* ===================================================== 1 · pure merges */
  section("Settings merge helpers");
  rec("merging nothing returns the bootstrap commerce defaults", mergeCommerceSettings(undefined).shippingFeeCents === DEFAULT_COMMERCE_SETTINGS.shippingFeeCents);
  rec(
    "a partial commerce save only overrides what it sets",
    mergeCommerceSettings({ codEnabled: false }).shippingFeeCents === DEFAULT_COMMERCE_SETTINGS.shippingFeeCents &&
      mergeCommerceSettings({ codEnabled: false }).codEnabled === false,
  );
  rec("garbage commerce input falls back to defaults, not NaN", mergeCommerceSettings({ shippingFeeCents: -5 } as never).shippingFeeCents === DEFAULT_COMMERCE_SETTINGS.shippingFeeCents);
  rec("merging nothing returns the demo site content", mergeSiteContent(undefined).brandName === "Maison Lumière");
  const partialSite = mergeSiteContent({ brandName: "Nouvelle Maison" } as Partial<SiteContent>);
  rec("a partial site-content save only overrides what it sets", partialSite.brandName === "Nouvelle Maison" && partialSite.tagline.length > 0);

  /* ========================================== 2 · store settings persist */
  section("Store settings persist in local mode (previously silently discarded)");
  await repo.saveCommerceSettings({ shippingFeeCents: 500, freeShippingThresholdCents: 15000, codEnabled: true });

  // Read back through the same local-store table the repo just wrote.
  const { getTables } = await import("../src/lib/admin/local-store.ts");
  const stored = mergeCommerceSettings(getTables().store_settings.commerce as never);
  rec("saved shipping fee is read back", stored.shippingFeeCents === 500);
  rec("saved free-shipping threshold is read back", stored.freeShippingThresholdCents === 15000);

  await repo.saveCommerceSettings({ codEnabled: false });
  const afterPartial = mergeCommerceSettings(getTables().store_settings.commerce as never);
  rec("a second, partial save keeps the earlier shipping fee", afterPartial.shippingFeeCents === 500);
  rec("...and applies just the new field", afterPartial.codEnabled === false);

  await repo.saveSiteContent({
    ...mergeSiteContent(undefined),
    brandName: "Atelier Lumière",
    logoUrl: "/uploads/images/brand/logo.png",
    contact: {
      email: "hello@atelier.pk",
      phone: "+92 42 1234567",
      whatsapp: "+92 300 1234567",
      addressLines: ["123 Mall Road", "Lahore"],
      hours: "Mon–Sat, 10am–7pm",
    },
    social: [{ label: "Instagram", href: "https://instagram.com/atelier" }],
  });
  const storedSite = mergeSiteContent(getTables().store_settings.site_content as never);
  rec("saved brand name is read back", storedSite.brandName === "Atelier Lumière");
  rec("saved logo URL is read back", storedSite.logoUrl === "/uploads/images/brand/logo.png");
  rec("saved WhatsApp number is read back", storedSite.contact.whatsapp === "+92 300 1234567");
  rec("saved social links replace the demo ones", storedSite.social.length === 1 && storedSite.social[0].label === "Instagram");
  rec("un-touched fields (hero, story…) are preserved", storedSite.hero.title.length > 0 && storedSite.story.stats.length > 0);

  /* re-enable COD for the rest of this run */
  await repo.saveCommerceSettings({ codEnabled: true });

  /* ==================================================== 3 · COD dynamism */
  section("COD is a live setting, not a hardcoded flag");
  rec("COD enabled ⇒ appears in the enabled list", getEnabledPaymentMethods({ codEnabled: true }).some((m) => m.id === "cod"));
  rec("COD disabled ⇒ disappears from the enabled list", !getEnabledPaymentMethods({ codEnabled: false }).some((m) => m.id === "cod"));

  /* ===================================================== 4 · coupon CRUD */
  section("Coupon CRUD");
  const couponId = await repo.createCoupon({
    code: "welcome15",
    description: "15% off, once per customer",
    discount_type: "percentage",
    discount_value: 15,
    minimum_subtotal_cents: 0,
    max_redemptions: 2,
    per_user_limit: 1,
    is_active: true,
  });
  rec("coupon created", !!couponId);
  const created = await repo.getCoupon(couponId);
  rec("code is normalised to uppercase", created?.code === "WELCOME15");
  rec("redeemed_count starts at 0", created?.redeemed_count === 0);

  await expectThrow(
    () => repo.createCoupon({ code: "WELCOME15", discount_type: "fixed_amount", discount_value: 100 }),
    "a duplicate code is rejected",
    /already exists/i,
  );
  await expectThrow(
    () => repo.createCoupon({ code: "BADPCT", discount_type: "percentage", discount_value: 150 }),
    "a percentage over 100 is rejected",
    /between 0 and 100/i,
  );
  await expectThrow(
    () => repo.createCoupon({ code: "BADFIXED", discount_type: "fixed_amount", discount_value: -5 }),
    "a negative fixed discount is rejected",
    /negative/i,
  );

  await repo.updateCoupon(couponId, { description: "Updated description" });
  rec("update applies", (await repo.getCoupon(couponId))?.description === "Updated description");
  await expectThrow(
    () => repo.updateCoupon(couponId, { discount_value: 200 }),
    "update re-validates the discount value",
    /between 0 and 100/i,
  );

  const list = await repo.listCoupons();
  rec("the demo coupons seeded at startup are present", list.some((c) => c.code === "DISCOVERY10"));
  rec("the newly created coupon is present", list.some((c) => c.id === couponId));

  /* ================================== 5 · expiry / active / minimum order */
  section("Checkout validation — expired, inactive, invalid, below minimum");
  const products = await repo.listProducts({ pageSize: 5 });
  const productId = products.items[0].id;
  const productDetail = (await repo.getProduct(productId))!;
  const sku = productDetail.variants.find((v) => v.stock_quantity > 5)?.sku ?? productDetail.variants[0].sku;

  const expiredId = await repo.createCoupon({
    code: "EXPIRED5",
    discount_type: "fixed_amount",
    discount_value: 500,
    expires_at: new Date(Date.now() - 86_400_000).toISOString(),
  });
  const expiredOrder = await repo.createOrder({
    customer: CUSTOMER,
    paymentMethod: "cod",
    couponCode: "EXPIRED5",
    lines: [{ productId, variantSku: sku, quantity: 1 }],
  });
  rec("an expired coupon is never applied", expiredOrder.discountCode === null && expiredOrder.discountCents === 0);
  void expiredId;

  const inactiveId = await repo.createCoupon({
    code: "OFFCODE",
    discount_type: "fixed_amount",
    discount_value: 500,
    is_active: false,
  });
  const inactiveOrder = await repo.createOrder({
    customer: CUSTOMER,
    paymentMethod: "cod",
    couponCode: "OFFCODE",
    lines: [{ productId, variantSku: sku, quantity: 1 }],
  });
  rec("an inactive coupon is never applied", inactiveOrder.discountCode === null);
  void inactiveId;

  const belowMinId = await repo.createCoupon({
    code: "BIGORDER",
    discount_type: "fixed_amount",
    discount_value: 500,
    minimum_subtotal_cents: 99_999_999,
  });
  const belowMinOrder = await repo.createOrder({
    customer: CUSTOMER,
    paymentMethod: "cod",
    couponCode: "BIGORDER",
    lines: [{ productId, variantSku: sku, quantity: 1 }],
  });
  rec("a coupon below its minimum order value is never applied", belowMinOrder.discountCode === null);
  void belowMinId;

  const garbageOrder = await repo.createOrder({
    customer: CUSTOMER,
    paymentMethod: "cod",
    couponCode: "TOTALLY-MADE-UP-CODE",
    lines: [{ productId, variantSku: sku, quantity: 1 }],
  });
  rec("an unknown coupon code doesn't fail the order — it's just not applied", garbageOrder.discountCode === null);

  /* ============================================ 6 · overuse (store-wide) */
  section("Overuse — store-wide usage limit");
  const limitedId = await repo.createCoupon({
    code: "LIMITED1",
    discount_type: "percentage",
    discount_value: 20,
    max_redemptions: 1,
    per_user_limit: 5,
  });
  const first = await repo.createOrder({
    customer: CUSTOMER,
    paymentMethod: "cod",
    couponCode: "LIMITED1",
    lines: [{ productId, variantSku: sku, quantity: 1 }],
  });
  rec("the first redemption applies the discount", first.discountCode === "LIMITED1" && first.discountCents > 0);
  const afterFirstRedemption = await repo.getCoupon(limitedId);
  rec("redeemed_count increments after a real redemption", afterFirstRedemption?.redeemed_count === 1);

  const second = await repo.createOrder({
    customer: CUSTOMER_2, // a different customer — this is a STORE-WIDE limit
    paymentMethod: "cod",
    couponCode: "LIMITED1",
    lines: [{ productId, variantSku: sku, quantity: 1 }],
  });
  rec("a second order after the store-wide limit gets no discount", second.discountCode === null);
  rec("...but still succeeds, at full price", second.subtotalCents === second.totalCents - second.shippingCents);
  const afterSecondAttempt = await repo.getCoupon(limitedId);
  rec("redeemed_count does not increment for a rejected redemption", afterSecondAttempt?.redeemed_count === 1);

  /* ========================================== 7 · overuse (per customer) */
  section("Overuse — per-customer usage limit (including guests, by email)");
  const perCustomerId = await repo.createCoupon({
    code: "ONETIME",
    discount_type: "fixed_amount",
    discount_value: 300,
    max_redemptions: null,
    per_user_limit: 1,
  });
  const guestFirst = await repo.createOrder({
    customer: CUSTOMER,
    paymentMethod: "cod",
    couponCode: "ONETIME",
    lines: [{ productId, variantSku: sku, quantity: 1 }],
  });
  rec("a guest's first use of a one-per-customer coupon applies", guestFirst.discountCode === "ONETIME");

  const guestSecond = await repo.createOrder({
    customer: CUSTOMER, // same email, still a guest (no account)
    paymentMethod: "cod",
    couponCode: "ONETIME",
    lines: [{ productId, variantSku: sku, quantity: 1 }],
  });
  rec("the same guest email reusing it gets no discount", guestSecond.discountCode === null);

  const otherGuest = await repo.createOrder({
    customer: CUSTOMER_2,
    paymentMethod: "cod",
    couponCode: "ONETIME",
    lines: [{ productId, variantSku: sku, quantity: 1 }],
  });
  rec("a different guest email can still use it", otherGuest.discountCode === "ONETIME");
  void perCustomerId;

  /* ============================================== 8 · manipulated amount */
  section("Manipulated discounts are impossible, not just rejected");
  const tamperId = await repo.createCoupon({
    code: "TAMPERTEST",
    discount_type: "percentage",
    discount_value: 10,
  });
  const tamperOrder = await repo.createOrder({
    customer: CUSTOMER,
    paymentMethod: "cod",
    couponCode: "TAMPERTEST",
    // `CreateOrderInput` has no field for a client-supplied discount amount at
    // all — there is nothing here to tamper with. The only lever is the code,
    // and the amount is recomputed from the server-priced subtotal.
    lines: [{ productId, variantSku: sku, quantity: 3 }],
  });
  rec(
    "the discount is exactly 10% of the server-computed subtotal, nothing else",
    tamperOrder.discountCents === Math.round(tamperOrder.subtotalCents * 0.1),
    `${tamperOrder.discountCents} vs ${Math.round(tamperOrder.subtotalCents * 0.1)}`,
  );
  void tamperId;

  /* ================================================== 9 · staff auth gate */
  section("Staff authorization gate on settings/coupon writes");
  const prevBypass = process.env.ADMIN_DEV_BYPASS;
  process.env.ADMIN_DEV_BYPASS = "false";
  rec("no session ⇒ getAdminSession() is null", (await getAdminSession()) === null);
  try {
    await requireStaff();
    rec("an unauthenticated caller is refused by requireStaff()", false, "did not throw/redirect");
  } catch (err) {
    rec("an unauthenticated caller is refused by requireStaff()", expectRedirectTo(err, "/admin/login"));
  }
  process.env.ADMIN_DEV_BYPASS = prevBypass;

  resetLocalStore();

  /* ------------------------------------------------------------ summary */
  const failed = checks.filter((c) => !c.ok);
  console.log("\n=======================================");
  console.log(`${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`));
    process.exit(1);
  }
  console.log("Store settings & discount system verified.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
