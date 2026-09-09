import {
  Leaf,
  FlaskConical,
  Sparkles,
  Recycle,
  Hand,
  Globe2,
  type LucideIcon,
} from "lucide-react";
import { Section, Container } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/Reveal";
import type { ValueProp } from "@/lib/types";

const ICONS: Record<ValueProp["icon"], LucideIcon> = {
  leaf: Leaf,
  flask: FlaskConical,
  sparkles: Sparkles,
  recycle: Recycle,
  hand: Hand,
  globe: Globe2,
};

export function WhyChooseUs({ values }: { values: ValueProp[] }) {
  return (
    <Section id="values" className="border-b border-bone/10 bg-ink-soft">
      <Container>
        <Reveal>
          <span className="eyebrow">Why Maison Lumière</span>
          <h2 className="mt-4 max-w-2xl text-3xl sm:text-4xl lg:text-[2.9rem]">
            A house built on control, not compromise
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-px overflow-hidden border border-bone/10 bg-bone/10 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((v, i) => {
            const Icon = ICONS[v.icon];
            return (
              <Reveal key={v.title} delay={(i % 3) * 0.08}>
                <div className="flex h-full flex-col gap-4 bg-ink-soft p-8 lg:p-10">
                  <Icon size={22} className="text-gold" strokeWidth={1.4} />
                  <h3 className="font-serif text-xl text-bone">{v.title}</h3>
                  <p className="text-sm leading-relaxed text-bone/55">
                    {v.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
