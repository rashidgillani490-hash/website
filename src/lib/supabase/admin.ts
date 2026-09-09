import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SUPABASE_URL, getServiceRoleKey } from "./env";

let adminClient: SupabaseClient<Database> | null = null;

/**
 * Service-role Supabase client — BYPASSES Row Level Security.
 *
 * Use only for trusted server-side work: seeding, admin dashboard mutations,
 * webhooks, guest-cart handling. Never import this from a Client Component.
 * Returns `null` when the service-role key is not set.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  const serviceKey = getServiceRoleKey();
  if (!SUPABASE_URL || !serviceKey) return null;

  if (!adminClient) {
    adminClient = createClient<Database>(SUPABASE_URL, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}
