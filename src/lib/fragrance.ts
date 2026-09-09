import type { Product } from "@/lib/types";

/**
 * Recommended occasions for a fragrance. Uses an explicit `product.occasions`
 * list when present, otherwise derives a tasteful set from the olfactive
 * families, concentration and sillage so every product has meaningful content.
 */
const FAMILY_OCCASIONS: Record<string, string[]> = {
  floral: ["Daytime", "Spring", "Romantic evenings"],
  citrus: ["Warm weather", "The office", "Daytime"],
  woody: ["Autumn", "Evening", "Cool weather"],
  amber: ["Winter", "Evening", "Special occasions"],
  green: ["Daytime", "Spring", "Outdoors"],
  aromatic: ["Everyday", "The office", "Travel"],
  fruity: ["Daytime", "Casual", "Warm weather"],
  leather: ["Evening", "Autumn", "Statement moments"],
  musky: ["Everyday", "Close encounters", "Layering"],
};

export function recommendedOccasions(product: Product): string[] {
  if (product.occasions && product.occasions.length > 0) {
    return product.occasions;
  }

  const set = new Set<string>();
  for (const family of product.families) {
    for (const occ of FAMILY_OCCASIONS[family] ?? []) set.add(occ);
  }

  if (product.concentration === "Extrait de Parfum") set.add("Special occasions");
  if (product.concentration === "Eau de Cologne") set.add("Refreshing anytime");
  if (product.sillage === "Bold") set.add("Nights out");
  if (product.sillage === "Intimate") set.add("Quiet days");

  const list = [...set];
  return list.length > 0 ? list.slice(0, 6) : ["Everyday", "Evening", "Special occasions"];
}

/** Format the primary olfactive family for display. */
export function primaryFamily(product: Product): string {
  const f = product.families[0] ?? "signature";
  return f.charAt(0).toUpperCase() + f.slice(1);
}

/** "Floral · Citrus · Woody" */
export function familyLine(product: Product): string {
  return product.families
    .map((f) => f.charAt(0).toUpperCase() + f.slice(1))
    .join(" · ");
}
