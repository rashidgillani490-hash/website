import "server-only";

import { randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { saveStoreSetting } from "@/lib/supabase/mutations";
import { mergeCommerceSettings } from "@/lib/settings";
import { buildProductList } from "./list";
import { buildOrder, OutOfStockError } from "./order-calc";
import { buildOrderDetail, resolveOrderCustomerInfo } from "./order-view";
import type { CouponUsageCounts } from "@/lib/coupons";
import type { CommerceSettings } from "@/lib/commerce";
import type { SiteContent } from "@/lib/types";
import type { Json } from "@/lib/supabase/database.types";
import type { AdminRepo } from "./repo";
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
  OrderCustomizationRecord,
  OrderDetail,
  OrderItemRecord,
  OrderListItem,
  OrderListResult,
  OrderQueryParams,
  OrderRecord,
  OrderStatusHistoryRecord,
  OrderStatusValue,
  ProductDetail,
  ProductInput,
  ProductListParams,
  ProductListResult,
  ProductNoteEntry,
  ProductRecord,
  VariantInput,
  VariantRecord,
} from "./records";

function db() {
  const client = getSupabaseAdminClient();
  if (!client) throw new Error("Supabase admin client is not configured.");
  return client;
}

function check<T>(res: { data: T; error: { message: string } | null }, op: string): T {
  if (res.error) throw new Error(`${op}: ${res.error.message}`);
  return res.data;
}

export class SupabaseAdminRepo implements AdminRepo {
  readonly backend = "supabase" as const;

  /* ------------------------------------------------------------- products */

  async listProducts(params: ProductListParams): Promise<ProductListResult> {
    const client = db();
    const [products, categories, variants, images] = await Promise.all([
      client.from("products").select("*"),
      client.from("categories").select("id,slug,name"),
      client.from("product_variants").select("product_id,price_cents,stock_quantity"),
      client.from("product_images").select("product_id,url,position,is_primary"),
    ]);
    return buildProductList(
      {
        products: check(products, "listProducts") as ProductRecord[],
        categories: check(categories, "listProducts:categories") ?? [],
        variants: check(variants, "listProducts:variants") ?? [],
        images: check(images, "listProducts:images") ?? [],
      },
      params,
    );
  }

  async getProduct(id: string): Promise<ProductDetail | null> {
    return this.assemble("id", id);
  }

  async getProductBySlug(slug: string): Promise<ProductDetail | null> {
    return this.assemble("slug", slug);
  }

  private async assemble(
    by: "id" | "slug",
    value: string,
  ): Promise<ProductDetail | null> {
    const client = db();
    const productRes = await client.from("products").select("*").eq(by, value).maybeSingle();
    const product = check(productRes, "getProduct") as ProductRecord | null;
    if (!product) return null;

    const [variants, images, models, notes] = await Promise.all([
      client
        .from("product_variants")
        .select("*")
        .eq("product_id", product.id)
        .order("position"),
      client
        .from("product_images")
        .select("*")
        .eq("product_id", product.id)
        .order("position"),
      client.from("product_3d_models").select("*").eq("product_id", product.id),
      client.from("product_notes").select("*").eq("product_id", product.id),
    ]);

    return {
      product,
      variants: (check(variants, "getProduct:variants") ?? []) as VariantRecord[],
      images: (check(images, "getProduct:images") ?? []) as ImageRecord[],
      models: (check(models, "getProduct:models") ?? []) as ModelRecord[],
      notes: check(notes, "getProduct:notes") ?? [],
    };
  }

  async createProduct(input: ProductInput): Promise<string> {
    const row = {
      ...input,
      families: input.families ?? [],
      status: input.status ?? "draft",
      published_at: (input.status ?? "draft") === "active" ? new Date().toISOString() : null,
    };
    const res = await db().from("products").insert(row).select("id").single();
    return (check(res, "createProduct") as { id: string }).id;
  }

  async updateProduct(id: string, patch: Partial<ProductInput>): Promise<void> {
    const extra =
      patch.status === "active" ? { published_at: new Date().toISOString() } : {};
    const res = await db()
      .from("products")
      .update({ ...patch, ...extra })
      .eq("id", id);
    check(res, "updateProduct");
  }

