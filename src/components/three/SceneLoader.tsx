"use client";

/**
 * Plain loader (no R3F / drei dependency) used by `next/dynamic` while the
 * cinematic chunk downloads. The in-canvas asset-progress loader lives in
 * `CanvasLoader.tsx` so it isn't pulled into the light entry bundle.
 */
export function SceneLoader({ label = "Preparing the flacon" }: { label?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-ink">
      <span className="font-serif text-lg tracking-wide2 text-bone/80">
        Maison Lumière
      </span>
      <div className="h-px w-40 overflow-hidden bg-bone/15">
        <div className="h-full w-1/3 animate-[shimmer_1.4s_ease-in-out_infinite] bg-gold" />
      </div>
      <span className="text-[10px] uppercase tracking-luxe text-bone/40">{label}</span>
    </div>
  );
}
