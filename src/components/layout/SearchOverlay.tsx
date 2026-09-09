"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Search, X, ArrowRight, SearchX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { searchCatalogAction, type SearchHit } from "@/app/(site)/actions";
import { Price } from "@/components/ui/misc";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { cn } from "@/lib/utils";

const SUGGESTIONS = ["Vetiver", "Rose", "Oud", "Jasmine", "Amber", "Nocturne"];

/**
 * The site-wide quick-search: product name, fragrance family, category and
 * every note — the same `applyProductQuery` engine the /fragrances page uses,
 * so a hit here is never inconsistent with a full search there. Opens from
 * the header icon or ⌘K / Ctrl+K, closes on Escape or a backdrop click.
 */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  useEscapeKey(onClose, open);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (open) {
      // Wait a tick so the enter transition has started before stealing focus.
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    setQuery("");
    setHits([]);
    setTotal(0);
    setActiveIndex(-1);
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setActiveIndex(-1);
    const t = setTimeout(async () => {
      const res = await searchCatalogAction(q);
      // Guard against an in-flight request resolving after the query changed again.
      setQuery((current) => {
        if (current.trim() === res.query) {
          setHits(res.hits);
          setTotal(res.total);
        }
        return current;
      });
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function goToFullResults() {
    const q = query.trim();
    if (!q) return;
    onClose();
    router.push(`/fragrances?q=${encodeURIComponent(q)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown" && hits.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp" && hits.length > 0) {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = activeIndex >= 0 ? hits[activeIndex] : null;
      if (chosen) {
        onClose();
        router.push(`/fragrances/${chosen.slug}`);
      } else {
        goToFullResults();
      }
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-[90] bg-ink/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search fragrances"
            className="fixed inset-x-0 top-0 z-[95] mx-auto flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden border-b border-x border-bone/10 bg-ink shadow-2xl sm:top-[8vh] sm:border"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-bone/10 px-5 py-4">
              <Search size={18} className="shrink-0 text-bone/40" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                type="text"
                placeholder="Search fragrances, notes, families…"
                aria-label="Search"
                className="w-full bg-transparent text-base text-bone placeholder:text-bone/35 focus:outline-none"
              />
              {loading ? <Loader2 size={16} className="shrink-0 animate-spin text-bone/40" /> : null}
              <button
                onClick={onClose}
                aria-label="Close search"
                className="shrink-0 text-bone/40 transition-colors hover:text-bone"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {query.trim().length < 2 ? (
                <div className="flex flex-col gap-4 px-5 py-8">
                  <span className="text-[11px] uppercase tracking-luxe text-bone/35">
                    Try searching for
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setQuery(s)}
                        className="border border-bone/15 px-3.5 py-1.5 text-xs text-bone/60 transition-colors hover:border-gold/50 hover:text-gold"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : hits.length === 0 && !loading ? (
                <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
                  <SearchX size={26} className="text-bone/25" />
                  <p className="text-sm text-bone/50">
                    Nothing matches &ldquo;{query.trim()}&rdquo;.
                  </p>
                  <p className="text-xs text-bone/35">
                    Try a fragrance family, a note, or a shorter word.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-bone/5 py-2">
                  {hits.map((hit, i) => (
                    <li key={hit.slug}>
                      <Link
                        href={`/fragrances/${hit.slug}`}
                        onClick={onClose}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={cn(
                          "flex items-center gap-4 px-5 py-3 transition-colors",
                          activeIndex === i ? "bg-bone/[0.05]" : "hover:bg-bone/[0.03]",
                        )}
                      >
                        <span className="relative h-14 w-11 shrink-0 overflow-hidden bg-ink-soft">
                          {hit.image ? (
                            <Image src={hit.image} alt={hit.imageAlt} fill sizes="44px" className="object-cover" />
                          ) : null}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-serif text-base text-bone">{hit.name}</span>
                          <span className="truncate text-xs text-bone/45">
                            {hit.collectionName}
                            {hit.families.length ? ` · ${hit.families.slice(0, 2).join(", ")}` : ""}
                          </span>
                        </span>
                        <Price amount={hit.priceFrom} from className="shrink-0 text-xs text-bone/60" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {total > hits.length ? (
              <button
                onClick={goToFullResults}
                className="flex items-center justify-between border-t border-bone/10 px-5 py-4 text-xs uppercase tracking-wide2 text-gold transition-colors hover:bg-gold/[0.06]"
              >
                <span>View all {total} results</span>
                <ArrowRight size={14} />
              </button>
            ) : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
