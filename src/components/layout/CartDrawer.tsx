"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X, ShoppingBag } from "lucide-react";
import {
  useCart,
  cartSubtotal,
  cartCount,
  cartShipping,
  lineUnitPrice,
} from "@/lib/store/cart";
import { useCommerceSettings } from "@/lib/store/commerce-settings";
import { Button } from "@/components/ui/Button";
import { Price, QuantityStepper } from "@/components/ui/misc";
import { useEscapeKey } from "@/hooks/useEscapeKey";

export function CartDrawer() {
  const { items, isOpen, close, setQuantity, removeItem } = useCart();
  useEscapeKey(close, isOpen);
  const freeShippingThreshold = useCommerceSettings((s) => s.freeShippingThresholdCents);
  const subtotal = cartSubtotal(items);
  const shipping = cartShipping(subtotal);
  const remaining = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-ink/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col border-l border-bone/10 bg-ink"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping bag"
          >
            <header className="flex items-center justify-between border-b border-bone/10 px-6 py-5">
              <h2 className="font-serif text-xl">
                Your bag
                <span className="ml-2 text-sm text-bone/40">
                  ({cartCount(items)})
                </span>
              </h2>
              <button onClick={close} aria-label="Close bag" className="text-bone/50 hover:text-bone">
                <X size={20} />
              </button>
            </header>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <ShoppingBag size={28} className="text-bone/30" />
                <p className="text-sm text-bone/50">Your bag is empty.</p>
                <Button href="/fragrances" variant="outline" size="sm" onClick={close}>
                  Explore fragrances
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {subtotal < freeShippingThreshold ? (
                    <p className="mb-5 border border-bone/10 bg-bone/[0.03] px-4 py-3 text-xs text-bone/60">
                      Add <Price amount={remaining} className="text-gold" /> more for
                      complimentary shipping.
                    </p>
                  ) : (
                    <p className="mb-5 border border-gold/30 bg-gold/10 px-4 py-3 text-xs text-gold">
                      You&apos;ve unlocked complimentary shipping.
                    </p>
                  )}
                  <ul className="flex flex-col gap-6">
                    {items.map((item) => (
                      <li key={item.lineId} className="flex gap-4">
                        <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-ink-soft">
                          <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
                          {item.customization ? (
                            <span className="absolute left-1 top-1 rounded-full bg-gold px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide2 text-ink">
                              Yours
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-1 flex-col gap-1">
                          <Link
                            href={`/fragrances/${item.slug}`}
                            onClick={close}
                            className="font-serif text-base text-bone hover:text-gold"
                          >
                            {item.name}
                          </Link>
                          <span className="text-xs text-bone/40">{item.ml}ml</span>
                          {item.customization ? (
                            <span className="text-[11px] leading-snug text-gold/80">
                              {item.customization.summary}
                            </span>
                          ) : null}
                          <div className="mt-2 flex items-center justify-between">
                            <QuantityStepper
                              value={item.quantity}
                              onChange={(n) => setQuantity(item.lineId, n)}
                            />
                            <Price
                              amount={lineUnitPrice(item) * item.quantity}
                              className="text-sm"
                            />
                          </div>
                          <button
                            onClick={() => removeItem(item.lineId)}
                            className="mt-1 self-start text-[11px] uppercase tracking-wide2 text-bone/35 hover:text-bone/70"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <footer className="border-t border-bone/10 px-6 py-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-bone/50">Subtotal</span>
                    <Price amount={subtotal} className="text-base" />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-bone/40">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? "Complimentary" : <Price amount={shipping} />}</span>
                  </div>
                  <Button href="/checkout" size="lg" className="mt-4 w-full" onClick={close}>
                    Proceed to checkout
                  </Button>
                  <button
                    onClick={close}
                    className="mt-3 w-full text-center text-[11px] uppercase tracking-wide2 text-bone/40 hover:text-bone/70"
                  >
                    Continue shopping
                  </button>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
