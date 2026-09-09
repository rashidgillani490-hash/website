// Server-only by convention (reads the Node file store via local-store).
import type {
  BottleSize,
  Collection,
  NotePyramid,
  Product,
  SiteContent,
} from "@/lib/types";
import { getTables } from "./local-store";
import { parseCustomizationConfig } from "@/lib/customization/pricing";
import { mergeSiteContent, mergeCommerceSettings } from "@/lib/settings";
import type { CommerceSettings } from "@/lib/commerce";
import type { ProductRecord } from "./records";

/**
 * Assemble the local admin store into the storefront domain types, so that
 * catalogue edits made in the Admin Dashboard show on the site even when
 * running against the offline (file-backed) repository.
 */

function assemble(p: ProductRecord): Product {
  const t = getTables();
  const catSlug = t.categories.find((c) => c.id === p.category_id)?.slug ?? "";

  const sizes: BottleSize[] = t.variants
    .filter((v) => v.product_id === p.id)
    .sort((a, b) => a.position - b.position || a.volume_ml - b.volume_ml)
    .map((v) => ({
      ml: v.volume_ml,
      price: v.price_cents,
      stock: v.stock_quantity,
      sku: v.sku,
    }));

  const notes: NotePyramid = { top: [], heart: [], base: [] };
  t.product_notes
    .filter((pn) => pn.product_id === p.id)
    .sort((a, b) => a.position - b.position)
    .forEach((pn) => {
      const note = t.notes.find((n) => n.id === pn.note_id);
      if (note) notes[pn.tier].push({ name: note.name, family: note.family });
    });

  const images = t.images
    .filter((i) => i.product_id === p.id)
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position)
    .map((i) => ({ src: i.url, alt: i.alt ?? p.name }));

  const model = t.models.find((m) => m.product_id === p.id && m.is_active);

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline ?? "",
    shortDescription: p.short_description ?? undefined,
    description: p.description ?? "",
    ingredients: p.ingredients ?? undefined,
    baseSku: p.base_sku ?? undefined,
    modelUrl: model?.model_url ?? null,
    story: p.story ?? "",
    concentration: (p.concentration as Product["concentration"]) ?? "Eau de Parfum",
    gender: (p.gender as Product["gender"]) ?? "Unisex",
    collectionSlug: catSlug,
    families: p.families ?? [],
    customization: parseCustomizationConfig(p.customization),
    notes,
    perfumer: p.perfumer ?? "",
    sillage: (p.sillage as Product["sillage"]) ?? "Moderate",
    longevity: (p.longevity as Product["longevity"]) ?? "6–8h",
    images: images.length ? images : [{ src: "", alt: p.name }],
    accentColor: model?.accent_color ?? p.accent_color ?? "#c8a866",
    sizes: sizes.length ? sizes : [{ ml: 50, price: 0, stock: 0, sku: `${p.slug}-50` }],
    rating: p.rating,
    reviewCount: p.review_count,
    featured: p.is_featured,
    isNew: p.is_new,
    releaseYear: p.release_year ?? new Date().getFullYear(),
  };
}

export function localActiveProducts(): Product[] {
  return getTables()
    .products.filter((p) => p.status === "active")
    .map(assemble);
}

export function localProductBySlug(slug: string): Product | null {
  const p = getTables().products.find((x) => x.slug === slug && x.status === "active");
  return p ? assemble(p) : null;
}

export function localActiveSlugs(): string[] {
  return getTables()
    .products.filter((p) => p.status === "active")
    .map((p) => p.slug);
}

export function localCollections(): Collection[] {
  return getTables()
    .categories.filter((c) => c.is_active)
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      subtitle: c.subtitle ?? "",
      description: c.description ?? "",
      image: c.hero_image_url ?? "",
      accentColor: c.accent_color ?? "#c8a866",
      order: c.position,
    }));
}

export function localCollectionBySlug(slug: string): Collection | null {
  return localCollections().find((c) => c.slug === slug) ?? null;
}

/** Persisted admin edits (Admin → Settings → Site content), merged over the demo copy. */
export function localSiteContent(): SiteContent {
  return mergeSiteContent(getTables().store_settings.site_content as Partial<SiteContent> | undefined);
}

/** Persisted admin edits (Admin → Settings → Store settings), merged over the bootstrap defaults. */
export function localCommerceSettings(): CommerceSettings {
  return mergeCommerceSettings(
    getTables().store_settings.commerce as Partial<CommerceSettings> | undefined,
  );
}
