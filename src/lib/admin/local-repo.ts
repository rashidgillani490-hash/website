// Server-only by convention; the `server-only` guard lives on `repo.ts`.
import type { AdminRepo } from "./repo";
import { getTables, persist, randomUUID, now } from "./local-store";
import { buildProductList, buildOrderList } from "./list";
import { buildOrder } from "./order-calc";
import { buildOrderDetail, resolveOrderCustomerInfo } from "./order-view";
import { mergeCommerceSettings } from "@/lib/settings";
import { slugify } from "@/lib/utils";
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
  VariantRecord,
} from "./records";

export class LocalAdminRepo implements AdminRepo {
  readonly backend = "local" as const;

  /* ------------------------------------------------------------- products */

  async listProducts(params: ProductListParams): Promise<ProductListResult> {
    const t = getTables();
    return buildProductList(
      {
        products: t.products,
        categories: t.categories,
        variants: t.variants,
        images: t.images,
      },
      params,
    );
  }

  async getProduct(id: string): Promise<ProductDetail | null> {
    const t = getTables();
    const product = t.products.find((p) => p.id === id);
    if (!product) return null;
    return this.assemble(product.id);
  }

  async getProductBySlug(slug: string): Promise<ProductDetail | null> {
    const t = getTables();
    const product = t.products.find((p) => p.slug === slug);
    return product ? this.assemble(product.id) : null;
  }

  private assemble(id: string): ProductDetail {
    const t = getTables();
    return {
      product: t.products.find((p) => p.id === id)!,
      variants: t.variants
        .filter((v) => v.product_id === id)
        .sort((a, b) => a.position - b.position || a.volume_ml - b.volume_ml),
      images: t.images
        .filter((i) => i.product_id === id)
        .sort((a, b) => a.position - b.position),
      models: t.models.filter((m) => m.product_id === id),
      notes: t.product_notes.filter((n) => n.product_id === id),
    };
  }

  async createProduct(input: ProductInput): Promise<string> {
    const t = getTables();
    if (t.products.some((p) => p.slug === input.slug)) {
      throw new Error(`A product with slug "${input.slug}" already exists.`);
    }
    const ts = now();
    const id = randomUUID();
    t.products.push({
      id,
      slug: input.slug,
      name: input.name,
      tagline: input.tagline ?? null,
      short_description: input.short_description ?? null,
      description: input.description ?? null,
      ingredients: input.ingredients ?? null,
      story: input.story ?? null,
      base_sku: input.base_sku ?? null,
      category_id: input.category_id ?? null,
      concentration: input.concentration ?? null,
      gender: input.gender ?? null,
      perfumer: input.perfumer ?? null,
      sillage: input.sillage ?? null,
      longevity: input.longevity ?? null,
      accent_color: input.accent_color ?? null,
      families: input.families ?? [],
      customization: input.customization ?? {},
      status: input.status ?? "draft",
      is_featured: input.is_featured ?? false,
      is_new: input.is_new ?? false,
      release_year: input.release_year ?? new Date().getFullYear(),
      rating: 0,
      review_count: 0,
      published_at: (input.status ?? "draft") === "active" ? ts : null,
      created_at: ts,
      updated_at: ts,
    });
    persist();
    return id;
  }

  async updateProduct(id: string, patch: Partial<ProductInput>): Promise<void> {
    const t = getTables();
    const p = t.products.find((x) => x.id === id);
    if (!p) throw new Error("Product not found.");
    if (patch.slug && patch.slug !== p.slug && t.products.some((x) => x.slug === patch.slug)) {
      throw new Error(`A product with slug "${patch.slug}" already exists.`);
    }
    Object.assign(p, patch, { updated_at: now() });
    if (patch.status === "active" && !p.published_at) p.published_at = now();
    persist();
  }

  async deleteProduct(id: string): Promise<void> {
    const t = getTables();
    t.products = t.products.filter((p) => p.id !== id);
    t.variants = t.variants.filter((v) => v.product_id !== id);
    t.product_notes = t.product_notes.filter((n) => n.product_id !== id);
    t.images = t.images.filter((i) => i.product_id !== id);
    t.models = t.models.filter((m) => m.product_id !== id);
    persist();
  }

