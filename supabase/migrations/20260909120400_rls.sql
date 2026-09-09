-- ============================================================================
-- Maison Lumière — Phase 2
-- 04 · Row Level Security
--
-- Model:
--   * Catalog (categories, products, variants, notes, images, 3d models) —
--     world-readable when active/published; writable only by staff/admin.
--   * store_settings & active coupons — world-readable; writable by staff/admin.
--   * profiles / carts / orders — each user sees and manages only their own
--     rows; staff/admin may read & manage everything.
--   * order_status_history — visible to the owning customer and staff; never
--     written directly (only via the orders trigger, which is SECURITY DEFINER).
-- The service-role key bypasses RLS entirely and is used server-side only for
-- seeding and privileged admin mutations.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Role helpers. SECURITY DEFINER + owned by the migration role so they bypass
-- RLS on `profiles` and cannot cause recursive policy evaluation. Defined here
-- (not in migration 00) so `public.profiles` already exists and the function
-- bodies validate.
-- ----------------------------------------------------------------------------
create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role::text from public.profiles p where p.id = auth.uid()),
    'anon'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('staff', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

comment on function public.is_staff() is 'True when the current user has the staff or admin role.';
comment on function public.is_admin() is 'True when the current user has the admin role.';

alter table public.profiles              enable row level security;
alter table public.categories            enable row level security;
alter table public.fragrance_notes       enable row level security;
alter table public.products              enable row level security;
alter table public.product_variants      enable row level security;
alter table public.product_notes         enable row level security;
alter table public.product_images        enable row level security;
alter table public.product_3d_models     enable row level security;
alter table public.carts                 enable row level security;
alter table public.cart_items            enable row level security;
alter table public.customizations        enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.order_status_history  enable row level security;
alter table public.coupons               enable row level security;
alter table public.coupon_usage          enable row level security;
alter table public.store_settings        enable row level security;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid() or public.is_staff());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- Catalog — public read of live rows, staff write
-- ----------------------------------------------------------------------------
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories
  for select using (is_active or public.is_staff());

drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists fragrance_notes_read on public.fragrance_notes;
create policy fragrance_notes_read on public.fragrance_notes
  for select using (true);

drop policy if exists fragrance_notes_write on public.fragrance_notes;
create policy fragrance_notes_write on public.fragrance_notes
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select using (status = 'active' or public.is_staff());

drop policy if exists products_write on public.products;
create policy products_write on public.products
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists product_variants_read on public.product_variants;
create policy product_variants_read on public.product_variants
  for select using (
    public.is_staff() or exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.status = 'active'
    )
  );

drop policy if exists product_variants_write on public.product_variants;
create policy product_variants_write on public.product_variants
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists product_notes_read on public.product_notes;
create policy product_notes_read on public.product_notes
  for select using (
    public.is_staff() or exists (
      select 1 from public.products p
      where p.id = product_notes.product_id and p.status = 'active'
    )
  );

drop policy if exists product_notes_write on public.product_notes;
create policy product_notes_write on public.product_notes
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists product_images_read on public.product_images;
create policy product_images_read on public.product_images
  for select using (
    public.is_staff() or exists (
      select 1 from public.products p
      where p.id = product_images.product_id and p.status = 'active'
    )
  );

drop policy if exists product_images_write on public.product_images;
create policy product_images_write on public.product_images
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists product_3d_models_read on public.product_3d_models;
create policy product_3d_models_read on public.product_3d_models
  for select using (
    public.is_staff() or exists (
      select 1 from public.products p
      where p.id = product_3d_models.product_id and p.status = 'active'
    )
  );

drop policy if exists product_3d_models_write on public.product_3d_models;
create policy product_3d_models_write on public.product_3d_models
  for all using (public.is_staff()) with check (public.is_staff());

-- ----------------------------------------------------------------------------
-- carts & cart_items — owner (user) access; guest carts are handled by the
-- server with the service-role key.
-- ----------------------------------------------------------------------------
drop policy if exists carts_owner on public.carts;
create policy carts_owner on public.carts
  for all using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid() or public.is_staff());

drop policy if exists cart_items_owner on public.cart_items;
create policy cart_items_owner on public.cart_items
  for all using (
    public.is_staff() or exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id and c.user_id = auth.uid()
    )
  )
  with check (
    public.is_staff() or exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id and c.user_id = auth.uid()
    )
  );

drop policy if exists customizations_owner on public.customizations;
create policy customizations_owner on public.customizations
  for all using (
    public.is_staff()
    or exists (
      select 1 from public.cart_items ci
      join public.carts c on c.id = ci.cart_id
      where ci.id = customizations.cart_item_id and c.user_id = auth.uid()
    )
    or exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = customizations.order_item_id and o.user_id = auth.uid()
    )
  )
  with check (
    public.is_staff()
    or exists (
      select 1 from public.cart_items ci
      join public.carts c on c.id = ci.cart_id
      where ci.id = customizations.cart_item_id and c.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- orders & lines — customers read/create their own; updates are staff-only.
-- ----------------------------------------------------------------------------
drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own on public.orders
  for insert with check (user_id = auth.uid() or user_id is null or public.is_staff());

drop policy if exists orders_update_staff on public.orders;
create policy orders_update_staff on public.orders
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select using (
    public.is_staff() or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items
  for insert with check (
    public.is_staff() or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists order_status_history_select on public.order_status_history;
create policy order_status_history_select on public.order_status_history
  for select using (
    public.is_staff() or exists (
      select 1 from public.orders o
      where o.id = order_status_history.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists order_status_history_write_staff on public.order_status_history;
create policy order_status_history_write_staff on public.order_status_history
  for insert with check (public.is_staff());

-- ----------------------------------------------------------------------------
-- coupons — read active codes to validate at checkout; staff manage.
-- ----------------------------------------------------------------------------
drop policy if exists coupons_read_active on public.coupons;
create policy coupons_read_active on public.coupons
  for select using (
    public.is_staff()
    or (
      is_active
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at >= now())
    )
  );

drop policy if exists coupons_write_staff on public.coupons;
create policy coupons_write_staff on public.coupons
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists coupon_usage_select on public.coupon_usage;
create policy coupon_usage_select on public.coupon_usage
  for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists coupon_usage_insert on public.coupon_usage;
create policy coupon_usage_insert on public.coupon_usage
  for insert with check (user_id = auth.uid() or public.is_staff());

-- ----------------------------------------------------------------------------
-- store_settings — world-readable, staff-writable.
-- ----------------------------------------------------------------------------
drop policy if exists store_settings_read on public.store_settings;
create policy store_settings_read on public.store_settings
  for select using (true);

drop policy if exists store_settings_write on public.store_settings;
create policy store_settings_write on public.store_settings
  for all using (public.is_staff()) with check (public.is_staff());
