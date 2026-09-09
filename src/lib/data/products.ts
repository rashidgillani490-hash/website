import type { BottleSize, Product } from "@/lib/types";

function sizes(base: number, skuRoot: string): BottleSize[] {
  return [
    { ml: 10, price: Math.round(base * 0.28), stock: 40, sku: `${skuRoot}-10` },
    { ml: 50, price: base, stock: 22, sku: `${skuRoot}-50` },
    { ml: 100, price: Math.round(base * 1.7), stock: 12, sku: `${skuRoot}-100` },
  ];
}

const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;

export const products: Product[] = [
  {
    id: "p-blanche-heure",
    slug: "blanche-heure",
    name: "Blanche Heure",
    tagline: "The maison's first light — jasmine before the sun clears the ridge.",
    description:
      "Blanche Heure is built around a single pre-dawn harvest of jasmine grandiflorum, lifted with Calabrian bergamot and set on a bed of pale sandalwood and musk. It reads as clean skin warmed by sun — luminous, close, quietly indulgent.",
    story:
      "The composition that made the maison. Éléonore Vaudlin blended the first version in 1991 from essences she had distilled for other houses, deciding the best of the harvest should carry her own name. The formula has been adjusted only twice in three decades.",
    concentration: "Eau de Parfum",
    gender: "Feminine",
    collectionSlug: "lumiere",
    families: ["floral", "citrus", "woody"],
    notes: {
      top: [
        { name: "Calabrian Bergamot", family: "Citrus" },
        { name: "White Peach", family: "Fruity" },
      ],
      heart: [
        { name: "Jasmine Grandiflorum", family: "Floral" },
        { name: "Orange Blossom", family: "Floral" },
      ],
      base: [
        { name: "Pale Sandalwood", family: "Woody" },
        { name: "White Musk", family: "Musky" },
      ],
    },
    perfumer: "Éléonore Vaudlin",
    sillage: "Moderate",
    longevity: "6–8h",
    images: [
      { src: UNSPLASH("1588405748880-12d1d2a59d75"), alt: "Blanche Heure flacon on stone" },
      { src: UNSPLASH("1615634260167-c8cdede054de"), alt: "Jasmine field at dawn" },
    ],
    accentColor: "#e7d9b8",
    sizes: sizes(21500, "BLH"),
    rating: 4.8,
    reviewCount: 214,
    featured: true,
    isNew: false,
    releaseYear: 1991,
  },
  {
    id: "p-nuit-vetiver",
    slug: "nuit-vetiver",
    name: "Nuit Vétiver",
    tagline: "Haitian vetiver, cold air and woodsmoke.",
    description:
      "A dry, mineral vetiver sharpened with grapefruit and pink pepper, then shadowed by guaiac wood and a whisper of leather. Built for cold mornings and long coats.",
    story:
      "Auguste Rey's answer to a request that kept coming from the atelier's oldest clients: a vetiver with no sweetness at all. Three years of trials; the released version uses vetiver from a single Haitian cooperative the maison has bought from since 2009.",
    concentration: "Eau de Parfum",
    gender: "Masculine",
    collectionSlug: "nocturne",
    families: ["woody", "aromatic", "citrus"],
    notes: {
      top: [
        { name: "Pink Grapefruit", family: "Citrus" },
        { name: "Pink Pepper", family: "Spicy" },
      ],
      heart: [
        { name: "Haitian Vetiver", family: "Woody" },
        { name: "Clary Sage", family: "Aromatic" },
      ],
      base: [
        { name: "Guaiac Wood", family: "Woody" },
        { name: "Dry Leather", family: "Leather" },
      ],
    },
    perfumer: "Auguste Rey",
    sillage: "Bold",
    longevity: "8h+",
    images: [
      { src: UNSPLASH("1594035910387-fea47794261f"), alt: "Nuit Vétiver dark flacon" },
      { src: UNSPLASH("1519681393784-d120267933ba"), alt: "Cold mountain landscape" },
    ],
    accentColor: "#3f4a3a",
    sizes: sizes(23500, "NVT"),
    rating: 4.7,
    reviewCount: 168,
    featured: true,
    isNew: false,
    releaseYear: 2016,
  },
  {
    id: "p-rose-close",
    slug: "rose-close",
    name: "Rose Close",
    tagline: "Centifolia rose, still wet, held at arm's length.",
    description:
      "The maison's centifolia rose absolute in near-photographic focus — dewy, faintly green, with a spiced lychee facet and a soft honeyed base. Not a jammy rose; a garden rose an hour after rain.",
    story:
      "Distilled entirely from the maison's own May harvest. In a strong year the entire run is under 900 bottles, which is why Rose Close moves to the Archive line whenever the crop is short.",
    concentration: "Extrait de Parfum",
    gender: "Unisex",
    collectionSlug: "lumiere",
    families: ["floral", "green"],
    notes: {
      top: [
        { name: "Lychee", family: "Fruity" },
        { name: "Violet Leaf", family: "Green" },
      ],
      heart: [
        { name: "Centifolia Rose Absolute", family: "Floral" },
        { name: "Peony", family: "Floral" },
      ],
      base: [
        { name: "Blond Woods", family: "Woody" },
        { name: "Acacia Honey", family: "Sweet" },
      ],
    },
    perfumer: "Auguste Rey",
    sillage: "Intimate",
    longevity: "6–8h",
    images: [
      { src: UNSPLASH("1592945403244-b3fbafd7f539"), alt: "Rose Close flacon with petals" },
      { src: UNSPLASH("1526047932273-341f2a7631f9"), alt: "Rose garden" },
    ],
    accentColor: "#d9a7a0",
    sizes: sizes(28000, "RSC"),
    rating: 4.9,
    reviewCount: 132,
    featured: true,
    isNew: false,
    releaseYear: 2013,
  },
  {
    id: "p-ambre-lumen",
    slug: "ambre-lumen",
    name: "Ambre Lumen",
    tagline: "Amber lit from behind — resin without the weight.",
    description:
      "Labdanum and benzoin rendered translucent with bitter orange and a dry tonka. Warm and enveloping but never heavy, it glows on the skin rather than sitting on it.",
    story:
      "An exercise in restraint. Rey rebuilt a classic maison amber from 1984, removing the vanillin and coumarin overdose and letting the natural benzoin carry the sweetness. The 1984 version is still in the Archive.",
    concentration: "Eau de Parfum",
    gender: "Unisex",
    collectionSlug: "nocturne",
    families: ["amber", "woody", "citrus"],
    notes: {
      top: [
        { name: "Bitter Orange", family: "Citrus" },
        { name: "Cardamom", family: "Spicy" },
      ],
      heart: [
        { name: "Labdanum", family: "Amber" },
        { name: "Immortelle", family: "Amber" },
      ],
      base: [
        { name: "Siam Benzoin", family: "Amber" },
        { name: "Dry Tonka", family: "Sweet" },
      ],
    },
    perfumer: "Auguste Rey",
    sillage: "Moderate",
    longevity: "8h+",
    images: [
      { src: UNSPLASH("1541643600914-78b084683601"), alt: "Ambre Lumen amber-glass flacon" },
      { src: UNSPLASH("1516546453174-5e1098a4b4af"), alt: "Warm evening light" },
    ],
    accentColor: "#c98a3c",
    sizes: sizes(22500, "AML"),
    rating: 4.6,
    reviewCount: 97,
    featured: true,
    isNew: false,
    releaseYear: 2019,
  },
  {
    id: "p-jardin-clos",
    slug: "jardin-clos",
    name: "Jardin Clos",
    tagline: "The walled garden at 6am — galbanum, fig, wet stone.",
    description:
      "Sharp green galbanum softened by fig leaf and a cool, transparent orris. There's a mineral coolness underneath, like the smell of a courtyard before the day has warmed it.",
    story:
      "The eponymous scent of the Jardin Clos line, composed on site over a full growing season. Rey took cuttings back to the atelier every morning for three months to keep the accord honest.",
    concentration: "Eau de Toilette",
    gender: "Unisex",
    collectionSlug: "jardin",
    families: ["green", "floral", "woody"],
    notes: {
      top: [
        { name: "Galbanum", family: "Green" },
        { name: "Bergamot", family: "Citrus" },
      ],
      heart: [
        { name: "Fig Leaf", family: "Green" },
        { name: "Orris Butter", family: "Floral" },
      ],
      base: [
        { name: "Wet Stone Accord", family: "Mineral" },
        { name: "Blond Cedar", family: "Woody" },
      ],
    },
    perfumer: "Auguste Rey",
    sillage: "Intimate",
    longevity: "4–6h",
    images: [
      { src: UNSPLASH("1615634260167-c8cdede054de"), alt: "Jardin Clos green-glass flacon" },
      { src: UNSPLASH("1466781783364-36c955e42a7f"), alt: "Green garden foliage" },
    ],
    accentColor: "#6f8f5e",
    sizes: sizes(18500, "JDC"),
    rating: 4.5,
    reviewCount: 76,
    featured: false,
    isNew: false,
    releaseYear: 2011,
  },
  {
    id: "p-heure-bleue-77",
    slug: "heure-bleue-77",
    name: "Heure Bleue 77",
    tagline: "Archive re-issue — powdery iris and carnation, 1977 formula.",
    description:
      "A faithful re-issue of a 1977 maison composition: heliotrope, iris and a spiced carnation over a soft almond-woods base. Nostalgic, powdery, unmistakably vintage in structure.",
    story:
      "Reconstructed from the original lab notebook and a sealed reference bottle held in the maison archive. Released in a numbered run of 500 for the house's 49th year.",
    concentration: "Extrait de Parfum",
    gender: "Feminine",
    collectionSlug: "archive",
    families: ["floral", "amber", "aromatic"],
    notes: {
      top: [
        { name: "Aniseed", family: "Aromatic" },
        { name: "Bergamot", family: "Citrus" },
      ],
      heart: [
        { name: "Iris", family: "Floral" },
        { name: "Spiced Carnation", family: "Floral" },
      ],
      base: [
        { name: "Heliotrope", family: "Sweet" },
        { name: "Almond Woods", family: "Woody" },
      ],
    },
    perfumer: "Éléonore Vaudlin",
    sillage: "Moderate",
    longevity: "8h+",
    images: [
      { src: UNSPLASH("1567016376408-0226e4d0c1ea"), alt: "Heure Bleue 77 numbered flacon" },
      { src: UNSPLASH("1493146671510-97f3f4f5e6e5"), alt: "Blue hour sky" },
    ],
    accentColor: "#5566a8",
    sizes: sizes(31000, "HB77"),
    rating: 4.7,
    reviewCount: 41,
    featured: false,
    isNew: true,
    releaseYear: 2026,
  },
  {
    id: "p-neroli-franc",
    slug: "neroli-franc",
    name: "Néroli Franc",
    tagline: "Orange blossom, bitter and bright, straight from the still.",
    description:
      "A near-soliflore of maison-distilled neroli — honeyed, faintly bitter, green at the edges — over a clean white musk. The most transparent scent in the wardrobe.",
    story:
      "Bottled directly from single distillation runs. Because it's barely a composition, tiny shifts in the harvest show — each batch code smells slightly different, and the maison lists tasting notes per batch.",
    concentration: "Eau de Toilette",
    gender: "Unisex",
    collectionSlug: "jardin",
    families: ["floral", "citrus"],
    notes: {
      top: [
        { name: "Petitgrain", family: "Green" },
        { name: "Mandarin", family: "Citrus" },
      ],
      heart: [
        { name: "Neroli", family: "Floral" },
        { name: "Orange Blossom Absolute", family: "Floral" },
      ],
      base: [
        { name: "White Musk", family: "Musky" },
        { name: "Blond Woods", family: "Woody" },
      ],
    },
    perfumer: "Auguste Rey",
    sillage: "Intimate",
    longevity: "4–6h",
    images: [
      { src: UNSPLASH("1523293182086-7651a899d37f"), alt: "Néroli Franc clear flacon" },
      { src: UNSPLASH("1502741224143-90386d7f8c82"), alt: "Orange blossom branch" },
    ],
    accentColor: "#e5c766",
    sizes: sizes(16500, "NRF"),
    rating: 4.4,
    reviewCount: 58,
    featured: false,
    isNew: true,
    releaseYear: 2025,
  },
  {
    id: "p-cuir-centifolia",
    slug: "cuir-centifolia",
    name: "Cuir Centifolia",
    tagline: "Rose and leather, aged eighteen months.",
    description:
      "The maison's centifolia rose pressed into a smoky birch-tar leather, with saffron and a dark plum sweetness. Opulent, a little dangerous, built for evening.",
    story:
      "The longest-aged composition the maison makes — eighteen months in glass demijohns before bottling. Production is capped at one batch per year.",
    concentration: "Extrait de Parfum",
    gender: "Unisex",
    collectionSlug: "nocturne",
    families: ["floral", "woody", "amber"],
    notes: {
      top: [
        { name: "Saffron", family: "Spicy" },
        { name: "Black Plum", family: "Fruity" },
      ],
      heart: [
        { name: "Centifolia Rose", family: "Floral" },
        { name: "Orris", family: "Floral" },
      ],
      base: [
        { name: "Birch Tar Leather", family: "Leather" },
        { name: "Oud Accord", family: "Woody" },
      ],
    },
    perfumer: "Auguste Rey",
    sillage: "Bold",
    longevity: "8h+",
    images: [
      { src: UNSPLASH("1610461888750-10bfc601b874"), alt: "Cuir Centifolia deep-red flacon" },
      { src: UNSPLASH("1512207736890-6ffed8a84e8d"), alt: "Dark leather texture" },
    ],
    accentColor: "#7a2e2e",
    sizes: sizes(33000, "CRC"),
    rating: 4.8,
    reviewCount: 63,
    featured: true,
    isNew: false,
    releaseYear: 2021,
  },
];
