"use client";

import { useState } from "react";
import { Check, ShoppingBag, Heart } from "lucide-react";
import type { Product } from "@/lib/types";
import type { CustomizationLine } from "@/lib/customization/types";
import { Button } from "@/components/ui/Button";
import { QuantityStepper, Price } from "@/components/ui/misc";
import { useCart } from "@/lib/store/cart";
import { cn } from "@/lib/utils";

export function ProductPurchasePanel({
  product,
  customization = null,
  customizationPending = false,
}: {
  product: Product;
  customization?: CustomizationLine | null;
  customizationPending?: boolean;
}) {
  const [sku, setSku] = useState(product.sizes[1]?.sku ?? product.sizes[0].sku);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCart((s) => s.addItem);

  const size = product.sizes.find((s) => s.sku === sku) ?? product.sizes[0];
  const custDelta = customization?.deltaCents ?? 0;
  const unit = size.price + custDelta;

  const stock = size.stock;
  const outOfStock = stock !== null && stock <= 0;
  const lowStock = stock !== null && stock > 0 && stock <= 5;
  const maxQty = stock === null ? 99 : Math.max(1, stock);
  const effectiveQty = Math.min(qty, maxQty);

  function handleAdd() {
    if (outOfStock) return;
    addItem(product, sku, effectiveQty, customization ?? null);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="text-[11px] font-medium uppercase tracking-luxe text-bone/50">
          Bottle size
        </span>
        <div className="grid grid-cols-3 gap-2">
          {product.sizes.map((s) => {
            const isActive = s.sku === sku;
            const soldOut = s.stock !== null && s.stock <= 0;
            return (
              <button
                key={s.sku}
                disabled={soldOut}
                onClick={() => setSku(s.sku)}
                className={cn(
                  "flex flex-col items-center gap-1 border px-3 py-4 transition-colors duration-300",
                  isActive
                    ? "border-gold bg-gold/10"
                    : "border-bone/15 hover:border-bone/40",
                  soldOut && "cursor-not-allowed opacity-40",
                )}
              >
                <span className="font-serif text-lg text-bone">{s.ml}ml</span>
                <Price amount={s.price} className="text-xs text-bone/60" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-end justify-between border-y border-bone/10 py-5">
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-luxe text-bone/40">
            {size.ml}ml · {product.concentration}
            {custDelta > 0 ? " · personalised" : ""}
          </span>
          <Price amount={unit * effectiveQty} className="mt-1 text-2xl text-bone" />
          {custDelta > 0 ? (
            <span className="mt-1 text-[11px] text-bone/40">
              includes <Price amount={custDelta * effectiveQty} /> personalisation
            </span>
          ) : null}
          {outOfStock ? (
            <span className="mt-1 text-[11px] uppercase tracking-wide2 text-red-400">
              Out of stock
            </span>
          ) : lowStock ? (
            <span className="mt-1 text-[11px] text-amber-300">Only {stock} left</span>
          ) : null}
        </div>
        <QuantityStepper
          value={effectiveQty}
          onChange={(n) => setQty(Math.min(n, maxQty))}
          max={maxQty}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleAdd}
          variant={added ? "gold" : "primary"}
          size="lg"
          className="flex-1"
          disabled={customizationPending || outOfStock}
        >
          {outOfStock ? (
            "Out of stock"
          ) : added ? (
            <>
              <Check size={16} /> Added to bag
            </>
          ) : (
            <>
              <ShoppingBag size={16} />{" "}
              {customization ? "Add personalised to bag" : "Add to bag"}
            </>
          )}
        </Button>
        <Button variant="outline" size="lg" aria-label="Save to wishlist">
          <Heart size={16} />
        </Button>
      </div>

      <ul className="flex flex-col gap-2 text-xs text-bone/45">
        <li>Complimentary 2ml discovery vial with every bottle</li>
        <li>Carbon-neutral delivery · 30-day returns on unopened flacons</li>
        <li>Refill programme available at checkout</li>
      </ul>
    </div>
  );
}
