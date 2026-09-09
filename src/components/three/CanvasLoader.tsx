"use client";

import { Html, useProgress } from "@react-three/drei";

/** In-canvas loader (inside <Suspense>) — reports real asset progress. */
export function CanvasLoader() {
  const { progress, active } = useProgress();
  return (
    <Html center>
      <div className="flex w-48 flex-col items-center gap-3">
        <div className="h-px w-full overflow-hidden bg-bone/15">
          <div
            className="h-full bg-gold transition-[width] duration-300 ease-out"
            style={{ width: `${active ? progress : 100}%` }}
          />
        </div>
        <span className="text-[10px] uppercase tracking-luxe text-bone/40">
          {Math.round(progress)}%
        </span>
      </div>
    </Html>
  );
}
