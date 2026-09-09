import "server-only";

import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import type { CommerceSettings } from "@/lib/commerce";
import type { CouponUsageCounts } from "@/lib/coupons";
import type { SiteContent } from "@/lib/types";
import type {
  CategoryInput,
  CategoryRecord,
  CouponInput,
  CouponRecord,
  CreateOrderInput,
  OrderConfirmation,
  ImageRecord,
  ModelRecord,
  NoteInput,
  NoteRecord,
  OrderDetail,
  OrderListResult,
  OrderQueryParams,
  OrderStatusValue,
  ProductDetail,
  ProductInput,
  ProductListParams,
  ProductListResult,
  ProductNoteEntry,
  VariantInput,
} from "./records";

/**
 * The single interface the Admin Dashboard talks to. Two implementations:
 *
 *   • SupabaseAdminRepo — service-role client, used when Supabase is configured.
 *   • LocalAdminRepo    — JSON-file store under `.data/admin`, seeded from
 *                         `src/lib/data/*`, used for offline development so the
 *                         full CRUD flow works and is testable without Supabase.
 *
 * Callers must gate every mutation with `requireStaff()` first (see
 * `src/lib/auth.ts`); the repo itself performs no authorization.
 */
export interface AdminRepo {
  readonly backend: "supabase" | "local";

  /* Products */
  listProducts(params: ProductListParams): Promise<ProductListResult>;
  getProduct(id: string): Promise<ProductDetail | null>;
  getProductBySlug(slug: string): Promise<ProductDetail | null>;
  createProduct(input: ProductInput): Promise<string>;
  updateProduct(id: string, patch: Partial<ProductInput>): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  setProductStatus(id: string, status: ProductInput["status"]): Promise<void>;
  setProductFeatured(id: string, featured: boolean): Promise<void>;

  /* Variants */
  upsertVariant(productId: string, input: VariantInput): Promise<string>;
  deleteVariant(productId: string, variantId: string): Promise<void>;

  /* Categories */
  listCategories(): Promise<CategoryRecord[]>;
  createCategory(input: CategoryInput): Promise<string>;
  updateCategory(id: string, patch: Partial<CategoryInput>): Promise<void>;
  deleteCategory(id: string): Promise<void>;

  /* Fragrance notes */
  listNotes(): Promise<NoteRecord[]>;
  createNote(input: NoteInput): Promise<string>;
  updateNote(id: string, patch: Partial<NoteInput>): Promise<void>;
  deleteNote(id: string): Promise<void>;
  setProductNotes(productId: string, entries: ProductNoteEntry[]): Promise<void>;

  /* Media — images */
  addImage(
    productId: string,
    input: { url: string; alt?: string | null; storage_path?: string | null },
  ): Promise<string>;
  deleteImage(productId: string, imageId: string): Promise<void>;
  setPrimaryImage(productId: string, imageId: string): Promise<void>;
  moveImage(productId: string, imageId: string, direction: "up" | "down"): Promise<void>;

  /* Media — 3D models */
  addModel(
    productId: string,
    input: {
      model_url: string;
      format: ModelRecord["format"];
      storage_path?: string | null;
      poster_url?: string | null;
    },
  ): Promise<string>;
  deleteModel(productId: string, modelId: string): Promise<void>;
  setActiveModel(productId: string, modelId: string): Promise<void>;

  listAllMedia(): Promise<{ images: ImageRecord[]; models: ModelRecord[] }>;

  /* Orders — created by customers at checkout, managed by staff */
  createOrder(input: CreateOrderInput): Promise<OrderConfirmation>;
  /** Search / filter / paginate every order. Staff-only — see `requireStaff()`. */
  listOrders(params?: OrderQueryParams): Promise<OrderListResult>;
  getOrder(id: string): Promise<OrderDetail | null>;
  /** Change status and record it in the history, with an optional note. */
  setOrderStatus(id: string, status: OrderStatusValue, note?: string | null): Promise<void>;
  /** Set tracking number/carrier; logged to the status history automatically. */
  updateOrderTracking(
    id: string,
    input: { trackingNumber: string; trackingCarrier?: string | null; note?: string | null },
  ): Promise<void>;
  /** Cancel and restore each line's reserved stock. Idempotent; refuses a delivered order. */
  cancelOrder(id: string, note?: string | null): Promise<void>;

  /* Coupons */
  listCoupons(): Promise<CouponRecord[]>;
  getCoupon(id: string): Promise<CouponRecord | null>;
  /** Case-insensitive exact-code lookup, used by checkout. */
  getCouponByCode(code: string): Promise<CouponRecord | null>;
  createCoupon(input: CouponInput): Promise<string>;
  updateCoupon(id: string, patch: Partial<CouponInput>): Promise<void>;
  deleteCoupon(id: string): Promise<void>;
  /** Fresh redemption counts for `validateCoupon` — never cached, read right before deciding. */
  getCouponUsageCounts(
    couponId: string,
    customer: { userId?: string | null; email: string },
  ): Promise<CouponUsageCounts>;

  /* Store settings — Admin → Settings. Reads go through `src/lib/cms.ts`
   * (`getSiteContent`/`getCommerceSettings`), which resolve the same
   * Supabase/local split every other storefront read does; only the write
   * path needs the staff-gated repo. */
  saveSiteContent(content: SiteContent): Promise<void>;
  saveCommerceSettings(patch: Partial<CommerceSettings>): Promise<void>;
}

let cached: AdminRepo | null = null;

export async function getAdminRepo(): Promise<AdminRepo> {
  if (cached) return cached;
  if (isSupabaseAdminConfigured()) {
    const { SupabaseAdminRepo } = await import("./supabase-repo");
    cached = new SupabaseAdminRepo();
  } else {
    const { LocalAdminRepo } = await import("./local-repo");
    cached = new LocalAdminRepo();
  }
  return cached;
}

export type {
  CategoryInput,
  CategoryRecord,
  CouponInput,
  CouponRecord,
  CouponUsageRecord,
  CreateOrderInput,
  CreateOrderLineInput,
  CreateOrderResult,
  OrderConfirmation,
  ImageRecord,
  ModelRecord,
  NoteInput,
  NoteRecord,
  OrderCustomerInfo,
  OrderDetail,
  OrderListItem,
  OrderListResult,
  OrderQueryParams,
  OrderRecord,
  OrderItemRecord,
  OrderCustomizationRecord,
  OrderStatusHistoryRecord,
  OrderStatusValue,
  PaymentMethodValue,
  PaymentStatusValue,
  ProductDetail,
  ProductInput,
  ProductListParams,
  ProductListResult,
  ProductNoteEntry,
  VariantInput,
  VariantRecord,
} from "./records";
