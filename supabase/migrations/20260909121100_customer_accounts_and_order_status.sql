-- ============================================================================
-- Maison Lumière — Phase 7
-- 11 · Customer accounts & order management:
--        * order_status recut to the customer-facing lifecycle (no more
--          'paid' / 'refunded' — payment_status already covers those)
--        * tracking fields + search indexes on orders
--        * status-history notes threaded through admin-driven transitions
--        * guarded RPCs for status change / tracking / cancel-with-restock
--        * closes a role-escalation gap in the self-update policy on profiles
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1 · Recut the order_status enum.
--     pending → confirmed → processing → shipped → out_for_delivery → delivered
--     cancelled is reachable from any pre-delivery state.
--     Legacy values are remapped rather than dropped silently: 'paid' becomes
--     'confirmed' (payment_status already records the money side) and
--     'refunded' becomes 'cancelled'.
-- ----------------------------------------------------------------------------
alter type public.order_status rename to order_status_old;

create type public.order_status as enum (
  'pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'
);

alter table public.orders alter column status drop default;
alter table public.orders
  alter column status type public.order_status
  using (
    case status::text
      when 'paid' then 'confirmed'
      when 'refunded' then 'cancelled'
      else status::text
    end
  )::public.order_status;
alter table public.orders alter column status set default 'pending';

alter table public.order_status_history
  alter column status type public.order_status
  using (
    case status::text
      when 'paid' then 'confirmed'
      when 'refunded' then 'cancelled'
      else status::text
    end
  )::public.order_status;

drop type public.order_status_old;

-- ----------------------------------------------------------------------------
-- 2 · Tracking information lives on the order; a change is also recorded as a
--     status-history entry (same status, a note) so the customer sees when it
--     was added.
-- ----------------------------------------------------------------------------
alter table public.orders
  add column if not exists tracking_carrier   text,
  add column if not exists tracking_updated_at timestamptz;

-- ----------------------------------------------------------------------------
-- 3 · Search & filter indexes for the admin order list.
-- ----------------------------------------------------------------------------
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_status_idx  on public.orders (status);
create index if not exists orders_order_number_trgm_idx
  on public.orders using gin (order_number gin_trgm_ops);
create index if not exists orders_email_trgm_idx
  on public.orders using gin ((email::text) gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 4 · Let an admin-driven status change carry a note without the automatic
--     insert/update trigger and the admin's own insert racing to write two
--     history rows for one transition. The trigger reads a transaction-local
--     setting the RPCs below populate first.
-- ----------------------------------------------------------------------------
create or replace function public.log_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note text;
begin
  v_note := nullif(current_setting('app.order_status_note', true), '');
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, status, changed_by, note)
    values (new.id, new.status, auth.uid(), coalesce(v_note, 'Order placed'));
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.order_status_history (order_id, status, changed_by, note)
    values (new.id, new.status, auth.uid(), v_note);
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5 · Order-management RPCs used by the admin repository. Authorization for
--     every admin mutation in this app is enforced once, at the Server Action
--     boundary (`requireStaff()`), and the repo then talks to Postgres with
--     the service-role key — exactly like `try_decrement_variant_stock` /
--     `restore_variant_stock` above and every other admin write in this
--     schema. These are SECURITY DEFINER only so they can write history/stock
--     rows in one transaction; they are not re-checking the caller's role,
--     and are granted to `service_role` alone so nothing else can invoke them.
-- ----------------------------------------------------------------------------
create or replace function public.admin_set_order_status(
  p_order_id uuid,
  p_status   public.order_status,
  p_note     text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.order_status_note', coalesce(p_note, ''), true);
  update public.orders set status = p_status where id = p_order_id;
  if not found then
    raise exception 'Order not found.';
  end if;
end;
$$;

create or replace function public.admin_add_order_tracking(
  p_order_id        uuid,
  p_tracking_number text,
  p_tracking_carrier text default null,
  p_note            text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
begin
  update public.orders
     set tracking_number = nullif(trim(p_tracking_number), ''),
         tracking_carrier = nullif(trim(coalesce(p_tracking_carrier, '')), ''),
         tracking_updated_at = now()
   where id = p_order_id
   returning status into v_status;
  if not found then
    raise exception 'Order not found.';
  end if;
  insert into public.order_status_history (order_id, status, changed_by, note)
  values (
    p_order_id,
    v_status,
    auth.uid(),
    coalesce(p_note, 'Tracking added: ' || coalesce(p_tracking_carrier || ' ', '') || p_tracking_number)
  );
end;
$$;

create or replace function public.admin_cancel_order(
  p_order_id uuid,
  p_note     text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
  r        record;
begin
  select status into v_status from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.';
  end if;
  if v_status = 'cancelled' then
    return; -- already cancelled — idempotent, stock already restored once
  end if;
  if v_status = 'delivered' then
    raise exception 'A delivered order cannot be cancelled.';
  end if;

  for r in
    select variant_id, quantity from public.order_items
    where order_id = p_order_id and variant_id is not null
  loop
    update public.product_variants
       set stock_quantity = stock_quantity + r.quantity,
           updated_at = now()
     where id = r.variant_id;
  end loop;

  perform set_config('app.order_status_note', coalesce(p_note, 'Order cancelled'), true);
  update public.orders set status = 'cancelled' where id = p_order_id;
end;
$$;

revoke all on function public.admin_set_order_status(uuid, public.order_status, text) from public, anon, authenticated;
revoke all on function public.admin_add_order_tracking(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_cancel_order(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_order_status(uuid, public.order_status, text) to service_role;
grant execute on function public.admin_add_order_tracking(uuid, text, text, text) to service_role;
grant execute on function public.admin_cancel_order(uuid, text) to service_role;

comment on function public.admin_set_order_status(uuid, public.order_status, text) is
  'Service-role only: change an order status and record the transition with an optional note. Staff authorization happens in the Next.js Server Action (requireStaff()) before this is ever called.';
comment on function public.admin_add_order_tracking(uuid, text, text, text) is
  'Service-role only: set tracking number/carrier and log it to the status history.';
comment on function public.admin_cancel_order(uuid, text) is
  'Service-role only: cancel an order and restore each line''s reserved stock. Idempotent; refuses a delivered order.';

-- ----------------------------------------------------------------------------
-- 6 · Close a privilege-escalation gap: `profiles_update_self` lets a customer
--     update their OWN row (by id), but nothing stopped that update from also
--     setting role = 'admin'. A non-admin's role change is now silently
--     reverted server-side, regardless of what the request tried to set.
-- ----------------------------------------------------------------------------
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Target precisely "a signed-in, non-admin user editing their OWN row" —
  -- the shape of the app's self-service profile update. `profiles_update_self`
  -- already requires `is_admin()` for anyone touching a row that isn't their
  -- own, so a foreign-row update reaching this point is already
  -- admin-authorized; a null `auth.uid()` means there is no request context at
  -- all (service-role writes, seeds, migrations) and is left alone too.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and auth.uid() = old.id
     and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_role_self_escalation on public.profiles;
create trigger prevent_role_self_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

comment on function public.prevent_role_self_escalation() is
  'Defense in depth: a non-admin session cannot change ITS OWN profiles.role, even though RLS already scopes the row to its owner. Service-role writes (no auth.uid()) and admin-performed changes are unaffected.';
