import "server-only";

import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import {
  validateCustomerImage,
  MAX_CUSTOMER_IMAGE_BYTES,
} from "@/lib/customization/validation";

export const MEDIA_BUCKET = "product-media";
export const CUSTOMER_BUCKET = "customer-uploads";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const MODEL_EXTENSIONS = [".glb", ".gltf"];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_MODEL_BYTES = 40 * 1024 * 1024; // 40 MB

export interface UploadedAsset {
  url: string;
  /** Storage path (Supabase) or public path (local) — kept for later deletion. */
  path: string;
  backend: "supabase" | "local";
}

function extensionFor(name: string, type: string): string {
  const dot = name.lastIndexOf(".");
  if (dot !== -1) return name.slice(dot).toLowerCase();
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/avif": ".avif",
    "model/gltf-binary": ".glb",
    "model/gltf+json": ".gltf",
  };
  return map[type] ?? "";
}

export function assertValidUpload(
  file: File,
  kind: "image" | "model",
): void {
  if (!file || file.size === 0) throw new Error("No file was provided.");
  const ext = extensionFor(file.name, file.type);
  if (kind === "image") {
    if (file.size > MAX_IMAGE_BYTES) throw new Error("Image exceeds the 8 MB limit.");
    const okType = IMAGE_TYPES.includes(file.type) || [".jpg", ".jpeg", ".png", ".webp", ".avif"].includes(ext);
    if (!okType) throw new Error("Unsupported image type. Use JPEG, PNG, WebP or AVIF.");
  } else {
    if (file.size > MAX_MODEL_BYTES) throw new Error("Model exceeds the 40 MB limit.");
    if (!MODEL_EXTENSIONS.includes(ext)) throw new Error("Unsupported model. Upload a .glb or .gltf file.");
  }
}

/**
 * Store an uploaded product asset.
 *
 *   • Supabase configured → Supabase Storage bucket `product-media` (public).
 *   • Otherwise           → `public/uploads/<kind>s/` so offline development can
 *                           still replace demo imagery / models with real files.
 */
export async function uploadProductAsset(
  file: File,
  opts: { kind: "image" | "model"; productSlug: string },
): Promise<UploadedAsset> {
  assertValidUpload(file, opts.kind);

  const ext = extensionFor(file.name, file.type) || (opts.kind === "model" ? ".glb" : ".bin");
  const folder = opts.kind === "image" ? "images" : "models";
  const key = `${folder}/${opts.productSlug}/${randomUUID()}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (isSupabaseAdminConfigured()) {
    const client = getSupabaseAdminClient();
    if (!client) throw new Error("Supabase admin client unavailable.");
    const { error } = await client.storage.from(MEDIA_BUCKET).upload(key, bytes, {
      contentType: file.type || (opts.kind === "model" ? "model/gltf-binary" : "application/octet-stream"),
      upsert: false,
    });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    const { data } = client.storage.from(MEDIA_BUCKET).getPublicUrl(key);
    return { url: data.publicUrl, path: key, backend: "supabase" };
  }

  // Local fallback
  const publicRel = join("uploads", folder, opts.productSlug);
  const dir = join(process.cwd(), "public", publicRel);
  await mkdir(dir, { recursive: true });
  const fileName = `${randomUUID()}${ext}`;
  await writeFile(join(dir, fileName), bytes);
  const url = `/${join(publicRel, fileName).replace(/\\/g, "/")}`;
  return { url, path: url, backend: "local" };
}

export async function deleteProductAsset(
  pathOrUrl: string | null | undefined,
): Promise<void> {
  return deleteFromBucket(MEDIA_BUCKET, pathOrUrl);
}

async function deleteFromBucket(
  bucket: string,
  pathOrUrl: string | null | undefined,
): Promise<void> {
  if (!pathOrUrl) return;

  if (isSupabaseAdminConfigured() && !pathOrUrl.startsWith("/uploads/")) {
    const client = getSupabaseAdminClient();
    if (!client) return;
    const marker = `/object/public/${bucket}/`;
    const key = pathOrUrl.includes(marker)
      ? pathOrUrl.slice(pathOrUrl.indexOf(marker) + marker.length)
      : pathOrUrl;
    await client.storage.from(bucket).remove([key]);
    return;
  }

  if (pathOrUrl.startsWith("/uploads/")) {
    try {
      await unlink(join(process.cwd(), "public", pathOrUrl.replace(/^\//, "")));
    } catch {
      /* already gone */
    }
  }
}

/* ------------------------------------------- customer personalisation images */

export type CustomerUpload = UploadedAsset;

/**
 * Store a customer-uploaded personalisation image.
 *
 * Validated (type + size) here as well as on the client. Written to the private
 * `customer-uploads` bucket via the service-role key at an unguessable path, or
 * to `public/uploads/custom/` when Supabase isn't configured.
 */
export async function uploadCustomerImage(file: File): Promise<CustomerUpload> {
  const check = validateCustomerImage({
    name: file?.name ?? "",
    type: file?.type ?? "",
    size: file?.size ?? 0,
  });
  if (!check.ok) throw new Error(check.error ?? "Invalid image.");
  if (file.size > MAX_CUSTOMER_IMAGE_BYTES) {
    throw new Error("Image exceeds the 5 MB limit.");
  }

  const ext = extensionFor(file.name, file.type) || ".jpg";
  const key = `${randomUUID()}/${randomUUID()}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (isSupabaseAdminConfigured()) {
    const client = getSupabaseAdminClient();
    if (!client) throw new Error("Supabase admin client unavailable.");
    const { error } = await client.storage
      .from(CUSTOMER_BUCKET)
      .upload(key, bytes, { contentType: file.type || "image/jpeg", upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const { data } = client.storage.from(CUSTOMER_BUCKET).getPublicUrl(key);
    return { url: data.publicUrl, path: key, backend: "supabase" };
  }

  const publicRel = join("uploads", "custom", key.split("/")[0]);
  const dir = join(process.cwd(), "public", publicRel);
  await mkdir(dir, { recursive: true });
  const fileName = key.split("/")[1];
  await writeFile(join(dir, fileName), bytes);
  const url = `/${join(publicRel, fileName).replace(/\\/g, "/")}`;
  return { url, path: url, backend: "local" };
}

export async function deleteCustomerImage(
  pathOrUrl: string | null | undefined,
): Promise<void> {
  return deleteFromBucket(CUSTOMER_BUCKET, pathOrUrl);
}