  async setProductStatus(id: string, status: ProductInput["status"]): Promise<void> {
    await this.updateProduct(id, { status });
  }

  async setProductFeatured(id: string, featured: boolean): Promise<void> {
    await this.updateProduct(id, { is_featured: featured });
  }

  /* ------------------------------------------------------------- variants */

  async upsertVariant(productId: string, input: VariantInput): Promise<string> {
    const t = getTables();
    const ts = now();
    const siblings = t.variants.filter((v) => v.product_id === productId);

    if (t.variants.some((v) => v.sku === input.sku && v.id !== input.id)) {
      throw new Error(`SKU "${input.sku}" is already in use.`);
    }

    let record: VariantRecord;
    if (input.id) {
      const existing = t.variants.find((v) => v.id === input.id);
      if (!existing) throw new Error("Variant not found.");
      record = existing;
      Object.assign(record, {
        sku: input.sku,
        volume_ml: input.volume_ml,
        price_cents: input.price_cents,
        compare_at_price_cents: input.compare_at_price_cents ?? null,
        stock_quantity: input.stock_quantity,
        position: input.position ?? existing.position,
        updated_at: ts,
      });
    } else {
      record = {
        id: randomUUID(),
        product_id: productId,
        sku: input.sku,
        volume_ml: input.volume_ml,
        price_cents: input.price_cents,
        compare_at_price_cents: input.compare_at_price_cents ?? null,
        currency: "USD",
        stock_quantity: input.stock_quantity,
        is_default: siblings.length === 0,
        position: input.position ?? siblings.length,
        created_at: ts,
        updated_at: ts,
      };
      t.variants.push(record);
    }

    if (input.is_default) {
      t.variants
        .filter((v) => v.product_id === productId)
        .forEach((v) => (v.is_default = v.id === record.id));
    }
    if (!t.variants.some((v) => v.product_id === productId && v.is_default)) {
      const first = t.variants.find((v) => v.product_id === productId);
      if (first) first.is_default = true;
    }
    persist();
    return record.id;
  }

  async deleteVariant(productId: string, variantId: string): Promise<void> {
    const t = getTables();
    const target = t.variants.find((v) => v.id === variantId && v.product_id === productId);
    if (!target) return;
    t.variants = t.variants.filter((v) => v.id !== variantId);
    if (target.is_default) {
      const next = t.variants.find((v) => v.product_id === productId);
      if (next) next.is_default = true;
    }
    persist();
  }

  /* ----------------------------------------------------------- categories */

  async listCategories(): Promise<CategoryRecord[]> {
    return [...getTables().categories].sort((a, b) => a.position - b.position);
  }

  async createCategory(input: CategoryInput): Promise<string> {
    const t = getTables();
    if (t.categories.some((c) => c.slug === input.slug)) {
      throw new Error(`A category with slug "${input.slug}" already exists.`);
    }
    const ts = now();
    const id = randomUUID();
    t.categories.push({
      id,
      slug: input.slug,
      name: input.name,
      subtitle: input.subtitle ?? null,
      description: input.description ?? null,
      hero_image_url: input.hero_image_url ?? null,
      accent_color: input.accent_color ?? null,
      position: input.position ?? t.categories.length + 1,
      is_active: input.is_active ?? true,
      created_at: ts,
      updated_at: ts,
    });
    persist();
    return id;
  }

  async updateCategory(id: string, patch: Partial<CategoryInput>): Promise<void> {
    const t = getTables();
    const c = t.categories.find((x) => x.id === id);
    if (!c) throw new Error("Category not found.");
    if (patch.slug && patch.slug !== c.slug && t.categories.some((x) => x.slug === patch.slug)) {
      throw new Error(`A category with slug "${patch.slug}" already exists.`);
    }
    Object.assign(c, patch, { updated_at: now() });
    persist();
  }

  async deleteCategory(id: string): Promise<void> {
    const t = getTables();
    if (t.products.some((p) => p.category_id === id)) {
      throw new Error("Cannot delete a category that still has products assigned.");
    }
    t.categories = t.categories.filter((c) => c.id !== id);
    persist();
  }

  /* --------------------------------------------------------------- notes */

