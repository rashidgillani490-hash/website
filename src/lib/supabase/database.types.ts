/**
 * Typed schema for the Maison Lumière Supabase database.
 *
 * Hand-authored to match `supabase/migrations/*`. When a Supabase project is
 * linked you can regenerate this file with:
 *
 *   npm run db:types      # supabase gen types typescript --local
 *
 * Keep the shape identical so the rest of the app does not change.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "customer" | "staff" | "admin";
export type ProductStatus = "draft" | "active" | "archived";
export type NoteTier = "top" | "heart" | "base";
export type ModelFormat = "glb" | "gltf" | "usdz";
export type CartStatus = "active" | "converted" | "abandoned";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";
export type DiscountType = "percentage" | "fixed_amount" | "free_shipping";
export type CustomizationKind =
  | "engraving"
  | "refill"
  | "gift_wrap"
  | "sample_set"
  | "personalisation";

type Timestamps = { created_at: string; updated_at: string };

export interface ProfileRow extends Timestamps {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  marketing_opt_in: boolean;
  loyalty_points: number;
  default_address: Json | null;
}

export interface CategoryRow extends Timestamps {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  hero_image_url: string | null;
  accent_color: string | null;
  parent_id: string | null;
  position: number;
  is_active: boolean;
  seo: Json;
}

export interface FragranceNoteRow extends Timestamps {
  id: string;
  slug: string;
  name: string;
  family: string;
  description: string | null;
}

export interface ProductRow extends Timestamps {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  short_description: string | null;
  description: string | null;
  ingredients: string | null;
  story: string | null;
  base_sku: string | null;
  category_id: string | null;
  concentration: string | null;
  gender: string | null;
  perfumer: string | null;
  sillage: string | null;
  longevity: string | null;
  accent_color: string | null;
  families: string[];
  customization: Json;
  status: ProductStatus;
  is_featured: boolean;
  is_new: boolean;
  release_year: number | null;
  rating: number;
  review_count: number;
  metadata: Json;
  published_at: string | null;
}

export interface ProductVariantRow extends Timestamps {
  id: string;
  product_id: string;
  sku: string;
  volume_ml: number;
  price_cents: number;
  compare_at_price_cents: number | null;
  currency: string;
  stock_quantity: number;
  is_default: boolean;
  position: number;
}

export interface ProductNoteRow {
  id: string;
  product_id: string;
  note_id: string;
  tier: NoteTier;
  position: number;
  created_at: string;
}

export interface ProductImageRow extends Timestamps {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  position: number;
  is_primary: boolean;
  width: number | null;
  height: number | null;
}

export interface Product3DModelRow extends Timestamps {
  id: string;
  product_id: string;
  model_url: string | null;
  format: ModelFormat;
  poster_url: string | null;
  accent_color: string | null;
  scale: number;
  is_active: boolean;
  metadata: Json;
}

export interface CartRow extends Timestamps {
  id: string;
  user_id: string | null;
  anonymous_token: string | null;
  status: CartStatus;
  currency: string;
  note: string | null;
  expires_at: string | null;
}

export interface CartItemRow extends Timestamps {
  id: string;
  cart_id: string;
  variant_id: string;
  product_id: string;
  quantity: number;
  unit_price_cents: number;
}

export interface CustomizationRow extends Timestamps {
  id: string;
  cart_item_id: string | null;
  order_item_id: string | null;
  kind: CustomizationKind;
  payload: Json;
  price_delta_cents: number;
}

export interface OrderRow extends Timestamps {
  id: string;
  order_number: string;
  user_id: string | null;
  email: string;
  status: OrderStatus;
  payment_method: string;
  payment_status: string;
  currency: string;
  subtotal_cents: number;
  discount_cents: number;
  discount_code: string | null;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  coupon_id: string | null;
  shipping_address: Json;
  billing_address: Json;
  shipping_method: string | null;
  tracking_number: string | null;
  tracking_carrier: string | null;
  tracking_updated_at: string | null;
  customer_note: string | null;
  placed_at: string | null;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_label: string;
  sku: string | null;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  created_at: string;
}

export interface OrderStatusHistoryRow {
  id: string;
  order_id: string;
  status: OrderStatus;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface CouponRow extends Timestamps {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  currency: string;
  minimum_subtotal_cents: number;
  max_redemptions: number | null;
  per_user_limit: number;
  redeemed_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export interface CouponUsageRow {
  id: string;
  coupon_id: string;
  user_id: string | null;
  email: string;
  order_id: string | null;
  amount_cents: number;
  created_at: string;
}

export interface StoreSettingRow {
  key: string;
  value: Json;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

/** Row shape of the `product_catalog` view (JSON aggregates). */
export interface ProductCatalogRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  short_description: string | null;
  description: string | null;
  ingredients: string | null;
  story: string | null;
  base_sku: string | null;
  concentration: string | null;
  gender: string | null;
  perfumer: string | null;
  sillage: string | null;
  longevity: string | null;
  accent_color: string | null;
  families: string[];
  customization: Json;
  status: ProductStatus;
  is_featured: boolean;
  is_new: boolean;
  release_year: number | null;
  rating: number;
  review_count: number;
  metadata: Json;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category_id: string | null;
  category_slug: string | null;
  category_name: string | null;
  variants: CatalogVariant[];
  images: CatalogImage[];
  notes: CatalogNote[];
  model: CatalogModel | null;
}

