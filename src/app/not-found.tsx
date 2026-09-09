import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="container-luxe flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <span className="font-serif text-7xl text-gold/70">404</span>
      <h1 className="text-3xl sm:text-4xl">This page has evaporated</h1>
      <p className="max-w-md text-sm text-bone/50">
        The fragrance or page you&apos;re looking for isn&apos;t here. It may have
        moved to the archive.
      </p>
      <div className="mt-2 flex gap-3">
        <Button href="/fragrances" variant="primary" size="md">
          Browse fragrances
        </Button>
        <Button href="/" variant="outline" size="md">
          Back to home
        </Button>
      </div>
    </div>
  );
}