  async listNotes(): Promise<NoteRecord[]> {
    return [...getTables().notes].sort((a, b) => a.family.localeCompare(b.family) || a.name.localeCompare(b.name));
  }

  async createNote(input: NoteInput): Promise<string> {
    const t = getTables();
    const slug = input.slug || slugify(input.name);
    if (t.notes.some((n) => n.slug === slug)) {
      throw new Error(`A note with slug "${slug}" already exists.`);
    }
    const ts = now();
    const id = randomUUID();
    t.notes.push({
      id,
      slug,
      name: input.name,
      family: input.family,
      description: input.description ?? null,
      created_at: ts,
      updated_at: ts,
    });
    persist();
    return id;
  }

  async updateNote(id: string, patch: Partial<NoteInput>): Promise<void> {
    const t = getTables();
    const n = t.notes.find((x) => x.id === id);
    if (!n) throw new Error("Note not found.");
    Object.assign(n, patch, { updated_at: now() });
    persist();
  }

  async deleteNote(id: string): Promise<void> {
    const t = getTables();
    t.notes = t.notes.filter((n) => n.id !== id);
    t.product_notes = t.product_notes.filter((pn) => pn.note_id !== id);
    persist();
  }

  async setProductNotes(productId: string, entries: ProductNoteEntry[]): Promise<void> {
    const t = getTables();
    t.product_notes = t.product_notes.filter((pn) => pn.product_id !== productId);
    const ts = now();
    entries.forEach((e) => {
      t.product_notes.push({
        id: randomUUID(),
        product_id: productId,
        note_id: e.note_id,
        tier: e.tier,
        position: e.position,
        created_at: ts,
      });
    });
    const p = t.products.find((x) => x.id === productId);
    if (p) p.updated_at = ts;
    persist();
  }

  /* --------------------------------------------------------------- media */

  async addImage(
    productId: string,
    input: { url: string; alt?: string | null; storage_path?: string | null },
  ): Promise<string> {
    const t = getTables();
    const siblings = t.images.filter((i) => i.product_id === productId);
    const ts = now();
    const id = randomUUID();
    t.images.push({
      id,
      product_id: productId,
      url: input.url,
      alt: input.alt ?? null,
      position: siblings.length,
      is_primary: siblings.length === 0,
      storage_path: input.storage_path ?? null,
      created_at: ts,
      updated_at: ts,
    });
    persist();
    return id;
  }

  async deleteImage(productId: string, imageId: string): Promise<void> {
    const t = getTables();
    const target = t.images.find((i) => i.id === imageId && i.product_id === productId);
    if (!target) return;
    t.images = t.images.filter((i) => i.id !== imageId);
    const rest = t.images
      .filter((i) => i.product_id === productId)
      .sort((a, b) => a.position - b.position);
    rest.forEach((i, idx) => (i.position = idx));
    if (target.is_primary && rest[0]) rest[0].is_primary = true;
    persist();
  }

  async setPrimaryImage(productId: string, imageId: string): Promise<void> {
    const t = getTables();
    t.images
      .filter((i) => i.product_id === productId)
      .forEach((i) => (i.is_primary = i.id === imageId));
    persist();
  }

