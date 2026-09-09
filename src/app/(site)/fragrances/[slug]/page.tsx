import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getProductBySlug,
  getAllProductSlugs,
  getRelatedProducts,
  getCollectionBySlug,
} from "@/lib/cms";
import { Container } from "@/components/ui/primitives";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductFacts } from "@/components/product/ProductFacts";
import { PerfumeExperience } from "@/components/three/PerfumeExperience";
import { CURRENCY } from "@/lib/money";
import type { Product } from "@/lib/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** schema.org Product — lets search engines show price, availability and rating in results. */
function productJsonLd(product: Product) {
  const url = `${SITE_URL}/fragrances/${product.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription ?? product.tagline,
    image: product.images.map((i) => i.src),
    sku: product.baseSku ?? product.sizes[0]?.sku,
    brand: { "@type": "Brand", name: "Maison Lumière" },
    ...(product.perfumer ? { manufacturer: { "@type": "Organization", name: product.perfumer } } : {}),
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
    offers: product.sizes.map((size) => ({
      "@type": "Offer",
      url,
      priceCurrency: CURRENCY,
      price: size.price,
      availability:
        size.stock === null || size.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    })),
  };
}

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

/**
 * Demo phase: all products are known at build time, so an unknown slug is a
 * true 404. A later phase using Supabase can flip this to `true` and pair it
 * with on-demand revalidation when the client publishes a new fragrance.
 */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Fragrance not found", robots: { index: false } };

  const description = product.shortDescription ?? product.tagline;
  const image = product.images[0];
  return {
    title: product.name,
    description,
    alternates: { canonical: `/fragrances/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      url: `/fragrances/${product.slug}`,
      type: "website",
      images: image ? [{ url: image.src, alt: image.alt }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: image ? [image.src] : [],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, collection] = await Promise.all([
    getRelatedProducts(product, 3),
    getCollectionBySlug(product.collectionSlug),
  ]);

  return (
    <article className="relative">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
      />
      {/* Breadcrumb — overlaid on the experience */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <Container className="py-5">
          <nav
            aria-label="Breadcrumb"
            className="pointer-events-auto flex items-center gap-2 text-[11px] uppercase tracking-wide2 text-bone/40"
          >
            <Link href="/fragrances" className="hover:text-bone/80">
              Fragrances
            </Link>
            <span>/</span>
            {collection ? (
              <>
                <Link
                  href={`/fragrances?collection=${collection.slug}`}
                  className="hover:text-bone/80"
                >
                  {collection.name}
                </Link>
                <span>/</span>
              </>
            ) : null}
            <span className="text-bone/70">{product.name}</span>
          </nav>
        </Container>
      </div>

      {/* Cinematic 3D experience (with graceful fallbacks) */}
      <PerfumeExperience product={product} />

      {/* Everything the customer needs after the visual experience */}
      <ProductFacts product={product} collection={collection} />

      {related.length > 0 ? (
        <Container className="pb-28">
          <h2 className="text-2xl sm:text-3xl">You may also wear</h2>
          <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </Container>
      ) : null}
    </article>
  );
}
