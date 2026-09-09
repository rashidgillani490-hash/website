"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Loader2, ShoppingBag } from "lucide-react";
import {
  useCart,
  cartSubtotal,
  cartShipping,
  cartCount,
  lineUnitPrice,
} from "@/lib/store/cart";
import { useCartSync } from "@/lib/store/useCartSync";
import { Button } from "@/components/ui/Button";
import { Price, QuantityStepper, EmptyState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/lib/types";
import type { CartSyncLine } from "@/app/(site)/actions";

export function CartView({ compact = false }: { compact?: boolean }) {
  const { items, hydrated, setQuantity, removeItem, changeSize } = useCart();
  const { lines, issues, syncing, blocked } = useCartSync();

  if (!hydrated) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag size={28} />}
        title="Your bag is empty"
        description="When you add a fragrance it will appear here, ready for checkout."
        action={
          <Button href="/fragrances" variant="primary" size="md">
            Explore fragrances
          </Button>
        }
      />
    );
  }

  const subtotal = cartSubtotal(items);
  const shipping = cartShipping(subtotal);
  const total = subtotal + shipping;

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_360px] lg:gap-16">
      <div className="flex flex-col gap-6">
        {issues.length > 0 ? (
          <div className="flex gap-3 border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <ul className="flex flex-col gap-1">
              {issues.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <ul className="flex flex-col divide-y divide-bone/10 border-y border-bone/10">
          {items.map((item) => (
            <CartLine
              key={item.lineId}
              item={item}
              live={lines[item.lineId]}
              onQuantity={(n) => setQuantity(item.lineId, n)}
              onRemove={() => removeItem(item.lineId)}
              onSize={(size) => changeSize(item.lineId, size)}
            />
          ))}
        </ul>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="flex flex-col gap-4 border border-bone/10 bg-bone/[0.02] p-8">
          <h2 className="font-serif text-xl">Order summary</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <Row label={`Subtotal (${cartCount(items)} items)`}>
              <Price amount={subtotal} />
            </Row>
            <Row label="Shipping">
              {shipping === 0 ? "Complimentary" : <Price amount={shipping} />}
            </Row>
            <Row label="Discount">Apply a code at checkout</Row>
          </dl>
          <div className="flex items-center justify-between border-t border-bone/10 pt-4">
            <span className="text-sm uppercase tracking-wide2 text-bone/60">Total</span>
            <Price amount={total} className="text-lg" />
          </div>
          {!compact ? (
            <>
              {blocked ? (
                <Button size="lg" disabled className="mt-2 w-full">
                  Checkout
                </Button>
              ) : (
                <Button href="/checkout" size="lg" className="mt-2 w-full">
                  {syncing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Checking availability…
                    </>
                  ) : (
                    "Checkout"
                  )}
                </Button>
              )}
              {blocked ? (
                <p className="text-[11px] text-amber-300/80">
                  Remove or adjust the unavailable items to continue.
                </p>
              ) : null}
            </>
          ) : null}
          <p className="text-[11px] leading-relaxed text-bone/35">
            Cash on Delivery across Pakistan. Stock and prices are confirmed on our
            server before your order is placed.
          </p>
        </div>
      </aside>
    </div>
  );
}

function CartLine({
  item,
  live,
  onQuantity,
  onRemove,
  onSize,
}: {
  item: CartItem;
  live?: CartSyncLine;
  onQuantity: (n: number) => void;
  onRemove: () => void;
  onSize: (size: { sku: string; ml: number; price: number; stock: number | null }) => void;
}) {
  const sizes = live?.sizes ?? [];
  const max = live?.maxQuantity ?? (item.stock === null ? 99 : Math.max(1, item.stock));
  const unavailable =
    live?.status === "out-of-stock" ||
    live?.status === "unavailable" ||
    live?.status === "size-unavailable";
  const lowStock = typeof live?.stock === "number" && live.stock > 0 && live.stock <= 3;

  return (
    <li className={cn("flex gap-6 py-6", unavailable && "opacity-60")}>
      <Link
        href={`/fragrances/${item.slug}`}
        className="relative h-32 w-24 shrink-0 overflow-hidden bg-ink-soft"
      >
        <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
      </Link>
      <div className="flex flex-1 flex-col justify-between gap-3">
        <div className="flex justify-between gap-4">
          <div>
            <Link href={`/fragrances/${item.slug}`} className="font-serif text-lg hover:text-gold">
              {item.name}
            </Link>
            <p className="mt-1 text-xs text-bone/40">
              {item.ml}ml · {item.sku}
            </p>

            {sizes.length > 1 ? (
              <label className="mt-2 flex items-center gap-2 text-[11px] text-bone/45">
                <span className="uppercase tracking-wide2">Size</span>
                <select
                  value={item.sku}
                  onChange={(e) => {
                    const s = sizes.find((x) => x.sku === e.target.value);
                    if (s) onSize(s);
                  }}
                  className="h-8 border border-bone/20 bg-ink px-2 text-xs text-bone focus:border-gold focus:outline-none"
                >
                  {sizes.map((s) => (
                    <option key={s.sku} value={s.sku} disabled={s.stock !== null && s.stock <= 0}>
                      {s.ml}ml{s.stock !== null && s.stock <= 0 ? " — sold out" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {item.customization ? (
              <div className="mt-2 flex items-start gap-3">
                {item.customization.selection.imageUrl ? (
                  <span
                    className="h-10 w-10 shrink-0 rounded-sm bg-cover bg-center ring-1 ring-inset ring-gold/30"
                    style={{ backgroundImage: `url(${item.customization.selection.imageUrl})` }}
                  />
                ) : null}
                <div className="flex flex-col gap-0.5 text-[11px] text-gold/80">
                  <span className="uppercase tracking-wide2 text-gold/60">Personalised</span>
                  <span>{item.customization.summary}</span>
                  {item.customization.deltaCents > 0 ? (
                    <span className="text-bone/45">
                      + <Price amount={item.customization.deltaCents} /> / bottle
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {live?.message ? (
              <p className="mt-2 text-[11px] text-amber-300/90">{live.message}</p>
            ) : lowStock ? (
              <p className="mt-2 text-[11px] text-amber-300/70">
                Only {live?.stock} left in stock.
              </p>
            ) : null}
          </div>
          <Price amount={lineUnitPrice(item) * item.quantity} className="text-sm" />
        </div>
        <div className="flex items-center justify-between">
          <QuantityStepper value={item.quantity} onChange={onQuantity} max={Math.max(1, max)} />
          <button
            onClick={onRemove}
            className="text-[11px] uppercase tracking-wide2 text-bone/35 hover:text-bone/70"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-bone/55">
      <dt>{label}</dt>
      <dd className="text-bone/80">{children}</dd>
    </div>
  );
}
