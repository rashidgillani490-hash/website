"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth";
import { getAdminRepo } from "@/lib/admin/repo";
import { uploadProductAsset, deleteProductAsset } from "@/lib/admin/storage";
import { parseCustomizationConfig } from "@/lib/customization/pricing";
import { slugify } from "@/lib/utils";
import type { SiteContent } from "@/lib/types";
import type { CommerceSettings } from "@/lib/commerce";
import type { ProductCustomizationConfig } from "@/lib/customization/types";
import type {
  CategoryInput,
  CouponInput,
  NoteInput,
  OrderStatusValue,
  ProductInput,
  ProductNoteEntry,
  VariantInput,
} from "@/lib/admin/records";

export interface ActionResult {
  ok: boolean;
  message: string;
  id?: string;
}

function ok(message: string, id?: string): ActionResult {
  return { ok: true, message, id };
}
function fail(err: unknown): ActionResult {
  return { ok: false, message: err instanceof Error ? err.message : String(err) };
}

function revalidateCatalog(slug?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/fragrances", "layout");
  revalidatePath("/admin/products");
  revalidatePath("/admin/media");
  if (slug) revalidatePath(`/fragrances/${slug}`);
}

/* ============================================================== Site content */

export async function saveSiteContentAction(content: SiteContent): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    await repo.saveSiteContent(content);
    revalidatePath("/", "layout");
    revalidatePath("/admin/content");
    revalidatePath("/admin/settings");
    return ok("Changes published.");
  } catch (err) {
    return fail(err);
  }
}

export async function saveCommerceSettingsAction(
  patch: Partial<CommerceSettings>,
): Promise<ActionResult> {
  try {
    await requireStaff();
    if (patch.shippingFeeCents !== undefined && (!Number.isFinite(patch.shippingFeeCents) || patch.shippingFeeCents < 0)) {
      throw new Error("Shipping fee must be zero or more.");
    }
    if (
      patch.freeShippingThresholdCents !== undefined &&
      (!Number.isFinite(patch.freeShippingThresholdCents) || patch.freeShippingThresholdCents < 0)
    ) {
      throw new Error("Free shipping threshold must be zero or more.");
    }
    const repo = await getAdminRepo();
    await repo.saveCommerceSettings(patch);
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    revalidatePath("/cart");
    revalidatePath("/checkout");
    return ok("Changes published.");
  } catch (err) {
    return fail(err);
  }
}

/* ================================================================= Products */

export async function createProductAction(input: ProductInput): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    const slug = input.slug ? slugify(input.slug) : slugify(input.name);
    if (!slug) throw new Error("A name or slug is required.");
    if (!input.name?.trim()) throw new Error("Product name is required.");
    const id = await repo.createProduct({ ...input, slug });
    revalidateCatalog(slug);
    return ok("Product created.", id);
  } catch (err) {
    return fail(err);
  }
}

export async function updateProductAction(
  id: string,
  patch: Partial<ProductInput>,
): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    if (patch.slug) patch.slug = slugify(patch.slug);
    await repo.updateProduct(id, patch);
    revalidateCatalog(patch.slug);
    return ok("Changes saved.");
  } catch (err) {
    return fail(err);
  }
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    const detail = await repo.getProduct(id);
    await repo.deleteProduct(id);
    // Best-effort cleanup of uploaded assets.
    for (const img of detail?.images ?? []) {
      await deleteProductAsset(img.storage_path ?? img.url);
    }
    for (const m of detail?.models ?? []) {
      await deleteProductAsset(m.storage_path ?? m.model_url);
    }
    revalidateCatalog(detail?.product.slug);
    return ok("Product deleted.");
  } catch (err) {
    return fail(err);
  }
}

export async function setProductStatusAction(
  id: string,
  status: "draft" | "active" | "archived",
): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    await repo.setProductStatus(id, status);
    revalidateCatalog();
    return ok(status === "active" ? "Product published." : `Product set to ${status}.`);
  } catch (err) {
    return fail(err);
  }
}

export async function setProductFeaturedAction(
  id: string,
  featured: boolean,
): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    await repo.setProductFeatured(id, featured);
    revalidateCatalog();
    return ok(featured ? "Added to featured." : "Removed from featured.");
  } catch (err) {
    return fail(err);
  }
}

/* ================================================================= Variants */

