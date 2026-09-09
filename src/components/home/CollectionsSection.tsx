import Image from "next/image";
import Link from "next/link";
import { Section, Container } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/Reveal";
import type { Collection } from "@/lib/types";

export function CollectionsSection({ collections }: { collections: Collection[] }) {
  return (
    <Section className="border-b border-bone/10">
      <Container>
        <Reveal>
          <span className="eyebrow">Four lines, one field</span>
          <h2 className="mt-4 max-w-2xl text-3xl sm:text-4xl lg:text-[2.9rem]">
            Collections
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {collections.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.08}>
              <Link
                href={`/fragrances?collection=${c.slug}`}
                className="group relative block aspect-[3/4] overflow-hidden bg-ink-soft"
              >
                <Image
                  src={c.image}
                  alt={c.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover opacity-70 transition-all duration-[1200ms] ease-luxe group-hover:scale-105 group-hover:opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="text-[10px] uppercase tracking-luxe text-gold">
                    {c.subtitle}
                  </p>
                  <h3 className="mt-2 font-serif text-2xl text-bone">{c.name}</h3>
                  <p className="mt-2 max-h-0 overflow-hidden text-xs leading-relaxed text-bone/60 opacity-0 transition-all duration-500 ease-luxe group-hover:max-h-24 group-hover:opacity-100">
                    {c.description}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
