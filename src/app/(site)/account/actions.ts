"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireCustomer } from "@/lib/customer/auth";
import { updateCustomerProfile, changeCustomerPassword } from "@/lib/customer/local-accounts";

export interface AccountActionResult {
  ok: boolean;
  message: string;
}

function fail(err: unknown): AccountActionResult {
  return { ok: false, message: err instanceof Error ? err.message : String(err) };
}

export async function updateProfileAction(input: {
  fullName: string;
  phone: string | null;
  marketingOptIn: boolean;
}): Promise<AccountActionResult> {
  try {
    const session = await requireCustomer();
    const fullName = input.fullName.trim();
    if (fullName.length < 2) throw new Error("Enter your full name.");

    if (isSupabaseConfigured) {
      const supabase = await getSupabaseServerClient();
      if (!supabase) throw new Error("Profile updates are unavailable right now.");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: input.phone?.trim() || null,
          marketing_opt_in: input.marketingOptIn,
        })
        .eq("id", session.userId);
      if (error) throw new Error(error.message);
    } else {
      updateCustomerProfile(session.userId, {
        fullName,
        phone: input.phone,
        marketingOptIn: input.marketingOptIn,
      });
    }

    revalidatePath("/account");
    revalidatePath("/account/settings");
    return { ok: true, message: "Profile updated." };
  } catch (err) {
    return fail(err);
  }
}

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<AccountActionResult> {
  try {
    const session = await requireCustomer();
    if (input.newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters.");
    }

    if (isSupabaseConfigured) {
      const supabase = await getSupabaseServerClient();
      if (!supabase) throw new Error("Password changes are unavailable right now.");
      // Supabase's updateUser doesn't re-verify the current password itself —
      // re-authenticate with it first so a hijacked, still-open session can't
      // silently lock the real owner out.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: session.email,
        password: input.currentPassword,
      });
      if (reauthError) throw new Error("Current password is incorrect.");
      const { error } = await supabase.auth.updateUser({ password: input.newPassword });
      if (error) throw new Error(error.message);
    } else {
      const result = changeCustomerPassword(
        session.userId,
        input.currentPassword,
        input.newPassword,
      );
      if (!result.ok) throw new Error(result.error);
    }

    return { ok: true, message: "Password updated." };
  } catch (err) {
    return fail(err);
  }
}
