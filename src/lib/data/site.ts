import type { SiteContent } from "@/lib/types";

/**
 * Editable site-wide content. In the demo phase this object is the single
 * source of truth for copy that isn't tied to a product. In a later phase the
 * Admin Dashboard writes these same fields to Supabase and `getSiteContent()`
 * (see `src/lib/cms.ts`) returns the stored record instead.
 */
export const siteContent: SiteContent = {
  brandName: "Maison Lumière",
  tagline: "Perfumes composed in light.",
  announcement:
    "Complimentary engraving & 2ml discovery vials with every order over $180.",
  hero: {
    kicker: "Maison de Parfum — Grasse, since 1976",
    title: "Fragrance, rendered as light.",
    subtitle:
      "A house that grows, distills and composes its own materials. Each perfume is a study in luminosity — worn close to the skin, remembered long after.",
    ctaPrimary: { label: "Explore the collection", href: "/fragrances" },
    ctaSecondary: { label: "Our craft", href: "/about" },
  },
  intro: {
    heading: "A single house, from field to flacon",
    body: [
      "Maison Lumière is one of the few perfume houses that still controls every step of its craft. We cultivate our own jasmine and centifolia rose on the terraces above Grasse, distill in copper on site, and age our compositions in the dark for a full season before bottling.",
      "The result is a wardrobe of scent with unusual clarity — perfumes that feel lit from within rather than layered on.",
    ],
  },
  story: {
    heading: "Since 1976, in the hills above Grasse",
    body: [
      "Founded by Éléonore Vaudlin, a fourth-generation grower, Maison Lumière began as a distillery supplying essences to the great couture houses. In 1991 we released our first signature — Blanche Heure — and never looked back.",
      "Today the maison is led by master perfumer Auguste Rey, who joined in 2004. Our atelier remains deliberately small: nine noses, one field, and a refusal to release more than two compositions a year.",
    ],
    stats: [
      { label: "Years of craft", value: "49" },
      { label: "Hectares of flower fields", value: "14" },
      { label: "Compositions in the archive", value: "38" },
      { label: "Signatures released per year", value: "≤ 2" },
    ],
  },
  values: [
    {
      title: "Grown, not sourced",
      description:
        "Our jasmine, rose and tuberose are cultivated on maison-owned terraces and picked before dawn.",
      icon: "leaf",
    },
    {
      title: "Distilled on site",
      description:
        "Small-batch copper distillation in Grasse means we control the character of every essence.",
      icon: "flask",
    },
    {
      title: "Aged a full season",
      description:
        "Compositions rest in darkness for 90+ days so the materials marry before they reach you.",
      icon: "sparkles",
    },
    {
      title: "Refillable by design",
      description:
        "Every flacon is engraved glass with a refill programme — send it back, we replenish it.",
      icon: "recycle",
    },
    {
      title: "Hand-finished",
      description:
        "Each bottle is filled, stoppered, waxed and numbered by hand in our atelier.",
      icon: "hand",
    },
    {
      title: "Traceable to the row",
      description:
        "A batch code on the base ties your bottle to the exact harvest and distillation.",
      icon: "globe",
    },
  ],
  contact: {
    email: "atelier@maisonlumiere.example",
    phone: "+33 4 93 00 00 00",
    addressLines: ["17 Chemin des Terrasses", "06130 Grasse", "France"],
    hours: "Atelier visits by appointment · Tuesday–Saturday, 10h–17h",
  },
  social: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "Pinterest", href: "https://pinterest.com" },
    { label: "Journal", href: "/about" },
  ],
};