export interface CatalogVariant {
  id: string;
  sku: string;
  volume_ml: number;
  price_cents: number;
  compare_at_price_cents: number | null;
  currency: string;
  stock_quantity: number;
  is_default: boolean;
  position: number;
}
export interface CatalogImage {
  id: string;
  url: string;
  alt: string | null;
  position: number;
  is_primary: boolean;
}
export interface CatalogNote {
  tier: NoteTier;
  position: number;
  slug: string;
  name: string;
  family: string;
}
export interface CatalogModel {
  model_url: string | null;
  format: ModelFormat;
  poster_url: string | null;
  accent_color: string | null;
  scale: number;
}

type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow>;
      categories: TableDef<CategoryRow>;
      fragrance_notes: TableDef<FragranceNoteRow>;
      products: TableDef<ProductRow>;
      product_variants: TableDef<ProductVariantRow>;
      product_notes: TableDef<ProductNoteRow>;
      product_images: TableDef<ProductImageRow>;
      product_3d_models: TableDef<Product3DModelRow>;
      carts: TableDef<CartRow>;
      cart_items: TableDef<CartItemRow>;
      customizations: TableDef<CustomizationRow>;
      orders: TableDef<OrderRow>;
      order_items: TableDef<OrderItemRow>;
      order_status_history: TableDef<OrderStatusHistoryRow>;
      coupons: TableDef<CouponRow>;
      coupon_usage: TableDef<CouponUsageRow>;
      store_settings: TableDef<StoreSettingRow>;
    };
    Views: {
      product_catalog: { Row: ProductCatalogRow };
    };
    Functions: {
      is_staff: { Args: Record<string, never>; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      try_decrement_variant_stock: {
        Args: { p_variant_id: string; p_qty: number };
        Returns: boolean;
      };
      restore_variant_stock: {
        Args: { p_variant_id: string; p_qty: number };
        Returns: undefined;
      };
      admin_set_order_status: {
        Args: { p_order_id: string; p_status: OrderStatus; p_note?: string | null };
        Returns: undefined;
      };
      admin_add_order_tracking: {
        Args: {
          p_order_id: string;
          p_tracking_number: string;
          p_tracking_carrier?: string | null;
          p_note?: string | null;
        };
        Returns: undefined;
      };
      admin_cancel_order: {
        Args: { p_order_id: string; p_note?: string | null };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      product_status: ProductStatus;
      note_tier: NoteTier;
      model_format: ModelFormat;
      cart_status: CartStatus;
      order_status: OrderStatus;
      discount_type: DiscountType;
      customization_kind: CustomizationKind;
    };
  };
}
