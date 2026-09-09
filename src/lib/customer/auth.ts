import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCustomerById } from "./local-accounts";
import { verifyCustomerSessionToken, CUSTOMER_SESSION_COOKIE } from "./session-token";
import type { CustomerSession } from "./types";

/**
 * Resolve the current shopper, or `null`. Never redirects — use this for
 * conditional UI (e.g. "Sign in" vs "My account" in the header). Route
 * protection goes through `requireCustomer()`.
 *
 * Any authenticated account works here, staff included — /account is about
 * "am I signed in", not role. Role only gates /admin (`src/lib/auth.ts`).
 */
export async function getCustomerSession(): Promise<CustomerSession | null> {
  if (isSupabaseConfigured) {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return null;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, marketing_opt_in")
      .eq("id", user.id)
      .maybeSingle();

    return {
      userId: user.id,
      email: user.email ?? "",
      fullName: profile?.full_name ?? "",
      phone: profile?.phone ?? null,
      marketingOptIn: profile?.marketing_opt_in ?? false,
      mode: "supabase",
    };
  }

  let token: string | undefined;
  try {
    const cookieStore = await cookies();
    token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  } catch {
    // `cookies()` requires a request scope (a Server Component/Action/Route
    // Handler). Code that runs outside one — a script, a cron job — has no
    // session to read; treat it as "signed out" rather than throwing, so a
    // caller like `createOrderAction` still completes as a guest order.
    return null;
  }
  const customerId = verifyCustomerSessionToken(token);
  if (!customerId) return null;

  const account = getCustomerById(customerId);
  if (!account) return null; // token outlived the account (deleted, reset store, …)

  return {
    userId: account.id,
    email: account.email,
    fullName: account.fullName,
    phone: account.phone,
    marketingOptIn: account.marketingOptIn,
    mode: "local",
  };
}

/**
 * Server-side gate for every protected `/account` route. Redirects to the
 * sign-in page (preserving where the shopper was headed) when there is no
 * session — access is never granted by the client merely rendering a page.
 */
export async function requireCustomer(redirectTo = "/account"): Promise<CustomerSession> {
  const session = await getCustomerSession();
  if (!session) {
    const qs = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : "";
    redirect(`/account/login${qs}`);
  }
  return session;
}
