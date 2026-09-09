import Image from "next/image";
import Link from "next/link";
import { footerNav } from "@/lib/nav";
import type { SiteContent } from "@/lib/types";
import { NewsletterForm } from "./NewsletterForm";

export function Footer({ site }: { site: SiteContent }) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-bone/10 bg-ink-soft">
      <div className="container-luxe grid gap-14 py-20 lg:grid-cols-[1.2fr_2fr]">
        <div className="flex flex-col gap-6">
          <div>
            {site.logoUrl ? (
              <span className="relative block h-9 w-32">
                <Image src={site.logoUrl} alt={site.brandName} fill sizes="128px" className="object-contain object-left" />
              </span>
            ) : (
              <p className="font-serif text-2xl tracking-wide2 text-bone">
                {site.brandName}
              </p>
            )}
            <p className="mt-1 text-[10px] uppercase tracking-luxe text-gold/80">
              Maison de Parfum — Grasse
            </p>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-bone/50">
            {site.tagline} A house that grows, distills and composes its own
            materials since 1976.
          </p>
          {site.contact.whatsapp ? (
            <a
              href={`https://wa.me/${site.contact.whatsapp.replace(/[^\d]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-2 text-xs text-bone/60 link-underline hover:text-bone"
            >
              Chat on WhatsApp — {site.contact.whatsapp}
            </a>
          ) : null}
          <NewsletterForm />
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {footerNav.map((col) => (
            <div key={col.title} className="flex flex-col gap-4">
              <h3 className="text-[11px] font-medium uppercase tracking-luxe text-bone/40">
                {col.title}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-bone/60 transition-colors hover:text-bone link-underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-bone/10">
        <div className="container-luxe flex flex-col items-center justify-between gap-4 py-6 text-[11px] text-bone/35 sm:flex-row">
          <p>
            © {year} {site.brandName}. All rights reserved. Sample content — replaceable
            from the Admin Dashboard.
          </p>
          <div className="flex gap-6">
            {site.social.map((s) => (
              <Link key={s.label} href={s.href} className="hover:text-bone/70">
                {s.label}
              </Link>
            ))}
            <Link href="/admin" className="hover:text-bone/70">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
