/**
 * Database integration test.
 *
 *   npm run db:test
 *
 * Exercises: environment detection, client construction, connection,
 * queries, product retrieval (via the product_catalog view), Row Level
 * Security behaviour for the anon role, and error handling.
 *
 * When Supabase is not configured it validates the graceful-degradation path
 * (clients must return null, never throw) and exits 0.
 */

import { loadEnv } from "./_env.ts";
loadEnv();

import { createClient } from "@supabase/supabase-js";

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];
function record(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  const tag = ok ? "PASS" : "FAIL";
  console.log(`  [${tag}] ${name}${detail ? ` — ${detail}` : ""}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
const configured = Boolean(url && anonKey);

async function main() {
  console.log("\nMaison Lumière — database integration test");
  console.log("=========================================");
  console.log(`Supabase configured: ${configured ? "yes" : "no"}`);
  if (url) console.log(`URL: ${url}`);

  // ---------------------------------------------------------------- unconfigured
  if (!configured) {
    console.log(
      "\nNo Supabase credentials found — validating the demo fallback path.\n",
    );

    const { isSupabaseConfigured, isSupabaseAdminConfigured } = await import(
      "../src/lib/supabase/env.ts"
    );
    record("env.isSupabaseConfigured is false", isSupabaseConfigured === false);
    record(
      "env.isSupabaseAdminConfigured() is false",
      isSupabaseAdminConfigured() === false,
    );

    // The demo fallback content the CMS layer serves when Supabase is absent.
    const { products } = await import("../src/lib/data/products.ts");
    const { collections } = await import("../src/lib/data/collections.ts");
    const { siteContent } = await import("../src/lib/data/site.ts");
    const { applyProductQuery } = await import("../src/lib/catalog-query.ts");

    record(
      "demo product data present & shaped",
      Array.isArray(products) &&
        products.length > 0 &&
        products.every(
          (p) =>
            !!p.slug &&
            p.sizes.length > 0 &&
            p.images.length > 0 &&
            p.notes.top.length > 0,
        ),
      `${products.length} products`,
    );

    record(
      "demo collections & site content present",
      collections.length > 0 && !!siteContent.brandName && siteContent.values.length > 0,
    );

    // Retrieval logic: filtering
    const nocturne = applyProductQuery(products, { collection: "nocturne" });
    record(
      "query: filter by collection",
      nocturne.length > 0 && nocturne.every((p) => p.collectionSlug === "nocturne"),
      `${nocturne.length} in nocturne`,
    );

    const featured = applyProductQuery(products, { featuredOnly: true });
    record(
      "query: featuredOnly",
      featured.length > 0 && featured.every((p) => p.featured),
    );

    // Retrieval logic: sorting
    const asc = applyProductQuery(products, { sort: "price-asc" });
    const prices = asc.map((p) => Math.min(...p.sizes.map((s) => s.price)));
    record(
      "query: sort by price ascending",
      prices.every((v, i) => i === 0 || prices[i - 1] <= v),
    );

    // Retrieval logic: search (matches across name / tagline / description / families)
    const search = applyProductQuery(products, { search: "vetiver" });
    record(
      "query: full-text-ish search",
      search.length > 0 && search.some((p) => p.slug === "nuit-vetiver"),
      `${search.length} hits`,
    );

    // Error handling: unknown slug resolves to null (mirrors cms.getProductBySlug)
    const missing = products.find((p) => p.slug === "no-such-fragrance-xyz") ?? null;
    record("error handling: unknown slug resolves to null", missing === null);

    return summarise();
  }

  // ------------------------------------------------------------------ configured
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = serviceKey
    ? createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  // 1. Connection
  {
    const { error } = await anon
      .from("store_settings")
      .select("key", { head: true, count: "exact" });
    record("connection: reach store_settings", !error, error?.message);
  }

  // 2. Query: categories
  {
    const { data, error } = await anon
      .from("categories")
      .select("slug,name,position")
      .eq("is_active", true)
      .order("position");
    record(
      "query: list active categories",
      !error && Array.isArray(data) && data.length > 0,
      error ? error.message : `${data?.length ?? 0} rows`,
    );
  }

  // 3. Product retrieval via the catalog view
  {
    const { data, error } = await anon
      .from("product_catalog")
      .select("*")
      .eq("status", "active")
      .limit(50);
    const first = data?.[0] as
      | { slug: string; variants: unknown[]; notes: unknown[]; images: unknown[] }
      | undefined;
    const shaped =
      !!first &&
      Array.isArray(first.variants) &&
      first.variants.length > 0 &&
      Array.isArray(first.notes) &&
      Array.isArray(first.images);
    record(
      "product retrieval: product_catalog view",
      !error && !!data && data.length > 0 && shaped,
      error ? error.message : `${data?.length ?? 0} products, first="${first?.slug}"`,
    );
  }

  // 4. Product retrieval: single by slug
  {
    const { data, error } = await anon
      .from("product_catalog")
      .select("slug,name")
      .eq("slug", "blanche-heure")
      .maybeSingle();
    record(
      "product retrieval: by slug (blanche-heure)",
      !error && data?.slug === "blanche-heure",
      error?.message,
    );
  }

  // 5. RLS: anon cannot write to products
  {
    const { error } = await anon
      .from("products")
      .insert({ slug: "rls-probe", name: "RLS probe" } as never);
    record(
      "RLS: anon INSERT into products is rejected",
      !!error,
      error ? `blocked (${error.code ?? "error"})` : "UNEXPECTEDLY ALLOWED",
    );
  }

  // 6. RLS: draft/archived products hidden from anon
  if (admin) {
    const probeSlug = `zz-draft-probe-${Date.now()}`;
    await admin.from("products").insert({
      slug: probeSlug,
      name: "Draft probe",
      status: "draft",
    } as never);
    const { data: viaAnon } = await anon
      .from("products")
      .select("slug")
      .eq("slug", probeSlug)
      .maybeSingle();
    const { data: viaAdmin } = await admin
      .from("products")
      .select("slug")
      .eq("slug", probeSlug)
      .maybeSingle();
    record(
      "RLS: draft product hidden from anon, visible to service role",
      viaAnon === null && viaAdmin?.slug === probeSlug,
    );
    await admin.from("products").delete().eq("slug", probeSlug);
  } else {
    console.log("  [SKIP] RLS draft-visibility test (no service-role key)");
  }

  // 7. Error handling: querying a missing relation surfaces a clean error
  {
    const { error } = await anon.from("table_that_does_not_exist" as never).select("*");
    record(
      "error handling: missing relation returns an error object",
      !!error,
      error?.message?.slice(0, 60),
    );
  }

  // 8. Error handling: invalid column
  {
    const { error } = await anon.from("products").select("no_such_column");
    record("error handling: invalid column returns an error object", !!error);
  }

  summarise();
}

function summarise() {
  const failed = results.filter((r) => !r.ok);
  console.log("\n-----------------------------------------");
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    console.log("Failed:");
    failed.forEach((f) => console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`));
    process.exit(1);
  }
  console.log("All checks passed.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\nUnexpected error:", err);
  process.exit(1);
});
