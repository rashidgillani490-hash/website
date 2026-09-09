/**
 * Centralised Supabase environment access.
 *
 * The public URL and anon key are safe to expose to the browser (they are
 * protected by Row Level Security). The service-role key is read ONLY here and
 * only ever imported from server-only modules — never shipped to the client.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

/** True when the public client can be constructed. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Server-only: the service-role key (bypasses RLS). */
export function getServiceRoleKey(): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

export const isSupabaseAdminConfigured = () =>
  isSupabaseConfigured && getServiceRoleKey() !== null;

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
}
