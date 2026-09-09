"use server";

import { getProductBySlug, getCommerceSettings, getProducts, getCollections } from "@/lib/cms";
import { getAdminRepo } from "@/lib/admin/repo";
import { uploadCustomerImage } from "@/lib/admin/storage";
import { priceCustomization } from "@/lib/customization/pricing";
import { validateCustomerImage } from "@/lib/customization/validation";
import { emptyCustomizationConfig } from "@/lib/customization/types";
import { validateCheckoutCustomer } from "@/lib/checkout/validation";
import { getPaymentMethod } from "@/lib/payments/registry";
import { validateCoupon } from "@/lib/coupons";
import { shippingFor } from "@/lib/commerce";
import { getCustomerSession } from "@/lib/customer/auth";
import type {
  CustomizationLine,
  CustomizationSelection,
} from "@/lib/customization/types";
import type { CheckoutFieldErrors } from "@/lib/checkout/types";
import type { CreateOrderInput, OrderConfirmation } from "@/lib/admin/records";

/* --------------------------------------------------- price verification */

export interface PriceCustomizationResult {
  ok: boolean;
  message?: string;
  enabled: boolean;
  allowImage: boolean;
  allowText: boolean;
  textMaxLength: number;
  /** Authoritative, server-computed. The browser must not price this itself. */
  line: CustomizationLine | null;
}

/**
 * Re-derives the customisation price from the product's stored config. Called
 * by the storefront customiser for a live preview AND again (implicitly, via
 * the order path) at checkout. A price coming from the browser is ignored.
 */
export async function priceCustomizationAction(
  productSlug: string,
  selection: CustomizationSelection,
): Promise<PriceCustomizationResult> {
  const product = await getProductBySlug(productSlug);
  if (!product) {
    return { ok: false, message: "Product not found.", enabled: false, allowImage: false, allowText: false, textMaxLength: 0, line: null };
  }
  const config = product.customization ?? emptyCustomizationConfig;
  if (!config.enabled) {
    return {
      ok: true,
      enabled: false,
      allowImage: false,
      allowText: false,
      textMaxLength: 0,
      line: null,
    };
  }
  const line = priceCustomization(config, selection);
  return {
    ok: true,
    enabled: true,
    allowImage: config.allowImage,
    allowText: config.allowText,
    textMaxLength: config.textMaxLength,
    line,
  };
}

/* ------------------------------------------------------- image upload */

export interface UploadImageResult {
  ok: boolean;
  message?: string;
  url?: string;
  path?: string;
}

export async function uploadCustomizationImageAction(
  formData: FormData,
): Promise<UploadImageResult> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, message: "No file received." };

    const pre = validateCustomerImage({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    if (!pre.ok) return { ok: false, message: pre.error };

    const asset = await uploadCustomerImage(file);
    return { ok: true, url: asset.url, path: asset.path };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Upload failed. Please try again.",
    };
  }
}

/* ---------------------------------------------------- coupon preview */

export interface CouponPreviewResult {
  ok: boolean;
  message?: string;
  code?: string;
  discountCents?: number;
  freeShipping?: boolean;
  label?: string;
}

/**
 * Validates a discount code against the current subtotal — and, best-effort,
 * the shopper's own redemption history — and returns what it would be worth.
 * Preview only: `createOrderAction` re-reads the coupon and re-counts its
 * redemptions at the moment the order is actually placed, which is the only
 * check that's authoritative (this one can't see a guest's past orders until
 * they've typed an email, and can't see a race with another tab).
 */
export async function previewCouponAction(
  rawCode: string,
  subtotalCents: number,
  email?: string,
): Promise<CouponPreviewResult> {
  const code = String(rawCode ?? "").trim();
  if (!code) return { ok: false, message: "Enter a code." };
  const subtotal = Math.max(0, Math.trunc(Number(subtotalCents) || 0));

  const repo = await getAdminRepo();
  const coupon = await repo.getCouponByCode(code);
  if (!coupon) return { ok: false, message: "That code isn't valid." };

  const [session, settings] = await Promise.all([getCustomerSession(), getCommerceSettings()]);
  const usage = await repo.getCouponUsageCounts(coupon.id, {
    userId: session?.userId ?? null,
    email: session?.email ?? email ?? "",
  });
  const shipping = shippingFor(subtotal, settings.shippingFeeCents, settings.freeShippingThresholdCents);
  const d = validateCoupon(coupon, { subtotalCents: subtotal, shippingCents: shipping, usage });
  if (!d.ok) return { ok: false, message: d.error };

  return {
    ok: true,
    code: d.result.code,
    discountCents: d.result.discountCents,
    freeShipping: d.result.freeShipping,
    label: d.result.label,
  };
}

