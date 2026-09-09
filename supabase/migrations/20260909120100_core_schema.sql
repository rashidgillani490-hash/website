-- ============================================================================
-- Maison Lumière — Phase 2
-- 01 · Core schema: 17 tables with primary keys, foreign keys, constraints,
--      timestamps and relationships.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles — one row per auth user (kept in sync by a trigger on auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             citext,
  full_name         text,
  avatar_url        text,
  phone             text,
  role              public.user_role not null default 'customer',
  marketing_opt_in  boolean not null default false,
  loyalty_points    integer not null default 0 check (loyalty_points >= 0),
  default_address   jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint profiles_full_name_len check (full_name is null or char_length(full_name) <= 200)
);

comment on table public.profiles is 'Public profile & role data mirroring auth.users.';

-- ----------------------------------------------------------------------------
-- categories — storefront "collections" (self-referential tree)
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  subtitle        text,
  description     text,
  hero_image_url  text,
  accent_color    text check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  parent_id       uuid references public.categories (id) on delete set null,
  position        integer not null default 0,
  is_active       boolean not null default true,
  seo             jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_not_self_parent check (parent_id is null or parent_id <> id)
);

-- ----------------------------------------------------------------------------
-- fragrance_notes — master list of olfactive materials
-- ----------------------------------------------------------------------------
create table if not exists public.fragrance_notes (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  family       text not null,
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint fragrance_notes_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

-- ----------------------------------------------------------------------------
-- products
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  tagline        text,
  description    text,
  story          text,
  category_id    uuid references public.categories (id) on delete set null,
  concentration  text check (concentration in (
                   'Eau de Cologne', 'Eau de Toilette', 'Eau de Parfum', 'Extrait de Parfum'
                 )),
  gender         text check (gender in ('Feminine', 'Masculine', 'Unisex')),
  perfumer       text,
  sillage        text check (sillage in ('Intimate', 'Moderate', 'Bold')),
  longevity      text,
  accent_color   text check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  families       text[] not null default '{}'::text[],
  status         public.product_status not null default 'draft',
  is_featured    boolean not null default false,
  is_new         boolean not null default false,
  release_year   integer check (release_year is null or release_year between 1900 and 2100),
  rating         numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count   integer not null default 0 check (review_count >= 0),
  metadata       jsonb not null default '{}'::jsonb,
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

comment on column public.products.families is 'Denormalised olfactive family slugs for fast filtering; authoritative notes live in product_notes.';

-- ----------------------------------------------------------------------------
-- product_variants — purchasable bottle sizes
-- ----------------------------------------------------------------------------
create table if not exists public.product_variants (
  id                     uuid primary key default gen_random_uuid(),
  product_id             uuid not null references public.products (id) on delete cascade,
  sku                    text not null unique,
  volume_ml              integer not null check (volume_ml > 0),
  price_cents            integer not null check (price_cents >= 0),
  compare_at_price_cents integer check (compare_at_price_cents is null or compare_at_price_cents >= 0),
  currency               text not null default 'USD' check (char_length(currency) = 3),
  stock_quantity         integer not null default 0 check (stock_quantity >= 0),
  is_default             boolean not null default false,
  position               integer not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (product_id, volume_ml)
);

-- Exactly one default variant per product (when one is flagged)
create unique index if not exists product_variants_one_default
  on public.product_variants (product_id)
  where is_default;

-- ----------------------------------------------------------------------------
-- product_notes — product ⇆ fragrance_notes, tiered pyramid
-- ----------------------------------------------------------------------------
create table if not exists public.product_notes (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  note_id     uuid not null references public.fragrance_notes (id) on delete cascade,
  tier        public.note_tier not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (product_id, note_id, tier)
);

-- ----------------------------------------------------------------------------
-- product_images
-- ----------------------------------------------------------------------------
create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  url         text not null,
  alt         text,
  position    integer not null default 0,
  is_primary  boolean not null default false,
  width       integer check (width is null or width > 0),
  height      integer check (height is null or height > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists product_images_one_primary
  on public.product_images (product_id)
  where is_primary;

-- ----------------------------------------------------------------------------
-- product_3d_models
-- ----------------------------------------------------------------------------
create table if not exists public.product_3d_models (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  model_url     text,
  format        public.model_format not null default 'glb',
  poster_url    text,
  accent_color  text check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  scale         numeric not null default 1 check (scale > 0),
  is_active     boolean not null default true,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- One active model per product
create unique index if not exists product_3d_models_one_active
  on public.product_3d_models (product_id)
  where is_active;

-- ----------------------------------------------------------------------------
-- coupons  (declared before orders because orders references it)
-- ----------------------------------------------------------------------------
create table if not exists public.coupons (
  id                     uuid primary key default gen_random_uuid(),
  code                   citext not null unique,
  description            text,
  discount_type          public.discount_type not null,
  discount_value         numeric not null check (discount_value >= 0),
  currency               text not null default 'USD' check (char_length(currency) = 3),
  minimum_subtotal_cents integer not null default 0 check (minimum_subtotal_cents >= 0),
  max_redemptions        integer check (max_redemptions is null or max_redemptions > 0),
  per_user_limit         integer not null default 1 check (per_user_limit > 0),
  redeemed_count         integer not null default 0 check (redeemed_count >= 0),
  starts_at              timestamptz,
  expires_at             timestamptz,
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint coupons_percentage_range check (
    discount_type <> 'percentage' or (discount_value >= 0 and discount_value <= 100)
  ),
  constraint coupons_window check (
    starts_at is null or expires_at is null or expires_at > starts_at
  )
);

-- ----------------------------------------------------------------------------
-- carts
-- ----------------------------------------------------------------------------
create table if not exists public.carts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users (id) on delete cascade,
  anonymous_token   text,
  status            public.cart_status not null default 'active',
  currency          text not null default 'USD' check (char_length(currency) = 3),
  note              text,
  expires_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint carts_owner_present check (user_id is not null or anonymous_token is not null)
);

-- At most one active cart per user / per guest token
create unique index if not exists carts_one_active_per_user
  on public.carts (user_id) where status = 'active' and user_id is not null;
create unique index if not exists carts_one_active_per_token
  on public.carts (anonymous_token) where status = 'active' and anonymous_token is not null;

-- ----------------------------------------------------------------------------
-- cart_items
-- ----------------------------------------------------------------------------
create table if not exists public.cart_items (
  id                uuid primary key default gen_random_uuid(),
  cart_id           uuid not null references public.carts (id) on delete cascade,
  variant_id        uuid not null references public.product_variants (id) on delete restrict,
  product_id        uuid not null references public.products (id) on delete restrict,
  quantity          integer not null default 1 check (quantity > 0),
  unit_price_cents  integer not null check (unit_price_cents >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (cart_id, variant_id)
);

-- ----------------------------------------------------------------------------
-- orders
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      text not null unique,
  user_id           uuid references auth.users (id) on delete set null,
  email             citext not null,
  status            public.order_status not null default 'pending',
  currency          text not null default 'USD' check (char_length(currency) = 3),
  subtotal_cents    integer not null check (subtotal_cents >= 0),
  discount_cents    integer not null default 0 check (discount_cents >= 0),
  shipping_cents    integer not null default 0 check (shipping_cents >= 0),
  tax_cents         integer not null default 0 check (tax_cents >= 0),
  total_cents       integer not null check (total_cents >= 0),
  coupon_id         uuid references public.coupons (id) on delete set null,
  shipping_address  jsonb not null default '{}'::jsonb,
  billing_address   jsonb not null default '{}'::jsonb,
  shipping_method   text,
  tracking_number   text,
  customer_note     text,
  placed_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- order_items — line items with snapshotted product data
-- ----------------------------------------------------------------------------
create table if not exists public.order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  product_id        uuid references public.products (id) on delete set null,
  variant_id        uuid references public.product_variants (id) on delete set null,
  product_name      text not null,
  variant_label     text not null,
  sku               text,
  quantity          integer not null check (quantity > 0),
  unit_price_cents  integer not null check (unit_price_cents >= 0),
  total_cents       integer not null check (total_cents >= 0),
  created_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- order_status_history — append-only audit of status transitions
-- ----------------------------------------------------------------------------
create table if not exists public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  status      public.order_status not null,
  note        text,
  changed_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- customizations — engraving / refill / gift options on a cart or order line
-- ----------------------------------------------------------------------------
create table if not exists public.customizations (
  id                 uuid primary key default gen_random_uuid(),
  cart_item_id       uuid references public.cart_items (id) on delete cascade,
  order_item_id      uuid references public.order_items (id) on delete cascade,
  kind               public.customization_kind not null,
  payload            jsonb not null default '{}'::jsonb,
  price_delta_cents  integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint customizations_target_present check (
    cart_item_id is not null or order_item_id is not null
  )
);

-- ----------------------------------------------------------------------------
-- coupon_usage — one row per redemption
-- ----------------------------------------------------------------------------
create table if not exists public.coupon_usage (
  id             uuid primary key default gen_random_uuid(),
  coupon_id      uuid not null references public.coupons (id) on delete cascade,
  user_id        uuid references auth.users (id) on delete set null,
  order_id       uuid references public.orders (id) on delete cascade,
  amount_cents   integer not null default 0 check (amount_cents >= 0),
  created_at     timestamptz not null default now(),
  unique (coupon_id, order_id)
);

-- ----------------------------------------------------------------------------
-- store_settings — key/JSON store for admin-editable site configuration
-- ----------------------------------------------------------------------------
create table if not exists public.store_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  description text,
  updated_by  uuid references auth.users (id) on delete set null,
  updated_at  timestamptz not null default now(),
  constraint store_settings_key_format check (key ~ '^[a-z0-9_]+$')
);

comment on table public.store_settings is 'Admin-editable site content & commerce configuration. Replaces hardcoded demo copy.';
