/**
 * Customer-image upload validation. Used on BOTH sides: the client checks
 * before uploading for instant feedback; the server action re-checks the real
 * `File` before it touches Storage. Never rely on the client result alone.
 */

export const CUSTOMER_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const CUSTOMER_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;
export const MAX_CUSTOMER_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MIN_CUSTOMER_IMAGE_BYTES = 64; // reject truncated / empty

export interface FileMeta {
  name: string;
  type: string;
  size: number;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateCustomerImage(file: FileMeta | null | undefined): ValidationResult {
  if (!file) return { ok: false, error: "No file selected." };
  if (file.size < MIN_CUSTOMER_IMAGE_BYTES) {
    return { ok: false, error: "That file looks empty or corrupt." };
  }
  if (file.size > MAX_CUSTOMER_IMAGE_BYTES) {
    return {
      ok: false,
      error: `Image is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 5 MB.`,
    };
  }
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const typeOk = (CUSTOMER_IMAGE_TYPES as readonly string[]).includes(file.type);
  const extOk = (CUSTOMER_IMAGE_EXTENSIONS as readonly string[]).includes(ext);
  if (!typeOk && !extOk) {
    return { ok: false, error: "Please upload a JPEG, PNG or WebP image." };
  }
  return { ok: true };
}
