import type { Collection, Product } from "@/lib/types";
import { Container } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/Reveal";
import { Rating, NoteTag, Price } from "@/components/ui/misc";
import { ProductGallery } from "./ProductGallery";
import { PersonaliseAndBuy } from "./PersonaliseAndBuy";
import { Accordion } from "@/components/ui/Accordion";
import { recommendedOccasions, familyLine } from "@/lib/fragrance";

/**
 * Everything a customer needs after the cinematic experience — story, family,
 * the full note pyramid, ingredients, performance, recommended occasions, and
 * the purchase panel (sizes / price / add to cart).
 */
export function ProductFacts({
  product,
  collection,
}: {
  product: Product;
  collection: Collection | null;
}) {
  const occasions = recommendedOccasions(product);
  const pyramid = [
    { label: "Top notes", notes: product.notes.top },
    { label: "Heart notes", notes: product.notes.heart },
    { label: "Base notes", notes: product.notes.base },
  ];
  const minPrice = Math.min(...product.sizes.map((s) => s.price));

  return (
    <div className="relative z-10 bg-ink pb-28">
      <Container className="grid gap-14 pt-20 sm:pt-28 lg:grid-cols-2 lg:gap-20">
        {/* Gallery */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <ProductGallery images={product.images} accent={product.accentColor} />
        </div>

        {/* Purchase + headline facts */}
        <div className="flex flex-col gap-8">
          <Reveal>
            <span className="text-[11px] uppercase tracking-luxe text-gold">
              {collection ? `${collection.name} · ` : ""}
              {product.concentration} · {product.gender}
            </span>
            <h2 className="mt-4 text-4xl sm:text-5xl">{product.name}</h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-bone/60">
              {product.tagline}
            </p>
            <div className="mt-4">
              <Rating value={product.rating} count={product.reviewCount} />
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <p className="text-pretty leading-relaxed text-bone/60">
              {product.shortDescription || product.description}
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex items-baseline gap-3 border-y border-bone/10 py-5">
              <Price amount={minPrice} from className="text-2xl text-bone" />
              <span className="text-xs text-bone/40">
                · {product.sizes.length} sizes from {product.sizes[0]?.ml}ml
              </span>
            </div>
          </Reveal>

          <PersonaliseAndBuy product={product} />
        </div>
      </Container>

      {/* Story */}
      <Container className="mt-24 grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <Reveal>
          <span className="eyebrow">The story</span>
          <h3 className="mt-4 text-3xl sm:text-4xl">Behind {product.name}</h3>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="text-pretty text-lg leading-relaxed text-bone/60">
            {product.story || product.description}
          </p>
        </Reveal>
      </Container>

      {/* Family + performance */}
      <Container className="mt-20">
        <Reveal>
          <div className="grid gap-px overflow-hidden border border-bone/10 bg-bone/10 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Fragrance family" value={familyLine(product) || "Signature"} />
            <Fact label="Longevity" value={product.longevity} />
            <Fact label="Sillage" value={product.sillage} />
            <Fact label="Perfumer" value={product.perfumer || "The maison"} />
          </div>
        </Reveal>
      </Container>

      {/* Note pyramid */}
      <Container className="mt-20 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <Reveal>
          <span className="eyebrow">The composition</span>
          <h3 className="mt-4 text-3xl sm:text-4xl">Note pyramid</h3>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-bone/55">
            How {product.name} unfolds on the skin over the first hours of wear.
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="flex flex-col divide-y divide-bone/10 border-y border-bone/10">
            {pyramid.map((tier) => (
              <div key={tier.label} className="flex flex-col gap-3 py-6">
                <span className="text-[11px] uppercase tracking-luxe text-gold">
                  {tier.label}
                </span>
                <div className="flex flex-wrap gap-2">
                  {tier.notes.length > 0 ? (
                    tier.notes.map((n) => <NoteTag key={n.name}>{n.name}</NoteTag>)
                  ) : (
                    <span className="text-xs text-bone/30">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </Container>

      {/* Occasions */}
      <Container className="mt-20">
        <Reveal>
          <span className="eyebrow">When to wear it</span>
          <h3 className="mt-4 text-3xl sm:text-4xl">Recommended occasions</h3>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {occasions.map((o) => (
              <span
                key={o}
                className="rounded-full border border-bone/15 bg-bone/[0.03] px-4 py-2 text-sm text-bone/70"
              >
                {o}
              </span>
            ))}
          </div>
        </Reveal>
      </Container>

      {/* Ingredients + care */}
      <Container className="mt-20 max-w-3xl">
        <Accordion
          defaultOpen="ingredients"
          items={[
            {
              id: "ingredients",
              title: "Ingredients",
              content: (
                <p>
                  {product.ingredients ||
                    "Alcohol Denat., Parfum (Fragrance), Aqua (Water), natural isolates from maison-distilled essences. A batch code on the base ties this bottle to its harvest. May contain Linalool, Limonene, Citral, Geraniol, Coumarin (naturally occurring in the essential oils)."}
                </p>
              ),
            },
            {
              id: "shipping",
              title: "Shipping & returns",
              content: (
                <p>
                  Complimentary carbon-neutral shipping on orders over $180.
                  Dispatched within 2 business days from Grasse. 30-day returns
                  on unopened flacons; discovery vials are non-returnable.
                </p>
              ),
            },
            {
              id: "refill",
              title: "The refill programme",
              content: (
                <p>
                  Return your empty flacon with the prepaid label included in
                  your order. We clean, re-engrave the batch code and refill it
                  at 20% below the price of a new bottle.
                </p>
              ),
            },
          ]}
        />
      </Container>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2 bg-ink p-6">
      <span className="text-[10px] uppercase tracking-wide2 text-bone/40">
        {label}
      </span>
      <span className="font-serif text-xl text-bone">{value}</span>
    </div>
  );
}
