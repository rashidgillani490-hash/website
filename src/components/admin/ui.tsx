import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta?: string;
  hint?: string;
}) {
  const positive = delta?.startsWith("+");
  return (
    <div className="flex flex-col gap-2 border border-bone/10 bg-bone/[0.02] p-6">
      <span className="text-[11px] uppercase tracking-wide2 text-bone/40">
        {label}
      </span>
      <span className="font-serif text-3xl text-bone">{value}</span>
      {delta ? (
        <span
          className={cn(
            "text-xs",
            positive ? "text-emerald-400" : "text-red-400",
          )}
        >
          {delta} {hint ?? "vs. last month"}
        </span>
      ) : hint ? (
        <span className="text-xs text-bone/35">{hint}</span>
      ) : null}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border border-bone/10 bg-bone/[0.02]", className)}>
      <header className="flex items-center justify-between border-b border-bone/10 px-6 py-4">
        <h2 className="font-serif text-lg">{title}</h2>
        {action}
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-bone/10 text-[11px] uppercase tracking-wide2 text-bone/40">
            {columns.map((c) => (
              <th key={c} className="px-3 py-3 font-medium first:pl-0">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-bone/5">
          {rows.map((row, i) => (
            <tr key={i} className="transition-colors hover:bg-bone/[0.03]">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-4 first:pl-0 align-middle text-bone/75">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    {
      Published: "border-emerald-500/30 text-emerald-300 bg-emerald-500/10",
      Active: "border-emerald-500/30 text-emerald-300 bg-emerald-500/10",
      Draft: "border-bone/20 text-bone/50 bg-bone/5",
      "Low stock": "border-amber-500/30 text-amber-300 bg-amber-500/10",
      Processing: "border-blue-500/30 text-blue-300 bg-blue-500/10",
      Shipped: "border-gold/40 text-gold bg-gold/10",
      Delivered: "border-bone/20 text-bone/50 bg-bone/5",
      Cancelled: "border-red-500/30 text-red-300 bg-red-500/10",
    }[status] ?? "border-bone/20 text-bone/50 bg-bone/5";

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide2",
        tone,
      )}
    >
      {status}
    </span>
  );
}

export function MiniBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-40 items-end gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-sm bg-gradient-to-t from-gold/20 to-gold/70"
              style={{ height: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-bone/35">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
