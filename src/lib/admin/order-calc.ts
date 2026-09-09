/**
 * Server-side order calculation — the ONLY place a placed order's money is
 * decided. It reads variant prices, stock and each product's customisation
 * config straight from the catalogue and recomputes every figure. The client's
 * `CreateOrderInput` carries selections and quantities only; any price it might
 * have shown is irrelevant here.
 *
 * Shared by both repository backends so Supabase and the local file store
 * produce identical orders. The caller (repo) is responsible for actually
 * reserving the `stockDecrements` this returns.
 */

import { parseCustomizationConfig, priceCustomization } from "@/lib/customization/pricing";
import { shippingFor, type CommerceSettings } from "@/lib/commerce";
import { CURRENCY } from "@/lib/money";
import { validateCoupon, type CouponUsageCounts } from "@/lib/coupons";
import { validateCheckoutCustomer } from "@/lib/checkout/validation";
import { getPaymentMethod } from "@/lib/payments/registry";
import type {
  CouponRecord,
  CreateOrderInput,
  CreateOrderResult,
  OrderConfirmation,
  OrderCustomizationRecord,
  OrderItemRecord,
  OrderRecord,
  PaymentMethodValue,
  ProductRecord,
  VariantRecord,
} from "./records";

export interface OrderCalcContext {
  products: Pick<ProductRecord, "id" | "name" | "customization">[];
  variants: Pick<
    VariantRecord,
    "id" | "product_id" | "sku" | "volume_ml" | "price_cents" | "stock_quantity"
  >[];
  /**
   * The coupon this order is trying to redeem, already resolved by code and
   * already counted — the repo reads both fresh, right now, before calling
   * this. `null` when no code was supplied OR the repo couldn't find a
   * matching coupon (an unknown code is silently not applied, same as an
   * expired one — never a hard failure at order-creation time).
   */
  coupon: { record: CouponRecord; usage: CouponUsageCounts } | null;
  /** Admin-configured shipping/COD settings, read fresh — never a stale default. */
  commerceSettings: CommerceSettings;
  orderNumber: string;
  now: string;
  newId: () => string;
}

export interface BuiltOrder {
  order: OrderRecord;
  items: OrderItemRecord[];
  customizations: OrderCustomizationRecord[];
  /** Stock the repo must reserve, one entry per line. */
  stockDecrements: { variantId: string; sku: string; name: string; qty: number }[];
  result: CreateOrderResult;
  confirmation: OrderConfirmation;
  /**
   * The order's opening status-history row. Supabase writes this itself (the
   * `log_order_status` trigger fires on insert); the local store has no
   * trigger, so its repo pushes this row explicitly.
   */
  initialStatusHistory: import("./records").OrderStatusHistoryRecord;
  /** Set when a coupon actually applied — the repo records a `coupon_usage` row for this id. */
  appliedCouponId: string | null;
}

export class OutOfStockError extends Error {
  constructor(public readonly items: string[]) {
    super(`Some items are no longer available: ${items.join(", ")}`);
    this.name = "OutOfStockError";
  }
}