  async deleteProduct(id: string): Promise<void> {
    // FKs cascade variants / notes / images / models.
    check(await db().from("products").delete().eq("id", id), "deleteProduct");
  }

  async setProductStatus(id: string, status: ProductInput["status"]): Promise<void> {
    await this.updateProduct(id, { status });
  }

  async setProductFeatured(id: string, featured: boolean): Promise<void> {
    check(
      await db().from("products").update({ is_featured: featured }).eq("id", id),
      "setProductFeatured",
    );
  }

  /* ------------------------------------------------------------- variants */

  async upsertVariant(productId: string, input: VariantInput): Promise<string> {
    const client = db();
    const base = {
      product_id: productId,
      sku: input.sku,
      volume_ml: input.volume_ml,
      price_cents: input.price_cents,
      compare_at_price_cents: input.compare_at_price_cents ?? null,
      stock_quantity: input.stock_quantity,
    };

    let variantId: string;
    if (input.id) {
      check(
        await client.from("product_variants").update(base).eq("id", input.id),
        "upsertVariant:update",
      );
      variantId = input.id;
    } else {
      const existing = check(
        await client.from("product_variants").select("id").eq("product_id", productId),
        "upsertVariant:count",
      ) as { id: string }[];
      const res = await client
        .from("product_variants")
        .insert({ ...base, is_default: existing.length === 0, position: existing.length })
        .select("id")
        .single();
      variantId = (check(res, "upsertVariant:insert") as { id: string }).id;
    }

    if (input.is_default) {
      check(
        await client
          .from("product_variants")
          .update({ is_default: false })
          .eq("product_id", productId)
          .neq("id", variantId),
        "upsertVariant:clearDefault",
      );
      check(
        await client.from("product_variants").update({ is_default: true }).eq("id", variantId),
        "upsertVariant:setDefault",
      );
    }
    return variantId;
  }

  async deleteVariant(productId: string, variantId: string): Promise<void> {
    const client = db();
    const target = check(
      await client
        .from("product_variants")
        .select("is_default")
        .eq("id", variantId)
        .maybeSingle(),
      "deleteVariant:lookup",
    ) as { is_default: boolean } | null;

    check(await client.from("product_variants").delete().eq("id", variantId), "deleteVariant");

    if (target?.is_default) {
      const next = check(
        await client
          .from("product_variants")
          .select("id")
          .eq("product_id", productId)
          .order("position")
          .limit(1),
        "deleteVariant:next",
      ) as { id: string }[];
      if (next[0]) {
        check(
          await client.from("product_variants").update({ is_default: true }).eq("id", next[0].id),
          "deleteVariant:promote",
        );
      }
    }
  }

  /* ----------------------------------------------------------- categories */

  async listCategories(): Promise<CategoryRecord[]> {
    return (check(
      await db().from("categories").select("*").order("position"),
      "listCategories",
    ) ?? []) as CategoryRecord[];
  }

  async createCategory(input: CategoryInput): Promise<string> {
    const res = await db().from("categories").insert(input).select("id").single();
    return (check(res, "createCategory") as { id: string }).id;
  }

  async updateCategory(id: string, patch: Partial<CategoryInput>): Promise<void> {
    check(await db().from("categories").update(patch).eq("id", id), "updateCategory");
  }

  async deleteCategory(id: string): Promise<void> {
    const used = check(
      await db().from("products").select("id").eq("category_id", id).limit(1),
      "deleteCategory:check",
    ) as { id: string }[];
    if (used.length) {
      throw new Error("Cannot delete a category that still has products assigned.");
    }
    check(await db().from("categories").delete().eq("id", id), "deleteCategory");
  }

  /* --------------------------------------------------------------- notes */

  async listNotes(): Promise<NoteRecord[]> {
    return (check(
      await db().from("fragrance_notes").select("*").order("family").order("name"),
      "listNotes",
    ) ?? []) as NoteRecord[];
  }

  async createNote(input: NoteInput): Promise<string> {
    const res = await db().from("fragrance_notes").insert(input).select("id").single();
    return (check(res, "createNote") as { id: string }).id;
  }

  async updateNote(id: string, patch: Partial<NoteInput>): Promise<void> {
    check(await db().from("fragrance_notes").update(patch).eq("id", id), "updateNote");
  }

