"use client";

/**
 * Client-side mirror of the admin-controlled commerce settings (shipping fee,
 * free-shipping threshold, whether COD is offered). Never persisted to
 * localStorage — it should always reflect what the server last resolved, not
 * a stale value from a previous visit. `<CommerceSettingsSync>` (rendered once
 * in the site layout) hydrates it from a server-fetched value on mount.
 *
 * This is a display/preview convenience only. The server recomputes shipping
 * and re-validates COD availability from the same settings at order time
 * (`src/lib/admin/order-calc.ts`) — nothing here is ever trusted for money.
 */
import { create } from "zustand";
import { DEFAULT_COMMERCE_SETTINGS, type CommerceSettings } from "@/lib/commerce";

interface CommerceSettingsState extends CommerceSettings {
  /** False until `<CommerceSettingsSync>` has applied a server-fetched value. */
  loaded: boolean;
}

export const useCommerceSettings = create<CommerceSettingsState>(() => ({
  ...DEFAULT_COMMERCE_SETTINGS,
  loaded: false,
}));

export function applyCommerceSettings(settings: CommerceSettings) {
  useCommerceSettings.setState({ ...settings, loaded: true });
}
