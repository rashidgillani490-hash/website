"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/app/admin/actions";

/* --------------------------------------------------------------- feedback */

export function useActionRunner() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const run = useCallback(
    (fn: () => Promise<ActionResult>, onDone?: (r: ActionResult) => void) => {
      start(async () => {
        try {
          const r = await fn();
          setResult(r);
          onDone?.(r);
        } catch (e) {
          setResult({ ok: false, message: e instanceof Error ? e.message : String(e) });
        }
      });
    },
    [],
  );

  return { pending, result, setResult, run };
}

export function ResultNote({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <span
      className={cn(
        "text-xs",
        result.ok ? "text-emerald-400" : "text-red-400",
      )}
    >
      {result.message}
    </span>
  );
}

/* ----------------------------------------------------------------- buttons */

export function AdminButton({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "sm",
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "xs" | "sm";
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary: "bg-bone text-ink hover:bg-bone-soft",
    outline: "border border-bone/25 text-bone hover:border-bone/50",
    ghost: "text-bone/60 hover:text-bone",
    danger: "border border-red-500/40 text-red-300 hover:bg-red-500/10",
  }[variant];
  const sizing = size === "xs" ? "h-8 px-3 text-[10px]" : "h-9 px-4 text-[11px]";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-medium uppercase tracking-wide2 transition-colors disabled:opacity-40",
        styles,
        sizing,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function ConfirmButton({
  onConfirm,
  label = "Delete",
  confirmLabel = "Confirm",
  message = "This cannot be undone.",
  variant = "danger",
  size = "xs",
}: {
  onConfirm: () => void;
  label?: string;
  confirmLabel?: string;
  message?: string;
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "xs" | "sm";
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  if (armed) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="text-[10px] text-bone/40">{message}</span>
        <AdminButton variant="danger" size={size} onClick={onConfirm}>
          {confirmLabel}
        </AdminButton>
        <AdminButton variant="ghost" size={size} onClick={() => setArmed(false)}>
          Cancel
        </AdminButton>
      </span>
    );
  }
  return (
    <AdminButton variant={variant} size={size} onClick={() => setArmed(true)}>
      {label}
    </AdminButton>
  );
}

export function Spinner() {
  return <Loader2 size={14} className="animate-spin" />;
}

/* -------------------------------------------------- URL-driven toolbar */

export interface FilterSelect {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

export function TableToolbar({
  searchPlaceholder = "Search…",
  filters = [],
  rightSlot,
}: {
  searchPlaceholder?: string;
  filters?: FilterSelect[];
  rightSlot?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const push = useCallback(
    (mut: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mut(next);
      next.delete("page");
      start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
    },
    [params, pathname, router],
  );

  // debounce search
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => {
      push((p) => (q ? p.set("q", q) : p.delete("q")));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 w-56 border border-bone/20 bg-transparent px-3 text-sm text-bone placeholder:text-bone/30 focus:border-gold focus:outline-none"
        />
        {pending ? (
          <Loader2
            size={13}
            className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-bone/40"
          />
        ) : null}
      </div>

      {filters.map((f) => (
        <select
          key={f.name}
          value={params.get(f.name) ?? "all"}
          onChange={(e) =>
            push((p) =>
              e.target.value === "all" ? p.delete(f.name) : p.set(f.name, e.target.value),
            )
          }
          className="h-9 border border-bone/20 bg-ink px-2 text-xs text-bone focus:border-gold focus:outline-none"
          aria-label={f.label}
        >
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}

      {(params.get("q") || filters.some((f) => params.get(f.name))) && (
        <button
          onClick={() => start(() => router.replace(pathname, { scroll: false }))}
          className="text-xs text-gold link-underline"
        >
          Clear
        </button>
      )}

      <div className="ml-auto">{rightSlot}</div>
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
}: {
  page: number;
  pageCount: number;
  total: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const href = (p: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    return `${pathname}?${next.toString()}`;
  };
  if (pageCount <= 1) {
    return <p className="text-xs text-bone/35">{total} total</p>;
  }
  return (
    <div className="flex items-center justify-between text-xs text-bone/40">
      <span>{total} total</span>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="border border-bone/20 px-3 py-1.5 hover:border-bone/50">
            Prev
          </Link>
        ) : null}
        <span className="px-2">
          Page {page} / {pageCount}
        </span>
        {page < pageCount ? (
          <Link href={href(page + 1)} className="border border-bone/20 px-3 py-1.5 hover:border-bone/50">
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}
