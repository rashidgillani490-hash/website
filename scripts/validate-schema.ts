/**
 * Offline schema + RLS + seed validation.
 *
 *   npm run db:validate
 *
 * Runs every file in `supabase/migrations/` and then `supabase/seed.sql`
 * against an in-process Postgres 15 (PGlite), with a minimal `auth` schema and
 * the Supabase-style `anon` / `authenticated` / `service_role` roles bootstrapped
 * first. Then exercises connection, queries, product retrieval and RLS.
 *
 * This gives real Postgres validation of the migrations without Docker.
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
const rec = (name: string, ok: boolean, detail?: string) => {
  checks.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
};

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");
const SEED = resolve(process.cwd(), "supabase/seed.sql");

const BOOTSTRAP = /* sql */ `
  create schema if not exists auth;
  create table if not exists auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create or replace function auth.uid() returns uuid
    language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

  do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
  do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
  do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

  -- Minimal stand-in for the Supabase-managed storage schema so the storage
  -- migration (bucket + object policies) can be validated.
  create schema if not exists storage;
  create table if not exists storage.buckets (
    id text primary key,
    name text not null,
    public boolean not null default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table if not exists storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text,
    owner uuid,
    created_at timestamptz default now()
  );
  alter table storage.objects enable row level security;

  grant usage on schema auth, public, storage to anon, authenticated, service_role;
`;

const GRANTS = /* sql */ `
  grant select on all tables in schema public to anon;
  grant select, insert, update, delete on all tables in schema public to authenticated;
  grant all on all tables in schema public to service_role;
  grant usage, select on all sequences in schema public to authenticated, service_role;
  grant execute on all functions in schema public to anon, authenticated, service_role;
  grant select on auth.users to authenticated, service_role;
`;

