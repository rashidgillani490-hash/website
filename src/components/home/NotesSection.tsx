"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Section, Container } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/Reveal";
import { NoteTag } from "@/components/ui/misc";
import type { OlfactiveFamily } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NotesSection({ families }: { families: OlfactiveFamily[] }) {
  const [active, setActive] = useState(0);
  const current = families[active];

  return (
    <Section className="border-b border-bone/10">
      <Container>
        <Reveal>
          <span className="eyebrow">The raw materials</span>
          <h2 className="mt-4 max-w-2xl text-3xl sm:text-4xl lg:text-[2.9rem]">
            Fragrance notes, drawn from our own fields
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-[260px_1fr]">
          <ul className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-0">
            {families.map((f, i) => (
              <li key={f.slug}>
                <button
                  onClick={() => setActive(i)}
                  className={cn(
                    "w-full border-b border-bone/10 py-3 text-left font-serif text-xl transition-colors lg:py-4",
                    i === active ? "text-gold" : "text-bone/40 hover:text-bone/80",
                  )}
                >
                  {f.name}
                </button>
              </li>
            ))}
          </ul>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.slug}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-6 border border-bone/10 bg-bone/[0.02] p-8 lg:p-12"
            >
              <span className="font-serif text-4xl text-bone/15">
                0{active + 1}
              </span>
              <p className="max-w-xl text-pretty text-lg leading-relaxed text-bone/70">
                {current.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {current.keyNotes.map((n) => (
                  <NoteTag key={n}>{n}</NoteTag>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </Container>
    </Section>
  );
}