export async function saveVariantAction(
  productId: string,
  input: VariantInput,
): Promise<ActionResult> {
  try {
    await requireStaff();
    if (!input.sku?.trim()) throw new Error("SKU is required.");
    if (!Number.isFinite(input.volume_ml) || input.volume_ml <= 0)
      throw new Error("Bottle size (ml) must be a positive number.");
    if (!Number.isFinite(input.price_cents) || input.price_cents < 0)
      throw new Error("Price must be zero or more.");
    const repo = await getAdminRepo();
    const id = await repo.upsertVariant(productId, input);
    revalidateCatalog();
    return ok("Variant saved.", id);
  } catch (err) {
    return fail(err);
  }
}

export async function deleteVariantAction(
  productId: string,
  variantId: string,
): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    await repo.deleteVariant(productId, variantId);
    revalidateCatalog();
    return ok("Variant removed.");
  } catch (err) {
    return fail(err);
  }
}

/* =============================================================== Categories */

export async function saveCategoryAction(
  id: string | null,
  input: CategoryInput,
): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    const slug = input.slug ? slugify(input.slug) : slugify(input.name);
    if (!input.name?.trim()) throw new Error("Category name is required.");
    if (id) {
      await repo.updateCategory(id, { ...input, slug });
      revalidateCatalog();
      return ok("Category updated.", id);
    }
    const newId = await repo.createCategory({ ...input, slug });
    revalidateCatalog();
    return ok("Category created.", newId);
  } catch (err) {
    return fail(err);
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    await repo.deleteCategory(id);
    revalidateCatalog();
    return ok("Category deleted.");
  } catch (err) {
    return fail(err);
  }
}

/* ========================================================== Fragrance notes */

export async function saveNoteAction(
  id: string | null,
  input: NoteInput,
): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    if (!input.name?.trim()) throw new Error("Note name is required.");
    if (!input.family?.trim()) throw new Error("Olfactive family is required.");
    const slug = input.slug ? slugify(input.slug) : slugify(input.name);
    if (id) {
      await repo.updateNote(id, { ...input, slug });
      revalidatePath("/admin/notes");
      return ok("Note updated.", id);
    }
    const newId = await repo.createNote({ ...input, slug });
    revalidatePath("/admin/notes");
    return ok("Note created.", newId);
  } catch (err) {
    return fail(err);
  }
}

export async function deleteNoteAction(id: string): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    await repo.deleteNote(id);
    revalidatePath("/admin/notes");
    revalidateCatalog();
    return ok("Note deleted.");
  } catch (err) {
    return fail(err);
  }
}

export async function saveProductNotesAction(
  productId: string,
  entries: ProductNoteEntry[],
): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    await repo.setProductNotes(productId, entries);
    revalidateCatalog();
    return ok("Note pyramid saved.");
  } catch (err) {
    return fail(err);
  }
}

/* ============================================================ Customisation */

export async function saveCustomizationConfigAction(
  productId: string,
  config: ProductCustomizationConfig,
): Promise<ActionResult> {
  try {
    await requireStaff();
    // Re-parse/clamp so nothing malformed reaches the storefront pricer.
    const clean = parseCustomizationConfig(config as unknown);
    const repo = await getAdminRepo();
    await repo.updateProduct(productId, {
      customization: clean as unknown as Record<string, unknown>,
    });
    revalidateCatalog();
    return ok(clean.enabled ? "Customisation enabled & saved." : "Customisation saved.");
  } catch (err) {
    return fail(err);
  }
}

/* =================================================================== Orders */

function revalidateOrder(orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
}

export async function setOrderStatusAction(
  orderId: string,
  status: OrderStatusValue,
  note?: string | null,
): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    await repo.setOrderStatus(orderId, status, note);
    revalidateOrder(orderId);
    return ok(`Order marked ${status.replace(/_/g, " ")}.`);
  } catch (err) {
    return fail(err);
  }
}

export async function updateOrderTrackingAction(
  orderId: string,
  trackingNumber: string,
  trackingCarrier?: string | null,
  note?: string | null,
): Promise<ActionResult> {
  try {
    await requireStaff();
    if (!trackingNumber?.trim()) throw new Error("Tracking number is required.");
    const repo = await getAdminRepo();
    await repo.updateOrderTracking(orderId, { trackingNumber, trackingCarrier, note });
    revalidateOrder(orderId);
    return ok("Tracking information saved.");
  } catch (err) {
    return fail(err);
  }
}

export async function cancelOrderAction(
  orderId: string,
  note?: string | null,
): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    await repo.cancelOrder(orderId, note);
    revalidateOrder(orderId);
    return ok("Order cancelled and stock restored.");
  } catch (err) {
    return fail(err);
  }
}

/* =================================================================== Media */

