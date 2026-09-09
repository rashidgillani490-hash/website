import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/primitives";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Maison Lumière order.",
};

export default function CheckoutPage() {
  return (
    <div className="min-h-screen pb-28">
      <header className="border-b border-bone/10 py-8">
        <Container className="flex items-center justify-between">
          <Link href="/" className="font-serif text-lg tracking-wide2">
            Maison Lumière
          </Link>
          <Link
            href="/cart"
            className="text-[11px] uppercase tracking-wide2 text-bone/50 link-underline"
          >
            Return to bag
          </Link>
        </Container>
      </header>
      <Container className="pt-12">
        <CheckoutFlow />
      </Container>
    </div>
  );
}
