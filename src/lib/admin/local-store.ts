// Server-only by convention (Node `fs`/`crypto`). The `server-only` guard lives
// on `repo.ts`, the module every app consumer imports through.
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { products as demoProducts } from "@/lib/data/products";
import { collections as demoCollections } from "@/lib/data/collections";
import { slugify } from "@/lib/utils";
import type {
  CategoryRecord,
  CouponRecord,
  CouponUsageRecord,
  CustomerRecord,
  ImageRecord,
  ModelRecord,
  NoteRecord,
  OrderCustomizationRecord,
  OrderItemRecord,
  OrderRecord,
  OrderStatusHistoryRecord,
  ProductNoteRecord,
  ProductRecord,
  VariantRecord,
} from "./records";

export interface Tables {
  products: ProductRecord[];
  categories: CategoryRecord[];
  notes: NoteRecord[];
  variants: VariantRecord[];
  product_notes: ProductNoteRecord[];
  images: ImageRecord[];
  models: ModelRecord[];
  orders: OrderRecord[];
  order_items: OrderItemRecord[];
  order_customizations: OrderCustomizationRecord[];
  order_status_history: OrderStatusHistoryRecord[];
  customers: CustomerRecord[];
  coupons: CouponRecord[];
  coupon_usage: CouponUsageRecord[];
  /** Key → value settings blob (`"site_content"`, `"commerce"`, …) — mirrors the Supabase `store_settings` table. */
  store_settings: Record<string, unknown>;
}

const TABLE_NAMES = [
  "products",
  "categories",
  "notes",
  "variants",
  "product_notes",
  "images",
  "models",
  "orders",
  "order_items",
  "order_customizations",
  "order_status_history",
  "customers",
  "coupons",
  "coupon_usage",
  "store_settings",
] as const;
type TableName = (typeof TABLE_NAMES)[number];

const DATA_DIR = join(process.cwd(), ".data", "admin");
const now = () => new Date().toISOString();

/** The bundled demo 3D asset (see scripts/generate-demo-model.mjs). */
export const DEMO_MODEL_URL = "/models/demo-flacon.gltf";

/**
 * Demo per-product personalisation configs so the customiser is usable
 * immediately. The client replaces these from Admin → product → Customisation.
 */
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

/** In-memory copy — used as the source of truth and as a fallback when the
 *  filesystem is read-only (e.g. some serverless targets). */
let memory: Tables | null = null;
let diskWritable = true;

/* --------------------------------------------------------------- seeding */

function seedTables(): Tables {
  const ts = now();

  const categories: CategoryRecord[] = demoCollections.map((c) => ({
    id: randomUUID(),
    slug: c.slug,
    name: c.name,
    subtitle: c.subtitle,
    description: c.description,
    hero_image_url: c.image,
    accent_color: c.accentColor,
    position: c.order,
    is_active: true,
    created_at: ts,
    updated_at: ts,
  }));
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const noteBySlug = new Map<string, NoteRecord>();
  for (const p of demoProducts) {
    for (const tier of ["top", "heart", "base"] as const) {
      for (const n of p.notes[tier]) {
        const slug = slugify(n.name);
        if (!noteBySlug.has(slug)) {
          noteBySlug.set(slug, {
            id: randomUUID(),
            slug,
            name: n.name,
            family: n.family,
            description: null,
            created_at: ts,
            updated_at: ts,
          });
        }
      }
    }
  }
  const notes = [...noteBySlug.values()];

  const products: ProductRecord[] = [];
  const variants: VariantRecord[] = [];
  const product_notes: ProductNoteRecord[] = [];
  const images: ImageRecord[] = [];
  const models: ModelRecord[] = [];

  for (const p of demoProducts) {
    const id = randomUUID();
    products.push({
      id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      short_description: p.tagline,
      description: p.description,
      ingredients:
        "Alcohol Denat., Parfum (Fragrance), Aqua (Water), natural isolates from maison-distilled essences.",
      story: p.story,
      base_sku: p.slug.toUpperCase().replace(/-/g, "").slice(0, 6),
      category_id: categoryBySlug.get(p.collectionSlug)?.id ?? null,
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
      published_at: ts,
      created_at: ts,
      updated_at: ts,
    });

    p.sizes.forEach((s, i) => {
      variants.push({
        id: randomUUID(),
        product_id: id,
        sku: s.sku,
        volume_ml: s.ml,
        price_cents: s.price,
        compare_at_price_cents: null,
        currency: "USD",
        stock_quantity: s.stock ?? 0,
        is_default: i === Math.min(1, p.sizes.length - 1),
        position: i,
        created_at: ts,
        updated_at: ts,
      });
    });

    (["top", "heart", "base"] as const).forEach((tier) => {
      p.notes[tier].forEach((n, i) => {
        const note = noteBySlug.get(slugify(n.name));
        if (note) {
          product_notes.push({
            id: randomUUID(),
            product_id: id,
            note_id: note.id,
            tier,
            position: i,
            created_at: ts,
          });
        }
      });
    });

    p.images.forEach((img, i) => {
      images.push({
        id: randomUUID(),
        product_id: id,
        url: img.src,
        alt: img.alt,
        position: i,
        is_primary: i === 0,
        storage_path: null,
        created_at: ts,
        updated_at: ts,
      });
    });

    // Ship the bundled demo flacon for most products; leave a couple without a
    // model so the graceful image-based fallback is demonstrable out of the box.
    const withoutModel = new Set(["jardin-clos", "neroli-franc"]);
    models.push({
      id: randomUUID(),
      product_id: id,
      model_url: withoutModel.has(p.slug) ? null : DEMO_MODEL_URL,
      format: "gltf",
      poster_url: p.images[0]?.src ?? null,
      accent_color: p.accentColor,
      scale: 1,
      is_active: true,
      storage_path: null,
      created_at: ts,
      updated_at: ts,
    });
  }

  return {
    products,
    categories,
    notes,
    variants,
    product_notes,
    images,
    models,
    orders: [],
    order_items: [],
    order_customizations: [],
    order_status_history: [],
    customers: [],
    coupons: seedCoupons(ts),
    coupon_usage: [],
    store_settings: {},
  };
}

