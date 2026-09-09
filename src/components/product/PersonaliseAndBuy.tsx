"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import type { CustomizationLine } from "@/lib/customization/types";
import { CustomizePanel } from "./CustomizePanel";
import { ProductPurchasePanel } from "./ProductPurchasePanel";

/**
 * Composes the personalisation panel (when the product enables it) with the
 * size / quantity / add-to-bag panel, lifting the server-priced customisation
 * so it's attached to the cart line.
 */
export function PersonaliseAndBuy({ product }: { product: Product }) {
  const [line, setLine] = useState<CustomizationLine | null>(null);
  const [pending, setPending] = useState(false);
  const canCustomise = !!product.customization?.enabled;

  return (
    <div className="flex flex-col gap-8">
      {canCustomise ? (
        <CustomizePanel
          product={product}
          onChange={(l, p) => {
            setLine(l);
            setPending(p);
          }}
        />
      ) : null}
      <ProductPurchasePanel
        product={product}
        customization={line}
        customizationPending={pending}
      />
    </div>
  );
}