/* ------------------------------------------------------- order creation */

export interface PlaceOrderResult {
  ok: boolean;
  message?: string;
  fieldErrors?: CheckoutFieldErrors;
  confirmation?: OrderConfirmation;
}

/**
 * Places an order (Cash on Delivery for now). The client sends customer
 * details, the chosen payment method, an optional coupon code and line
 * selections + quantities only.
 *
 * Server-side, in order:
 *  1. validate customer data · 2. validate the payment method
 *  3. the repo validates products · 4. validates stock · 5. recalculates every
 *  price from the catalogue · 6. mints a unique order number · 7. creates the
 *  order · 8. creates order items · 9. saves customisations · 10. reserves stock
 *  atomically. Then a full confirmation is returned.
 */
export async function createOrderAction(
  input: CreateOrderInput,
): Promise<PlaceOrderResult> {
  // 1 · customer data
  const customer = validateCheckoutCustomer(input?.customer);
  if (!customer.ok) {
    return {
      ok: false,
      message: "Please check your delivery details.",
      fieldErrors: customer.errors,
    };
  }

  // 2 · payment method — checked against the live settings (COD might have
  // just been switched off), never the client's say-so.
  const settings = await getCommerceSettings();
  const method = getPaymentMethod(input?.paymentMethod, settings);
  if (!method) {
    return { ok: false, message: "Select an available payment method." };
  }
  const payloadCheck = method.validatePayload(input?.paymentPayload ?? null);
  if (!payloadCheck.ok) {
    return { ok: false, message: payloadCheck.error ?? "Payment details are incomplete." };
  }

  try {
    // The signed-in shopper, if any — resolved server-side from the session,
    // never taken from `input`. Checkout stays guest-friendly either way.
    const session = await getCustomerSession();
    const repo = await getAdminRepo();
    const confirmation = await repo.createOrder({
      ...input,
      customer: customer.value!,
      customerId: session?.userId ?? null,
    });
    return { ok: true, confirmation };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : "We couldn't place your order. Please try again.",
    };
  }
}

/* ---------------------------------------------------------- cart sync */

export interface CartSyncLineInput {
  lineId: string;
  slug: string;
  sku: string;
  quantity: number;
  customization?: CustomizationSelection | null;
}

export type CartLineStatus =
  | "ok"
  | "reduced"
  | "out-of-stock"
  | "size-unavailable"
  | "unavailable";

export interface CartSyncSize {
  sku: string;
  ml: number;
  price: number;
  stock: number | null;
}

export interface CartSyncLine {
  lineId: string;
  status: CartLineStatus;
  message?: string;
  /** Live values — the client overwrites its persisted copy with these. */
  productId?: string;
  name?: string;
  image?: string;
  sku?: string;
  ml?: number;
  unitPrice?: number;
  stock?: number | null;
  /** Highest quantity currently orderable for this line. */
  maxQuantity?: number;
  /** Re-priced personalisation (server authority), or null. */
  customization?: CustomizationLine | null;
  /** Every bottle size the customer can switch this line to. */
  sizes?: CartSyncSize[];
}

export interface CartSyncResult {
  lines: CartSyncLine[];
  /** True when at least one line needs the customer's attention. */
  hasIssues: boolean;
}

/**
 * Re-reads every cart line against the live catalogue: product still published,
 * size still sold, current price, current stock and a re-derived customisation
 * price. The browser's persisted cart is only a wish-list — this is what makes
 * "stock validation" and in-cart size switching real. The order pipeline
 * validates all of it again on submit.
 */
