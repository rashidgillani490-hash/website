"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { accountNav } from "@/lib/nav";
import { signOutAction } from "@/app/(site)/account/login/actions";
import { cn } from "@/lib/utils";

export function AccountNav() {
  const pathname = usePathname();
  const [pending, start] = useTransition();

  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-0">
        {accountNav.map((link) => {
          const active =
            pathname === link.href ||
            (link.href !== "/account" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "shrink-0 border-b border-bone/10 py-3 text-sm transition-colors lg:py-4",
                active ? "text-gold" : "text-bone/50 hover:text-bone",
              )}
            >
              {link.label}
            </Link>
          );
        })}
        <button
          onClick={() => start(() => signOutAction())}
          disabled={pending}
          className="mt-4 hidden text-left text-[11px] uppercase tracking-wide2 text-bone/30 hover:text-bone/60 disabled:opacity-50 lg:block"
        >
          {pending ? "Signing out…" : "Sign out"}
        </button>
      </nav>
    </aside>
  );
}
