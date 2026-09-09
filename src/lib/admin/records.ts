/**
 * Normalised admin records. These mirror the Supabase table rows closely so the
 * Supabase repository is a thin passthrough and the local (file-backed) repo can
 * stand in for it 1:1 during offline development.
 */

import type { NoteTier, ProductStatus, ModelFormat } from "@/lib/supabase/database.types";

export type { NoteTier, ProductStatus, ModelFormat };

export interface CategoryRecord {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  hero_image_url: string | null;
  accent_color: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NoteRecord {
  id: string;
  slug: string;
  name: string;
  family: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductRecord {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  short_description: string | null;
  description: string | null;
  ingredients: string | null;
  story: string | null;
  base_sku: string | null;
  category_id: string | null;
  concentration: string | null;
  gender: string | null;
  perfumer: string | null;
  sillage: string | null;
  longevity: string | null;
  accent_color: string | null;
  families: string[];
  customization: Record<string, unknown>;
  status: ProductStatus;
  is_featured: boolean;
  is_new: boolean;
  release_year: number | null;
  rating: number;
  review_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VariantRecord {
  id: string;
  product_id: string;
  sku: string;
  volume_ml: number;
  price_cents: number;
  compare_at_price_cents: number | null;
  currency: string;
  stock_quantity: number;
  is_default: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ProductNoteRecord {
  id: string;
  product_id: string;
  note_id: string;
  tier: NoteTier;
  position: number;
  created_at: string;
}

export interface ImageRecord {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  position: number;
  is_primary: boolean;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModelRecord {
  id: string;
  product_id: string;
  model_url: string | null;
  format: ModelFormat;
  poster_url: string | null;
  accent_color: string | null;
  scale: number;
  is_active: boolean;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ Inputs */

export interface ProductInput {
  slug: string;
  name: string;
  tagline?: string | null;
  short_description?: string | null;
  description?: string | null;
  ingredients?: string | null;
  story?: string | null;
  base_sku?: string | null;
  category_id?: string | null;
  concentration?: string | null;
  gender?: string | null;
  perfumer?: string | null;
  sillage?: string | null;
  longevity?: string | null;
  accent_color?: string | null;
  families?: string[];
  customization?: Record<string, unknown>;
  status?: ProductStatus;
  is_featured?: boolean;
  is_new?: boolean;
  release_year?: number | null;
}

export interface VariantInput {
  id?: string;
  sku: string;
  volume_ml: number;
  price_cents: number;
  compare_at_price_cents?: number | null;
  stock_quantity: number;
  is_default?: boolean;
  position?: number;
}

export interface CategoryInput {
  slug: string;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  hero_image_url?: string | null;
  accent_color?: string | null;
  position?: number;
  is_active?: boolean;
}

export interface NoteInput {
  slug: string;
  name: string;
  family: string;
  description?: string | null;
}

export interface ProductNoteEntry {
  note_id: string;
  tier: NoteTier;
  position: number;
}

/* ---------------------------------------------------------------- Queries */

export interface ProductListParams {
  search?: string;
  category?: string; // category slug
  family?: string;
  status?: ProductStatus | "all";
  featured?: "yes" | "no" | "all";
  sort?: "recent" | "name" | "price-asc" | "price-desc" | "stock";
  page?: number;
  pageSize?: number;
}

export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  status: ProductStatus;
  is_featured: boolean;
  is_new: boolean;
  category_id: string | null;
  category_name: string | null;
  families: string[];
  primary_image: string | null;
  min_price_cents: number | null;
  total_stock: number;
  variant_count: number;
  updated_at: string;
}

export interface ProductListResult {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface ProductDetail {
  product: ProductRecord;
  variants: VariantRecord[];
  images: ImageRecord[];
  models: ModelRecord[];
  notes: ProductNoteRecord[];
}

/* ------------------------------------------------------------------ Orders */

export type OrderStatusValue =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

/** Forward order-of-operations for the normal (non-cancelled) lifecycle. */
export const ORDER_STATUS_FLOW: OrderStatusValue[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
];
export const ORDER_STATUS_LABELS: Record<OrderStatusValue, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export type PaymentMethodValue =
  | "cod"
  | "jazzcash"
  | "easypaisa"
  | "bank_transfer"
  | "card";
export type PaymentStatusValue =
  | "unpaid"
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

export interface OrderRecord {
  id: string;
  order_number: string;
  /** The signed-in customer this order belongs to, or null for a guest order. */
  user_id: string | null;
  email: string;
  status: OrderStatusValue;
  payment_method: PaymentMethodValue;
  payment_status: PaymentStatusValue;
  currency: string;
  subtotal_cents: number;
  discount_cents: number;
  discount_code: string | null;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  /** Structured Pakistan delivery details. */
  shipping_address: Record<string, unknown>;
  shipping_method: string | null;
  tracking_number: string | null;
  tracking_carrier: string | null;
  tracking_updated_at: string | null;
  customer_note: string | null;
  placed_at: string;
  created_at: string;
  updated_at: string;
}

/** Append-only audit trail of every status transition on an order. */
export interface OrderStatusHistoryRecord {
  id: string;
  order_id: string;
  status: OrderStatusValue;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface OrderItemRecord {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_label: string;
  sku: string | null;
  quantity: number;
  /** Base variant unit price (customisation surcharge is a separate row). */
  unit_price_cents: number;
  total_cents: number;
  created_at: string;
}

export interface OrderCustomizationRecord {
  id: string;
  order_item_id: string;
  kind: "personalisation";
  /** Resolved selection + labels + breakdown + summary + image url/path. */
  payload: Record<string, unknown>;
  price_delta_cents: number;
  created_at: string;
}

/** Resolved account info shown on the admin "view customer" panel. */
export interface OrderCustomerInfo {
  /** Set when the order belongs to a signed-in account, null for a guest order. */
  userId: string | null;
  fullName: string;
  email: string;
  mobile: string;
  isRegistered: boolean;
}

export interface OrderDetail {
  order: OrderRecord;
  items: (OrderItemRecord & { customization: OrderCustomizationRecord | null })[];
  statusHistory: OrderStatusHistoryRecord[];
  customer: OrderCustomerInfo;
}

export interface OrderListItem {
  id: string;
  order_number: string;
  user_id: string | null;
  email: string;
  customer_name: string;
  status: OrderStatusValue;
  payment_method: PaymentMethodValue;
  payment_status: PaymentStatusValue;
  tracking_number: string | null;
  total_cents: number;
  item_count: number;
  personalised_count: number;
  placed_at: string;
}

/** Search / filter / pagination for the admin order list. */
export interface OrderQueryParams {
  /** Matches order number, customer email or tracking number (case-insensitive). */
  search?: string;
  status?: OrderStatusValue | "all";
  paymentMethod?: PaymentMethodValue | "all";
  sort?: "recent" | "oldest" | "total-desc" | "total-asc";
  page?: number;
  pageSize?: number;
}

export interface OrderListResult {
  items: OrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Client sends selections + quantities only — never prices. */
export interface CreateOrderLineInput {
  productId: string;
  variantSku: string;
  quantity: number;
  customization?: import("@/lib/customization/types").CustomizationSelection | null;
}

export interface CreateOrderInput {
  customer: import("@/lib/checkout/types").CheckoutCustomerDetails;
  paymentMethod: PaymentMethodValue;
  paymentPayload?: Record<string, unknown> | null;
  couponCode?: string | null;
  lines: CreateOrderLineInput[];
  /**
   * The signed-in customer placing this order, resolved server-side from the
   * session — never taken from client input. `null`/absent for a guest order.
   */
  customerId?: string | null;
}

export interface CreateOrderResult {
  orderId: string;
  orderNumber: string;
  subtotalCents: number;
  discountCents: number;
  discountCode: string | null;
  shippingCents: number;
  totalCents: number;
  paymentMethod: PaymentMethodValue;
  paymentStatus: PaymentStatusValue;
  status: OrderStatusValue;
}

/** Full confirmation payload returned to the customer after placing an order. */
export interface OrderConfirmation extends CreateOrderResult {
  placedAt: string;
  customer: import("@/lib/checkout/types").CheckoutCustomerDetails;
  items: {
    name: string;
    variantLabel: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    customization: {
      summary: string;
      deltaCents: number;
      imageUrl: string | null;
    } | null;
  }[];
}

/* --------------------------------------------------------- Customer accounts
 * Local-mode stand-in for Supabase Auth + `profiles`. Only used when Supabase
 * is not configured — see `src/lib/customer/local-accounts.ts`. The password
 * hash never leaves that module; every other consumer sees `CustomerAccount`
 * (below), which omits it entirely.
 * ------------------------------------------------------------------------ */

export interface CustomerRecord {
  id: string;
  email: string; // stored lower-cased; uniqueness is enforced on this form
  password_hash: string; // "scrypt$<saltHex>$<hashHex>"
  full_name: string;
  phone: string | null;
  marketing_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

/* ---------------------------------------------------------------- Coupons
 * `src/lib/coupons.ts` is the single authority on what a coupon is worth and
 * whether it's currently redeemable — this file only carries the stored
 * shape. Both repositories implement identical CRUD + lookup + redemption
 * counting so checkout enforces the same rules (expiry, active flag, minimum
 * order value, total and per-customer usage limits) on either backend.
 * ------------------------------------------------------------------------ */

export type DiscountTypeValue = "percentage" | "fixed_amount" | "free_shipping";

export interface CouponRecord {
  id: string;
  code: string; // stored upper-cased; matched case-insensitively
  description: string | null;
  discount_type: DiscountTypeValue;
  /** percentage: 0–100 · fixed_amount: whole PKR · free_shipping: ignored */
  discount_value: number;
  minimum_subtotal_cents: number;
  /** Total redemptions allowed across all customers, or null = unlimited. */
  max_redemptions: number | null;
  /** Redemptions allowed per customer (by account id, or by email for guests). */
  per_user_limit: number;
  /** Denormalised count of successful redemptions — kept in sync on each order. */
  redeemed_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponInput {
  code: string;
  description?: string | null;
  discount_type: DiscountTypeValue;
  discount_value: number;
  minimum_subtotal_cents?: number;
  max_redemptions?: number | null;
  per_user_limit?: number;
  starts_at?: string | null;
  expires_at?: string | null;
  is_active?: boolean;
}

/** One redemption — inserted the moment an order using a coupon is placed. */
export interface CouponUsageRecord {
  id: string;
  coupon_id: string;
  /** The signed-in customer, or null for a guest checkout. */
  user_id: string | null;
  /** Always recorded (account email or the checkout contact email) — the
   *  per-customer limit for guests is enforced against this. */
  email: string;
  order_id: string;
  amount_cents: number;
  created_at: string;
}
