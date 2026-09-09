-- ============================================================================
-- Maison Lumière — Phase 2
-- 00 · Extensions, enum types and shared helper functions
-- ============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "citext";        -- case-insensitive text (coupon codes, emails)
create extension if not exists "pg_trgm";       -- trigram indexes for search

-- ----------------------------------------------------------------------------
-- Enum types
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('customer', 'staff', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.note_tier as enum ('top', 'heart', 'base');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.model_format as enum ('glb', 'gltf', 'usdz');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cart_status as enum ('active', 'converted', 'abandoned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.discount_type as enum ('percentage', 'fixed_amount', 'free_shipping');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.customization_kind as enum ('engraving', 'refill', 'gift_wrap', 'sample_set');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- updated_at trigger helper (no table dependency — safe to define now)
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Role-helper functions (is_staff / is_admin) are defined in the RLS migration,
-- after `public.profiles` exists, so their bodies validate cleanly.
