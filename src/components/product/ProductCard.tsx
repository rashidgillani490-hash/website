"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Product } from "@/lib/types";
import { Price } from "@/components/ui/misc";
import { isProductInStock } from "@/lib/catalog-query";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  index = 0,
  priority = false,
}: {
  product: Product;
  index?: number;
  priority?: boolean;
}) {
  const min = Math.min(...product.sizes.map((s) => s.price));
  const totalStock = product.sizes.reduce((n, s) => n + (s.stock ?? Infinity), 0);
  const inStock = isProductInStock(product);
  const lowStock = inStock && totalStock > 0 && totalStock <= 5;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      <Link href={`/fragrances/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-ink-soft">
          <Image
            src={product.images[0].src}
            alt={product.images[0].alt}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-[1200ms] ease-luxe group-hover:scale-105"
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-700 group-hover:opacity-100"
            style={{ background: `radial-gradient(circle at 50% 30%, ${product.accentColor}, transparent 70%)` }}
          />
          <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center justify-between p-4 opacity-0 transition-all duration-500 ease-luxe group-hover:translate-y-0 group-hover:opacity-100">
            <span className="bg-bone px-4 py-2 text-[10px] font-medium uppercase tracking-wide2 text-ink">
              View fragrance
            </span>
          </div>
          <div className="absolute left-4 top-4 flex gap-2">
            {product.isNew ? (
              <span className="bg-gold px-2.5 py-1 text-[9px] font-medium uppercase tracking-wide2 text-ink">
                New
              </span>
            ) : null}
            {product.collectionSlug === "archive" ? (
              <span className="border border-bone/40 bg-ink/60 px-2.5 py-1 text-[9px] font-medium uppercase tracking-wide2 text-bone backdrop-blur">
                Numbered
              </span>
            ) : null}
          </div>
          {!inStock ? (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/50">
              <span className="border border-bone/40 bg-ink/80 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide2 text-bone backdrop-blur">
                Out of stock
              </span>
            </div>
          ) : lowStock ? (
            <span className="absolute right-4 top-4 bg-ink/70 px-2.5 py-1 text-[9px] font-medium uppercase tracking-wide2 text-amber-200 backdrop-blur">
              Only {totalStock} left
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5 pt-4">
          <span className="text-[10px] uppercase tracking-luxe text-gold">
            {product.concentration}
          </span>
          <h3 className="font-serif text-xl text-bone">{product.name}</h3>
          <p className="line-clamp-1 text-xs text-bone/50">{product.tagline}</p>
          <div className="mt-1 flex items-center gap-3 text-xs text-bone/70">
            <Price amount={min} from />
            <span className="text-bone/20">·</span>
            <span className={cn("text-bone/50")}>
              {product.families.slice(0, 2).map((f) => cap(f)).join(" / ")}
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
