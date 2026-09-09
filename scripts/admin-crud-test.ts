/**
 * Admin CRUD test.
 *
 *   npm run admin:test
 *
 * Exercises the full Admin repository — products, variants, categories,
 * fragrance notes, note pyramids, images and 3D models — through create / read /
 * update / delete, against the LocalAdminRepo (the offline file-backed backend
 * that mirrors the Supabase one 1:1). Also verifies the search / filter / sort /
 * pagination used by the products table, and that catalogue edits surface in the
 * storefront domain view.
 */

import { loadEnv } from "./_env.ts";
loadEnv();

import { LocalAdminRepo } from "../src/lib/admin/local-repo.ts";
import { resetLocalStore } from "../src/lib/admin/local-store.ts";
import { localActiveProducts, localProductBySlug } from "../src/lib/admin/to-domain.ts";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
function rec(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}
async function expectThrow(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
    rec(label, false, "expected an error");
  } catch {
    rec(label, true);
  }
}

async function main() {
  console.log("\nMaison Lumière — Admin CRUD test (LocalAdminRepo)");
  console.log("================================================");
  resetLocalStore();
  const repo = new LocalAdminRepo();

  /* ---------------------------------------------------------- categories */
  const catId = await repo.createCategory({
    slug: "editions-test",
    name: "Test Editions",
    subtitle: "QA",
  });
  rec("category: create", !!catId);

  let cats = await repo.listCategories();
  rec("category: appears in list", cats.some((c) => c.id === catId));

  await repo.updateCategory(catId, { name: "Test Editions (renamed)" });
  cats = await repo.listCategories();
  rec(
    "category: update",
    cats.find((c) => c.id === catId)?.name === "Test Editions (renamed)",
  );

  /* ------------------------------------------------------------ notes */
  const noteId = await repo.createNote({ slug: "", name: "QA Ambrette", family: "Musky" });
  rec("note: create", !!noteId);
  const notes = await repo.listNotes();
  rec("note: in library", notes.some((n) => n.id === noteId));
  await repo.updateNote(noteId, { family: "Powdery" });
  rec(
    "note: update",
    (await repo.listNotes()).find((n) => n.id === noteId)?.family === "Powdery",
  );

  /* ----------------------------------------------------------- products */
  const prodId = await repo.createProduct({
    slug: "qa-fragrance",
    name: "QA Fragrance",
    short_description: "A test scent",
    description: "Long copy.",
    category_id: catId,
    concentration: "Eau de Parfum",
    gender: "Unisex",
    families: ["musky", "woody"],
    status: "draft",
  });
  rec("product: create (draft)", !!prodId);

  await expectThrow(
    () =>
      repo.createProduct({ slug: "qa-fragrance", name: "dup" }),
    "product: duplicate slug rejected",
  );

  let detail = await repo.getProduct(prodId);
  rec("product: read by id", detail?.product.slug === "qa-fragrance");
  rec(
    "product: read by slug",
    (await repo.getProductBySlug("qa-fragrance"))?.product.id === prodId,
  );

  await repo.updateProduct(prodId, { name: "QA Fragrance II", perfumer: "A. Tester" });
  detail = await repo.getProduct(prodId);
  rec(
    "product: update fields",
    detail?.product.name === "QA Fragrance II" && detail?.product.perfumer === "A. Tester",
  );

  /* --------------------------------------------------- draft hidden on site */
  rec(
    "storefront: draft product hidden",
    localProductBySlug("qa-fragrance") === null,
  );

  await repo.setProductStatus(prodId, "active");
  rec(
    "product: publish → visible on storefront",
    localProductBySlug("qa-fragrance") !== null,
  );

  await repo.setProductFeatured(prodId, true);
  rec(
    "product: feature flag",
    (await repo.getProduct(prodId))?.product.is_featured === true,
  );

  /* ---------------------------------------------------------- variants */
  const v10 = await repo.upsertVariant(prodId, {
    sku: "QAF-10",
    volume_ml: 10,
    price_cents: 4500,
    stock_quantity: 30,
  });
  const v50 = await repo.upsertVariant(prodId, {
    sku: "QAF-50",
    volume_ml: 50,
    price_cents: 14500,
    compare_at_price_cents: 12000,
    stock_quantity: 12,
    is_default: true,
  });
  rec("variant: create x2", !!v10 && !!v50);

  await expectThrow(
    () => repo.upsertVariant(prodId, { sku: "QAF-10", volume_ml: 25, price_cents: 900, stock_quantity: 1 }),
    "variant: duplicate SKU rejected",
  );

  detail = await repo.getProduct(prodId);
  rec("variant: default is the 50ml", detail?.variants.find((v) => v.is_default)?.sku === "QAF-50");
  rec(
    "variant: sale price stored",
    detail?.variants.find((v) => v.sku === "QAF-50")?.compare_at_price_cents === 12000,
  );

  await repo.upsertVariant(prodId, {
    id: v10,
    sku: "QAF-10",
    volume_ml: 10,
    price_cents: 5000,
    stock_quantity: 40,
  });
  detail = await repo.getProduct(prodId);
  rec(
    "variant: update price/stock",
    detail?.variants.find((v) => v.id === v10)?.price_cents === 5000,
  );

  await repo.deleteVariant(prodId, v10);
  detail = await repo.getProduct(prodId);
  rec("variant: delete", detail?.variants.every((v) => v.id !== v10) ?? false);

  /* -------------------------------------------------------- note pyramid */
  await repo.setProductNotes(prodId, [
    { note_id: noteId, tier: "top", position: 0 },
    { note_id: notes[0].id, tier: "base", position: 0 },
  ]);
  detail = await repo.getProduct(prodId);
  rec(
    "product notes: set pyramid",
    detail?.notes.length === 2 &&
      detail.notes.some((n) => n.tier === "top" && n.note_id === noteId),
  );

  await repo.setProductNotes(prodId, [{ note_id: noteId, tier: "heart", position: 0 }]);
  detail = await repo.getProduct(prodId);
  rec("product notes: replace pyramid", detail?.notes.length === 1 && detail.notes[0].tier === "heart");

  /* -------------------------------------------------------------- images */
  const img1 = await repo.addImage(prodId, { url: "https://example.com/a.jpg", alt: "A" });
  const img2 = await repo.addImage(prodId, { url: "https://example.com/b.jpg", alt: "B" });
  detail = await repo.getProduct(prodId);
  rec("image: add x2", detail?.images.length === 2);
  rec("image: first is primary", detail?.images.find((i) => i.is_primary)?.id === img1);

  await repo.setPrimaryImage(prodId, img2);
  detail = await repo.getProduct(prodId);
  rec("image: change primary", detail?.images.find((i) => i.is_primary)?.id === img2);

  await repo.moveImage(prodId, img2, "down");
  detail = await repo.getProduct(prodId);
  rec(
    "image: reorder",
    (detail?.images.sort((a, b) => a.position - b.position)[0].id ?? "") === img1,
  );

  await repo.deleteImage(prodId, img2);
  detail = await repo.getProduct(prodId);
  rec(
    "image: delete + primary reassigned",
    detail?.images.length === 1 && detail.images[0].is_primary === true,
  );

  /* -------------------------------------------------------------- models */
  const m1 = await repo.addModel(prodId, { model_url: "/uploads/models/x/a.glb", format: "glb" });
  const m2 = await repo.addModel(prodId, { model_url: "/uploads/models/x/b.glb", format: "glb" });
  detail = await repo.getProduct(prodId);
  rec("model: newest upload is active", detail?.models.find((m) => m.is_active)?.id === m2);
  await repo.setActiveModel(prodId, m1);
  detail = await repo.getProduct(prodId);
  rec("model: switch active", detail?.models.find((m) => m.is_active)?.id === m1);
  await repo.deleteModel(prodId, m1);
  detail = await repo.getProduct(prodId);
  rec(
    "model: delete + active reassigned",
    detail?.models.length === 1 && detail.models[0].id === m2 && detail.models[0].is_active,
  );

  /* ---------------------------------------------------- list: search/filter */
  const search = await repo.listProducts({ search: "QA Fragrance" });
  rec("list: search matches", search.items.some((i) => i.id === prodId));

  const byCat = await repo.listProducts({ category: "editions-test" });
  rec("list: filter by category", byCat.items.every((i) => i.category_id === catId) && byCat.items.length === 1);

  const drafts = await repo.listProducts({ status: "draft" });
  rec("list: filter by status", drafts.items.every((i) => i.status === "draft"));

  const featured = await repo.listProducts({ featured: "yes" });
  rec("list: filter featured", featured.items.some((i) => i.id === prodId));

  const paged = await repo.listProducts({ pageSize: 3, page: 2 });
  rec("list: pagination", paged.page === 2 && paged.pageSize === 3 && paged.items.length <= 3);

  const sorted = await repo.listProducts({ sort: "price-asc", pageSize: 100 });
  const prices = sorted.items.map((i) => i.min_price_cents ?? Infinity);
  rec("list: sort price ascending", prices.every((v, i) => i === 0 || prices[i - 1] <= v));

  const listItem = search.items.find((i) => i.id === prodId);
  rec(
    "list: derived columns",
    !!listItem &&
      listItem.category_name === "Test Editions (renamed)" &&
      listItem.variant_count === 1 &&
      listItem.total_stock === 12,
  );

  /* ------------------------------------------------- storefront reflection */
  const onSite = localActiveProducts().find((p) => p.slug === "qa-fragrance");
  rec(
    "storefront: edits visible (name, variant, notes)",
    !!onSite &&
      onSite.name === "QA Fragrance II" &&
      onSite.sizes.length === 1 &&
      onSite.notes.heart.length === 1,
  );

  /* -------------------------------------------------------- delete guards */
  await expectThrow(() => repo.deleteCategory(catId), "category: delete blocked while in use");

  /* -------------------------------------------------------- product delete */
  await repo.deleteProduct(prodId);
  rec("product: delete", (await repo.getProduct(prodId)) === null);
  detail = null;
  const orphanVariants = (await repo.listProducts({ pageSize: 10000 })).items.some(
    (i) => i.id === prodId,
  );
  rec("product: delete removes from list", !orphanVariants);

  await repo.deleteCategory(catId);
  rec("category: delete once empty", (await repo.listCategories()).every((c) => c.id !== catId));

  await repo.deleteNote(noteId);
  rec("note: delete", (await repo.listNotes()).every((n) => n.id !== noteId));

  /* ------------------------------------------------------- restore clean */
  resetLocalStore();

  const failed = checks.filter((c) => !c.ok);
  console.log("\n------------------------------------------------");
  console.log(`${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  - ${f.name}`));
    process.exit(1);
  }
  console.log("Admin CRUD verified.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\nUnexpected error:", err);
  process.exit(1);
});