/** Mirrors `supabase/seed.sql`'s three demo coupons, so both backends behave
 *  identically out of the box. */
function seedCoupons(ts: string): CouponRecord[] {
  const DAY = 24 * 60 * 60 * 1000;
  const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();
  return [
    {
      id: randomUUID(),
      code: "DISCOVERY10",
      description: "10% off a first order",
      discount_type: "percentage",
      discount_value: 10,
      minimum_subtotal_cents: 0,
      max_redemptions: null,
      per_user_limit: 1,
      redeemed_count: 0,
      starts_at: iso(-30),
      expires_at: iso(180),
      is_active: true,
      created_at: ts,
      updated_at: ts,
    },
    {
      id: randomUUID(),
      code: "LUMIERE25",
      description: "Rs 2,500 off orders over Rs 20,000",
      discount_type: "fixed_amount",
      discount_value: 2500,
      minimum_subtotal_cents: 20000,
      max_redemptions: null,
      per_user_limit: 3,
      redeemed_count: 0,
      starts_at: iso(-10),
      expires_at: iso(90),
      is_active: true,
      created_at: ts,
      updated_at: ts,
    },
    {
      id: randomUUID(),
      code: "ATELIER",
      description: "Complimentary shipping",
      discount_type: "free_shipping",
      discount_value: 0,
      minimum_subtotal_cents: 0,
      max_redemptions: null,
      per_user_limit: 5,
      redeemed_count: 0,
      starts_at: null,
      expires_at: null,
      is_active: true,
      created_at: ts,
      updated_at: ts,
    },
  ];
}

/* ------------------------------------------------------------- persistence */

function fileFor(name: TableName) {
  return join(DATA_DIR, `${name}.json`);
}

function readFromDisk(): Tables | null {
  if (!existsSync(DATA_DIR)) return null;
  try {
    const out: Record<string, unknown> = {};
    for (const name of TABLE_NAMES) {
      const path = fileFor(name);
      if (!existsSync(path)) return null;
      out[name] = JSON.parse(readFileSync(path, "utf8"));
    }
    return out as unknown as Tables;
  } catch {
    return null;
  }
}

function writeToDisk(tables: Tables) {
  if (!diskWritable) return;
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    for (const name of TABLE_NAMES) {
      writeFileSync(fileFor(name), JSON.stringify(tables[name], null, 2), "utf8");
    }
  } catch {
    diskWritable = false;
  }
}

function ensureLoaded(): Tables {
  if (memory) return memory;
  memory = readFromDisk();
  if (!memory) {
    memory = seedTables();
    writeToDisk(memory);
  }
  return memory;
}

/* ------------------------------------------------------------------ API */

export function getTables(): Tables {
  return ensureLoaded();
}

/** Persist the current in-memory tables (call after any mutation). */
export function persist() {
  if (memory) writeToDisk(memory);
}

/** Test helper — wipe the store so the next read re-seeds. */
export function resetLocalStore() {
  memory = seedTables();
  writeToDisk(memory);
}

export { randomUUID, now };
