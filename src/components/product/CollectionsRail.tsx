import Image from "next/image";
import Link from "next/link";
import type { Collection } from "@/lib/types";

export function CollectionsRail({ collections }: { collections: Collection[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl">Browse by collection</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {collections.map((c) => (
          <Link
            key={c.id}
            href={`/fragrances?collection=${c.slug}`}
            className="group relative block aspect-video overflow-hidden bg-ink-soft"
          >
            <Image
              src={c.image}
              alt={c.name}
              fill
              sizes="(max-width: 1024px) 50vw, 25vw"
              className="object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
            <div className="absolute bottom-0 left-0 p-4">
              <p className="text-[10px] uppercase tracking-luxe text-gold">
                {c.subtitle}
              </p>
              <h3 className="font-serif text-lg">{c.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
