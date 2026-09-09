"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Section, Container } from "@/components/ui/primitives";
import { Rating } from "@/components/ui/misc";
import type { Testimonial } from "@/lib/types";

export function Testimonials({ items }: { items: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const count = items.length;

  const go = useCallback(
    (dir: number) => setIndex((i) => (i + dir + count) % count),
    [count],
  );

  useEffect(() => {
    const t = setInterval(() => go(1), 7000);
    return () => clearInterval(t);
  }, [go]);

  const current = items[index];

  return (
    <Section className="border-b border-bone/10">
      <Container className="flex flex-col items-center text-center">
        <span className="eyebrow">In their words</span>
        <Quote size={32} className="mt-8 text-gold/40" />

        <div className="relative mt-6 min-h-[220px] w-full max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.blockquote
              key={current.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-6"
            >
              <p className="text-balance font-serif text-2xl leading-snug text-bone/90 sm:text-3xl">
                &ldquo;{current.quote}&rdquo;
              </p>
              <footer className="flex flex-col items-center gap-2">
                <Rating value={current.rating} />
                <cite className="not-italic text-sm text-bone/50">
                  {current.author} — {current.location}
                </cite>
              </footer>
            </motion.blockquote>
          </AnimatePresence>
        </div>

        <div className="mt-10 flex items-center gap-6">
          <button
            onClick={() => go(-1)}
            aria-label="Previous testimonial"
            className="text-bone/40 transition-colors hover:text-bone"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? "w-6 bg-gold" : "w-1.5 bg-bone/20"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => go(1)}
            aria-label="Next testimonial"
            className="text-bone/40 transition-colors hover:text-bone"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </Container>
    </Section>
  );
}
