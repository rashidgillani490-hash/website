import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";
import { AccountNav } from "@/components/account/AccountNav";
import { requireCustomer } from "@/lib/customer/auth";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

// Every account route is rendered per-request behind the auth gate.
export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCustomer();

  return (
    <div className="pb-28">
      <header className="border-b border-bone/10 py-14">
        <Container>
          <span className="eyebrow">My account</span>
          <h1 className="mt-4 text-4xl sm:text-5xl">
            Bonjour, {session.fullName.split(" ")[0] || "there"}
          </h1>
          <p className="mt-3 text-sm text-bone/45">{session.email}</p>
        </Container>
      </header>
      <Container className="grid gap-12 pt-14 lg:grid-cols-[240px_1fr] lg:gap-20">
        <AccountNav />
        <div>{children}</div>
      </Container>
    </div>
  );
}
