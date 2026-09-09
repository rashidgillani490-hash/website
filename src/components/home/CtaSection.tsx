import { Container } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden py-28 sm:py-36">
      <div
        className="absolute inset-0 bg-cover bg-fixed bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=2000&q=80')",
        }}
      />
      <div className="absolute inset-0 bg-ink/80" />
      <div className="grain absolute inset-0 opacity-[0.12] mix-blend-overlay" />

      <Container className="relative flex flex-col items-center text-center">
        <Reveal>
          <span className="eyebrow">Find your signature</span>
          <h2 className="mt-5 max-w-2xl text-balance text-3xl leading-[1.15] sm:text-5xl">
            Begin with a discovery set of five 2ml vials
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-bone/60">
            Try the wardrobe at home. The cost of the set is credited in full
            against your first full bottle.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button href="/fragrances" variant="primary" size="lg">
              Shop discovery sets
            </Button>
            <Button href="/contact" variant="outline" size="lg">
              Speak to an advisor
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
