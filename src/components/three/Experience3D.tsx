"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowDown } from "lucide-react";
import { CinematicCanvas } from "./CinematicCanvas";
import type { Product } from "@/lib/types";
import { familyLine } from "@/lib/fragrance";

/**
 * The scroll-choreographed cinematic experience. A tall section provides the
 * scroll distance; the canvas is sticky inside it. Framer Motion's scroll
 * progress is smoothed and written to a ref that the R3F rig reads per frame
 * (no React re-renders during scroll).
 */
export function Experience3D({
  product,
  mode,
  isMobile,
  onFail,
}: {
  product: Product;
  mode: "cinematic" | "static";
  isMobile: boolean;
  onFail: () => void;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.4,
  });
  useMotionValueEvent(smooth, "change", (v) => {
    progressRef.current = v;
  });

  const cinematic = mode === "cinematic";
  const pages = cinematic ? (isMobile ? 2.6 : 3.4) : 1;

  const cap1 = useTransform(smooth, [0.0, 0.08, 0.18, 0.28], [0, 1, 1, 0]);
  const cap2 = useTransform(smooth, [0.3, 0.4, 0.52, 0.62], [0, 1, 1, 0]);
  const cap3 = useTransform(smooth, [0.62, 0.72, 0.8, 0.88], [0, 1, 1, 0]);
  const nameReveal = useTransform(smooth, [0.84, 0.96], [0, 1]);
  const nameY = useTransform(smooth, [0.84, 0.96], [24, 0]);
  const cueOpacity = useTransform(smooth, [0, 0.06], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative bg-ink"
      style={{ height: `${pages * 100}vh` }}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <CinematicCanvas
          modelUrl={product.modelUrl ?? undefined}
          accent={product.accentColor}
          mode={mode}
          isMobile={isMobile}
          progressRef={progressRef}
          onFail={onFail}
        />

        {/* cinematic grading over the canvas */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(11,11,13,0.72)_100%)]" />
        <div className="grain pointer-events-none absolute inset-0 opacity-[0.1] mix-blend-overlay" />

        {/* eyebrow */}
        <div className="pointer-events-none absolute inset-x-0 top-10 flex justify-center">
          <span className="text-[11px] uppercase tracking-luxe text-gold">
            {product.concentration}
            {familyLine(product) ? ` · ${familyLine(product)}` : ""}
          </span>
        </div>

        {cinematic ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-28 px-6">
            <div className="relative mx-auto h-16 max-w-2xl text-center">
              <motion.p
                style={{ opacity: cap1 }}
                className="absolute inset-x-0 font-serif text-2xl text-bone sm:text-4xl"
              >
                The flacon
              </motion.p>
              <motion.p
                style={{ opacity: cap2 }}
                className="absolute inset-x-0 font-serif text-2xl text-bone sm:text-4xl"
              >
                Hand-finished glass, waxed &amp; numbered
              </motion.p>
              <motion.p
                style={{ opacity: cap3 }}
                className="absolute inset-x-0 font-serif text-2xl text-bone sm:text-4xl"
              >
                One press releases the composition
              </motion.p>
            </div>
          </div>
        ) : null}

        {/* final name reveal (always shown in static mode) */}
        <motion.div
          style={{ opacity: cinematic ? nameReveal : 1, y: cinematic ? nameY : 0 }}
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center"
        >
          <h1 className="text-balance text-5xl leading-[1.05] text-bone sm:text-7xl">
            {product.name}
          </h1>
          <p className="max-w-md text-pretty text-sm leading-relaxed text-bone/60 sm:text-base">
            {product.tagline}
          </p>
        </motion.div>

        {/* scroll cue */}
        <motion.div
          style={{ opacity: cinematic ? cueOpacity : 0 }}
          className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-2 text-[10px] uppercase tracking-luxe text-bone/40"
        >
          <span>Scroll to explore</span>
          <ArrowDown size={14} className="animate-bounce" />
        </motion.div>
      </div>
    </section>
  );
}
