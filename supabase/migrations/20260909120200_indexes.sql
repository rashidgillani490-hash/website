-- ============================================================================
-- Maison Lumière — Phase 2
-- 02 · Secondary indexes for foreign keys, filters and search
-- ============================================================================

-- profiles
create index if not exists profiles_role_idx on public.profiles (role);

-- categories
create index if not exists categories_parent_id_idx on public.categories (parent_id);
create index if not exists categories_active_position_idx on public.categories (is_active, position);

-- products
create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_status_idx on public.products (status);
create index if not exists products_featured_idx on public.products (is_featured) where is_featured;
create index if not exists products_is_new_idx on public.products (is_new) where is_new;
create index if not exists products_families_gin on public.products using gin (families);
create index if not exists products_name_trgm on public.products using gin (name gin_trgm_ops);
create index if not exists products_published_at_idx on public.products (published_at desc nulls last);

-- product_variants
create index if not exists product_variants_product_id_idx on public.product_variants (product_id);
create index if not exists product_variants_price_idx on public.product_variants (price_cents);

-- product_notes
create index if not exists product_notes_product_id_idx on public.product_notes (product_id);
create index if not exists product_notes_note_id_idx on public.product_notes (note_id);

-- product_images
create index if not exists product_images_product_id_idx on public.product_images (product_id, position);

-- product_3d_models
create index if not exists product_3d_models_product_id_idx on public.product_3d_models (product_id);

-- fragrance_notes
create index if not exists fragrance_notes_family_idx on public.fragrance_notes (family);

-- carts
create index if not exists carts_user_id_idx on public.carts (user_id);
create index if not exists carts_status_idx on public.carts (status);

-- cart_items
create index if not exists cart_items_cart_id_idx on public.cart_items (cart_id);
create index if not exists cart_items_variant_id_idx on public.cart_items (variant_id);
create index if not exists cart_items_product_id_idx on public.cart_items (product_id);

-- orders
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_email_idx on public.orders (email);
create index if not exists orders_coupon_id_idx on public.orders (coupon_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- order_items
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);

-- order_status_history
create index if not exists order_status_history_order_id_idx on public.order_status_history (order_id, created_at);

-- customizations
create index if not exists customizations_cart_item_id_idx on public.customizations (cart_item_id);
create index if not exists customizations_order_item_id_idx on public.customizations (order_item_id);

-- coupons
create index if not exists coupons_active_idx on public.coupons (is_active) where is_active;

-- coupon_usage
create index if not exists coupon_usage_coupon_id_idx on public.coupon_usage (coupon_id);
create index if not exists coupon_usage_user_id_idx on public.coupon_usage (user_id);
create index if not exists coupon_usage_order_id_idx on public.coupon_usage (order_id);
