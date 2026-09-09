import type { Collection } from "@/lib/types";

export const collections: Collection[] = [
  {
    id: "col-lumiere",
    slug: "lumiere",
    name: "Lumière",
    subtitle: "The signature line",
    description:
      "The core wardrobe of the maison — luminous, skin-close compositions built around a single grown material.",
    image:
      "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1400&q=80",
    accentColor: "#c8a866",
    order: 1,
  },
  {
    id: "col-nocturne",
    slug: "nocturne",
    name: "Nocturne",
    subtitle: "After dark",
    description:
      "Deeper, resinous, warm. Ambers and woods aged longer for weight and shadow.",
    image:
      "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1400&q=80",
    accentColor: "#7c5cff",
    order: 2,
  },
  {
    id: "col-jardin",
    slug: "jardin",
    name: "Jardin Clos",
    subtitle: "The walled garden",
    description:
      "Green, dewy and transparent — a portrait of the maison terraces at first light.",
    image:
      "https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1400&q=80",
    accentColor: "#4a9d7f",
    order: 3,
  },
  {
    id: "col-archive",
    slug: "archive",
    name: "Archive Editions",
    subtitle: "Numbered & limited",
    description:
      "Re-issues from the maison archive and single-harvest experiments, released in small numbered runs.",
    image:
      "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1400&q=80",
    accentColor: "#b5643c",
    order: 4,
  },
];
