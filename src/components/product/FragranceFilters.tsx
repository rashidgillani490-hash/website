"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Collection, OlfactiveFamily } from "@/lib/types";
import { cn } from "@/lib/utils";

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top rated" },
];

const GENDERS = ["Feminine", "Masculine", "Unisex"];

const PRICE_BUCKETS: { label: string; min?: number; max?: number }[] = [
  { label: "Under Rs 15,000", max: 14999 },
  { label: "Rs 15,000 – 30,000", min: 15000, max: 30000 },
  { label: "Rs 30,000 – 50,000", min: 30001, max: 50000 },
  { label: "Over Rs 50,000", min: 50001 },
];

export function FragranceFilters({
  collections,
  families,
  sizes,
  total,
}: {
  collections: Collection[];
  families: OlfactiveFamily[];
  sizes: number[];
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(params.get("q") ?? "");

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || next.get(key) === value) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const setPriceBucket = useCallback(
    (bucket: (typeof PRICE_BUCKETS)[number]) => {
      const next = new URLSearchParams(params.toString());
      const isActive = params.get("priceMin") === String(bucket.min ?? "") && params.get("priceMax") === String(bucket.max ?? "");
      next.delete("priceMin");
      next.delete("priceMax");
      if (!isActive) {
        if (bucket.min !== undefined) next.set("priceMin", String(bucket.min));
        if (bucket.max !== undefined) next.set("priceMax", String(bucket.max));
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const toggleSize = useCallback(
    (ml: number) => {
      const current = params.getAll("size").map(Number);
      const next = new URLSearchParams(params.toString());
      next.delete("size");
      const updated = current.includes(ml) ? current.filter((s) => s !== ml) : [...current, ml];
      updated.forEach((s) => next.append("size", String(s)));
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  // Debounce the search box into the URL so typing doesn't refetch on every keystroke.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (searchInput === current) return;
    const t = setTimeout(() => setParam("q", searchInput.trim() || null), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const active = {
    q: params.get("q") ?? "",
    collection: params.get("collection"),
    family: params.get("family"),
    gender: params.get("gender"),
    sizes: params.getAll("size").map(Number),
    priceMin: params.get("priceMin"),
    priceMax: params.get("priceMax"),
    inStock: params.get("inStock") === "1",
    sort: params.get("sort") ?? "featured",
  };

  const activeCount = [
    active.collection,
    active.family,
    active.gender,
    active.priceMin || active.priceMax,
    active.sizes.length > 0,
    active.inStock,
  ].filter(Boolean).length;
  const hasFilters = activeCount > 0 || !!active.q;

  function clearAll() {
    setSearchInput("");
    router.replace(pathname, { scroll: false });
  }

  const body = (
    <div className="flex flex-col gap-8">
      <FilterGroup label="Search">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          type="search"
          placeholder="Name, family, note…"
          aria-label="Search fragrances"
          className="h-11 w-full border border-bone/20 bg-transparent px-4 text-sm text-bone placeholder:text-bone/35 transition-colors focus:border-gold focus:outline-none"
        />
      </FilterGroup>

      <FilterGroup label="Category">
        <div className="flex flex-wrap gap-2">
          {collections.map((c) => (
            <Chip key={c.slug} active={active.collection === c.slug} onClick={() => setParam("collection", c.slug)}>
              {c.name}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Fragrance family">
        <div className="flex flex-wrap gap-2">
          {families.map((f) => (
            <Chip key={f.slug} active={active.family === f.slug} onClick={() => setParam("family", f.slug)}>
              {f.name}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Price">
        <div className="flex flex-wrap gap-2">
          {PRICE_BUCKETS.map((b) => {
            const isActive =
              active.priceMin === (b.min !== undefined ? String(b.min) : null) &&
              active.priceMax === (b.max !== undefined ? String(b.max) : null);
            return (
              <Chip key={b.label} active={isActive} onClick={() => setPriceBucket(b)}>
                {b.label}
              </Chip>
            );
          })}
        </div>
      </FilterGroup>

      {sizes.length > 0 ? (
        <FilterGroup label="Bottle size">
          <div className="flex flex-wrap gap-2">
            {sizes.map((ml) => (
              <Chip key={ml} active={active.sizes.includes(ml)} onClick={() => toggleSize(ml)}>
                {ml}ml
              </Chip>
            ))}
          </div>
        </FilterGroup>
      ) : null}

      <FilterGroup label="Wear">
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => (
            <Chip key={g} active={active.gender === g} onClick={() => setParam("gender", g)}>
              {g}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Availability">
        <label className="flex w-fit cursor-pointer items-center gap-3 text-sm text-bone/70">
          <input
            type="checkbox"
            checked={active.inStock}
            onChange={(e) => setParam("inStock", e.target.checked ? "1" : null)}
            className="h-4 w-4 accent-gold"
          />
          In stock only
        </label>
      </FilterGroup>
    </div>
  );

  return (
    <>
      {/* ------------------------------------------------------- desktop */}
      <div className="hidden lg:block">{body}</div>

      {/* --------------------------------------------------------- mobile */}
      <div className="flex items-center justify-between gap-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 border border-bone/20 px-4 py-2.5 text-xs uppercase tracking-wide2 text-bone/80"
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeCount > 0 ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-ink">
              {activeCount}
            </span>
          ) : null}
        </button>
        <span className="text-xs text-bone/40">{total} fragrances</span>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              className="fixed inset-0 z-[80] bg-ink/70 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-[85] flex max-h-[85vh] flex-col rounded-t-lg border-t border-bone/10 bg-ink lg:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Filter fragrances"
            >
              <div className="flex items-center justify-between border-b border-bone/10 px-6 py-4">
                <h2 className="font-serif text-lg">Filters</h2>
                <button onClick={() => setMobileOpen(false)} aria-label="Close filters" className="text-bone/60">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6">{body}</div>
              <div className="flex items-center gap-3 border-t border-bone/10 px-6 py-4">
                {hasFilters ? (
                  <button onClick={clearAll} className="text-xs uppercase tracking-wide2 text-bone/50 hover:text-bone">
                    Clear all
                  </button>
                ) : null}
                <button
                  onClick={() => setMobileOpen(false)}
                  className="ml-auto flex-1 bg-bone px-6 py-3 text-center text-[11px] font-medium uppercase tracking-wide2 text-ink"
                >
                  Show {total} fragrances
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <div className="mt-8 hidden items-center justify-between gap-4 border-t border-bone/10 pt-6 lg:flex">
        <div className="flex items-center gap-4">
          <span className="text-xs text-bone/40">{total} fragrances</span>
          {hasFilters ? (
            <button onClick={clearAll} className="text-xs text-gold link-underline">
              Clear all
            </button>
          ) : null}
        </div>
        <SortSelect value={active.sort} onChange={(v) => setParam("sort", v)} />
      </div>

      <div className="mt-4 flex items-center justify-end lg:hidden">
        <SortSelect value={active.sort} onChange={(v) => setParam("sort", v)} />
      </div>
    </>
  );
}

function SortSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-3 text-xs text-bone/40">
      Sort
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none border border-bone/20 bg-ink px-3 py-2 text-xs text-bone focus:border-gold focus:outline-none"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] font-medium uppercase tracking-luxe text-bone/50">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "border px-4 py-2 text-xs transition-colors duration-300",
        active
          ? "border-gold bg-gold/10 text-gold"
          : "border-bone/15 text-bone/60 hover:border-bone/40 hover:text-bone",
      )}
    >
      {children}
    </button>
  );
}
