"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { verifyCustomerCredentials } from "@/lib/customer/local-accounts";
import {
  createCustomerSessionToken,
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_MAX_AGE_SECONDS,
} from "@/lib/customer/session-token";

export interface AccountAuthState {
  error?: string;
}

function safeRedirectTarget(raw: FormDataEntryValue | null): string {
  const value = String(raw ?? "");
  // Only ever redirect back into our own site — never follow an absolute or
  // protocol-relative URL a query string could smuggle in.
  return value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export async function signInAction(
  _prev: AccountAuthState,
  formData: FormData,
): Promise<AccountAuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectTarget(formData.get("redirect"));
  if (!email || !password) return { error: "Email and password are required." };

  if (isSupabaseConfigured) {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return { error: "Sign-in is unavailable right now." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Incorrect email or password." };
    redirect(redirectTo);
  }

  const result = verifyCustomerCredentials(email, password);
  if (!result.ok) return { error: result.error };

  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, createCustomerSessionToken(result.account.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CUSTOMER_SESSION_MAX_AGE_SECONDS,
  });
  redirect(redirectTo);
}

export async function signOutAction() {
  if (isSupabaseConfigured) {
    const supabase = await getSupabaseServerClient();
    if (supabase) await supabase.auth.signOut();
  } else {
    const cookieStore = await cookies();
    cookieStore.delete(CUSTOMER_SESSION_COOKIE);
  }
  redirect("/account/login");
}
