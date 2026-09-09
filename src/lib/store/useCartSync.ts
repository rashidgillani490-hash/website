"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/store/cart";
import { syncCartAction, type CartSyncLine } from "@/app/(site)/actions";

export interface CartSyncState {
  /** Server-verified state per line, keyed by lineId. */
  lines: Record<string, CartSyncLine>;
  /** Human-readable problems found on the last sync. */
  issues: string[];
  syncing: boolean;
  /** True while a line is out of stock or delisted — checkout must be blocked. */
  blocked: boolean;
  refresh: () => void;
}

/**
 * Revalidates the persisted cart against the live catalogue. Prices, stock,
 * sizes and personalisation surcharges all come back from the server; the
 * browser's copy is treated as a wish-list. Runs once on hydration and again
 * whenever the set of lines/skus changes.
 */
export function useCartSync(): CartSyncState {
  const { items, hydrated, applySync } = useCart();
  const [lines, setLines] = useState<Record<string, CartSyncLine>>({});
  const [issues, setIssues] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [nonce, setNonce] = useState(0);
  const inFlight = useRef(false);

  // Only re-run when the shape of the cart changes, not on every quantity tick.
  const signature = items
    .map((i) => `${i.lineId}:${i.sku}:${i.customization?.selection ? "c" : "p"}`)
    .join("|");

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!hydrated) return;
    const snapshot = useCart.getState().items;
    if (snapshot.length === 0) {
      setLines({});
      setIssues([]);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setSyncing(true);

    let cancelled = false;
    syncCartAction(
      snapshot.map((i) => ({
        lineId: i.lineId,
        slug: i.slug,
        sku: i.sku,
        quantity: i.quantity,
        customization: i.customization?.selection ?? null,
      })),
    )
      .then((res) => {
        if (cancelled) return;
        setLines(Object.fromEntries(res.lines.map((l) => [l.lineId, l])));
        setIssues(res.lines.map((l) => l.message).filter((m): m is string => !!m));
        applySync(res.lines);
      })
      .catch(() => {
        // Offline / transient: keep showing the persisted cart. The order
        // action re-validates everything anyway.
      })
      .finally(() => {
        inFlight.current = false;
        if (!cancelled) setSyncing(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, signature, nonce]);

  const blocked = Object.values(lines).some(
    (l) => l.status === "out-of-stock" || l.status === "unavailable" || l.status === "size-unavailable",
  );

  return { lines, issues, syncing, blocked, refresh };
}
