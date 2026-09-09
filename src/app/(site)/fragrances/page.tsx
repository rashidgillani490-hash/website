import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getProducts,
  getCollections,
  getOlfactiveFamilies,
  type ProductQuery,
} from "@/lib/cms";
import { catalogSizes } from "@/lib/catalog-query";
import { Container } from "@/components/ui/primitives";
import { FragranceFilters } from "@/components/product/FragranceFilters";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { CollectionsRail } from "@/components/product/CollectionsRail";

export const metadata: Metadata = {
  title: "Fragrances",
  description:
    "The complete Maison Lumière wardrobe — signatures, after-dark compositions, garden scents and numbered archive editions.",
  alternates: { canonical: "/fragrances" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}
function asNumber(v: string | undefined): number | undefined {
  const n = Number(v);
  return v !== undefined && Number.isFinite(n) ? n : undefined;
}

export default async function FragrancesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const showCollections = first(sp.view) === "collections";
  const sizeParams = (Array.isArray(sp.size) ? sp.size : sp.size ? [sp.size] : [])
    .map(Number)
    .filter((n) => Number.isFinite(n));

  const query: ProductQuery = {
    collection: first(sp.collection),
    family: first(sp.family),
    gender: first(sp.gender) as ProductQuery["gender"],
    search: first(sp.q),
    sort: first(sp.sort) as ProductQuery["sort"],
    priceMin: asNumber(first(sp.priceMin)),
    priceMax: asNumber(first(sp.priceMax)),
    sizes: sizeParams.length > 0 ? sizeParams : undefined,
    inStockOnly: first(sp.inStock) === "1",
  };

  // The full, unfiltered catalog only for building filter option lists (every
  // bottle size on offer) — never for what's actually displayed.
  const [products, allProducts, collections, families] = await Promise.all([
    getProducts(query),
    getProducts({}),
    getCollections(),
    getOlfactiveFamilies(),
  ]);
  const sizes = catalogSizes(allProducts);

  return (
    <div className="pb-28">
      <header className="border-b border-bone/10 py-16 sm:py-20">
        <Container>
          <span className="eyebrow">The wardrobe</span>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl">
            {query.collection
              ? collections.find((c) => c.slug === query.collection)?.name ??
                "Fragrances"
              : "All fragrances"}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-bone/55">
            Each composition is built around a single material grown on the maison
            terraces, distilled on site and aged a full season before bottling.
          </p>
        </Container>
      </header>

      {showCollections ? (
        <Container className="pt-16">
          <CollectionsRail collections={collections} />
        </Container>
      ) : null}

      <Container className="grid gap-12 pt-16 lg:grid-cols-[280px_1fr] lg:gap-16">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <Suspense fallback={<div className="h-64" />}>
            <FragranceFilters
              collections={collections}
              families={families}
              sizes={sizes}
              total={products.length}
            />
          </Suspense>
        </aside>

        <div>
          <Suspense fallback={<ProductGridSkeleton />}>
            <ProductGrid products={products} />
          </Suspense>
        </div>
      </Container>
    </div>
  );
}
