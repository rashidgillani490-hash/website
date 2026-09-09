/**
 * Phase 11 — upload path verification (product images, 3D models, customer
 * personalisation uploads).
 *
 *   npm run upload:test
 *
 * Nothing else in the test suite actually calls the upload functions with a
 * real `File` — `customization-test.ts` only exercises the pure validation
 * (`validateCustomerImage`). This drives the real local-disk fallback path
 * end to end: write → the returned URL resolves to a real file on disk →
 * delete removes it. Confirms the size/type guards actually reject what they
 * claim to, not just in theory.
 */
import { loadEnv } from "./_env.ts";
loadEnv();

import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  uploadProductAsset,
  deleteProductAsset,
  assertValidUpload,
  uploadCustomerImage,
  deleteCustomerImage,
  MAX_IMAGE_BYTES,
  MAX_MODEL_BYTES,
} from "../src/lib/admin/storage.ts";
import { validateCustomerImage, MAX_CUSTOMER_IMAGE_BYTES } from "../src/lib/customization/validation.ts";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
const rec = (name: string, ok: boolean, detail?: string) => {
  checks.push({ name, ok, detail });
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (title: string) => console.log(`\n${title}\n${"-".repeat(title.length)}`);

function fakeFile(name: string, type: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

async function main() {
  section("Product image upload (local disk fallback)");
  const img = fakeFile("swatch.jpg", "image/jpeg", 2048);
  const imgAsset = await uploadProductAsset(img, { kind: "image", productSlug: "test-product" });
  rec("upload returns a local backend when Supabase isn't configured", imgAsset.backend === "local");
  rec("upload returns a public-relative URL", imgAsset.url.startsWith("/uploads/images/test-product/"));
  const imgOnDisk = join(process.cwd(), "public", imgAsset.path.replace(/^\//, ""));
  rec("the file actually exists on disk at the returned path", existsSync(imgOnDisk));
  rec("the written bytes match what was uploaded", readFileSync(imgOnDisk).length === 2048);

  await deleteProductAsset(imgAsset.path);
  rec("delete removes the file from disk", !existsSync(imgOnDisk));

  section("Product image validation");
  let rejectedOversize = false;
  try {
    assertValidUpload(fakeFile("huge.jpg", "image/jpeg", MAX_IMAGE_BYTES + 1), "image");
  } catch {
    rejectedOversize = true;
  }
  rec("an oversized image is rejected before it touches disk", rejectedOversize);

  let rejectedType = false;
  try {
    assertValidUpload(fakeFile("virus.exe", "application/x-msdownload", 100), "image");
  } catch {
    rejectedType = true;
  }
  rec("an unsupported file type is rejected", rejectedType);

  section("3D model upload (local disk fallback)");
  const model = fakeFile("flacon.glb", "model/gltf-binary", 4096);
  const modelAsset = await uploadProductAsset(model, { kind: "model", productSlug: "test-product" });
  rec("model upload lands under /uploads/models/", modelAsset.url.startsWith("/uploads/models/test-product/"));
  const modelOnDisk = join(process.cwd(), "public", modelAsset.path.replace(/^\//, ""));
  rec("the model file exists on disk", existsSync(modelOnDisk));
  await deleteProductAsset(modelAsset.path);
  rec("deleting the model removes it from disk", !existsSync(modelOnDisk));

  let rejectedOversizeModel = false;
  try {
    assertValidUpload(fakeFile("huge.glb", "model/gltf-binary", MAX_MODEL_BYTES + 1), "model");
  } catch {
    rejectedOversizeModel = true;
  }
  rec("an oversized model is rejected", rejectedOversizeModel);

  let rejectedModelExt = false;
  try {
    assertValidUpload(fakeFile("model.zip", "application/zip", 100), "model");
  } catch {
    rejectedModelExt = true;
  }
  rec("a non-.glb/.gltf file is rejected as a model", rejectedModelExt);

  section("Customer personalisation image upload (private-ish local path)");
  const customerImg = fakeFile("my-photo.png", "image/png", 1024);
  const preCheck = validateCustomerImage({ name: customerImg.name, type: customerImg.type, size: customerImg.size });
  rec("a valid customer image passes pre-upload validation", preCheck.ok);
  const customerAsset = await uploadCustomerImage(customerImg);
  rec("customer upload succeeds and lands under /uploads/custom/", customerAsset.url.startsWith("/uploads/custom/"));
  const customerOnDisk = join(process.cwd(), "public", customerAsset.path.replace(/^\//, ""));
  rec("the customer file exists on disk", existsSync(customerOnDisk));
  await deleteCustomerImage(customerAsset.path);
  rec("deleting the customer upload removes it from disk", !existsSync(customerOnDisk));

  const tooLarge = validateCustomerImage({ name: "big.jpg", type: "image/jpeg", size: MAX_CUSTOMER_IMAGE_BYTES + 1 });
  rec("an oversized customer image is rejected pre-upload", !tooLarge.ok);
  const wrongType = validateCustomerImage({ name: "doc.pdf", type: "application/pdf", size: 1024 });
  rec("a non-image customer file is rejected pre-upload", !wrongType.ok);

  // Best-effort cleanup of the parent directories the uploads created.
  try {
    rmSync(join(process.cwd(), "public", "uploads"), { recursive: true, force: true });
  } catch {
    /* fine either way */
  }

  const failed = checks.filter((c) => !c.ok);
  console.log("\n=======================================");
  console.log(`${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`));
    process.exit(1);
  }
  console.log("Upload paths (product images, 3D models, customer uploads) verified.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
