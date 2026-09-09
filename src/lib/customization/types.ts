/**
 * Shared customisation types — used by the storefront customiser, the cart,
 * the checkout → order path, the admin product editor and the admin order view.
 * Dependency-free so the pricing/validation modules stay unit-testable.
 */

export interface CustomOption {
  id: string;
  label: string;
  /** Price delta in minor units (cents). May be 0. */
  priceCents: number;
}

/** Per-product configuration, stored in `products.customization` (jsonb). */
export interface ProductCustomizationConfig {
  enabled: boolean;
  allowImage: boolean;
  imagePriceCents: number;
  allowText: boolean;
  textMaxLength: number;
  textPriceCents: number;
  bottleOptions: CustomOption[];
  packagingOptions: CustomOption[];
}

export const emptyCustomizationConfig: ProductCustomizationConfig = {
  enabled: false,
  allowImage: false,
  imagePriceCents: 0,
  allowText: false,
  textMaxLength: 24,
  textPriceCents: 0,
  bottleOptions: [],
  packagingOptions: [],
};

/** What the customer chose. Never carries a price — the server derives that. */
export interface CustomizationSelection {
  text?: string | null;
  imageUrl?: string | null;
  /** Storage key/path — kept so the asset can be deleted/re-signed later. */
  imagePath?: string | null;
  bottleOptionId?: string | null;
  packagingOptionId?: string | null;
}

/** A priced, resolved customisation — stored on the cart item and the order. */
export interface CustomizationLine {
  selection: CustomizationSelection;
  bottleOptionLabel?: string | null;
  packagingOptionLabel?: string | null;
  /** Server-computed total surcharge for this line's customisation. */
  deltaCents: number;
  breakdown: { label: string; amountCents: number }[];
  /** One-line human summary for cart / order UIs. */
  summary: string;
}

export function isCustomizationEmpty(sel: CustomizationSelection): boolean {
  return (
    !sel.text?.trim() &&
    !sel.imageUrl &&
    !sel.bottleOptionId &&
    !sel.packagingOptionId
  );
}
