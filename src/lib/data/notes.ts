import type { OlfactiveFamily } from "@/lib/types";

/** Olfactive families used for filtering and the homepage notes section. */
export const olfactiveFamilies: OlfactiveFamily[] = [
  {
    slug: "floral",
    name: "Floral",
    description:
      "The heart of the maison. Grown jasmine, centifolia rose and tuberose, captured close to the petal.",
    keyNotes: ["Jasmine Grandiflorum", "Centifolia Rose", "Tuberose", "Orange Blossom"],
  },
  {
    slug: "citrus",
    name: "Citrus",
    description:
      "Cold-pressed peels and petitgrain that give a composition its first flash of light.",
    keyNotes: ["Calabrian Bergamot", "Bitter Orange", "Yuzu", "Petitgrain"],
  },
  {
    slug: "woody",
    name: "Woody",
    description:
      "Sandalwood, cedar and vetiver — the architecture a perfume stands on.",
    keyNotes: ["Mysore-type Sandalwood", "Atlas Cedar", "Haitian Vetiver", "Guaiac"],
  },
  {
    slug: "amber",
    name: "Amber",
    description:
      "Labdanum, benzoin and vanilla absolute, aged for warmth and a slow, resinous trail.",
    keyNotes: ["Labdanum", "Benzoin", "Vanilla Absolute", "Tonka"],
  },
  {
    slug: "green",
    name: "Green",
    description:
      "Crushed leaf, galbanum and fig — the smell of the terraces before the sun is up.",
    keyNotes: ["Galbanum", "Violet Leaf", "Fig", "Blackcurrant Bud"],
  },
  {
    slug: "aromatic",
    name: "Aromatic",
    description:
      "Lavender, clary sage and rosemary from the garrigue that borders the fields.",
    keyNotes: ["Fine Lavender", "Clary Sage", "Rosemary", "Bay Laurel"],
  },
];
