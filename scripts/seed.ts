/**
 * Programmatic seeder — populates a linked Supabase project with the demo
 * content from `src/lib/data/*` using the service-role key.
 *
 *   npm run db:seed
 *
 * Idempotent: everything is upserted on its natural key, join tables are
 * replaced per-product. Safe to re-run. Requires NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY.
 *
 * `supabase/seed.sql` is the equivalent for `supabase db reset`; this script is
 * for re-seeding a hosted database without a full reset.
 */

import { loadEnv } from "./_env.ts";
loadEnv();

import { createClient } from "@supabase/supabase-js";
import { products } from "../src/lib/data/products.ts";
import { collections } from "../src/lib/data/collections.ts";
import { siteContent } from "../src/lib/data/site.ts";
import { slugify } from "../src/lib/utils.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

if (!url || !serviceKey) {
  console.error(
    "seed: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local",
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function die(step: string, error: unknown): never {
  console.error(`seed: failed at "${step}":`, error);
  process.exit(1);
}

const DEMO_CUSTOMIZATION: Record<string, Record<string, unknown>> = {
  "blanche-heure": {
    enabled: true,
    allowText: true,
    textMaxLength: 22,
    textPriceCents: 2500,
    allowImage: true,
    imagePriceCents: 4500,
    bottleOptions: [
      { id: "clear", label: "Clear engraved glass", priceCents: 0 },
      { id: "frosted", label: "Frosted glass", priceCents: 3000 },
      { id: "gold-collar", label: "Gilded collar", priceCents: 6500 },
    ],
    packagingOptions: [
      { id: "standard", label: "Signature box", priceCents: 0 },
      { id: "lacquer", label: "Hand-lacquered coffret", priceCents: 5500 },
      { id: "gift", label: "Gift wrap & handwritten card", priceCents: 1800 },
    ],
  },
  "cuir-centifolia": {
    enabled: true,
    allowText: true,
    textMaxLength: 18,
    textPriceCents: 3000,
    allowImage: false,
    imagePriceCents: 0,
    bottleOptions: [
      { id: "standard", label: "Standard flacon", priceCents: 0 },
      { id: "leather", label: "Leather-sleeved flacon", priceCents: 9000 },
    ],
    packagingOptions: [
      { id: "standard", label: "Signature box", priceCents: 0 },
      { id: "travel", label: "Travel case + 10ml refill", priceCents: 7500 },
    ],
  },
};

async function main() {
  console.log("Seeding Maison Lumière demo content →", url);

  // 1. categories --------------------------------------------------------------
  {
    const rows = collections.map((c) => ({
      slug: c.slug,
      name: c.name,
      subtitle: c.subtitle,
      description: c.description,
      hero_image_url: c.image,
      accent_color: c.accentColor,
      position: c.order,
      is_active: true,
    }));
    const { error } = await db.from("categories").upsert(rows, { onConflict: "slug" });
    if (error) die("categories", error);
    console.log(`  categories: ${rows.length}`);
  }

  const { data: catRows, error: catErr } = await db
    .from("categories")
    .select("id,slug");
  if (catErr) die("categories:read", catErr);
  const catId = new Map(catRows!.map((c) => [c.slug, c.id]));

  // 2. fragrance_notes -------------------------------------------------------
  const noteKey = new Map<string, { slug: string; name: string; family: string }>();
  for (const p of products) {
    for (const tier of ["top", "heart", "base"] as const) {
      for (const n of p.notes[tier]) {
        const slug = slugify(n.name);
        if (!noteKey.has(slug)) noteKey.set(slug, { slug, name: n.name, family: n.family });
      }
    }
  }
  {
    const rows = [...noteKey.values()];
    const { error } = await db
      .from("fragrance_notes")
      .upsert(rows, { onConflict: "slug" });
    if (error) die("fragrance_notes", error);
    console.log(`  fragrance_notes: ${rows.length}`);
  }
  const { data: noteRows, error: noteErr } = await db
    .from("fragrance_notes")
    .select("id,slug");
  if (noteErr) die("fragrance_notes:read", noteErr);
  const noteId = new Map(noteRows!.map((n) => [n.slug, n.id]));

  // 3. products -----------------------------------------------------------------
  {
    const rows = products.map((p) => ({
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      short_description: p.shortDescription ?? p.tagline,
      description: p.description,
      ingredients:
        p.ingredients ??
        "Alcohol Denat., Parfum (Fragrance), Aqua (Water), natural isolates from maison-distilled essences.",
      base_sku: p.baseSku ?? p.slug.toUpperCase().replace(/-/g, "").slice(0, 6),
      story: p.story,
      category_id: catId.get(p.collectionSlug) ?? null,
      concentration: p.concentration,
      gender: p.gender,
      perfumer: p.perfumer,
      sillage: p.sillage,
      longevity: p.longevity,
      accent_color: p.accentColor,
      families: p.families,
      customization: DEMO_CUSTOMIZATION[p.slug] ?? {},
      status: "active",
      is_featured: p.featured,
      is_new: p.isNew,
      release_year: p.releaseYear,
      rating: p.rating,
      review_count: p.reviewCount,
      published_at: new Date().toISOString(),
    }));
    const { error } = await db.from("products").upsert(rows, { onConflict: "slug" });
    if (error) die("products", error);
    console.log(`  products: ${rows.length}`);
  }
  const { data: prodRows, error: prodErr } = await db
    .from("products")
    .select("id,slug");
  if (prodErr) die("products:read", prodErr);
  const prodId = new Map(prodRows!.map((p) => [p.slug, p.id]));

  // 4. product_variants -------------------------------------------------------
  {
    const rows = products.flatMap((p) =>
      p.sizes.map((s, i) => ({
        product_id: prodId.get(p.slug)!,
        sku: s.sku,
        volume_ml: s.ml,
        price_cents: s.price,
        stock_quantity: s.stock ?? 0,
        is_default: i === Math.min(1, p.sizes.length - 1),
        position: i,
      })),
    );
    const { error } = await db
      .from("product_variants")
      .upsert(rows, { onConflict: "sku" });
    if (error) die("product_variants", error);
    console.log(`  product_variants: ${rows.length}`);
  }

  // 5. product_images (replace per product) ---------------------------------
  for (const p of products) {
    const pid = prodId.get(p.slug)!;
    await db.from("product_images").delete().eq("product_id", pid);
    const rows = p.images.map((img, i) => ({
      product_id: pid,
      url: img.src,
      alt: img.alt,
      position: i,
      is_primary: i === 0,
    }));
    const { error } = await db.from("product_images").insert(rows);
    if (error) die("product_images", error);
  }
  console.log(`  product_images: replaced for ${products.length} products`);

  // 6. product_3d_models (one active per product) --------------------------
  for (const p of products) {
    const pid = prodId.get(p.slug)!;
    await db.from("product_3d_models").delete().eq("product_id", pid);
    const noModel = ["jardin-clos", "neroli-franc"].includes(p.slug);
    const { error } = await db.from("product_3d_models").insert({
      product_id: pid,
      model_url: noModel ? null : "/models/demo-flacon.gltf",
      format: "gltf",
      poster_url: p.images[0]?.src ?? null,
      accent_color: p.accentColor,
      is_active: true,
    });
    if (error) die("product_3d_models", error);
  }
  console.log(`  product_3d_models: ${products.length}`);

  // 7. product_notes (replace per product) --------------------------------
  for (const p of products) {
    const pid = prodId.get(p.slug)!;
    await db.from("product_notes").delete().eq("product_id", pid);
    const rows = (["top", "heart", "base"] as const).flatMap((tier) =>
      p.notes[tier].map((n, i) => ({
        product_id: pid,
        note_id: noteId.get(slugify(n.name))!,
        tier,
        position: i,
      })),
    );
    const { error } = await db.from("product_notes").insert(rows);
    if (error) die("product_notes", error);
  }
  console.log(`  product_notes: replaced for ${products.length} products`);

  // 8. coupons --------------------------------------------------------------
  {
    const rows = [
      {
        code: "DISCOVERY10",
        description: "10% off a first order",
        discount_type: "percentage",
        discount_value: 10,
        minimum_subtotal_cents: 0,
        per_user_limit: 1,
        is_active: true,
      },
      {
        code: "LUMIERE25",
        description: "$25 off orders over $200",
        discount_type: "fixed_amount",
        discount_value: 2500,
        minimum_subtotal_cents: 20000,
        per_user_limit: 3,
        is_active: true,
      },
      {
        code: "ATELIER",
        description: "Complimentary shipping",
        discount_type: "free_shipping",
        discount_value: 0,
        minimum_subtotal_cents: 0,
        per_user_limit: 5,
        is_active: true,
      },
    ];
    const { error } = await db.from("coupons").upsert(rows, { onConflict: "code" });
    if (error) die("coupons", error);
    console.log(`  coupons: ${rows.length}`);
  }

  // 9. store_settings -----------------------------------------------------------
  {
    const rows = [
      {
        key: "site_content",
        value: siteContent as unknown as Record<string, unknown>,
        description: "Homepage and site-wide editorial copy. Edited from Admin → Content.",
      },
      {
        key: "commerce",
        value: {
          currency: "USD",
          locale: "en-US",
          freeShippingThresholdCents: 18000,
          flatShippingCents: 1200,
        },
        description: "Storefront commerce configuration. Edited from Admin → Settings.",
      },
    ];
    const { error } = await db
      .from("store_settings")
      .upsert(rows, { onConflict: "key" });
    if (error) die("store_settings", error);
    console.log(`  store_settings: ${rows.length}`);
  }

  console.log("\nSeed complete.");
  process.exit(0);
}

main().catch((err) => die("unexpected", err));
