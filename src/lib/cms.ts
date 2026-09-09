/**
 * Content access layer.
 *
 * Every page and component reads content through THIS module and never imports
 * from `src/lib/data/*` or `src/lib/supabase/*` directly.
 *
 * Resolution order for each call:
 *   1. If Supabase is configured, query it (RLS-protected, admin-editable).
 *   2. Otherwise (or on a Supabase error), read the local admin store — a
 *      JSON-file catalogue seeded from `src/lib/data/*` and mutated by the
 *      Admin Dashboard. This keeps admin edits visible on the storefront even
 *      without Supabase.
 *
 * The bundled `src/lib/data/*` content is only the initial seed, never the
 * production data path.
 */

import { cache } from "react";

import { testimonials as demoTestimonials } from "@/lib/data/testimonials";
import { olfactiveFamilies as demoFamilies } from "@/lib/data/notes";
import type {
  Collection,
  OlfactiveFamily,
  Product,
  SiteContent,
  Testimonial,
} from "@/lib/types";
import type { CommerceSettings } from "@/lib/commerce";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  fetchCollectionBySlug,
  fetchCollections,
  fetchCommerceSettings,
  fetchProductBySlug,
  fetchProductSlugs,
  fetchProducts,
  fetchSiteContent,
} from "@/lib/supabase/queries";
import {
  localActiveProducts,
  localActiveSlugs,
  localCollectionBySlug,
  localCollections,
  localCommerceSettings,
  localProductBySlug,
  localSiteContent,
} from "@/lib/admin/to-domain";
import { applyProductQuery, type ProductQuery } from "@/lib/catalog-query";

export type { ProductQuery } from "@/lib/catalog-query";

export type ContentSource = "supabase" | "local";

/** Which backend the resolvers use. */
export const CONTENT_SOURCE: ContentSource = isSupabaseConfigured ? "supabase" : "local";

let warned = false;
function fallbackWarn(scope: string, err: unknown) {
  if (process.env.NODE_ENV === "production" || !warned) {
    warned = true;
    console.warn(
      `[cms] "${scope}" fell back to the local store: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

/**
 * Run a Supabase-backed loader with an automatic local-store fallback.
 */
async function withFallback<T>(
  scope: string,
  supabaseLoader: () => Promise<T>,
  local: () => T,
): Promise<T> {
  if (!isSupabaseConfigured) return local();
  try {
    return await supabaseLoader();
  } catch (err) {
    fallbackWarn(scope, err);
    return local();
  }
}

/* ------------------------------------------------------------------ Products */

const loadAllProducts = cache(async (): Promise<Product[]> => {
  return withFallback(
    "getProducts",
    async () => {
      const rows = await fetchProducts();
      // A successful but empty Supabase response (unseeded project, or RLS
      // hiding every row) would otherwise bypass the local-store fallback,
      // since `withFallback` only reacts to thrown errors.
      return rows.length > 0 ? rows : localActiveProducts();
    },
    () => localActiveProducts(),
  );
});

export async function getProducts(query: ProductQuery = {}): Promise<Product[]> {
  const [all, collections] = await Promise.all([loadAllProducts(), getCollections()]);
  return applyProductQuery(all, query, collections);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return withFallback(
    "getProductBySlug",
    () => fetchProductBySlug(slug),
    () => localProductBySlug(slug),
  );
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  const list = await getProducts({ featuredOnly: true });
  return list.slice(0, limit);
}

export async function getRelatedProducts(
  product: Product,
  limit = 3,
): Promise<Product[]> {
  const all = await loadAllProducts();
  return all
    .filter((p) => p.id !== product.id)
    .map((p) => ({
      p,
      score:
        (p.collectionSlug === product.collectionSlug ? 2 : 0) +
        p.families.filter((f) => product.families.includes(f)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

export async function getAllProductSlugs(): Promise<string[]> {
  return withFallback(
    "getAllProductSlugs",
    fetchProductSlugs,
    () => localActiveSlugs(),
  );
}

/* --------------------------------------------------------------- Collections */

export const getCollections = cache(async (): Promise<Collection[]> => {
  return withFallback("getCollections", fetchCollections, () => localCollections());
});

export async function getCollectionBySlug(
  slug: string,
): Promise<Collection | null> {
  return withFallback(
    "getCollectionBySlug",
    () => fetchCollectionBySlug(slug),
    () => localCollectionBySlug(slug),
  );
}

/* --------------------------------------------------- Notes, families, quotes */
/* Editorial content not covered by the Phase 2 table set — served from the
   bundled data. (Families are derivable from `fragrance_notes`; testimonials
   would live in `store_settings` — both are candidates for a later phase.) */

export async function getOlfactiveFamilies(): Promise<OlfactiveFamily[]> {
  return demoFamilies;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  return demoTestimonials;
}

/* ---------------------------------------------------------- Site content */

export const getSiteContent = cache(async (): Promise<SiteContent> => {
  return withFallback("getSiteContent", fetchSiteContent, () => localSiteContent());
});

/** Admin-controlled shipping fee, free-shipping threshold and COD availability. */
export const getCommerceSettings = cache(async (): Promise<CommerceSettings> => {
  return withFallback("getCommerceSettings", fetchCommerceSettings, () => localCommerceSettings());
});
