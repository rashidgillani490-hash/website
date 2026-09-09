/**
 * Pure, dependency-free catalog filtering & sorting.
 *
 * Shared by the CMS layer (`src/lib/cms.ts`) so the same query semantics apply
 * whether products came from Supabase or the demo fallback. Kept import-free so
 * it can be unit-tested from a plain Node script.
 */

import type { Collection, Product } from "@/lib/types";

export interface ProductQuery {
  /** Category / collection slug. */
  collection?: string;
  family?: string;
  gender?: Product["gender"];
  /** Matches product name, tagline, description, family, category name and every note. */
  search?: string;
  sort?: "featured" | "price-asc" | "price-desc" | "newest" | "rating";
  featuredOnly?: boolean;
  /** Whole-PKR bounds against the product's starting price, inclusive. */
  priceMin?: number;
  priceMax?: number;
  /** Bottle sizes (ml) — a product matches if it offers at least one of these. */
  sizes?: number[];
  /** Only products with at least one size currently in stock (untracked stock counts as available). */
  inStockOnly?: boolean;
}

export function minVariantPrice(p: Product): number {
  return Math.min(...p.sizes.map((s) => s.price));
}

export function isProductInStock(p: Product): boolean {
  return p.sizes.some((s) => s.stock === null || s.stock > 0);
}

/** Every note name across the top/heart/base pyramid, for search. */
function allNoteNames(p: Product): string[] {
  return [...p.notes.top, ...p.notes.heart, ...p.notes.base].map((n) => n.name);
}

export function applyProductQuery(
  list: readonly Product[],
  query: ProductQuery = {},
  collections: readonly Pick<Collection, "slug" | "name">[] = [],
): Product[] {
  let out = [...list];

  if (query.collection) {
    out = out.filter((p) => p.collectionSlug === query.collection);
  }
  if (query.family) {
    out = out.filter((p) => p.families.includes(query.family!));
  }
  if (query.gender) {
    out = out.filter((p) => p.gender === query.gender);
  }
  if (query.featuredOnly) {
    out = out.filter((p) => p.featured);
  }
  if (query.priceMin !== undefined) {
    out = out.filter((p) => minVariantPrice(p) >= query.priceMin!);
  }
  if (query.priceMax !== undefined) {
    out = out.filter((p) => minVariantPrice(p) <= query.priceMax!);
  }
  if (query.sizes && query.sizes.length > 0) {
    const wanted = new Set(query.sizes);
    out = out.filter((p) => p.sizes.some((s) => wanted.has(s.ml)));
  }
  if (query.inStockOnly) {
    out = out.filter(isProductInStock);
  }
  if (query.search) {
    const q = query.search.toLowerCase().trim();
    const collectionNameBySlug = new Map(collections.map((c) => [c.slug, c.name]));
    out = out.filter((p) =>
      [
        p.name,
        p.tagline,
        p.description,
        p.perfumer,
        ...p.families,
        collectionNameBySlug.get(p.collectionSlug) ?? "",
        ...allNoteNames(p),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }

  switch (query.sort) {
    case "price-asc":
      out.sort((a, b) => minVariantPrice(a) - minVariantPrice(b));
      break;
    case "price-desc":
      out.sort((a, b) => minVariantPrice(b) - minVariantPrice(a));
      break;
    case "newest":
      out.sort((a, b) => b.releaseYear - a.releaseYear);
      break;
    case "rating":
      out.sort((a, b) => b.rating - a.rating);
      break;
    default:
      out.sort(
        (a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating,
      );
  }

  return out;
}

/** Every bottle size (ml) offered anywhere in the catalog, ascending — for the size filter. */
export function catalogSizes(list: readonly Product[]): number[] {
  return [...new Set(list.flatMap((p) => p.sizes.map((s) => s.ml)))].sort((a, b) => a - b);
}