export async function syncCartAction(
  lines: CartSyncLineInput[],
): Promise<CartSyncResult> {
  const input = Array.isArray(lines) ? lines : [];
  const slugs = [...new Set(input.map((l) => String(l.slug ?? "")))].filter(Boolean);

  const products = new Map<string, Awaited<ReturnType<typeof getProductBySlug>>>();
  await Promise.all(
    slugs.map(async (slug) => {
      products.set(slug, await getProductBySlug(slug));
    }),
  );

  // Two lines can share a variant (one personalised, one plain) — their stock
  // claims have to be counted together, in cart order.
  const claimed = new Map<string, number>();

  const out: CartSyncLine[] = input.map((line) => {
    const qty = Math.max(1, Math.trunc(Number(line.quantity) || 0));
    const product = products.get(String(line.slug ?? "")) ?? null;
    if (!product) {
      return {
        lineId: line.lineId,
        status: "unavailable",
        message: "This fragrance is no longer available.",
      };
    }

    const sizes: CartSyncSize[] = product.sizes.map((s) => ({
      sku: s.sku,
      ml: s.ml,
      price: s.price,
      stock: s.stock,
    }));
    const size = product.sizes.find((s) => s.sku === line.sku);
    const base = {
      lineId: line.lineId,
      productId: product.id,
      name: product.name,
      image: product.images[0]?.src ?? "",
      sizes,
    };

    if (!size) {
      return {
        ...base,
        status: "size-unavailable" as const,
        message: "That bottle size is no longer sold. Choose another size.",
      };
    }

    const config = product.customization ?? emptyCustomizationConfig;
    const priced =
      config.enabled && line.customization
        ? priceCustomization(config, line.customization)
        : null;

    const already = claimed.get(size.sku) ?? 0;
    const available =
      size.stock === null ? Number.POSITIVE_INFINITY : Math.max(0, size.stock - already);
    const grantable = Math.min(qty, available === Infinity ? qty : available);
    claimed.set(size.sku, already + Math.max(0, grantable));

    const common = {
      ...base,
      sku: size.sku,
      ml: size.ml,
      unitPrice: size.price,
      stock: size.stock,
      customization: priced,
    };

    if (available <= 0) {
      return {
        ...common,
        status: "out-of-stock" as const,
        maxQuantity: 0,
        message: `${product.name} ${size.ml}ml is out of stock.`,
      };
    }
    if (grantable < qty) {
      return {
        ...common,
        status: "reduced" as const,
        maxQuantity: grantable,
        message: `Only ${grantable} left of ${product.name} ${size.ml}ml — quantity reduced.`,
      };
    }
    return {
      ...common,
      status: "ok" as const,
      maxQuantity: available === Infinity ? 99 : available,
    };
  });

  return { lines: out, hasIssues: out.some((l) => l.status !== "ok") };
}

/* ------------------------------------------------------------- quick search */

export interface SearchHit {
  slug: string;
  name: string;
  tagline: string;
  image: string;
  imageAlt: string;
  priceFrom: number;
  collectionName: string;
  families: string[];
}

export interface SearchResult {
  query: string;
  hits: SearchHit[];
  /** True when there were more matches than `hits` — "see all N results". */
  total: number;
}

const QUICK_SEARCH_LIMIT = 6;

/**
 * Powers the header search overlay: matches product name, fragrance family,
 * category and every note (`applyProductQuery`'s `search` — the same engine
 * the /fragrances page itself uses, so a quick-search hit and a full listing
 * result are never inconsistent with each other).
 */
export async function searchCatalogAction(query: string): Promise<SearchResult> {
  const q = query.trim();
  if (q.length < 2) return { query: q, hits: [], total: 0 };

  const [matches, collections] = await Promise.all([getProducts({ search: q }), getCollections()]);
  const nameBySlug = new Map(collections.map((c) => [c.slug, c.name]));

  return {
    query: q,
    total: matches.length,
    hits: matches.slice(0, QUICK_SEARCH_LIMIT).map((p) => ({
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      image: p.images[0]?.src ?? "",
      imageAlt: p.images[0]?.alt ?? p.name,
      priceFrom: Math.min(...p.sizes.map((s) => s.price)),
      collectionName: nameBySlug.get(p.collectionSlug) ?? "",
      families: p.families,
    })),
  };
}
