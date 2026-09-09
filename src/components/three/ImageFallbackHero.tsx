"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import type { Product } from "@/lib/types";
import { familyLine } from "@/lib/fragrance";

/**
 * The always-available, SSR-safe presentation of a fragrance — a cinematic
 * image hero. Shown when there is no 3D model, when WebGL/3D fails, on
 * save-data connections, and as the default before the 3D chunk mounts.
 */
export function ImageFallbackHero({
  product,
  reason,
}: {
  product: Product;
  reason?: "no-model" | "error" | "loading";
}) {
  const reduce = useReducedMotion();
  const img = product.images[0]?.src;

  return (
    <section className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-ink">
      {img ? (
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: reduce ? 1.02 : 1.14, opacity: 1 }}
          transition={{
            opacity: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
            scale: reduce
              ? { duration: 1.2 }
              : { duration: 18, ease: "linear", repeat: Infinity, repeatType: "reverse" },
          }}
        >
          <Image
            src={img}
            alt={product.images[0]?.alt ?? product.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 35%, ${product.accentColor}44, #0b0b0d 70%)`,
          }}
        />
      )}

      {/* Cinematic grading */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/30 to-ink" />
      <div
        className="absolute inset-0 opacity-50 mix-blend-soft-light"
        style={{
          background: `radial-gradient(60% 50% at 50% 40%, ${product.accentColor}55, transparent 70%)`,
        }}
      />
      <div className="grain absolute inset-0 opacity-[0.12] mix-blend-overlay" />

      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="text-[11px] uppercase tracking-luxe text-gold"
        >
          {product.concentration} · {familyLine(product) || product.gender}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 max-w-3xl text-balance text-5xl leading-[1.05] sm:text-7xl"
        >
          {product.name}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.55 }}
          className="mt-6 max-w-md text-pretty text-sm leading-relaxed text-bone/65 sm:text-base"
        >
          {product.tagline}
        </motion.p>
      </div>

      <div className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-2 text-[10px] uppercase tracking-luxe text-bone/40">
        <span>Scroll to discover</span>
        <ArrowDown size={14} className={reduce ? "" : "animate-bounce"} />
      </div>

      {reason === "error" ? (
        <span className="absolute right-4 top-4 rounded-full border border-bone/15 bg-ink/60 px-3 py-1 text-[9px] uppercase tracking-wide2 text-bone/40 backdrop-blur">
          Image mode
        </span>
      ) : null}
    </section>
  );
}
