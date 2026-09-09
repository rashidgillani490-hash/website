import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, devBypassAvailable, isStaffRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin sign in", robots: { index: false } };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Already authorised → straight to the dashboard.
  const session = await getAdminSession();
  if (session && isStaffRole(session.role)) redirect("/admin");

  const bypass = devBypassAvailable();

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-10 block text-center">
          <span className="font-serif text-2xl tracking-wide2 text-bone">
            Maison Lumière
          </span>
          <span className="mt-1 block text-[10px] uppercase tracking-luxe text-gold/80">
            Admin console
          </span>
        </Link>

        {error === "forbidden" ? (
          <p className="mb-6 border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            That account doesn&apos;t have staff access.
          </p>
        ) : null}

        {bypass ? (
          <div className="flex flex-col gap-4 border border-gold/30 bg-gold/5 p-6 text-center">
            <p className="text-sm text-bone/70">
              Development bypass is active (<code className="text-gold">ADMIN_DEV_BYPASS</code>).
              Supabase auth is not configured.
            </p>
            <Link
              href="/admin"
              className="inline-flex h-11 items-center justify-center bg-bone px-6 text-[11px] font-medium uppercase tracking-wide2 text-ink"
            >
              Enter dashboard
            </Link>
          </div>
        ) : (
          <LoginForm configured={isSupabaseConfigured} />
        )}

        <p className="mt-8 text-center text-[11px] text-bone/30">
          <Link href="/" className="link-underline">
            ← Back to storefront
          </Link>
        </p>
      </div>
    </div>
  );
}
