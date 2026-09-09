/**
 * Domain types for Maison Lumière.
 *
 * These types describe the shape of content regardless of where it is sourced
 * from. During the demo phase content comes from `src/lib/data/*`. In a later
 * phase the same shapes are returned by the Supabase-backed CMS layer, so no
 * component or page needs to change when the data source is swapped.
 */

export type ID = string;

export interface FragranceNote {
  name: string;
  /** Olfactive family, e.g. "Amber", "Citrus", "Woody". */
  family: string;
}

export interface NotePyramid {
  top: FragranceNote[];
  heart: FragranceNote[];
  base: FragranceNote[];
}

export interface BottleSize {
  /** Volume in millilitres. */
  ml: number;
  /** Price in minor currency units (cents). */
  price: number;
  /** Optional stock count. `null` means "track later / assume available". */
  stock: number | null;
  sku: string;
}

export type Concentration =
  | "Eau de Cologne"
  | "Eau de Toilette"
  | "Eau de Parfum"
  | "Extrait de Parfum";

export interface ProductImage {
  src: string;
  alt: string;
}

export interface Product {
  id: ID;
  slug: string;
  name: string;
  /** One-line evocative strapline. */
  tagline: string;
  /** Card / listing blurb. Falls back to `tagline` when unset. */
  shortDescription?: string;
  /** Long-form marketing description (supports plain paragraphs). */
  description: string;
  /** Full INCI / ingredient declaration. */
  ingredients?: string;
  story: string;
  /** Product-level style code; per-size codes live on each `BottleSize.sku`. */
  baseSku?: string;
  /** 3D model URL (GLB/GLTF). When absent the showcase renders a procedural flacon. */
  modelUrl?: string | null;
  concentration: Concentration;
  gender: "Feminine" | "Masculine" | "Unisex";
  collectionSlug: string;
  /** Primary olfactive families used for filtering. */
  families: string[];
  notes: NotePyramid;
  /** Perfumer / nose credited for the composition. */
  perfumer: string;
  sillage: "Intimate" | "Moderate" | "Bold";
  longevity: "4–6h" | "6–8h" | "8h+";
  /** Curated wear occasions. When empty, derived from families/concentration. */
  occasions?: string[];
  /** Per-product personalisation options (see `src/lib/customization`). */
  customization?: import("@/lib/customization/types").ProductCustomizationConfig;
  images: ProductImage[];
  /** Accent colour used in cards and the 3D showcase (hex). */
  accentColor: string;
  sizes: BottleSize[];
  rating: number;
  reviewCount: number;
  featured: boolean;
  isNew: boolean;
  releaseYear: number;
}

export interface Collection {
  id: ID;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  accentColor: string;
  order: number;
}

export interface Testimonial {
  id: ID;
  quote: string;
  author: string;
  location: string;
  rating: number;
}

export interface OlfactiveFamily {
  slug: string;
  name: string;
  description: string;
  keyNotes: string[];
}

export interface ValueProp {
  title: string;
  description: string;
  icon: "leaf" | "flask" | "sparkles" | "recycle" | "hand" | "globe";
}

export interface SiteContent {
  brandName: string;
  /** Uploaded/URL brand mark. When unset, the storefront shows `brandName` as text. */
  logoUrl?: string | null;
  tagline: string;
  announcement: string;
  hero: {
    kicker: string;
    title: string;
    subtitle: string;
    ctaPrimary: { label: string; href: string };
    ctaSecondary: { label: string; href: string };
  };
  intro: {
    heading: string;
    body: string[];
  };
  story: {
    heading: string;
    body: string[];
    stats: { label: string; value: string }[];
  };
  values: ValueProp[];
  contact: {
    email: string;
    phone: string;
    /** Optional — omitted rows/links never render. */
    whatsapp?: string;
    addressLines: string[];
    hours: string;
  };
  social: { label: string; href: string }[];
}

/** Cart types are client-side only during the demo phase. */
export interface CartItem {
  /** Stable per-line id (a personalised line is distinct from a plain one). */
  lineId: string;
  productId: ID;
  slug: string;
  name: string;
  image: string;
  sku: string;
  ml: number;
  /** Base variant price; customisation surcharge is added on top. */
  unitPrice: number;
  quantity: number;
  /** Variant stock at the time the line was added (`null` = untracked). */
  stock: number | null;
  /** Server-priced personalisation attached to this line, if any. */
  customization?: import("@/lib/customization/types").CustomizationLine | null;
}
