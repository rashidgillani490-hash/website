"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@/lib/types";
import type { CustomizationLine } from "@/lib/customization/types";
import type { CartSyncLine } from "@/app/(site)/actions";
import { shippingFor } from "@/lib/commerce";
import { useCommerceSettings } from "@/lib/store/commerce-settings";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  hydrated: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addItem: (
    product: Product,
    sku: string,
    quantity?: number,
    customization?: CustomizationLine | null,
  ) => void;
  removeItem: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  /** Switch a line to another bottle size (server-verified values). */
  changeSize: (
    lineId: string,
    size: { sku: string; ml: number; price: number; stock: number | null },
  ) => void;
  /** Overwrite lines with server-verified catalogue values. */
  applySync: (lines: CartSyncLine[]) => void;
  clear: () => void;
  _setHydrated: () => void;
}

function newLineId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `l_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      hydrated: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      addItem: (product, sku, quantity = 1, customization = null) =>
        set((s) => {
          const size = product.sizes.find((x) => x.sku === sku);
          if (!size) return s;
          const stock = size.stock;
          if (stock !== null && stock <= 0) return s; // out of stock

          const cap = (n: number) =>
            stock === null ? Math.max(1, n) : Math.min(Math.max(1, n), stock);

          // Personalised lines are always distinct; plain lines merge by sku.
          if (!customization) {
            const existing = s.items.find((i) => i.sku === sku && !i.customization);
            if (existing) {
              return {
                isOpen: true,
                items: s.items.map((i) =>
                  i.lineId === existing.lineId
                    ? { ...i, quantity: cap(i.quantity + quantity), stock }
                    : i,
                ),
              };
            }
          }

          const item: CartItem = {
            lineId: newLineId(),
            productId: product.id,
            slug: product.slug,
            name: product.name,
            image: product.images[0]?.src ?? "",
            sku,
            ml: size.ml,
            unitPrice: size.price,
            quantity: cap(quantity),
            stock,
            customization: customization ?? null,
          };
          return { isOpen: true, items: [...s.items, item] };
        }),
      removeItem: (lineId) =>
        set((s) => ({ items: s.items.filter((i) => i.lineId !== lineId) })),
      setQuantity: (lineId, quantity) =>
        set((s) => ({
          items: s.items
            .map((i) => {
              if (i.lineId !== lineId) return i;
              const max = i.stock === null ? 99 : Math.max(0, i.stock);
              return { ...i, quantity: Math.min(Math.max(1, quantity), Math.max(1, max)) };
            })
            .filter((i) => i.quantity > 0),
        })),
      changeSize: (lineId, size) =>
        set((s) => {
          const line = s.items.find((i) => i.lineId === lineId);
          if (!line || line.sku === size.sku) return s;
          const cap = (n: number) =>
            size.stock === null ? Math.max(1, n) : Math.min(Math.max(1, n), size.stock);

          // A plain line switching onto a size that's already in the bag merges.
          const twin = !line.customization
            ? s.items.find(
                (i) => i.lineId !== lineId && i.sku === size.sku && !i.customization,
              )
            : undefined;

          if (twin) {
            return {
              items: s.items
                .filter((i) => i.lineId !== lineId)
                .map((i) =>
                  i.lineId === twin.lineId
                    ? { ...i, quantity: cap(i.quantity + line.quantity), stock: size.stock }
                    : i,
                ),
            };
          }

          return {
            items: s.items.map((i) =>
              i.lineId === lineId
                ? {
                    ...i,
                    sku: size.sku,
                    ml: size.ml,
                    unitPrice: size.price,
                    stock: size.stock,
                    quantity: cap(i.quantity),
                  }
                : i,
            ),
          };
        }),
      applySync: (lines) =>
        set((s) => {
          const bySide = new Map(lines.map((l) => [l.lineId, l]));
          const next: CartItem[] = [];
          for (const item of s.items) {
            const live = bySide.get(item.lineId);
            if (!live) {
              next.push(item); // not part of this sync — leave untouched
              continue;
            }
            if (live.status === "unavailable") continue; // drop delisted products
            const patched: CartItem = {
              ...item,
              name: live.name ?? item.name,
              image: live.image ?? item.image,
              sku: live.sku ?? item.sku,
              ml: live.ml ?? item.ml,
              unitPrice: live.unitPrice ?? item.unitPrice,
              stock: live.stock === undefined ? item.stock : live.stock,
              customization:
                live.customization !== undefined && item.customization
                  ? live.customization
                  : item.customization,
            };
            if (live.status === "reduced" && typeof live.maxQuantity === "number") {
              patched.quantity = Math.max(1, live.maxQuantity);
            }
            next.push(patched);
          }
          return { items: next };
        }),
      clear: () => set({ items: [] }),
      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "ml-cart",
      version: 3,
      migrate: (persisted) => {
        // v1: sku-keyed, no lineId/customization. v2: no stock field.
        const state = persisted as { items?: Partial<CartItem>[] } | undefined;
        if (state?.items) {
          state.items = state.items.map((i) => ({
            ...i,
            lineId: i.lineId ?? newLineId(),
            customization: i.customization ?? null,
            stock: i.stock ?? null,
          }));
        }
        return state as never;
      },
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    },
  ),
);

/* ---------------------------------------------------------------- selectors */

/** Effective per-unit price including any customisation surcharge. */
export function lineUnitPrice(item: CartItem): number {
  return item.unitPrice + (item.customization?.deltaCents ?? 0);
}

export function cartCount(items: CartItem[]) {
  return items.reduce((n, i) => n + i.quantity, 0);
}

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((n, i) => n + i.quantity * lineUnitPrice(i), 0);
}

/**
 * Reads the current admin-configured fee/threshold from the client commerce-
 * settings store (hydrated by `<CommerceSettingsSync>`) — a display estimate
 * only. The order pipeline recomputes shipping server-side from the same
 * settings at the moment the order is placed.
 */
export function cartShipping(subtotal: number) {
  const { shippingFeeCents, freeShippingThresholdCents } = useCommerceSettings.getState();
  return shippingFor(subtotal, shippingFeeCents, freeShippingThresholdCents);
}