  async moveImage(productId: string, imageId: string, direction: "up" | "down"): Promise<void> {
    const t = getTables();
    const list = t.images
      .filter((i) => i.product_id === productId)
      .sort((a, b) => a.position - b.position);
    const idx = list.findIndex((i) => i.id === imageId);
    if (idx === -1) return;
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= list.length) return;
    [list[idx].position, list[swap].position] = [list[swap].position, list[idx].position];
    persist();
  }

  async addModel(
    productId: string,
    input: {
      model_url: string;
      format: ModelRecord["format"];
      storage_path?: string | null;
      poster_url?: string | null;
    },
  ): Promise<string> {
    const t = getTables();
    const ts = now();
    const id = randomUUID();
    // New upload becomes the active model.
    t.models
      .filter((m) => m.product_id === productId)
      .forEach((m) => (m.is_active = false));
    t.models.push({
      id,
      product_id: productId,
      model_url: input.model_url,
      format: input.format,
      poster_url: input.poster_url ?? null,
      accent_color: t.products.find((p) => p.id === productId)?.accent_color ?? null,
      scale: 1,
      is_active: true,
      storage_path: input.storage_path ?? null,
      created_at: ts,
      updated_at: ts,
    });
    persist();
    return id;
  }

  async deleteModel(productId: string, modelId: string): Promise<void> {
    const t = getTables();
    const target = t.models.find((m) => m.id === modelId && m.product_id === productId);
    if (!target) return;
    t.models = t.models.filter((m) => m.id !== modelId);
    if (target.is_active) {
      const next = t.models.find((m) => m.product_id === productId);
      if (next) next.is_active = true;
    }
    persist();
  }

  async setActiveModel(productId: string, modelId: string): Promise<void> {
    const t = getTables();
    t.models
      .filter((m) => m.product_id === productId)
      .forEach((m) => (m.is_active = m.id === modelId));
    persist();
  }

  async listAllMedia(): Promise<{ images: ImageRecord[]; models: ModelRecord[] }> {
    const t = getTables();
    return { images: [...t.images], models: [...t.models] };
  }

  /* --------------------------------------------------------------- orders */

  async createOrder(input: CreateOrderInput): Promise<OrderConfirmation> {
    const t = getTables();
    // Mirrors the Supabase `assign_order_number` trigger: ML-<5 digits> from a
    // sequence starting at 1001, so both backends mint the same shape.
    const highest = t.orders.reduce((max, o) => {
      const n = Number(/^ML-(\d+)$/.exec(o.order_number)?.[1] ?? 0);
      return Number.isFinite(n) && n > max ? n : max;
    }, 1000);
    const seq = String(highest + 1).padStart(5, "0");

    const couponEmail = String(input.customer?.email ?? "").trim().toLowerCase();
    const couponRecord = input.couponCode ? await this.getCouponByCode(input.couponCode) : null;
    const coupon = couponRecord
      ? {
          record: couponRecord,
          usage: await this.getCouponUsageCounts(couponRecord.id, {
            userId: input.customerId ?? null,
            email: couponEmail,
          }),
        }
      : null;

    const built = buildOrder(input, {
      products: t.products,
      variants: t.variants,
      coupon,
      commerceSettings: await this.#getCommerceSettingsInternal(),
      orderNumber: `ML-${seq}`,
      now: now(),
      newId: () => randomUUID(),
    });

    // Reserve stock. buildOrder already validated availability against this same
    // in-memory snapshot, and the local store is single-process, so this is safe.
    for (const d of built.stockDecrements) {
      const v = t.variants.find((x) => x.id === d.variantId);
      if (!v || v.stock_quantity < d.qty) {
        throw new Error(`"${d.name}" sold out while placing the order.`);
      }
    }
    for (const d of built.stockDecrements) {
      const v = t.variants.find((x) => x.id === d.variantId)!;
      v.stock_quantity -= d.qty;
      v.updated_at = now();
    }

    t.orders.push(built.order);
    t.order_items.push(...built.items);
    t.order_customizations.push(...built.customizations);
    t.order_status_history.push(built.initialStatusHistory);

    if (built.appliedCouponId) {
      t.coupon_usage.push({
        id: randomUUID(),
        coupon_id: built.appliedCouponId,
        user_id: input.customerId ?? null,
        email: built.confirmation.customer.email,
        order_id: built.order.id,
        amount_cents: built.order.discount_cents,
        created_at: now(),
      });
      const c = t.coupons.find((x) => x.id === built.appliedCouponId);
      if (c) {
        c.redeemed_count += 1;
        c.updated_at = now();
      }
    }

    persist();
    return built.confirmation;
  }

  async listOrders(params: OrderQueryParams = {}): Promise<OrderListResult> {
    const t = getTables();
    const personalisedItemIds = new Set(t.order_customizations.map((c) => c.order_item_id));
    const customerNames = new Map(
      t.orders.map((o) => [o.id, this.#resolveCustomerName(o.user_id, o.shipping_address)]),
    );
    return buildOrderList(
      { orders: t.orders, items: t.order_items, personalisedItemIds, customerNames },
      params,
    );
  }

  async getOrder(id: string): Promise<OrderDetail | null> {
    const t = getTables();
    const order = t.orders.find((o) => o.id === id);
    if (!order) return null;
    const items = t.order_items.filter((i) => i.order_id === id);
    const history = t.order_status_history.filter((h) => h.order_id === id);
    const account = order.user_id ? t.customers.find((c) => c.id === order.user_id) : undefined;
    const customer = resolveOrderCustomerInfo(
      order,
      account
        ? { full_name: account.full_name, email: account.email, phone: account.phone }
        : null,
    );
    return buildOrderDetail(order, items, t.order_customizations, history, customer);
  }

  async setOrderStatus(
    id: string,
    status: OrderStatusValue,
    note?: string | null,
  ): Promise<void> {
    const t = getTables();
    const o = t.orders.find((x) => x.id === id);
    if (!o) throw new Error("Order not found.");
    if (o.status === status) return; // no-op transition, nothing to log

    if (status === "cancelled") {
      this.#restoreOrderStock(o.id);
    }

    o.status = status;
    o.updated_at = now();
    t.order_status_history.push({
      id: randomUUID(),
      order_id: id,
      status,
      note: note?.trim() || null,
      changed_by: null, // set by the caller's session in a Supabase deployment; local mode has no auth.uid()
      created_at: now(),
    });
    persist();
  }

  async updateOrderTracking(
    id: string,
    input: { trackingNumber: string; trackingCarrier?: string | null; note?: string | null },
  ): Promise<void> {
    const t = getTables();
    const o = t.orders.find((x) => x.id === id);
    if (!o) throw new Error("Order not found.");
    const trackingNumber = input.trackingNumber.trim();
    if (!trackingNumber) throw new Error("Tracking number is required.");
    const trackingCarrier = input.trackingCarrier?.trim() || null;

    o.tracking_number = trackingNumber;
    o.tracking_carrier = trackingCarrier;
    o.tracking_updated_at = now();
    o.updated_at = now();
    t.order_status_history.push({
      id: randomUUID(),
      order_id: id,
      status: o.status,
      note:
        input.note?.trim() ||
        `Tracking added: ${trackingCarrier ? `${trackingCarrier} ` : ""}${trackingNumber}`,
      changed_by: null,
      created_at: now(),
    });
    persist();
  }

  async cancelOrder(id: string, note?: string | null): Promise<void> {
    const t = getTables();
    const o = t.orders.find((x) => x.id === id);
    if (!o) throw new Error("Order not found.");
    if (o.status === "cancelled") return; // idempotent — stock already restored once
    if (o.status === "delivered") throw new Error("A delivered order cannot be cancelled.");
    await this.setOrderStatus(id, "cancelled", note ?? "Order cancelled");
  }

  /** Adds each order line's quantity back to its variant's stock. */
  #restoreOrderStock(orderId: string) {
    const t = getTables();
    const items = t.order_items.filter((i) => i.order_id === orderId);
    for (const item of items) {
      if (!item.variant_id) continue;
      const v = t.variants.find((x) => x.id === item.variant_id);
      if (!v) continue;
      v.stock_quantity += item.quantity;
      v.updated_at = now();
    }
  }

  #resolveCustomerName(userId: string | null, shippingAddress: Record<string, unknown>): string {
    if (userId) {
      const account = getTables().customers.find((c) => c.id === userId);
      if (account) return account.full_name;
    }
    return typeof shippingAddress.fullName === "string" ? shippingAddress.fullName : "";
  }

  /* -------------------------------------------------------------- coupons */

  async listCoupons(): Promise<CouponRecord[]> {
    return [...getTables().coupons].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getCoupon(id: string): Promise<CouponRecord | null> {
    return getTables().coupons.find((c) => c.id === id) ?? null;
  }

  async getCouponByCode(code: string): Promise<CouponRecord | null> {
    const q = code.trim().toUpperCase();
    if (!q) return null;
    return getTables().coupons.find((c) => c.code.toUpperCase() === q) ?? null;
  }

  async createCoupon(input: CouponInput): Promise<string> {
    const t = getTables();
    const code = input.code.trim().toUpperCase();
    if (!code) throw new Error("Coupon code is required.");
    if (t.coupons.some((c) => c.code.toUpperCase() === code)) {
      throw new Error(`A coupon with the code "${code}" already exists.`);
    }
    validateCouponInput(input);

    const ts = now();
    const record: CouponRecord = {
      id: randomUUID(),
      code,
      description: input.description?.trim() || null,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      minimum_subtotal_cents: input.minimum_subtotal_cents ?? 0,
      max_redemptions: input.max_redemptions ?? null,
      per_user_limit: input.per_user_limit ?? 1,
      redeemed_count: 0,
      starts_at: input.starts_at ?? null,
      expires_at: input.expires_at ?? null,
      is_active: input.is_active ?? true,
      created_at: ts,
      updated_at: ts,
    };
    t.coupons.push(record);
    persist();
    return record.id;
  }

  async updateCoupon(id: string, patch: Partial<CouponInput>): Promise<void> {
    const t = getTables();
    const coupon = t.coupons.find((c) => c.id === id);
    if (!coupon) throw new Error("Coupon not found.");

    if (patch.code !== undefined) {
      const code = patch.code.trim().toUpperCase();
      if (!code) throw new Error("Coupon code is required.");
      if (t.coupons.some((c) => c.id !== id && c.code.toUpperCase() === code)) {
        throw new Error(`A coupon with the code "${code}" already exists.`);
      }
      coupon.code = code;
    }
    validateCouponInput({ ...coupon, ...patch } as CouponInput);

    if (patch.description !== undefined) coupon.description = patch.description?.trim() || null;
    if (patch.discount_type !== undefined) coupon.discount_type = patch.discount_type;
    if (patch.discount_value !== undefined) coupon.discount_value = patch.discount_value;
    if (patch.minimum_subtotal_cents !== undefined) coupon.minimum_subtotal_cents = patch.minimum_subtotal_cents;
    if (patch.max_redemptions !== undefined) coupon.max_redemptions = patch.max_redemptions;
    if (patch.per_user_limit !== undefined) coupon.per_user_limit = patch.per_user_limit;
    if (patch.starts_at !== undefined) coupon.starts_at = patch.starts_at;
    if (patch.expires_at !== undefined) coupon.expires_at = patch.expires_at;
    if (patch.is_active !== undefined) coupon.is_active = patch.is_active;
    coupon.updated_at = now();
    persist();
  }

  async deleteCoupon(id: string): Promise<void> {
    const t = getTables();
    t.coupons = t.coupons.filter((c) => c.id !== id);
    t.coupon_usage = t.coupon_usage.filter((u) => u.coupon_id !== id);
    persist();
  }

  async getCouponUsageCounts(
    couponId: string,
    customer: { userId?: string | null; email: string },
  ): Promise<CouponUsageCounts> {
    const usage = getTables().coupon_usage.filter((u) => u.coupon_id === couponId);
    const email = customer.email.trim().toLowerCase();
    const byCustomer = usage.filter((u) =>
      customer.userId ? u.user_id === customer.userId : u.user_id === null && u.email === email,
    ).length;
    return { total: usage.length, byCustomer };
  }

  /* --------------------------------------------------------- store settings */

  async saveSiteContent(content: SiteContent): Promise<void> {
    getTables().store_settings.site_content = content;
    persist();
  }

  async saveCommerceSettings(patch: Partial<CommerceSettings>): Promise<void> {
    const t = getTables();
    const current = mergeCommerceSettings(t.store_settings.commerce as Partial<CommerceSettings> | undefined);
    t.store_settings.commerce = { ...current, ...patch };
    persist();
  }

  /** Internal — order-calc needs the currently-effective settings, read fresh. */
  async #getCommerceSettingsInternal(): Promise<CommerceSettings> {
    return mergeCommerceSettings(getTables().store_settings.commerce as Partial<CommerceSettings> | undefined);
  }
}

function validateCouponInput(input: Pick<CouponInput, "discount_type" | "discount_value">): void {
  if (input.discount_type === "percentage" && (input.discount_value < 0 || input.discount_value > 100)) {
    throw new Error("A percentage discount must be between 0 and 100.");
  }
  if (input.discount_type !== "percentage" && input.discount_value < 0) {
    throw new Error("Discount value cannot be negative.");
  }
}
