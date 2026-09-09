import { Section, Container } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/Reveal";
import type { SiteContent } from "@/lib/types";

export function BrandIntro({ intro }: { intro: SiteContent["intro"] }) {
  return (
    <Section id="intro" className="border-b border-bone/10">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <Reveal>
            <span className="eyebrow">The house</span>
            <h2 className="mt-5 text-balance text-3xl leading-[1.15] sm:text-4xl">
              {intro.heading}
            </h2>
          </Reveal>
        </div>
        <div className="flex flex-col gap-6 lg:col-span-6 lg:col-start-7">
          {intro.body.map((para, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <p className="text-pretty text-base leading-relaxed text-bone/60 sm:text-lg">
                {para}
              </p>
            </Reveal>
          ))}
          <Reveal delay={0.2}>
            <div className="mt-4 flex flex-wrap gap-x-10 gap-y-4 border-t border-bone/10 pt-6 text-[11px] uppercase tracking-wide2 text-bone/45">
              <span>Grown in Grasse</span>
              <span>Distilled on site</span>
              <span>Hand-finished</span>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