  async deleteNote(id: string): Promise<void> {
    check(await db().from("fragrance_notes").delete().eq("id", id), "deleteNote");
  }

  async setProductNotes(productId: string, entries: ProductNoteEntry[]): Promise<void> {
    const client = db();
    check(
      await client.from("product_notes").delete().eq("product_id", productId),
      "setProductNotes:clear",
    );
    if (entries.length) {
      check(
        await client
          .from("product_notes")
          .insert(entries.map((e) => ({ ...e, product_id: productId }))),
        "setProductNotes:insert",
      );
    }
  }

  /* --------------------------------------------------------------- media */

  async addImage(
    productId: string,
    input: { url: string; alt?: string | null; storage_path?: string | null },
  ): Promise<string> {
    const client = db();
    const existing = check(
      await client.from("product_images").select("id").eq("product_id", productId),
      "addImage:count",
    ) as { id: string }[];
    const res = await client
      .from("product_images")
      .insert({
        product_id: productId,
        url: input.url,
        alt: input.alt ?? null,
        position: existing.length,
        is_primary: existing.length === 0,
      })
      .select("id")
      .single();
    return (check(res, "addImage") as { id: string }).id;
  }

  async deleteImage(productId: string, imageId: string): Promise<void> {
    const client = db();
    const target = check(
      await client
        .from("product_images")
        .select("is_primary")
        .eq("id", imageId)
        .maybeSingle(),
      "deleteImage:lookup",
    ) as { is_primary: boolean } | null;
    check(await client.from("product_images").delete().eq("id", imageId), "deleteImage");
    if (target?.is_primary) {
      const next = check(
        await client
          .from("product_images")
          .select("id")
          .eq("product_id", productId)
          .order("position")
          .limit(1),
        "deleteImage:next",
      ) as { id: string }[];
      if (next[0]) {
        check(
          await client.from("product_images").update({ is_primary: true }).eq("id", next[0].id),
          "deleteImage:promote",
        );
      }
    }
  }

  async setPrimaryImage(productId: string, imageId: string): Promise<void> {
    const client = db();
    check(
      await client
        .from("product_images")
        .update({ is_primary: false })
        .eq("product_id", productId)
        .neq("id", imageId),
      "setPrimaryImage:clear",
    );
    check(
      await client.from("product_images").update({ is_primary: true }).eq("id", imageId),
      "setPrimaryImage:set",
    );
  }

