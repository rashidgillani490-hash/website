export default function Loading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6">
      <div className="relative h-12 w-12">
        <span className="absolute inset-0 animate-slow-spin rounded-full border border-bone/15 border-t-gold" />
      </div>
      <p className="text-[11px] uppercase tracking-luxe text-bone/40">
        Maison Lumière
      </p>
    </div>
  );
}
