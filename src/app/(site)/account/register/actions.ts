"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { registerCustomer } from "@/lib/customer/local-accounts";
import {
  createCustomerSessionToken,
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_MAX_AGE_SECONDS,
} from "@/lib/customer/session-token";
import type { AccountAuthState } from "@/app/(site)/account/login/actions";

export async function registerAction(
  _prev: AccountAuthState,
  formData: FormData,
): Promise<AccountAuthState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const marketingOptIn = formData.get("marketingOptIn") === "on";

  if (fullName.length < 2) return { error: "Enter your full name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  if (isSupabaseConfigured) {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return { error: "Registration is unavailable right now." };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    });
    if (error) return { error: error.message };
    redirect("/account");
  }

  const result = registerCustomer({ email, password, fullName, phone, marketingOptIn });
  if (!result.ok) return { error: result.error };

  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, createCustomerSessionToken(result.account.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CUSTOMER_SESSION_MAX_AGE_SECONDS,
  });
  redirect("/account");
}
