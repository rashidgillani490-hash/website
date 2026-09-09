"use client";

import { useEffect } from "react";
import { applyCommerceSettings } from "@/lib/store/commerce-settings";
import type { CommerceSettings } from "@/lib/commerce";

/**
 * Hydrates the client-side commerce-settings store from the value the server
 * resolved for this request. Rendered once, server-side, in `(site)/layout.tsx`
 * — every page already pays for that fetch via `getCommerceSettings()`, this
 * just hands it to the client store so the cart/checkout previews (shipping
 * fee, free-shipping banner, whether COD is offered) stay in sync with
 * whatever an admin has configured, without every component re-fetching it.
 */
export function CommerceSettingsSync({ settings }: { settings: CommerceSettings }) {
  useEffect(() => {
    applyCommerceSettings(settings);
    // Re-applying on every settings identity change (a fresh server render)
    // is intentional — an admin who just changed a setting should see it
    // reflected next navigation, not stay pinned to whatever loaded first.
  }, [settings]);
  return null;
}
