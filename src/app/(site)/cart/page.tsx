import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = {
  title: "Shopping bag",
  description: "Review the fragrances in your bag.",
};

export default function CartPage() {
  return (
    <div className="pb-28">
      <header className="border-b border-bone/10 py-14">
        <Container>
          <span className="eyebrow">Almost yours</span>
          <h1 className="mt-4 text-4xl sm:text-5xl">Shopping bag</h1>
        </Container>
      </header>
      <Container className="pt-14">
        <CartView />
      </Container>
    </div>
  );
}
