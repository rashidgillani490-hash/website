/**
 * Pure merge helpers for the two admin-editable settings blobs
 * (`site_content`, `commerce`). Backend-agnostic on purpose — both
 * `src/lib/supabase/mappers.ts` (Supabase row → domain type) and
 * `src/lib/admin/to-domain.ts` / `local-repo.ts` (local JSON store → domain
 * type) call these, so a partially-saved record resolves identically on
 * either backend.
 */
import { siteContent as demoSiteContent } from "@/lib/data/site";
import { DEFAULT_COMMERCE_SETTINGS, type CommerceSettings } from "@/lib/commerce";
import type { SiteContent } from "@/lib/types";

/**
 * Merge a partially-saved `site_content` setting over the demo content, so an
 * admin editing just a few fields never blanks the rest of the storefront's
 * copy.
 */
export function mergeSiteContent(stored: Partial<SiteContent> | null | undefined): SiteContent {
  if (!stored || typeof stored !== "object") return demoSiteContent;
  return {
    ...demoSiteContent,
    ...stored,
    hero: { ...demoSiteContent.hero, ...(stored.hero ?? {}) },
    intro: { ...demoSiteContent.intro, ...(stored.intro ?? {}) },
    story: { ...demoSiteContent.story, ...(stored.story ?? {}) },
    contact: { ...demoSiteContent.contact, ...(stored.contact ?? {}) },
    values:
      Array.isArray(stored.values) && stored.values.length > 0
        ? (stored.values as SiteContent["values"])
        : demoSiteContent.values,
    social:
      Array.isArray(stored.social) && stored.social.length > 0
        ? (stored.social as SiteContent["social"])
        : demoSiteContent.social,
  };
}

/** Merge a partially-saved `commerce` setting over the bootstrap defaults. */
export function mergeCommerceSettings(
  stored: Partial<CommerceSettings> | null | undefined,
): CommerceSettings {
  const base = DEFAULT_COMMERCE_SETTINGS;
  if (!stored || typeof stored !== "object") return base;
  return {
    shippingFeeCents:
      Number.isFinite(stored.shippingFeeCents) && (stored.shippingFeeCents as number) >= 0
        ? Math.trunc(stored.shippingFeeCents as number)
        : base.shippingFeeCents,
    freeShippingThresholdCents:
      Number.isFinite(stored.freeShippingThresholdCents) &&
      (stored.freeShippingThresholdCents as number) >= 0
        ? Math.trunc(stored.freeShippingThresholdCents as number)
        : base.freeShippingThresholdCents,
    codEnabled: typeof stored.codEnabled === "boolean" ? stored.codEnabled : base.codEnabled,
  };
}
