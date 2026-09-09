-- ============================================================================
-- Maison Lumière — Phase 2
-- 03 · Triggers: updated_at maintenance, profile provisioning, order numbers,
--      status history and coupon redemption counting.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- updated_at on every table that carries the column
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'categories', 'fragrance_notes', 'products', 'product_variants',
    'product_images', 'product_3d_models', 'carts', 'cart_items', 'orders',
    'customizations', 'coupons', 'store_settings'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Provision a profile row whenever an auth user is created
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Human-friendly order numbers: ML-00001, ML-00002, ...
-- ----------------------------------------------------------------------------
create sequence if not exists public.order_number_seq start 1001;

create or replace function public.assign_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := 'ML-' || lpad(nextval('public.order_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists assign_order_number on public.orders;
create trigger assign_order_number
  before insert on public.orders
  for each row execute function public.assign_order_number();

-- ----------------------------------------------------------------------------
-- Record status transitions into order_status_history
-- ----------------------------------------------------------------------------
create or replace function public.log_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, status, changed_by, note)
    values (new.id, new.status, auth.uid(), 'Order created');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.order_status_history (order_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists log_order_status_ins on public.orders;
create trigger log_order_status_ins
  after insert on public.orders
  for each row execute function public.log_order_status();

drop trigger if exists log_order_status_upd on public.orders;
create trigger log_order_status_upd
  after update on public.orders
  for each row execute function public.log_order_status();

-- ----------------------------------------------------------------------------
-- Keep coupons.redeemed_count in step with coupon_usage
-- ----------------------------------------------------------------------------
create or replace function public.sync_coupon_redeemed_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.coupons set redeemed_count = redeemed_count + 1 where id = new.coupon_id;
  elsif tg_op = 'DELETE' then
    update public.coupons set redeemed_count = greatest(redeemed_count - 1, 0) where id = old.coupon_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_coupon_redeemed_count on public.coupon_usage;
create trigger sync_coupon_redeemed_count
  after insert or delete on public.coupon_usage
  for each row execute function public.sync_coupon_redeemed_count();
