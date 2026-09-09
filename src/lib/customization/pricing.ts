/**
 * The SINGLE source of truth for customisation pricing and normalisation.
 *
 * Both the "show me the price" server action and the order-creation server
 * action call `priceCustomization()` — a price sent from the browser is never
 * trusted. The client may render the same result for a live preview, but the
 * authoritative number always comes from here, computed from the product's
 * stored config.
 */

import {
  emptyCustomizationConfig,
  isCustomizationEmpty,
  type CustomizationLine,
  type CustomizationSelection,
  type CustomOption,
  type ProductCustomizationConfig,
} from "./types";

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === "number" ? Math.trunc(v) : parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

function parseOptions(raw: unknown): CustomOption[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CustomOption[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const id = String(r.id ?? "").trim();
    const label = String(r.label ?? "").trim();
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label, priceCents: clampInt(r.priceCents, 0, 1_000_000, 0) });
  }
  return out;
}

/** Safe parse of the `products.customization` jsonb blob. */
export function parseCustomizationConfig(raw: unknown): ProductCustomizationConfig {
  if (!raw || typeof raw !== "object") return { ...emptyCustomizationConfig };
  const r = raw as Record<string, unknown>;
  return {
    enabled: r.enabled === true,
    allowImage: r.allowImage === true,
    imagePriceCents: clampInt(r.imagePriceCents, 0, 1_000_000, 0),
    allowText: r.allowText === true,
    textMaxLength: clampInt(r.textMaxLength, 1, 200, 24),
    textPriceCents: clampInt(r.textPriceCents, 0, 1_000_000, 0),
    bottleOptions: parseOptions(r.bottleOptions),
    packagingOptions: parseOptions(r.packagingOptions),
  };
}

/**
 * Drop anything the config doesn't allow, trim text to the configured limit,
 * and discard option ids that don't exist. Returns a clean selection.
 */
export function normalizeSelection(
  config: ProductCustomizationConfig,
  sel: CustomizationSelection | null | undefined,
): CustomizationSelection {
  const s = sel ?? {};
  const out: CustomizationSelection = {};

  if (config.enabled && config.allowText && typeof s.text === "string") {
    const trimmed = s.text.replace(/\s+/g, " ").trim().slice(0, config.textMaxLength);
    if (trimmed) out.text = trimmed;
  }

  if (config.enabled && config.allowImage && s.imageUrl) {
    out.imageUrl = String(s.imageUrl);
    if (s.imagePath) out.imagePath = String(s.imagePath);
  }

  if (config.enabled && s.bottleOptionId) {
    const opt = config.bottleOptions.find((o) => o.id === s.bottleOptionId);
    if (opt) out.bottleOptionId = opt.id;
  }
  if (config.enabled && s.packagingOptionId) {
    const opt = config.packagingOptions.find((o) => o.id === s.packagingOptionId);
    if (opt) out.packagingOptionId = opt.id;
  }

  return out;
}

/**
 * Authoritative price + resolved labels + summary for a customisation.
 * Always normalises first, so callers can pass raw client input safely.
 */
export function priceCustomization(
  config: ProductCustomizationConfig,
  rawSelection: CustomizationSelection | null | undefined,
): CustomizationLine {
  const selection = normalizeSelection(config, rawSelection);
  const breakdown: { label: string; amountCents: number }[] = [];

  if (selection.text) {
    breakdown.push({
      label: `Engraving “${selection.text}”`,
      amountCents: config.textPriceCents,
    });
  }
  if (selection.imageUrl) {
    breakdown.push({ label: "Custom label image", amountCents: config.imagePriceCents });
  }

  const bottle = selection.bottleOptionId
    ? config.bottleOptions.find((o) => o.id === selection.bottleOptionId) ?? null
    : null;
  if (bottle) {
    breakdown.push({ label: `Bottle: ${bottle.label}`, amountCents: bottle.priceCents });
  }

  const packaging = selection.packagingOptionId
    ? config.packagingOptions.find((o) => o.id === selection.packagingOptionId) ?? null
    : null;
  if (packaging) {
    breakdown.push({
      label: `Packaging: ${packaging.label}`,
      amountCents: packaging.priceCents,
    });
  }

  const deltaCents = breakdown.reduce((sum, b) => sum + Math.max(0, b.amountCents), 0);

  const parts: string[] = [];
  if (selection.text) parts.push(`“${selection.text}”`);
  if (selection.imageUrl) parts.push("custom image");
  if (bottle) parts.push(bottle.label);
  if (packaging) parts.push(packaging.label);

  return {
    selection,
    bottleOptionLabel: bottle?.label ?? null,
    packagingOptionLabel: packaging?.label ?? null,
    deltaCents,
    breakdown,
    summary: parts.length ? parts.join(" · ") : "Personalised",
  };
}

/** Convenience: is there any actual personalisation to price / store? */
export function hasCustomization(
  config: ProductCustomizationConfig,
  sel: CustomizationSelection | null | undefined,
): boolean {
  if (!config.enabled) return false;
  return !isCustomizationEmpty(normalizeSelection(config, sel));
}
