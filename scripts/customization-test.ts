/**
 * Phase 5 — custom perfume / bottle flow.
 *
 *   npm run customization:test
 *
 * Covers: config parsing & clamping, selection normalisation, server-side
 * pricing (the browser's number is never used), file validation, and the full
 * flow — enable on a product → personalise a line → place an order → the
 * customisation is saved on the order → the admin can read it back.
 * Runs against the LocalAdminRepo (identical shape to the Supabase backend).
 */

import { loadEnv } from "./_env.ts";
loadEnv();

import { LocalAdminRepo } from "../src/lib/admin/local-repo.ts";
import { resetLocalStore } from "../src/lib/admin/local-store.ts";
import {
  parseCustomizationConfig,
  normalizeSelection,
  priceCustomization,
} from "../src/lib/customization/pricing.ts";
import { validateCustomerImage } from "../src/lib/customization/validation.ts";
import { shippingFor } from "../src/lib/commerce.ts";
import type { ProductCustomizationConfig } from "../src/lib/customization/types.ts";

import type { CheckoutCustomerDetails } from "../src/lib/checkout/types.ts";

/** A valid Pakistani delivery address, reused by every order in this script. */
const CUSTOMER: CheckoutCustomerDetails = {
  fullName: "Camille Farooq",
  mobile: "03012345678",
  email: "camille@example.com",
  province: "Punjab",
  city: "Lahore",
  area: "DHA Phase 5",
  address: "House 12, Street 4, near Lalik Chowk",
  postalCode: "54792",
};

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
const rec = (name: string, ok: boolean, detail?: string) => {
  checks.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
};
async function expectThrow(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
    rec(label, false, "expected an error");
  } catch {
    rec(label, true);
  }
}

const CONFIG: ProductCustomizationConfig = {
  enabled: true,
  allowText: true,
  textMaxLength: 10,
  textPriceCents: 2500,
  allowImage: true,
  imagePriceCents: 4000,
  bottleOptions: [
    { id: "clear", label: "Clear", priceCents: 0 },
    { id: "frosted", label: "Frosted", priceCents: 3000 },
  ],
  packagingOptions: [{ id: "gift", label: "Gift wrap", priceCents: 1800 }],
};

