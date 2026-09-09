"use client";

import { useState } from "react";
import { Section, Container } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/Reveal";
import { ShowcaseCanvas } from "@/components/three/ShowcaseCanvas";
import { Button } from "@/components/ui/Button";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ShowcaseThree({ products }: { products: Product[] }) {
  const picks = products.slice(0, 4);
  const [active, setActive] = useState(0);
  const current = picks[active];

  return (
    <Section className="relative overflow-hidden border-b border-bone/10 bg-ink-soft">
      <div
        className="pointer-events-none absolute inset-0 opacity-30 transition-colors duration-1000"
        style={{
          background: `radial-gradient(60% 50% at 70% 40%, ${current.accentColor}22, transparent 70%)`,
        }}
      />
      <Container className="relative grid items-center gap-12 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <Reveal>
            <span className="eyebrow">Interactive · 3D</span>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-[2.9rem]">
              Turn the flacon in your hand
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-bone/55">
              Every {`Maison Lumière`} bottle is engraved glass, filled and waxed by
              hand. Drag to rotate, then choose a composition to see its light
              change.
            </p>
          </Reveal>

          <div className="mt-8 flex flex-col gap-2">
            {picks.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setActive(i)}
                className={cn(
                  "flex items-center justify-between border-b border-bone/10 py-4 text-left transition-colors",
                  i === active ? "text-bone" : "text-bone/40 hover:text-bone/70",
                )}
              >
                <span className="font-serif text-lg">{p.name}</span>
                <span className="flex items-center gap-3 text-[11px] uppercase tracking-wide2">
                  {p.families[0]}
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: p.accentColor }}
                  />
                </span>
              </button>
            ))}
          </div>

          <Button
            href={`/fragrances/${current.slug}`}
            variant="outline"
            size="md"
            className="mt-8"
          >
            Discover {current.name}
          </Button>
        </div>

        <div className="order-1 h-[420px] w-full sm:h-[520px] lg:order-2">
          <ShowcaseCanvas accent={current.accentColor} interactive className="h-full w-full" />
        </div>
      </Container>
    </Section>
  );
}
