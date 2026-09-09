import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";
import { LoginForm } from "@/components/account/LoginForm";
import { getCustomerSession } from "@/lib/customer/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function AccountLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectParam } = await searchParams;
  const redirectTo = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/account";

  const session = await getCustomerSession();
  if (session) redirect(redirectTo);

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-20">
      <Container className="flex justify-center">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <h1 className="font-serif text-3xl">Sign in</h1>
            <p className="mt-2 text-sm text-bone/45">
              Access your orders, tracking and profile.
            </p>
          </div>

          <LoginForm redirectTo={redirectTo} />

          <p className="mt-8 text-center text-sm text-bone/45">
            New to Maison Lumière?{" "}
            <Link href="/account/register" className="link-underline text-bone/70">
              Create an account
            </Link>
          </p>
          <p className="mt-3 text-center text-[11px] text-bone/30">
            <Link href="/" className="link-underline">
              ← Back to storefront
            </Link>
          </p>
        </div>
      </Container>
    </div>
  );
}