async function main() {
  console.log("\nMaison Lumière — customisation flow test");
  console.log("=======================================");
  resetLocalStore();
  const repo = new LocalAdminRepo();

  /* ---------------------------------------------- config parse & clamp */
  {
    const parsed = parseCustomizationConfig({
      enabled: true,
      textMaxLength: 9999,
      textPriceCents: -50,
      bottleOptions: [
        { id: "a", label: "A", priceCents: -100 },
        { id: "a", label: "dup id ignored", priceCents: 10 },
        { label: "no id ignored", priceCents: 10 },
      ],
      packagingOptions: "not-an-array",
    });
    rec("config: textMaxLength clamped to <= 200", parsed.textMaxLength === 200);
    rec("config: negative prices clamped to 0", parsed.textPriceCents === 0 && parsed.bottleOptions[0].priceCents === 0);
    rec("config: dedupes option ids & drops id-less options", parsed.bottleOptions.length === 1);
    rec("config: bad option array becomes []", parsed.packagingOptions.length === 0);
  }

  /* -------------------------------------------- selection normalisation */
  {
    const n = normalizeSelection(CONFIG, {
      text: "  a very long name  ",
      imageUrl: "https://x/y.jpg",
      bottleOptionId: "does-not-exist",
      packagingOptionId: "gift",
    });
    rec("normalise: text trimmed to maxLength", n.text === "a very lon");
    rec("normalise: unknown option id dropped", !n.bottleOptionId);
    rec("normalise: valid option id kept", n.packagingOptionId === "gift");
    rec("normalise: image kept when allowed", n.imageUrl === "https://x/y.jpg");

    const noImg = normalizeSelection({ ...CONFIG, allowImage: false }, { imageUrl: "https://x/y.jpg" });
    rec("normalise: image dropped when not allowed", !noImg.imageUrl);

    const disabled = normalizeSelection({ ...CONFIG, enabled: false }, { text: "hi" });
    rec("normalise: nothing kept when customisation disabled", !disabled.text);
  }

  /* ------------------------------------------------- server-side pricing */
  {
    const line = priceCustomization(CONFIG, {
      text: "Camille",
      imageUrl: "https://x/y.jpg",
      bottleOptionId: "frosted",
      packagingOptionId: "gift",
    });
    // 2500 (text) + 4000 (image) + 3000 (frosted) + 1800 (gift)
    rec("price: delta is the sum of enabled surcharges", line.deltaCents === 11300, `${line.deltaCents}`);
    rec("price: breakdown lists each surcharge", line.breakdown.length === 4);
    rec("price: summary is human readable", /Camille/.test(line.summary) && /Frosted/.test(line.summary));

    const cheeky = priceCustomization(CONFIG, {
      text: "x",
      bottleOptionId: "does-not-exist", // pretend the client added a fake option
    });
    rec("price: fake option id contributes nothing", cheeky.deltaCents === 2500);

    const included = priceCustomization(CONFIG, { bottleOptionId: "clear" });
    rec("price: zero-cost option → delta 0", included.deltaCents === 0);
  }

  /* --------------------------------------------------- file validation */
  {
    rec("file: rejects > 5 MB", !validateCustomerImage({ name: "a.jpg", type: "image/jpeg", size: 6 * 1024 * 1024 }).ok);
    rec("file: rejects wrong type", !validateCustomerImage({ name: "a.gif", type: "image/gif", size: 1000 }).ok);
    rec("file: rejects empty", !validateCustomerImage({ name: "a.jpg", type: "image/jpeg", size: 0 }).ok);
    rec("file: accepts a valid jpeg", validateCustomerImage({ name: "a.jpg", type: "image/jpeg", size: 200_000 }).ok);
    rec("file: accepts webp by extension", validateCustomerImage({ name: "photo.webp", type: "", size: 200_000 }).ok);
  }

  /* -------------------------------- full flow: enable → order → admin view */
  const list = await repo.listProducts({ pageSize: 1 });
  const productId = list.items[0].id;
  const detail = await repo.getProduct(productId);
  const sku = detail!.variants.find((v) => v.is_default)?.sku ?? detail!.variants[0].sku;
  const basePrice = detail!.variants.find((v) => v.sku === sku)!.price_cents;

  // Admin enables customisation on this product.
  await repo.updateProduct(productId, {
    customization: CONFIG as unknown as Record<string, unknown>,
  });
  const reload = await repo.getProduct(productId);
  rec(
    "flow: admin enabled customisation on the product",
    parseCustomizationConfig(reload!.product.customization).enabled === true,
  );

  // Customer places an order: one plain line + one personalised line.
  // The "client" also sends a fictitious huge price — it must be ignored.
  const clientClaimedDelta = 999_999;
  const res = await repo.createOrder({
    customer: CUSTOMER,
    paymentMethod: "cod",
    lines: [
      { productId, variantSku: sku, quantity: 1 },
      {
        productId,
        variantSku: sku,
        quantity: 2,
        customization: {
          text: "Camille and some overflow",
          imageUrl: "/uploads/custom/abc/def.jpg",
          imagePath: "/uploads/custom/abc/def.jpg",
          bottleOptionId: "frosted",
          packagingOptionId: "gift",
          // @ts-expect-error — pretend a tampered client added this
          deltaCents: clientClaimedDelta,
        },
      },
    ],
  });

  const verifiedDelta = 2500 + 4000 + 3000 + 1800; // text+image+frosted+gift
  const expectedSubtotal = basePrice * 1 + 2 * (basePrice + verifiedDelta);
  const expectedShipping = shippingFor(expectedSubtotal);

  rec("flow: order created with a number", /^ML-\d{5}$/.test(res.orderNumber));
  rec(
    "flow: subtotal computed server-side (client price ignored)",
    res.subtotalCents === expectedSubtotal,
    `${res.subtotalCents} vs ${expectedSubtotal}`,
  );
  rec("flow: shipping computed server-side", res.shippingCents === expectedShipping);
  rec("flow: total = subtotal + shipping", res.totalCents === expectedSubtotal + expectedShipping);
  rec(
    "flow: the tampered client delta is nowhere near the real one",
    res.totalCents < clientClaimedDelta,
  );

  // Admin views the order.
  const order = await repo.getOrder(res.orderId);
  rec("admin: order retrievable", !!order && order.order.order_number === res.orderNumber);

  const personalisedItem = order!.items.find((i) => i.customization);
  rec("admin: personalised line has a customisation row", !!personalisedItem?.customization);
  rec(
    "admin: customisation kind is 'personalisation'",
    personalisedItem?.customization?.kind === "personalisation",
  );
  rec(
    "admin: stored price_delta_cents is the server value",
    personalisedItem?.customization?.price_delta_cents === verifiedDelta,
    `${personalisedItem?.customization?.price_delta_cents}`,
  );

  const payload = personalisedItem!.customization!.payload as {
    selection: { text?: string; imageUrl?: string; imagePath?: string };
    bottleOptionLabel?: string;
    packagingOptionLabel?: string;
    breakdown: unknown[];
    summary: string;
  };
  rec("admin: engraved text trimmed to maxLength in payload", payload.selection.text === "Camille an");
  rec("admin: uploaded image url preserved in payload", payload.selection.imageUrl === "/uploads/custom/abc/def.jpg");
  rec("admin: image storage path preserved (for re-download/delete)", !!payload.selection.imagePath);
  rec("admin: resolved option labels present", payload.bottleOptionLabel === "Frosted" && payload.packagingOptionLabel === "Gift wrap");
  rec("admin: price breakdown present for production", payload.breakdown.length === 4);

  const plainItem = order!.items.find((i) => !i.customization);
  rec("admin: plain line has no customisation row", !!plainItem && plainItem.total_cents === basePrice);

  const listed = (await repo.listOrders()).items;
  rec(
    "admin: order list flags the personalised line",
    listed.find((o) => o.id === res.orderId)?.personalised_count === 1,
  );

  /* --------------------------------------------- disabled product → no delta */
  {
    await repo.updateProduct(productId, {
      customization: { enabled: false } as unknown as Record<string, unknown>,
    });
    const r2 = await repo.createOrder({
      customer: CUSTOMER,
      paymentMethod: "cod",
      lines: [
        {
          productId,
          variantSku: sku,
          quantity: 1,
          customization: { text: "ShouldBeFree", bottleOptionId: "frosted" },
        },
      ],
    });
    const o2 = await repo.getOrder(r2.orderId);
    rec(
      "guard: customisation ignored when the product has it disabled",
      r2.subtotalCents === basePrice && !o2!.items[0].customization,
    );
  }

  /* -------------------------------------------------- input guards */
  await expectThrow(
    () => repo.createOrder({ customer: CUSTOMER, paymentMethod: "cod", lines: [] }),
    "guard: empty order rejected",
  );
  await expectThrow(
    () =>
      repo.createOrder({
        customer: { ...CUSTOMER, email: "not-an-email" },
        paymentMethod: "cod",
        lines: [{ productId, variantSku: sku, quantity: 1 }],
      }),
    "guard: invalid email rejected",
  );
  await expectThrow(
    () =>
      repo.createOrder({
        customer: CUSTOMER,
        paymentMethod: "cod",
        lines: [{ productId: "nope", variantSku: sku, quantity: 1 }],
      }),
    "guard: unknown product rejected",
  );
  await expectThrow(
    () =>
      repo.createOrder({
        customer: CUSTOMER,
        paymentMethod: "cod",
        lines: [{ productId, variantSku: "NOPE-999", quantity: 1 }],
      }),
    "guard: unknown bottle size rejected",
  );

  resetLocalStore();

  const failed = checks.filter((c) => !c.ok);
  console.log("\n---------------------------------------");
  console.log(`${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`));
    process.exit(1);
  }
  console.log("Customisation flow verified — prices are server-authoritative.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\nUnexpected error:", err);
  process.exit(1);
});
