import "server-only";

import { getSupabaseAdminClient } from "./admin";
import { isSupabaseAdminConfigured } from "./env";
import type { Json } from "./database.types";

export interface MutationResult {
  ok: boolean;
  /** True when the write was actually persisted to Supabase. */
  persisted: boolean;
  message: string;
}

const NOT_CONFIGURED: MutationResult = {
  ok: true,
  persisted: false,
  message:
    "Saved in preview only — connect Supabase (service-role key) to persist changes.",
};

/**
 * Upsert a `store_settings` row. This is how the Admin Dashboard replaces the
 * demo site content / commerce configuration.
 */
export async function saveStoreSetting(
  key: string,
  value: Json,
  updatedBy?: string,
): Promise<MutationResult> {
  if (!isSupabaseAdminConfigured()) return NOT_CONFIGURED;
  const admin = getSupabaseAdminClient();
  if (!admin) return NOT_CONFIGURED;

  const { error } = await admin
    .from("store_settings")
    .upsert(
      { key, value, updated_by: updatedBy ?? null, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );

  if (error) {
    return { ok: false, persisted: false, message: error.message };
  }
  return { ok: true, persisted: true, message: "Changes published." };
}

/** Partial update of a product row by id. */
export async function updateProduct(
  id: string,
  patch: Record<string, unknown>,
): Promise<MutationResult> {
  if (!isSupabaseAdminConfigured()) return NOT_CONFIGURED;
  const admin = getSupabaseAdminClient();
  if (!admin) return NOT_CONFIGURED;

  const { error } = await admin
    .from("products")
    .update({ ...patch, updated_at: new Date().toISOString() } as never)
    .eq("id", id);

  if (error) {
    return { ok: false, persisted: false, message: error.message };
  }
  return { ok: true, persisted: true, message: "Product updated." };
}
