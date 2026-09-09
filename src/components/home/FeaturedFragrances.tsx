import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section, Container } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/Reveal";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/lib/types";

export function FeaturedFragrances({ products }: { products: Product[] }) {
  return (
    <Section className="border-b border-bone/10">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal>
            <span className="eyebrow">The wardrobe</span>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-[2.9rem]">
              Featured fragrances
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <Link
              href="/fragrances"
              className="group flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide2 text-bone/60 transition-colors hover:text-bone"
            >
              View all
              <ArrowRight
                size={14}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </Reveal>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