export async function uploadImageAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireStaff();
    const productId = String(formData.get("productId") ?? "");
    const slug = String(formData.get("slug") ?? "product");
    const alt = String(formData.get("alt") ?? "");
    const file = formData.get("file");
    if (!productId) throw new Error("Missing product.");
    if (!(file instanceof File)) throw new Error("No image selected.");

    const asset = await uploadProductAsset(file, { kind: "image", productSlug: slug });
    const repo = await getAdminRepo();
    const id = await repo.addImage(productId, {
      url: asset.url,
      alt: alt || null,
      storage_path: asset.path,
    });
    revalidateCatalog(slug);
    return ok(`Image uploaded (${asset.backend}).`, id);
  } catch (err) {
    return fail(err);
  }
}

export async function deleteImageAction(
  productId: string,
  imageId: string,
): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    const detail = await repo.getProduct(productId);
    const img = detail?.images.find((i) => i.id === imageId);
    await repo.deleteImage(productId, imageId);
    if (img) await deleteProductAsset(img.storage_path ?? img.url);
    revalidateCatalog(detail?.product.slug);
    return ok("Image removed.");
  } catch (err) {
    return fail(err);
  }
}

export async function setPrimaryImageAction(
  productId: string,
  imageId: string,
): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    await repo.setPrimaryImage(productId, imageId);
    revalidateCatalog();
    return ok("Primary image updated.");
  } catch (err) {
    return fail(err);
  }
}

export async function moveImageAction(
  productId: string,
  imageId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    await repo.moveImage(productId, imageId, direction);
    revalidateCatalog();
    return ok("Order updated.");
  } catch (err) {
    return fail(err);
  }
}

export async function uploadModelAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireStaff();
    const productId = String(formData.get("productId") ?? "");
    const slug = String(formData.get("slug") ?? "product");
    const file = formData.get("file");
    if (!productId) throw new Error("Missing product.");
    if (!(file instanceof File)) throw new Error("No model selected.");

    const asset = await uploadProductAsset(file, { kind: "model", productSlug: slug });
    const format = file.name.toLowerCase().endsWith(".gltf") ? "gltf" : "glb";
    const repo = await getAdminRepo();
    const id = await repo.addModel(productId, {
      model_url: asset.url,
      format,
      storage_path: asset.path,
    });
    revalidateCatalog(slug);
    return ok(`3D model uploaded (${asset.backend}).`, id);
  } catch (err) {
    return fail(err);
  }
}

export async function deleteModelAction(
  productId: string,
  modelId: string,
): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    const detail = await repo.getProduct(productId);
    const model = detail?.models.find((m) => m.id === modelId);
    await repo.deleteModel(productId, modelId);
    if (model) await deleteProductAsset(model.storage_path ?? model.model_url);
    revalidateCatalog(detail?.product.slug);
    return ok("Model removed.");
  } catch (err) {
    return fail(err);
  }
}

export async function setActiveModelAction(
  productId: string,
  modelId: string,
): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    await repo.setActiveModel(productId, modelId);
    revalidateCatalog();
    return ok("Active model updated.");
  } catch (err) {
    return fail(err);
  }
}

/** The brand logo reuses the product-asset uploader under a fixed "brand" slug. */
export async function uploadLogoAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireStaff();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("No image selected.");
    const asset = await uploadProductAsset(file, { kind: "image", productSlug: "brand" });
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return ok(`Logo uploaded (${asset.backend}).`, asset.url);
  } catch (err) {
    return fail(err);
  }
}

/* =================================================================== Coupons */

function revalidateCoupons() {
  revalidatePath("/admin/coupons");
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function createCouponAction(input: CouponInput): Promise<ActionResult> {
  try {
    await requireStaff();
    if (!input.code?.trim()) throw new Error("Coupon code is required.");
    const repo = await getAdminRepo();
    const id = await repo.createCoupon(input);
    revalidateCoupons();
    return ok("Coupon created.", id);
  } catch (err) {
    return fail(err);
  }
}

export async function updateCouponAction(
  id: string,
  patch: Partial<CouponInput>,
): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    await repo.updateCoupon(id, patch);
    revalidateCoupons();
    return ok("Coupon updated.");
  } catch (err) {
    return fail(err);
  }
}

export async function deleteCouponAction(id: string): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    await repo.deleteCoupon(id);
    revalidateCoupons();
    return ok("Coupon deleted.");
  } catch (err) {
    return fail(err);
  }
}

export async function setCouponActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await requireStaff();
    const repo = await getAdminRepo();
    await repo.updateCoupon(id, { is_active: isActive });
    revalidateCoupons();
    return ok(isActive ? "Coupon activated." : "Coupon deactivated.");
  } catch (err) {
    return fail(err);
  }
}
