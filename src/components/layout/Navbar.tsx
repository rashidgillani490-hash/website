"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ShoppingBag, User, Search } from "lucide-react";
import { primaryNav } from "@/lib/nav";
import { useScrolled } from "@/hooks/useMediaQuery";
import { useCart, cartCount } from "@/lib/store/cart";
import { cn } from "@/lib/utils";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { SearchOverlay } from "./SearchOverlay";

export function Navbar({
  brandName,
  logoUrl,
}: {
  brandName: string;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();
  const scrolled = useScrolled(20);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const items = useCart((s) => s.items);
  const openCart = useCart((s) => s.open);
  const hydrated = useCart((s) => s.hydrated);
  const count = cartCount(items);

  // ⌘K / Ctrl+K opens search from anywhere on the storefront.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-luxe",
          scrolled
            ? "border-b border-bone/10 bg-ink/85 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <nav className="container-luxe flex h-16 items-center justify-between gap-8 lg:h-20">
          <div className="flex items-center gap-10">
            <Link href="/" className="group flex flex-col leading-none">
              {logoUrl ? (
                <span className="relative block h-8 w-28 lg:h-9 lg:w-32">
                  <Image
                    src={logoUrl}
                    alt={brandName}
                    fill
                    sizes="128px"
                    className="object-contain object-left"
                    priority
                  />
                </span>
              ) : (
                <>
                  <span className="font-serif text-lg tracking-wide2 text-bone lg:text-xl">
                    {brandName}
                  </span>
                  <span className="mt-0.5 hidden text-[9px] uppercase tracking-luxe text-gold/80 sm:block">
                    Maison de Parfum
                  </span>
                </>
              )}
            </Link>
            <ul className="hidden items-center gap-8 lg:flex">
              {primaryNav.map((link) => {
                const active =
                  link.href === pathname ||
                  (link.href.startsWith("/fragrances") && pathname.startsWith("/fragrances"));
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "text-[11px] font-medium uppercase tracking-wide2 transition-colors duration-300 link-underline",
                        active ? "text-gold" : "text-bone/70 hover:text-bone",
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex items-center gap-5">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="flex items-center gap-2 text-bone/70 transition-colors hover:text-bone"
            >
              <Search size={18} />
              <span className="hidden items-center gap-1 rounded-sm border border-bone/15 px-1.5 py-0.5 text-[10px] text-bone/35 lg:flex">
                <span>⌘</span>K
              </span>
            </button>
            <Link
              href="/account"
              aria-label="Account"
              className="hidden text-bone/70 transition-colors hover:text-bone sm:block"
            >
              <User size={18} />
            </Link>
            <button
              onClick={openCart}
              aria-label="Open bag"
              className="relative text-bone/80 transition-colors hover:text-bone"
            >
              <ShoppingBag size={18} />
              {hydrated && count > 0 ? (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-semibold text-ink">
                  {count}
                </span>
              ) : null}
            </button>
            <button
              className="text-bone/80 lg:hidden"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>
        </nav>
      </header>

      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onSearch={() => {
          setMobileOpen(false);
          setSearchOpen(true);
        }}
        brandName={brandName}
        pathname={pathname}
      />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Spacer so fixed header doesn't overlap non-home pages */}
      {pathname !== "/" ? <div className="h-16 lg:h-20" /> : null}
    </>
  );
}

function MobileMenu({
  open,
  onClose,
  onSearch,
  brandName,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  onSearch: () => void;
  brandName: string;
  pathname: string;
}) {
  useEscapeKey(onClose, open);
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-[80] flex flex-col bg-ink lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="container-luxe flex h-16 items-center justify-between">
            <span className="font-serif text-lg tracking-wide2">{brandName}</span>
            <div className="flex items-center gap-5">
              <button onClick={onSearch} aria-label="Search" className="text-bone/70">
                <Search size={20} />
              </button>
              <button onClick={onClose} aria-label="Close menu" className="text-bone/70">
                <X size={22} />
              </button>
            </div>
          </div>

          <nav className="container-luxe mt-8 flex flex-1 flex-col gap-1">
            {primaryNav.map((link, i) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
              >
                <Link
                  href={link.href}
                  onClick={onClose}
                  className={cn(
                    "block border-b border-bone/10 py-5 font-serif text-3xl",
                    pathname === link.href ? "text-gold" : "text-bone",
                  )}
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
          </nav>

          <div className="container-luxe flex flex-col gap-4 pb-12">
            <div className="flex gap-6 text-[11px] uppercase tracking-wide2 text-bone/60">
              <Link href="/account" onClick={onClose} className="link-underline">
                Account
              </Link>
              <Link href="/cart" onClick={onClose} className="link-underline">
                Bag
              </Link>
              <Link href="/admin" onClick={onClose} className="link-underline">
                Admin
              </Link>
            </div>
            <p className="text-[11px] text-bone/30">
              {brandName} — composed in Grasse, France
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
