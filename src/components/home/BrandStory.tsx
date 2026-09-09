import Image from "next/image";
import { Section, Container } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import type { SiteContent } from "@/lib/types";

export function BrandStory({ story }: { story: SiteContent["story"] }) {
  return (
    <Section id="story" className="border-b border-bone/10">
      <Container className="grid gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal direction="right">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink-soft">
            <Image
              src="https://images.unsplash.com/photo-1528465424850-54d22f092f9d?auto=format&fit=crop&w=1200&q=80"
              alt="The maison distillery in Grasse"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-bone/10" />
          </div>
        </Reveal>

        <div className="flex flex-col justify-center gap-8">
          <Reveal>
            <span className="eyebrow">Our story</span>
            <h2 className="mt-4 text-balance text-3xl leading-[1.15] sm:text-4xl">
              {story.heading}
            </h2>
          </Reveal>
          {story.body.map((para, i) => (
            <Reveal key={i} delay={0.1 + i * 0.08}>
              <p className="text-pretty leading-relaxed text-bone/60">{para}</p>
            </Reveal>
          ))}

          <Reveal delay={0.3}>
            <dl className="mt-2 grid grid-cols-2 gap-6 border-t border-bone/10 pt-8 sm:grid-cols-4">
              {story.stats.map((s) => (
                <div key={s.label} className="flex flex-col gap-1">
                  <dt className="font-serif text-3xl text-gold">{s.value}</dt>
                  <dd className="text-[11px] uppercase tracking-wide2 text-bone/40">
                    {s.label}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={0.35}>
            <Button href="/about" variant="outline" size="md" className="mt-2 self-start">
              Read the full story
            </Button>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
