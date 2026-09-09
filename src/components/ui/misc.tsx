"use client";

import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

export function Rating({
  value,
  count,
  size = 14,
  className,
}: {
  value: number;
  count?: number;
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex" aria-label={`Rated ${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            className={cn(
              i <= Math.round(value) ? "fill-gold text-gold" : "text-bone/25",
            )}
          />
        ))}
      </div>
      <span className="text-xs text-bone/50">
        {value.toFixed(1)}
        {count !== undefined ? ` · ${count} reviews` : ""}
      </span>
    </div>
  );
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="inline-flex h-11 items-center border border-bone/20">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-full w-11 text-lg text-bone/70 transition-colors hover:text-bone"
      >
        −
      </button>
      <span className="w-10 text-center text-sm tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-full w-11 text-lg text-bone/70 transition-colors hover:text-bone"
      >
        +
      </button>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 border border-dashed border-bone/15 px-6 py-20 text-center">
      {icon ? <div className="text-gold/70">{icon}</div> : null}
      <h3 className="text-xl">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-bone/50">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function NoteTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-bone/15 bg-bone/[0.03] px-3 py-1.5 text-xs text-bone/70">
      {children}
    </span>
  );
}

export function Price({
  amount,
  className,
  from,
}: {
  amount: number;
  className?: string;
  from?: boolean;
}) {
  return (
    <span className={cn("tabular-nums", className)}>
      {from ? <span className="text-bone/40">from </span> : null}
      {formatMoney(amount)}
    </span>
  );
}