  async moveImage(
    productId: string,
    imageId: string,
    direction: "up" | "down",
  ): Promise<void> {
    const client = db();
    const list = (check(
      await client
        .from("product_images")
        .select("id,position")
        .eq("product_id", productId)
        .order("position"),
      "moveImage:list",
    ) ?? []) as { id: string; position: number }[];
    const idx = list.findIndex((i) => i.id === imageId);
    if (idx === -1) return;
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= list.length) return;
    await Promise.all([
      client.from("product_images").update({ position: list[swap].position }).eq("id", list[idx].id),
      client.from("product_images").update({ position: list[idx].position }).eq("id", list[swap].id),
    ]);
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
    const client = db();
    check(
      await client
        .from("product_3d_models")
        .update({ is_active: false })
        .eq("product_id", productId),
      "addModel:clear",
    );
    const res = await client
      .from("product_3d_models")
      .insert({
        product_id: productId,
        model_url: input.model_url,
        format: input.format,
        poster_url: input.poster_url ?? null,
        is_active: true,
      })
      .select("id")
      .single();
    return (check(res, "addModel") as { id: string }).id;
  }

  async deleteModel(productId: string, modelId: string): Promise<void> {
    const client = db();
    const target = check(
      await client
        .from("product_3d_models")
        .select("is_active")
        .eq("id", modelId)
        .maybeSingle(),
      "deleteModel:lookup",
    ) as { is_active: boolean } | null;
    check(await client.from("product_3d_models").delete().eq("id", modelId), "deleteModel");
    if (target?.is_active) {
      const next = check(
        await client
          .from("product_3d_models")
          .select("id")
          .eq("product_id", productId)
          .limit(1),
        "deleteModel:next",
      ) as { id: string }[];
      if (next[0]) {
        check(
          await client
            .from("product_3d_models")
            .update({ is_active: true })
            .eq("id", next[0].id),
          "deleteModel:promote",
        );
      }
    }
  }

  async setActiveModel(productId: string, modelId: string): Promise<void> {
    const client = db();
    check(
      await client
        .from("product_3d_models")
        .update({ is_active: false })
        .eq("product_id", productId)
        .neq("id", modelId),
      "setActiveModel:clear",
    );
    check(
      await client.from("product_3d_models").update({ is_active: true }).eq("id", modelId),
      "setActiveModel:set",
    );
  }

  async listAllMedia(): Promise<{ images: ImageRecord[]; models: ModelRecord[] }> {
    const client = db();
    const [images, models] = await Promise.all([
      client.from("product_images").select("*").order("created_at", { ascending: false }),
      client.from("product_3d_models").select("*").order("created_at", { ascending: false }),
    ]);
    return {
      images: (check(images, "listAllMedia:images") ?? []) as ImageRecord[],
      models: (check(models, "listAllMedia:models") ?? []) as ModelRecord[],
    };
  }

  /* --------------------------------------------------------------- orders */

  async createOrder(input: CreateOrderInput): Promise<OrderConfirmation> {
    const client = db();
    const productIds = [...new Set(input.lines.map((l) => l.productId))];
    const couponEmail = String(input.customer?.email ?? "").trim().toLowerCase();

    // Resolve the coupon (if any) from the live coupons table, and count its
    // redemptions fresh — read right before `buildOrder` decides.
    let coupon: { record: CouponRecord; usage: CouponUsageCounts } | null = null;
    if (input.couponCode) {
      const record = await this.getCouponByCode(input.couponCode);
      if (record) {
        coupon = {
          record,
          usage: await this.getCouponUsageCounts(record.id, {
            userId: input.customerId ?? null,
            email: couponEmail,
          }),
        };
      }
    }

    const [prodRes, varRes] = await Promise.all([
      client.from("products").select("id,name,customization").in("id", productIds),
      client
        .from("product_variants")
        .select("id,product_id,sku,volume_ml,price_cents,stock_quantity")
        .in("product_id", productIds),
    ]);
    const products = check(prodRes, "createOrder:products") ?? [];
    const variants = check(varRes, "createOrder:variants") ?? [];

    const built = buildOrder(input, {
      products: products as ProductRecord[],
      variants: variants as VariantRecord[],
      coupon,
      commerceSettings: await this.getCommerceSettingsInternal(),
      orderNumber: "", // let the DB trigger assign
      now: new Date().toISOString(),
      newId: () => randomUUID(),
    });

    // 9 · Reserve stock atomically, line by line. If any line can't be
    // satisfied, hand back what we took and abort — no order is created.
    const reserved: { variantId: string; qty: number }[] = [];
    for (const d of built.stockDecrements) {
      const { data: okReserve, error } = await client.rpc("try_decrement_variant_stock", {
        p_variant_id: d.variantId,
        p_qty: d.qty,
      });
      if (error || okReserve !== true) {
        for (const r of reserved) {
          await client.rpc("restore_variant_stock", {
            p_variant_id: r.variantId,
            p_qty: r.qty,
          });
        }
        throw new OutOfStockError([d.name]);
      }
      reserved.push({ variantId: d.variantId, qty: d.qty });
    }

    const { order, items, customizations } = built;
    try {
      const insertedOrder = check(
        await client
          .from("orders")
          .insert({
            id: order.id,
            user_id: order.user_id,
            email: order.email,
            status: order.status,
            payment_method: order.payment_method,
            payment_status: order.payment_status,
            currency: order.currency,
            subtotal_cents: order.subtotal_cents,
            discount_cents: order.discount_cents,
            discount_code: order.discount_code,
            shipping_cents: order.shipping_cents,
            tax_cents: order.tax_cents,
            total_cents: order.total_cents,
            shipping_address: order.shipping_address,
            shipping_method: order.shipping_method,
            customer_note: order.customer_note,
            placed_at: order.placed_at,
          })
          .select("order_number")
          .single(),
        "createOrder:order",
      ) as { order_number: string };

      check(await client.from("order_items").insert(items), "createOrder:items");
      if (customizations.length) {
        check(
          await client.from("customizations").insert(
            customizations.map((c) => ({
              order_item_id: c.order_item_id,
              kind: c.kind,
              payload: c.payload,
              price_delta_cents: c.price_delta_cents,
            })),
          ),
          "createOrder:customizations",
        );
      }

      if (built.appliedCouponId) {
        // A trigger on this table keeps `coupons.redeemed_count` in sync — see
        // `sync_coupon_redeemed_count` (migration …120300).
        check(
          await client.from("coupon_usage").insert({
            coupon_id: built.appliedCouponId,
            user_id: order.user_id,
            email: order.email,
            order_id: order.id,
            amount_cents: order.discount_cents,
          } as never),
          "createOrder:coupon_usage",
        );
      }

      return {
        ...built.confirmation,
        orderNumber: insertedOrder.order_number,
      };
    } catch (err) {
      // Roll back: restore stock and remove any partial order rows.
      for (const r of reserved) {
        await client.rpc("restore_variant_stock", {
          p_variant_id: r.variantId,
          p_qty: r.qty,
        });
      }
      await client.from("orders").delete().eq("id", order.id);
      throw err;
    }
  }

  async listOrders(params: OrderQueryParams = {}): Promise<OrderListResult> {
    const client = db();
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.max(1, params.pageSize ?? 20);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client
      .from("orders")
      .select(
        "id,order_number,user_id,email,status,payment_method,payment_status,tracking_number,total_cents,placed_at,shipping_address",
        { count: "exact" },
      );

    const search = params.search?.trim();
    if (search) {
      // Escape PostgREST's pattern-filter separators so a literal "%"/"," in
      // the query can't widen the match or break out of the `.or()` clause.
      const q = search.replace(/[%,()]/g, (c) => `\\${c}`);
      query = query.or(
        `order_number.ilike.%${q}%,email.ilike.%${q}%,tracking_number.ilike.%${q}%`,
      );
    }
    if (params.status && params.status !== "all") query = query.eq("status", params.status);
    if (params.paymentMethod && params.paymentMethod !== "all") {
      query = query.eq("payment_method", params.paymentMethod);
    }

    switch (params.sort) {
      case "oldest":
        query = query.order("placed_at", { ascending: true });
        break;
      case "total-desc":
        query = query.order("total_cents", { ascending: false });
        break;
      case "total-asc":
        query = query.order("total_cents", { ascending: true });
        break;
      default:
        query = query.order("placed_at", { ascending: false });
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw new Error(`listOrders: ${error.message}`);
    const orders = (data ?? []) as (Pick<
      OrderRecord,
      | "id"
      | "order_number"
      | "user_id"
      | "email"
      | "status"
      | "payment_method"
      | "payment_status"
      | "tracking_number"
      | "total_cents"
      | "placed_at"
    > & { shipping_address: Record<string, unknown> })[];

    const total = count ?? orders.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    if (orders.length === 0) return { items: [], total, page, pageSize, pageCount };

    const ids = orders.map((o) => o.id);
    const items = (check(
      await client.from("order_items").select("id,order_id,quantity").in("order_id", ids),
      "listOrders:items",
    ) ?? []) as { id: string; order_id: string; quantity: number }[];
    const itemIds = items.map((i) => i.id);
    const custs = itemIds.length
      ? ((check(
          await client
            .from("customizations")
            .select("order_item_id")
            .in("order_item_id", itemIds),
          "listOrders:customizations",
        ) ?? []) as { order_item_id: string }[])
      : [];
    const personalisedIds = new Set(custs.map((c) => c.order_item_id));

    const userIds = [...new Set(orders.map((o) => o.user_id).filter((x): x is string => !!x))];
    const profiles = userIds.length
      ? ((check(
          await client.from("profiles").select("id,full_name").in("id", userIds),
          "listOrders:profiles",
        ) ?? []) as { id: string; full_name: string | null }[])
      : [];
    const nameByUser = new Map(profiles.map((p) => [p.id, p.full_name ?? ""]));

    const itemsByOrder = new Map<string, typeof items>();
    for (const i of items) {
      const arr = itemsByOrder.get(i.order_id) ?? [];
      arr.push(i);
      itemsByOrder.set(i.order_id, arr);
    }

    const resultItems: OrderListItem[] = orders.map((o) => {
      const oi = itemsByOrder.get(o.id) ?? [];
      const addrName =
        typeof o.shipping_address?.fullName === "string" ? o.shipping_address.fullName : "";
      return {
        id: o.id,
        order_number: o.order_number,
        user_id: o.user_id,
        email: o.email,
        customer_name: (o.user_id && nameByUser.get(o.user_id)) || addrName,
        status: o.status,
        payment_method: o.payment_method,
        payment_status: o.payment_status,
        tracking_number: o.tracking_number,
        total_cents: o.total_cents,
        item_count: oi.reduce((n, i) => n + i.quantity, 0),
        personalised_count: oi.filter((i) => personalisedIds.has(i.id)).length,
        placed_at: o.placed_at,
      };
    });

    return { items: resultItems, total, page, pageSize, pageCount };
  }

  async getOrder(id: string): Promise<OrderDetail | null> {
    const client = db();
    const order = check(
      await client.from("orders").select("*").eq("id", id).maybeSingle(),
      "getOrder",
    ) as OrderRecord | null;
    if (!order) return null;

    const items = (check(
      await client.from("order_items").select("*").eq("order_id", id).order("created_at"),
      "getOrder:items",
    ) ?? []) as OrderItemRecord[];
    const custs = items.length
      ? ((check(
          await client
            .from("customizations")
            .select("*")
            .in(
              "order_item_id",
              items.map((i) => i.id),
            ),
          "getOrder:customizations",
        ) ?? []) as OrderCustomizationRecord[])
      : [];
    const history = (check(
      await client
        .from("order_status_history")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: true }),
      "getOrder:history",
    ) ?? []) as OrderStatusHistoryRecord[];

    let account: { full_name: string; email: string; phone: string | null } | null = null;
    if (order.user_id) {
      const profile = check(
        await client
          .from("profiles")
          .select("full_name,email,phone")
          .eq("id", order.user_id)
          .maybeSingle(),
        "getOrder:profile",
      ) as { full_name: string | null; email: string | null; phone: string | null } | null;
      if (profile) {
        account = {
          full_name: profile.full_name ?? "",
          email: profile.email ?? order.email,
          phone: profile.phone,
        };
      }
    }

    return buildOrderDetail(order, items, custs, history, resolveOrderCustomerInfo(order, account));
  }

  async setOrderStatus(
    id: string,
    status: OrderStatusValue,
    note?: string | null,
  ): Promise<void> {
    const { error } = await db().rpc("admin_set_order_status", {
      p_order_id: id,
      p_status: status,
      p_note: note ?? null,
    });
    if (error) throw new Error(`setOrderStatus: ${error.message}`);
  }

  async updateOrderTracking(
    id: string,
    input: { trackingNumber: string; trackingCarrier?: string | null; note?: string | null },
  ): Promise<void> {
    const trackingNumber = input.trackingNumber.trim();
    if (!trackingNumber) throw new Error("Tracking number is required.");
    const { error } = await db().rpc("admin_add_order_tracking", {
      p_order_id: id,
      p_tracking_number: trackingNumber,
      p_tracking_carrier: input.trackingCarrier?.trim() || null,
      p_note: input.note ?? null,
    });
    if (error) throw new Error(`updateOrderTracking: ${error.message}`);
  }

  async cancelOrder(id: string, note?: string | null): Promise<void> {
    const { error } = await db().rpc("admin_cancel_order", {
      p_order_id: id,
      p_note: note ?? null,
    });
    if (error) throw new Error(`cancelOrder: ${error.message}`);
  }

  /* -------------------------------------------------------------- coupons */

  async listCoupons(): Promise<CouponRecord[]> {
    return (
      (check(
        await db().from("coupons").select("*").order("created_at", { ascending: false }),
        "listCoupons",
      ) as unknown as CouponRecord[]) ?? []
    );
  }

  async getCoupon(id: string): Promise<CouponRecord | null> {
    return check(
      await db().from("coupons").select("*").eq("id", id).maybeSingle(),
      "getCoupon",
    ) as unknown as CouponRecord | null;
  }

  async getCouponByCode(code: string): Promise<CouponRecord | null> {
    const q = code.trim();
    if (!q) return null;
    return check(
      await db().from("coupons").select("*").ilike("code", q).maybeSingle(),
      "getCouponByCode",
    ) as unknown as CouponRecord | null;
  }

  async createCoupon(input: CouponInput): Promise<string> {
    validateCouponInput(input);
    const code = input.code.trim().toUpperCase();
    if (!code) throw new Error("Coupon code is required.");
    const row = check(
      await db()
        .from("coupons")
        .insert({
          code,
          description: input.description?.trim() || null,
          discount_type: input.discount_type,
          discount_value: input.discount_value,
          minimum_subtotal_cents: input.minimum_subtotal_cents ?? 0,
          max_redemptions: input.max_redemptions ?? null,
          per_user_limit: input.per_user_limit ?? 1,
          starts_at: input.starts_at ?? null,
          expires_at: input.expires_at ?? null,
          is_active: input.is_active ?? true,
        } as never)
        .select("id")
        .single(),
      "createCoupon",
    ) as { id: string };
    return row.id;
  }

  async updateCoupon(id: string, patch: Partial<CouponInput>): Promise<void> {
    const existing = await this.getCoupon(id);
    if (!existing) throw new Error("Coupon not found.");
    validateCouponInput({ ...existing, ...patch } as CouponInput);

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.code !== undefined) {
      const code = patch.code.trim().toUpperCase();
      if (!code) throw new Error("Coupon code is required.");
      update.code = code;
    }
    if (patch.description !== undefined) update.description = patch.description?.trim() || null;
    if (patch.discount_type !== undefined) update.discount_type = patch.discount_type;
    if (patch.discount_value !== undefined) update.discount_value = patch.discount_value;
    if (patch.minimum_subtotal_cents !== undefined) update.minimum_subtotal_cents = patch.minimum_subtotal_cents;
    if (patch.max_redemptions !== undefined) update.max_redemptions = patch.max_redemptions;
    if (patch.per_user_limit !== undefined) update.per_user_limit = patch.per_user_limit;
    if (patch.starts_at !== undefined) update.starts_at = patch.starts_at;
    if (patch.expires_at !== undefined) update.expires_at = patch.expires_at;
    if (patch.is_active !== undefined) update.is_active = patch.is_active;

    check(
      await db().from("coupons").update(update as never).eq("id", id),
      "updateCoupon",
    );
  }

  async deleteCoupon(id: string): Promise<void> {
    check(await db().from("coupons").delete().eq("id", id), "deleteCoupon");
  }

  async getCouponUsageCounts(
    couponId: string,
    customer: { userId?: string | null; email: string },
  ): Promise<CouponUsageCounts> {
    const client = db();
    const email = customer.email.trim().toLowerCase();

    const [totalRes, customerRes] = await Promise.all([
      client
        .from("coupon_usage")
        .select("id", { count: "exact", head: true })
        .eq("coupon_id", couponId),
      customer.userId
        ? client
            .from("coupon_usage")
            .select("id", { count: "exact", head: true })
            .eq("coupon_id", couponId)
            .eq("user_id", customer.userId)
        : client
            .from("coupon_usage")
            .select("id", { count: "exact", head: true })
            .eq("coupon_id", couponId)
            .is("user_id", null)
            .ilike("email", email),
    ]);
    if (totalRes.error) throw new Error(`getCouponUsageCounts: ${totalRes.error.message}`);
    if (customerRes.error) throw new Error(`getCouponUsageCounts: ${customerRes.error.message}`);

    return { total: totalRes.count ?? 0, byCustomer: customerRes.count ?? 0 };
  }

  /* --------------------------------------------------------- store settings */

  async saveSiteContent(content: SiteContent): Promise<void> {
    const res = await saveStoreSetting("site_content", content as unknown as Json);
    if (!res.ok) throw new Error(res.message);
  }

  async saveCommerceSettings(patch: Partial<CommerceSettings>): Promise<void> {
    const current = await this.getCommerceSettingsInternal();
    const next = { ...current, ...patch };
    const res = await saveStoreSetting("commerce", next as unknown as Json);
    if (!res.ok) throw new Error(res.message);
  }

  /** Internal — order-calc needs the currently-effective settings, read fresh. */
  private async getCommerceSettingsInternal(): Promise<CommerceSettings> {
    const row = check(
      await db().from("store_settings").select("*").eq("key", "commerce").maybeSingle(),
      "getCommerceSettingsInternal",
    );
    return mergeCommerceSettings((row?.value as Partial<CommerceSettings>) ?? null);
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
