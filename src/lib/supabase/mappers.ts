/**
 * Row → domain-type mappers. Keeps Supabase's snake_case / normalised shape
 * out of the UI layer, which only ever sees the types in `src/lib/types.ts`.
 */

import type {
  BottleSize,
  Collection,
  NotePyramid,
  Product,
  SiteContent,
} from "@/lib/types";
import { siteContent as demoSiteContent } from "@/lib/data/site";
import { parseCustomizationConfig } from "@/lib/customization/pricing";
import { mergeSiteContent, mergeCommerceSettings } from "@/lib/settings";
import { DEFAULT_COMMERCE_SETTINGS, type CommerceSettings } from "@/lib/commerce";
import type {
  CategoryRow,
  ProductCatalogRow,
  StoreSettingRow,
} from "./database.types";

export function mapCategory(row: CategoryRow): Collection {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle ?? "",
    description: row.description ?? "",
    image: row.hero_image_url ?? "",
    accentColor: row.accent_color ?? "#c8a866",
    order: row.position,
  };
}

export function mapCatalogProduct(row: ProductCatalogRow): Product {
  const sizes: BottleSize[] = [...(row.variants ?? [])]
    .sort((a, b) => a.position - b.position || a.volume_ml - b.volume_ml)
    .map((v) => ({
      ml: v.volume_ml,
      price: v.price_cents,
      stock: v.stock_quantity,
      sku: v.sku,
    }));

  const notes: NotePyramid = { top: [], heart: [], base: [] };
  for (const n of row.notes ?? []) {
    notes[n.tier].push({ name: n.name, family: n.family });
  }

  const images = [...(row.images ?? [])]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position)
    .map((img) => ({ src: img.url, alt: img.alt ?? row.name }));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? "",
    shortDescription: row.short_description ?? undefined,
    description: row.description ?? "",
    ingredients: row.ingredients ?? undefined,
    baseSku: row.base_sku ?? undefined,
    modelUrl: row.model?.model_url ?? null,
    story: row.story ?? "",
    concentration: (row.concentration as Product["concentration"]) ?? "Eau de Parfum",
    gender: (row.gender as Product["gender"]) ?? "Unisex",
    collectionSlug: row.category_slug ?? "",
    families: row.families ?? [],
    customization: parseCustomizationConfig(row.customization),
    notes,
    perfumer: row.perfumer ?? "",
    sillage: (row.sillage as Product["sillage"]) ?? "Moderate",
    longevity: (row.longevity as Product["longevity"]) ?? "6–8h",
    images: images.length > 0 ? images : [{ src: "", alt: row.name }],
    accentColor: row.model?.accent_color ?? row.accent_color ?? "#c8a866",
    sizes:
      sizes.length > 0
        ? sizes
        : [{ ml: 50, price: 0, stock: 0, sku: `${row.slug}-50` }],
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count ?? 0,
    featured: row.is_featured,
    isNew: row.is_new,
    releaseYear: row.release_year ?? new Date().getFullYear(),
  };
}

export function mapSiteContent(row: StoreSettingRow | null): SiteContent {
  if (!row || typeof row.value !== "object" || row.value === null) {
    return demoSiteContent;
  }
  return mergeSiteContent(row.value as Partial<SiteContent>);
}

export function mapCommerceSettings(row: StoreSettingRow | null): CommerceSettings {
  if (!row || typeof row.value !== "object" || row.value === null) {
    return DEFAULT_COMMERCE_SETTINGS;
  }
  return mergeCommerceSettings(row.value as Partial<CommerceSettings>);
}