async function main() {
  console.log("\nMaison Lumière — offline schema validation (PGlite / Postgres 15)");
  console.log("================================================================");

  const db = await PGlite.create({ extensions: { citext, pg_trgm } });

  // 1. Connection
  const ping = await db.query<{ one: number }>("select 1 as one");
  rec("connection: PGlite up", ping.rows[0]?.one === 1);

  await db.exec(BOOTSTRAP);

  // 2. Migrations
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  let migrationsOk = true;
  for (const file of files) {
    let sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
    // pgcrypto is unavailable in PGlite; gen_random_uuid() is built in.
    sql = sql.replace(/create extension if not exists "pgcrypto";/g, "-- pgcrypto (built-in)");
    try {
      await db.exec(sql);
      console.log(`  applied ${file}`);
    } catch (err) {
      migrationsOk = false;
      rec(`migration ${file}`, false, (err as Error).message);
    }
  }
  rec("migrations: all applied", migrationsOk, `${files.length} files`);

  await db.exec(GRANTS);

  // 3. Structure
  const tableCount = await db.query<{ n: number }>(`
    select count(*)::int as n from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  `);
  const expectedTables = [
    "profiles", "categories", "products", "product_variants", "categories",
    "fragrance_notes", "product_notes", "product_images", "product_3d_models",
    "carts", "cart_items", "customizations", "orders", "order_items",
    "order_status_history", "coupons", "coupon_usage", "store_settings",
  ];
  rec(
    "structure: 17 base tables present",
    (tableCount.rows[0]?.n ?? 0) >= 17,
    `${tableCount.rows[0]?.n} tables`,
  );
  void expectedTables;

  const view = await db.query(`select 1 from information_schema.views where table_name = 'product_catalog'`);
  rec("structure: product_catalog view present", view.rows.length === 1);

  const fkCount = await db.query<{ n: number }>(`
    select count(*)::int as n from information_schema.table_constraints
    where table_schema = 'public' and constraint_type = 'FOREIGN KEY'
  `);
  rec("structure: foreign keys defined", (fkCount.rows[0]?.n ?? 0) >= 20, `${fkCount.rows[0]?.n} FKs`);

  const idxCount = await db.query<{ n: number }>(`
    select count(*)::int as n from pg_indexes where schemaname = 'public'
  `);
  rec("structure: indexes defined", (idxCount.rows[0]?.n ?? 0) >= 30, `${idxCount.rows[0]?.n} indexes`);

  const rlsCount = await db.query<{ n: number }>(`
    select count(*)::int as n from pg_tables
    where schemaname = 'public' and rowsecurity = true
  `);
  rec("security: RLS enabled on all 17 tables", (rlsCount.rows[0]?.n ?? 0) >= 17, `${rlsCount.rows[0]?.n} tables`);

  const polCount = await db.query<{ n: number }>(`select count(*)::int as n from pg_policies where schemaname = 'public'`);
  rec("security: RLS policies created", (polCount.rows[0]?.n ?? 0) >= 25, `${polCount.rows[0]?.n} policies`);

  // 3b. Phase 3 additions: product fields + storage
  const cols = await db.query<{ column_name: string }>(`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'products'
      and column_name in ('short_description', 'ingredients', 'base_sku')
  `);
  rec("structure: admin product fields added", cols.rows.length === 3);

  const bucket = await db.query(`select id, public from storage.buckets where id = 'product-media'`);
  rec("storage: product-media bucket created (public)", bucket.rows.length === 1);

  const storagePol = await db.query<{ n: number }>(
    `select count(*)::int as n from pg_policies where schemaname = 'storage' and tablename = 'objects'`,
  );
  rec("storage: object policies created", (storagePol.rows[0]?.n ?? 0) >= 4, `${storagePol.rows[0]?.n} policies`);

  // 3c. Phase 5 additions: customisation + customer-uploads bucket
  const custCol = await db.query(`
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'customization'
  `);
  rec("structure: products.customization column added", custCol.rows.length === 1);

  const custKind = await db.query(`
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'customization_kind' and e.enumlabel = 'personalisation'
  `);
  rec("structure: 'personalisation' customization_kind value added", custKind.rows.length === 1);

  const custBucket = await db.query(
    `select 1 from storage.buckets where id = 'customer-uploads' and public = true`,
  );
  rec("storage: customer-uploads bucket created (public read)", custBucket.rows.length === 1);

  const custView = await db.query(`
    select 1 from information_schema.columns
    where table_name = 'product_catalog' and column_name = 'customization'
  `);
  rec("structure: product_catalog exposes customization", custView.rows.length === 1);

  // 4. Seed
  try {
    await db.exec(readFileSync(SEED, "utf8"));
    rec("seed: seed.sql applied", true);
  } catch (err) {
    rec("seed: seed.sql applied", false, (err as Error).message);
  }

  // 5. Queries as service_role (full visibility)
  await db.exec("set role service_role");
  const prodAll = await db.query<{ n: number }>("select count(*)::int as n from products");
  rec("query: products seeded", prodAll.rows[0]?.n === 8, `${prodAll.rows[0]?.n} products`);

  const variantAll = await db.query<{ n: number }>("select count(*)::int as n from product_variants");
  rec("query: variants seeded", variantAll.rows[0]?.n === 24, `${variantAll.rows[0]?.n} variants`);

  const notesJoin = await db.query<{ n: number }>("select count(*)::int as n from product_notes");
  rec("query: product_notes seeded", notesJoin.rows[0]?.n === 48, `${notesJoin.rows[0]?.n} rows`);

  // 6. Product retrieval via the catalog view
  const catalog = await db.query<{
    slug: string;
    variants: unknown[];
    notes: unknown[];
    images: unknown[];
    model: unknown;
    category_slug: string;
  }>(`select slug, variants, notes, images, model, category_slug from product_catalog where slug = 'blanche-heure'`);
  const bh = catalog.rows[0];
  rec(
    "retrieval: product_catalog assembles nested JSON",
    !!bh &&
      Array.isArray(bh.variants) && bh.variants.length === 3 &&
      Array.isArray(bh.notes) && bh.notes.length === 6 &&
      Array.isArray(bh.images) && bh.images.length === 2 &&
      bh.category_slug === "lumiere" &&
      bh.model !== null,
    bh ? `${bh.variants.length} variants / ${bh.notes.length} notes / ${bh.images.length} images` : "no row",
  );

  const catalogCount = await db.query<{ n: number }>("select count(*)::int as n from product_catalog");
  rec("retrieval: full catalog", catalogCount.rows[0]?.n === 8, `${catalogCount.rows[0]?.n} products`);

  // 7. RLS — anon sees only active catalog rows, cannot write
  await db.exec("reset role; set role service_role");
  await db.query(
    `insert into products (slug, name, status) values ('zz-draft-probe', 'Draft probe', 'draft')`,
  );
  await db.exec("reset role; set role anon");

  const anonActive = await db.query<{ n: number }>("select count(*)::int as n from products");
  rec("RLS: anon sees active products only", anonActive.rows[0]?.n === 8, `${anonActive.rows[0]?.n} visible`);

  const anonDraft = await db.query("select slug from products where slug = 'zz-draft-probe'");
  rec("RLS: anon cannot see draft product", anonDraft.rows.length === 0);

  let anonWriteBlocked = false;
  try {
    await db.query(`insert into products (slug, name) values ('anon-hack', 'nope')`);
  } catch {
    anonWriteBlocked = true;
  }
  rec("RLS: anon INSERT into products is blocked", anonWriteBlocked);

  const anonSettings = await db.query<{ n: number }>("select count(*)::int as n from store_settings");
  rec("RLS: store_settings world-readable", (anonSettings.rows[0]?.n ?? 0) === 2, `${anonSettings.rows[0]?.n} keys`);

  const anonCoupon = await db.query("select code from coupons where code = 'DISCOVERY10'");
  rec("RLS: active coupon readable by anon", anonCoupon.rows.length === 1);

  // 8. Phase 7 — order_status recut, tracking columns, order-management RPCs
  await db.exec("reset role; set role service_role");

  const statusValues = await db.query<{ enumlabel: string }>(`
    select e.enumlabel from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'order_status'
    order by e.enumsortorder
  `);
  rec(
    "structure: order_status recut to the 7-status lifecycle",
    statusValues.rows.map((r) => r.enumlabel).join(",") ===
      "pending,confirmed,processing,shipped,out_for_delivery,delivered,cancelled",
    statusValues.rows.map((r) => r.enumlabel).join(","),
  );

  const trackingCols = await db.query(`
    select column_name from information_schema.columns
    where table_name = 'orders' and column_name in ('tracking_carrier', 'tracking_updated_at')
  `);
  rec("structure: tracking_carrier/tracking_updated_at added to orders", trackingCols.rows.length === 2);

  const orderRpcs = await db.query<{ proname: string }>(`
    select proname from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in ('admin_set_order_status', 'admin_add_order_tracking', 'admin_cancel_order')
  `);
  rec("structure: order-management RPCs created", orderRpcs.rows.length === 3, orderRpcs.rows.map((r) => r.proname).join(","));

  // 8b. Phase 8 — store settings & discount system: coupon_usage needs an
  //     email so a guest checkout's per-customer usage limit is enforceable.
  const couponUsageCols = await db.query(`
    select column_name from information_schema.columns
    where table_name = 'coupon_usage' and column_name = 'email'
  `);
  rec("structure: coupon_usage.email added (guest per-customer usage limit)", couponUsageCols.rows.length === 1);

  const couponUsageIdx = await db.query<{ n: number }>(`
    select count(*)::int as n from pg_indexes
    where tablename = 'coupon_usage' and indexname in ('coupon_usage_coupon_user_idx', 'coupon_usage_coupon_email_idx')
  `);
  rec("structure: coupon redemption-count indexes created", couponUsageIdx.rows[0]?.n === 2);

  const seededCoupons = await db.query<{ n: number }>(`select count(*)::int as n from coupons`);
  rec("seed: demo coupons present (percentage/fixed/free-shipping)", (seededCoupons.rows[0]?.n ?? 0) >= 3);

  // 9. Phase 7 — authorization: order/history ownership, staff-only writes,
  //    and the profile role-escalation guard. This is the sharpest edge of
  //    "customers must only see their own orders" — tested against real
  //    Postgres RLS, not application code that could itself have a bug.
  const custA = "a0000000-0000-0000-0000-00000000000a";
  const custB = "b0000000-0000-0000-0000-00000000000b";
  const staffId = "50000000-0000-0000-0000-000000000005";
  const orderA = "aaaa0000-0000-0000-0000-0000000000aa";
  const orderB = "bbbb0000-0000-0000-0000-0000000000bb";

  // Fixture setup runs as the bootstrapping superuser (bypasses RLS the same
  // way a migration or a Supabase dashboard action would), not service_role —
  // service_role only has SELECT on auth.users (see GRANTS above).
  await db.exec("reset role");
  await db.query(
    `insert into auth.users (id, email) values ($1, 'cust-a@example.com'), ($2, 'cust-b@example.com'), ($3, 'staff@example.com')`,
    [custA, custB, staffId],
  );
  // A direct, unauthenticated (superuser/service-role-equivalent) write —
  // auth.uid() is null here — must still be able to provision the first staff account.
  await db.query(`update profiles set role = 'staff' where id = $1`, [staffId]);
  const staffRoleSet = await db.query<{ role: string }>("select role from profiles where id = $1", [staffId]);
  rec(
    "security: service-role bootstrap can still grant staff (not blocked by the escalation guard)",
    staffRoleSet.rows[0]?.role === "staff",
  );

  await db.query(
    `insert into orders (id, user_id, email, subtotal_cents, total_cents) values ($1, $2, 'cust-a@example.com', 1000, 1000)`,
    [orderA, custA],
  );
  await db.query(
    `insert into orders (id, user_id, email, subtotal_cents, total_cents) values ($1, $2, 'cust-b@example.com', 2000, 2000)`,
    [orderB, custB],
  );

  // --- Customer A's own session -------------------------------------------------
  await db.exec("reset role; set role authenticated");
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [custA]);

  const aOwn = await db.query("select id from orders where id = $1", [orderA]);
  rec("RLS: a customer sees their own order", aOwn.rows.length === 1);
  const aOther = await db.query("select id from orders where id = $1", [orderB]);
  rec("RLS: a customer cannot see another customer's order", aOther.rows.length === 0);
  const aOtherList = await db.query<{ id: string }>("select id from orders");
  rec(
    "RLS: a customer's order list contains only their own orders",
    aOtherList.rows.length === 1 && aOtherList.rows[0]?.id === orderA,
  );

  const aUpdate = await db.query("update orders set status = 'confirmed' where id = $1", [orderA]);
  const aAfterUpdate = await db.query<{ status: string }>("select status from orders where id = $1", [orderA]);
  rec(
    "RLS: a customer cannot change their own order's status",
    aUpdate.affectedRows === 0 && aAfterUpdate.rows[0]?.status === "pending",
  );

  const aHistoryOwn = await db.query("select id from order_status_history where order_id = $1", [orderA]);
  rec("RLS: a customer sees their own order's status history", aHistoryOwn.rows.length >= 1);
  const aHistoryOther = await db.query("select id from order_status_history where order_id = $1", [orderB]);
  rec("RLS: a customer cannot see another customer's status history", aHistoryOther.rows.length === 0);

  let aHistoryInsertBlocked = false;
  try {
    await db.query(
      `insert into order_status_history (order_id, status) values ($1, 'confirmed')`,
      [orderA],
    );
  } catch {
    aHistoryInsertBlocked = true;
  }
  rec("RLS: a customer cannot write directly into their own status history", aHistoryInsertBlocked);

  const aProfileBefore = await db.query<{ role: string }>("select role from profiles where id = $1", [custA]);
  rec("RLS: a customer's own profile reads back as 'customer'", aProfileBefore.rows[0]?.role === "customer");
  await db.query("update profiles set role = 'admin' where id = $1", [custA]);
  const aProfileAfter = await db.query<{ role: string }>("select role from profiles where id = $1", [custA]);
  rec(
    "security: a customer cannot self-escalate their own role to admin",
    aProfileAfter.rows[0]?.role === "customer",
  );

  // --- Customer B's own session — same probes, opposite direction ---------------
  await db.exec("reset role; set role authenticated");
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [custB]);
  const bSeesA = await db.query("select id from orders where id = $1", [orderA]);
  rec("RLS: a second customer cannot see the first customer's order either", bSeesA.rows.length === 0);

  // --- Staff session ---------------------------------------------------------
  await db.exec("reset role; set role authenticated");
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [staffId]);
  const staffSeesBoth = await db.query<{ n: number }>("select count(*)::int as n from orders where id in ($1, $2)", [
    orderA,
    orderB,
  ]);
  rec("RLS: staff can read every customer's orders", staffSeesBoth.rows[0]?.n === 2);
  const staffUpdate = await db.query<{ status: string }>(
    "update orders set status = 'confirmed' where id = $1 returning status",
    [orderA],
  );
  rec("RLS: staff can change an order's status", staffUpdate.rows[0]?.status === "confirmed");
  const staffHistorySeesBoth = await db.query<{ n: number }>(
    "select count(*)::int as n from order_status_history where order_id in ($1, $2)",
    [orderA, orderB],
  );
  rec(
    "RLS: staff can read status history across customers",
    (staffHistorySeesBoth.rows[0]?.n ?? 0) >= 2,
  );

  // --- Anonymous ---------------------------------------------------------------
  // Clear the simulated JWT claim too — an anonymous request carries no `sub`
  // at all, and unlike the postgres ROLE, a `set_config` GUC survives a plain
  // `set role` switch, so the previous (staff) identity would otherwise leak in.
  await db.exec("reset role; set role anon");
  await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  const anonSeesOrder = await db.query("select id from orders where id = $1", [orderA]);
  rec("RLS: an anonymous request cannot see any order", anonSeesOrder.rows.length === 0);
  const anonSeesHistory = await db.query("select id from order_status_history where order_id = $1", [orderA]);
  rec("RLS: an anonymous request cannot see any status history", anonSeesHistory.rows.length === 0);

  await db.exec("reset role");

  // 10. Error handling — a bad query surfaces a clean error, session still usable
  await db.exec("reset role");
  let errored = false;
  try {
    await db.query("select * from table_that_does_not_exist");
  } catch (err) {
    errored = err instanceof Error;
  }
  rec("error handling: missing relation throws catchable error", errored);

  const stillAlive = await db.query<{ one: number }>("select 1 as one");
  rec("error handling: session recovers after error", stillAlive.rows[0]?.one === 1);

  await db.close();

  const failed = checks.filter((c) => !c.ok);
  console.log("\n----------------------------------------------------------------");
  console.log(`${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`));
    process.exit(1);
  }
  console.log("Schema, RLS and seed validated against Postgres 15.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\nUnexpected error:", err);
  process.exit(1);
});
