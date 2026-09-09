import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";
import { RegisterForm } from "@/components/account/RegisterForm";
import { getCustomerSession } from "@/lib/customer/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: false } };

export default async function AccountRegisterPage() {
  const session = await getCustomerSession();
  if (session) redirect("/account");

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-20">
      <Container className="flex justify-center">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <h1 className="font-serif text-3xl">Create your account</h1>
            <p className="mt-2 text-sm text-bone/45">
              Track orders and check out faster next time.
            </p>
          </div>

          <RegisterForm />

          <p className="mt-8 text-center text-sm text-bone/45">
            Already have an account?{" "}
            <Link href="/account/login" className="link-underline text-bone/70">
              Sign in
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
