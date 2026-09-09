"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Gauge,
  FlaskConical,
  Layers,
  Sparkles,
  Receipt,
  Users,
  Type,
  Image as ImageIcon,
  Settings,
  Tag,
  Menu,
  X,
  ExternalLink,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { adminNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/admin/login/actions";

const ICONS: Record<string, LucideIcon> = {
  gauge: Gauge,
  flask: FlaskConical,
  layers: Layers,
  sparkles: Sparkles,
  receipt: Receipt,
  users: Users,
  text: Type,
  image: ImageIcon,
  settings: Settings,
  tag: Tag,
};

export function AdminShell({
  children,
  email,
  mode,
  backend,
}: {
  children: React.ReactNode;
  email?: string | null;
  mode?: "supabase" | "dev-bypass";
  backend?: "supabase" | "local";
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const current =
    [...adminNav]
      .sort((a, b) => b.href.length - a.href.length)
      .find(
        (n) => n.href === pathname || (n.href !== "/admin" && pathname.startsWith(n.href)),
      ) ?? adminNav[0];

  const initials = (email ?? "AL")
    .replace(/@.*/, "")
    .split(/[.\-_ ]/)
    .map((s) => s[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <div className="min-h-screen bg-ink text-bone/85 lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-bone/10 bg-ink-soft transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-bone/10 px-6 py-5">
          <Link href="/admin" className="flex flex-col leading-none">
            <span className="font-serif text-lg tracking-wide2">Maison Lumière</span>
            <span className="mt-1 text-[9px] uppercase tracking-luxe text-gold/80">
              Admin console
            </span>
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          {adminNav.map((item) => {
            const Icon = ICONS[item.icon] ?? Gauge;
            const active =
              item.href === pathname ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-gold/10 text-gold"
                    : "text-bone/55 hover:bg-bone/5 hover:text-bone",
                )}
              >
                <Icon size={16} strokeWidth={1.6} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-1 border-t border-bone/10 p-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-xs text-bone/40 hover:text-bone"
          >
            <ExternalLink size={13} /> View storefront
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-bone/40 hover:text-bone"
            >
              <LogOut size={13} /> Sign out
            </button>
          </form>
        </div>
      </aside>

      {open ? (
        <div
          className="fixed inset-0 z-40 bg-ink/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {/* Main */}
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between border-b border-bone/10 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-serif text-xl">{current.label}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={cn(
                "hidden rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wide2 sm:inline-flex",
                backend === "supabase"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300",
              )}
              title={
                backend === "supabase"
                  ? "Connected to Supabase"
                  : "Local file store — connect Supabase for production"
              }
            >
              {backend === "supabase" ? "Supabase" : "Local store"}
            </span>
            {mode === "dev-bypass" ? (
              <span className="hidden text-[10px] uppercase tracking-wide2 text-amber-300/70 md:block">
                dev bypass
              </span>
            ) : null}
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold"
              title={email ?? undefined}
            >
              {initials || "AL"}
            </span>
          </div>
        </header>
        <div className="flex-1 p-6 lg:p-10">{children}</div>
      </div>
    </div>
  );
}
