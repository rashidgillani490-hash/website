/**
 * Pure product-list builder shared by both repository backends: given the raw
 * table rows it applies the admin search / filter / sort / pagination and
 * computes the derived columns shown in the products table.
 */

import { buildOrderListItem } from "./order-view";
import type {
  CategoryRecord,
  ImageRecord,
  OrderItemRecord,
  OrderListItem,
  OrderListResult,
  OrderQueryParams,
  OrderRecord,
  ProductListParams,
  ProductListItem,
  ProductListResult,
  ProductRecord,
  VariantRecord,
} from "./records";

const DEFAULT_PAGE_SIZE = 10;

export function buildProductList(
  data: {
    products: ProductRecord[];
    categories: Pick<CategoryRecord, "id" | "slug" | "name">[];
    variants: Pick<VariantRecord, "product_id" | "price_cents" | "stock_quantity">[];
    images: Pick<ImageRecord, "product_id" | "url" | "position" | "is_primary">[];
  },
  params: ProductListParams,
): ProductListResult {
  const catById = new Map(data.categories.map((c) => [c.id, c]));
  const variantsByProduct = new Map<string, typeof data.variants>();
  for (const v of data.variants) {
    const arr = variantsByProduct.get(v.product_id) ?? [];
    arr.push(v);
    variantsByProduct.set(v.product_id, arr);
  }

  let rows = [...data.products];

  if (params.search) {
    const q = params.search.toLowerCase();
    rows = rows.filter((p) =>
      [p.name, p.slug, p.base_sku ?? "", p.tagline ?? "", ...(p.families ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  if (params.category && params.category !== "all") {
    rows = rows.filter((p) => catById.get(p.category_id ?? "")?.slug === params.category);
  }
  if (params.family && params.family !== "all") {
    rows = rows.filter((p) => (p.families ?? []).includes(params.family!));
  }
  if (params.status && params.status !== "all") {
    rows = rows.filter((p) => p.status === params.status);
  }
  if (params.featured && params.featured !== "all") {
    rows = rows.filter((p) => p.is_featured === (params.featured === "yes"));
  }

  const priceOf = (id: string) => {
    const vs = variantsByProduct.get(id) ?? [];
    return vs.length ? Math.min(...vs.map((v) => v.price_cents)) : Number.POSITIVE_INFINITY;
  };
  const stockOf = (id: string) =>
    (variantsByProduct.get(id) ?? []).reduce((n, v) => n + v.stock_quantity, 0);

  switch (params.sort) {
    case "name":
      rows.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "price-asc":
      rows.sort((a, b) => priceOf(a.id) - priceOf(b.id));
      break;
    case "price-desc":
      rows.sort((a, b) => priceOf(b.id) - priceOf(a.id));
      break;
    case "stock":
      rows.sort((a, b) => stockOf(a.id) - stockOf(b.id));
      break;
    default:
      rows.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
  }

  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, params.page ?? 1), pageCount);
  const slice = rows.slice((page - 1) * pageSize, page * pageSize);

  const items: ProductListItem[] = slice.map((p) => {
    const vs = variantsByProduct.get(p.id) ?? [];
    const imgs = data.images.filter((i) => i.product_id === p.id);
    const primary =
      imgs.find((i) => i.is_primary) ?? [...imgs].sort((a, b) => a.position - b.position)[0];
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      status: p.status,
      is_featured: p.is_featured,
      is_new: p.is_new,
      category_id: p.category_id,
      category_name: catById.get(p.category_id ?? "")?.name ?? null,
      families: p.families ?? [],
      primary_image: primary?.url ?? null,
      min_price_cents: vs.length ? Math.min(...vs.map((v) => v.price_cents)) : null,
      total_stock: vs.reduce((n, v) => n + v.stock_quantity, 0),
      variant_count: vs.length,
      updated_at: p.updated_at,
    };
  });

  return { items, total, page, pageSize, pageCount };
}

/* ------------------------------------------------------------------ orders */

const DEFAULT_ORDER_PAGE_SIZE = 20;

/**
 * Search / filter / sort / paginate the admin order list. Shared by both
 * repository backends so the local store and Supabase behave identically.
 */
export function buildOrderList(
  data: {
    orders: OrderRecord[];
    items: OrderItemRecord[];
    personalisedItemIds: ReadonlySet<string>;
    customerNames: ReadonlyMap<string, string>; // order id → resolved name
  },
  params: OrderQueryParams,
): OrderListResult {
  let rows = [...data.orders];

  if (params.search) {
    const q = params.search.trim().toLowerCase();
    rows = rows.filter((o) =>
      [o.order_number, o.email, o.tracking_number ?? "", data.customerNames.get(o.id) ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  if (params.status && params.status !== "all") {
    rows = rows.filter((o) => o.status === params.status);
  }
  if (params.paymentMethod && params.paymentMethod !== "all") {
    rows = rows.filter((o) => o.payment_method === params.paymentMethod);
  }

  switch (params.sort) {
    case "oldest":
      rows.sort((a, b) => a.placed_at.localeCompare(b.placed_at));
      break;
    case "total-desc":
      rows.sort((a, b) => b.total_cents - a.total_cents);
      break;
    case "total-asc":
      rows.sort((a, b) => a.total_cents - b.total_cents);
      break;
    default:
      rows.sort((a, b) => b.placed_at.localeCompare(a.placed_at));
  }

  const pageSize = Math.max(1, params.pageSize ?? DEFAULT_ORDER_PAGE_SIZE);
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, params.page ?? 1), pageCount);
  const slice = rows.slice((page - 1) * pageSize, page * pageSize);

  const itemsByOrder = new Map<string, OrderItemRecord[]>();
  for (const i of data.items) {
    const arr = itemsByOrder.get(i.order_id) ?? [];
    arr.push(i);
    itemsByOrder.set(i.order_id, arr);
  }

  const items: OrderListItem[] = slice.map((o) =>
    buildOrderListItem(
      o,
      itemsByOrder.get(o.id) ?? [],
      data.personalisedItemIds,
      data.customerNames.get(o.id) ?? "",
    ),
  );

  return { items, total, page, pageSize, pageCount };
}
