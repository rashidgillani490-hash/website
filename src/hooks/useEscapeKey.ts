"use client";

import { useEffect, useRef } from "react";

/**
 * Closes an overlay (drawer, modal, dropdown) on Escape — required for any
 * dismissible UI to be keyboard-accessible, not just mouse/touch-dismissible.
 * Only listens while `active` is true, so closed overlays add no overhead.
 *
 * Takes `onEscape` via a ref internally, so passing a fresh inline arrow
 * function each render (the common case — `onClose={() => setOpen(false)}`)
 * never re-subscribes the listener or reads a stale closure.
 */
export function useEscapeKey(onEscape: () => void, active: boolean) {
  const callback = useRef(onEscape);
  callback.current = onEscape;

  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") callback.current();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);
}
