import "server-only";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { UserRole } from "@/lib/supabase/database.types";

export interface AdminSession {
  userId: string;
  email: string | null;
  role: UserRole;
  /** How the session was established. */
  mode: "supabase" | "dev-bypass";
}

const STAFF_ROLES: UserRole[] = ["staff", "admin"];

/**
 * Dev-only escape hatch so the Admin Dashboard is usable before Supabase Auth
 * is wired. Deliberately refuses to engage in production or when Supabase IS
 * configured (in which case real auth must be used).
 */
function devBypassEnabled(): boolean {
  return (
    process.env.ADMIN_DEV_BYPASS === "true" &&
    !isSupabaseConfigured &&
    process.env.NODE_ENV !== "production"
  );
}

/**
 * Resolve the current admin session, or `null`. Never redirects — use this for
 * conditional UI. Route protection goes through `requireStaff()`.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  if (isSupabaseConfigured) {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return null;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    return {
      userId: user.id,
      email: user.email ?? null,
      role: (profile?.role as UserRole | undefined) ?? "customer",
      mode: "supabase",
    };
  }

  if (devBypassEnabled()) {
    return {
      userId: "dev-admin",
      email: "admin@localhost",
      role: "admin",
      mode: "dev-bypass",
    };
  }

  return null;
}

export function isStaffRole(role: UserRole | undefined | null): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

/**
 * Server-side gate for every /admin route and every admin Server Action.
 * Redirects unauthenticated / unauthorised callers — access is NEVER granted by
 * the client merely rendering a page.
 */
export async function requireStaff(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  if (!isStaffRole(session.role)) {
    redirect("/admin/login?error=forbidden");
  }
  return session;
}

/** Whether an admin login screen should offer the dev bypass hint. */
export function devBypassAvailable(): boolean {
  return devBypassEnabled();
}
