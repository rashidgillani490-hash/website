import type { Metadata } from "next";
import Image from "next/image";
import { getSiteContent } from "@/lib/cms";
import { Container, Section } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/Reveal";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "The Maison",
  description:
    "Maison Lumière grows, distills and composes its own perfume materials in the hills above Grasse. Since 1976.",
  alternates: { canonical: "/about" },
};

const PROCESS = [
  {
    step: "01",
    title: "Grow",
    body: "Jasmine, centifolia rose and tuberose on fourteen hectares of maison-owned terraces. Picked before dawn, when the flower holds the most oil.",
  },
  {
    step: "02",
    title: "Distil",
    body: "Small-batch copper distillation and solvent extraction on site, within hours of the harvest. Nothing is shipped out as raw flower.",
  },
  {
    step: "03",
    title: "Compose",
    body: "Nine perfumers work from the maison's own essence library. No brief is accepted that can't be built from materials we control.",
  },
  {
    step: "04",
    title: "Age & finish",
    body: "Compositions rest in darkness for 90+ days, then each flacon is filled, stoppered, waxed and numbered by hand.",
  },
];

export default async function AboutPage() {
  const site = await getSiteContent();

  return (
    <div>
      {/* Hero */}
      <section className="relative flex min-h-[70vh] items-end overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1528465424850-54d22f092f9d?auto=format&fit=crop&w=2000&q=80"
          alt="Maison Lumière distillery"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/20" />
        <Container className="relative pb-16">
          <Reveal>
            <span className="eyebrow">Since 1976 · Grasse, France</span>
            <h1 className="mt-5 max-w-3xl text-balance text-4xl leading-[1.1] sm:text-6xl">
              One field. One distillery. One house.
            </h1>
          </Reveal>
        </Container>
      </section>

      {/* Intro */}
      <Section className="border-b border-bone/10">
        <Container className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <h2 className="text-3xl sm:text-4xl">{site.story.heading}</h2>
            </Reveal>
          </div>
          <div className="flex flex-col gap-6 lg:col-span-6 lg:col-start-7">
            {site.story.body.map((p, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <p className="text-pretty text-lg leading-relaxed text-bone/60">{p}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* Fields */}
      <Section id="fields" className="border-b border-bone/10 bg-ink-soft">
        <Container className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal direction="right">
            <div className="relative aspect-square overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1400&q=80"
                alt="Flower terraces above Grasse"
                fill
                className="object-cover"
              />
            </div>
          </Reveal>
          <div className="flex flex-col justify-center gap-6">
            <Reveal>
              <span className="eyebrow">The fields</span>
              <h2 className="mt-4 text-3xl sm:text-4xl">
                Grown, not sourced
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-pretty leading-relaxed text-bone/60">
                Most houses buy their absolutes on the open market. We grow ours.
                Fourteen hectares of terraces, farmed without synthetic pesticides,
                give us jasmine grandiflorum, centifolia rose, tuberose and orange
                blossom — picked by hand and in the still within the hour.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="text-pretty leading-relaxed text-bone/60">
                Controlling the crop means controlling the character: how green the
                rose reads, how indolic the jasmine turns. It is the difference you
                smell in every composition.
              </p>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* Process */}
      <Section className="border-b border-bone/10">
        <Container>
          <Reveal>
            <span className="eyebrow">From field to flacon</span>
            <h2 className="mt-4 text-3xl sm:text-4xl">The four movements</h2>
          </Reveal>
          <div className="mt-14 grid gap-px overflow-hidden border border-bone/10 bg-bone/10 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((p, i) => (
              <Reveal key={p.step} delay={(i % 4) * 0.08}>
                <div className="flex h-full flex-col gap-4 bg-ink p-8">
                  <span className="font-serif text-4xl text-gold/40">{p.step}</span>
                  <h3 className="font-serif text-xl">{p.title}</h3>
                  <p className="text-sm leading-relaxed text-bone/55">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* Values (reused) */}
      <WhyChooseUs values={site.values} />

      {/* Visit CTA */}
      <Section>
        <Container className="flex flex-col items-center gap-6 text-center">
          <Reveal>
            <span className="eyebrow">Come to Grasse</span>
            <h2 className="mt-4 max-w-xl text-balance text-3xl sm:text-4xl">
              Visit the atelier
            </h2>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-bone/55">
              {site.contact.hours}
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <Button href="/contact" variant="primary" size="lg">
              Request an appointment
            </Button>
          </Reveal>
        </Container>
      </Section>
    </div>
  );
}
