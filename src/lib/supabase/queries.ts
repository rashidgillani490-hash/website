import "server-only";

import { getSupabaseServerClient } from "./server";
import { mapCatalogProduct, mapCategory, mapCommerceSettings, mapSiteContent } from "./mappers";
import type { Collection, Product, SiteContent } from "@/lib/types";
import type { CommerceSettings } from "@/lib/commerce";
import type { ProductCatalogRow } from "./database.types";

/** Raised when a query runs but Supabase returns an error. */
export class SupabaseQueryError extends Error {
  constructor(
    public readonly operation: string,
    public readonly cause: unknown,
  ) {
    super(`Supabase query "${operation}" failed`);
    this.name = "SupabaseQueryError";
  }
}

const CATALOG_COLUMNS = "*";

async function client() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    throw new SupabaseQueryError("init", "Supabase client is not configured");
  }
  return supabase;
}

/* ------------------------------------------------------------------ Products */

export async function fetchProducts(): Promise<Product[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("product_catalog")
    .select(CATALOG_COLUMNS)
    .eq("status", "active");

  if (error) throw new SupabaseQueryError("fetchProducts", error);
  return (data as ProductCatalogRow[]).map(mapCatalogProduct);
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("product_catalog")
    .select(CATALOG_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new SupabaseQueryError("fetchProductBySlug", error);
  return data ? mapCatalogProduct(data as ProductCatalogRow) : null;
}

export async function fetchProductSlugs(): Promise<string[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("status", "active");

  if (error) throw new SupabaseQueryError("fetchProductSlugs", error);
  return (data ?? []).map((r) => r.slug);
}

/* --------------------------------------------------------------- Collections */

export async function fetchCollections(): Promise<Collection[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("position", { ascending: true });

  if (error) throw new SupabaseQueryError("fetchCollections", error);
  return (data ?? []).map(mapCategory);
}

export async function fetchCollectionBySlug(
  slug: string,
): Promise<Collection | null> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new SupabaseQueryError("fetchCollectionBySlug", error);
  return data ? mapCategory(data) : null;
}

/* -------------------------------------------------------------- Site content */

export async function fetchSiteContent(): Promise<SiteContent> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("key", "site_content")
    .maybeSingle();

  if (error) throw new SupabaseQueryError("fetchSiteContent", error);
  return mapSiteContent(data);
}

export async function fetchCommerceSettings(): Promise<CommerceSettings> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("key", "commerce")
    .maybeSingle();

  if (error) throw new SupabaseQueryError("fetchCommerceSettings", error);
  return mapCommerceSettings(data);
}

/* ----------------------------------------------------------- Health / test */

export interface DbHealth {
  ok: boolean;
  productCount: number;
  categoryCount: number;
  latencyMs: number;
  error?: string;
}

export async function checkDatabaseHealth(): Promise<DbHealth> {
  const started = Date.now();
  try {
    const supabase = await client();
    const [products, categories] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("categories").select("id", { count: "exact", head: true }),
    ]);
    if (products.error) throw products.error;
    if (categories.error) throw categories.error;
    return {
      ok: true,
      productCount: products.count ?? 0,
      categoryCount: categories.count ?? 0,
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    return {
      ok: false,
      productCount: 0,
      categoryCount: 0,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