export function buildOrder(input: CreateOrderInput, ctx: OrderCalcContext): BuiltOrder {
  if (!input.lines || input.lines.length === 0) {
    throw new Error("Cannot place an order with no items.");
  }

  /* 1 · Customer data (validated again here even though the action already did) */
  const customerCheck = validateCheckoutCustomer(input.customer);
  if (!customerCheck.ok || !customerCheck.value) {
    const first = Object.values(customerCheck.errors)[0];
    throw new Error(first ?? "Please check your delivery details.");
  }
  const customer = customerCheck.value;

  /* 2 · Payment method — re-checked against the current settings, never the
   *      client's say-so. If an admin disables COD between the shopper
   *      loading checkout and submitting it, this is what actually stops it. */
  const method = getPaymentMethod(input.paymentMethod, ctx.commerceSettings);
  if (!method) {
    throw new Error("That payment method isn't available.");
  }
  const payloadCheck = method.validatePayload(input.paymentPayload);
  if (!payloadCheck.ok) throw new Error(payloadCheck.error ?? "Payment details are incomplete.");

  /* 3 · Lines — products, stock, prices */
  const orderId = ctx.newId();
  const items: OrderItemRecord[] = [];
  const customizations: OrderCustomizationRecord[] = [];
  const stockDecrements: BuiltOrder["stockDecrements"] = [];
  const confItems: OrderConfirmation["items"] = [];
  const outOfStock: string[] = [];
  let subtotal = 0;

  // Aggregate quantities per variant so 2 lines of the same sku are checked together.
  const qtyByVariant = new Map<string, number>();

  for (const line of input.lines) {
    const qty = Math.max(1, Math.trunc(Number(line.quantity) || 0));
    const product = ctx.products.find((p) => p.id === line.productId);
    if (!product) throw new Error(`Unknown product in cart (${line.productId}).`);
    const variant = ctx.variants.find(
      (v) => v.product_id === product.id && v.sku === line.variantSku,
    );
    if (!variant) throw new Error(`Unknown bottle size "${line.variantSku}".`);

    const label = `${product.name} ${variant.volume_ml}ml`;
    const already = qtyByVariant.get(variant.id) ?? 0;
    qtyByVariant.set(variant.id, already + qty);
    if (already + qty > variant.stock_quantity) {
      outOfStock.push(
        variant.stock_quantity <= 0
          ? `${label} (out of stock)`
          : `${label} (only ${variant.stock_quantity} left)`,
      );
      continue;
    }

    const unitPrice = Math.max(0, variant.price_cents);
    const config = parseCustomizationConfig(product.customization);
    const priced = priceCustomization(config, line.customization ?? null);
    const custDelta = config.enabled ? priced.deltaCents : 0;
    const lineTotal = qty * (unitPrice + custDelta);
    subtotal += lineTotal;

    const itemId = ctx.newId();
    items.push({
      id: itemId,
      order_id: orderId,
      product_id: product.id,
      variant_id: variant.id,
      product_name: product.name,
      variant_label: `${variant.volume_ml}ml`,
      sku: variant.sku,
      quantity: qty,
      unit_price_cents: unitPrice,
      total_cents: lineTotal,
      created_at: ctx.now,
    });
    stockDecrements.push({ variantId: variant.id, sku: variant.sku, name: label, qty });

    const s = priced.selection;
    const hasPersonalisation =
      config.enabled &&
      !!(s.text || s.imageUrl || s.bottleOptionId || s.packagingOptionId);

    if (hasPersonalisation) {
      customizations.push({
        id: ctx.newId(),
        order_item_id: itemId,
        kind: "personalisation",
        payload: {
          selection: s,
          bottleOptionLabel: priced.bottleOptionLabel,
          packagingOptionLabel: priced.packagingOptionLabel,
          breakdown: priced.breakdown,
          summary: priced.summary,
        },
        price_delta_cents: custDelta,
        created_at: ctx.now,
      });
    }

    confItems.push({
      name: product.name,
      variantLabel: `${variant.volume_ml}ml`,
      quantity: qty,
      unitPriceCents: unitPrice,
      lineTotalCents: lineTotal,
      customization: hasPersonalisation
        ? { summary: priced.summary, deltaCents: custDelta, imageUrl: s.imageUrl ?? null }
        : null,
    });
  }

  if (outOfStock.length > 0) throw new OutOfStockError(outOfStock);
  if (items.length === 0) throw new Error("Cannot place an order with no items.");

  /* 4 · Shipping + discount */
  let shipping = shippingFor(
    subtotal,
    ctx.commerceSettings.shippingFeeCents,
    ctx.commerceSettings.freeShippingThresholdCents,
  );
  let discount = 0;
  let discountCode: string | null = null;
  /** Set only when a coupon actually applied — the repo uses this to record the redemption. */
  let appliedCouponId: string | null = null;

  if (ctx.coupon) {
    const d = validateCoupon(ctx.coupon.record, { subtotalCents: subtotal, shippingCents: shipping, usage: ctx.coupon.usage });
    if (d.ok) {
      discountCode = d.result.code;
      appliedCouponId = ctx.coupon.record.id;
      if (d.result.freeShipping) shipping = 0;
      discount = Math.min(d.result.discountCents, subtotal);
    }
    // An invalid/expired/exhausted coupon is silently dropped here — the
    // storefront validates it before submit (`previewCouponAction`), so this
    // only guards a coupon that changed state (expired, ran out, etc.)
    // between the shopper applying it and actually placing the order.
  }

  const tax = 0;
  const total = Math.max(0, subtotal - discount + shipping + tax);

  /* 5 · Records */
  const order: OrderRecord = {
    id: orderId,
    order_number: ctx.orderNumber,
    user_id: input.customerId ?? null,
    email: customer.email,
    status: method.initialOrderStatus,
    payment_method: input.paymentMethod as PaymentMethodValue,
    payment_status: method.initialPaymentStatus,
    currency: CURRENCY,
    subtotal_cents: subtotal,
    discount_cents: discount,
    discount_code: discountCode,
    shipping_cents: shipping,
    tax_cents: tax,
    total_cents: total,
    shipping_address: {
      fullName: customer.fullName,
      mobile: customer.mobile,
      email: customer.email,
      province: customer.province,
      city: customer.city,
      area: customer.area,
      address: customer.address,
      postalCode: customer.postalCode,
      country: "Pakistan",
    },
    shipping_method: "courier",
    tracking_number: null,
    tracking_carrier: null,
    tracking_updated_at: null,
    customer_note: customer.notes ?? null,
    placed_at: ctx.now,
    created_at: ctx.now,
    updated_at: ctx.now,
  };

  const result: CreateOrderResult = {
    orderId,
    orderNumber: ctx.orderNumber,
    subtotalCents: subtotal,
    discountCents: discount,
    discountCode,
    shippingCents: shipping,
    totalCents: total,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    status: order.status,
  };

  return {
    order,
    items,
    customizations,
    stockDecrements,
    result,
    confirmation: { ...result, placedAt: ctx.now, customer, items: confItems },
    initialStatusHistory: {
      id: ctx.newId(),
      order_id: orderId,
      status: order.status,
      note: "Order placed",
      changed_by: input.customerId ?? null,
      created_at: ctx.now,
    },
    appliedCouponId,
  };
}
