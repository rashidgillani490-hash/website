-- ============================================================================
-- Maison Lumière — Phase 6
-- 10 · Pakistan checkout: payment method/status on orders, and safe stock
--      decrement helpers used by the order pipeline.
-- ============================================================================

alter table public.orders
  add column if not exists payment_method text not null default 'cod',
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists discount_code  text;

do $$ begin
  alter table public.orders
    add constraint orders_payment_method_chk
    check (payment_method in ('cod', 'jazzcash', 'easypaisa', 'bank_transfer', 'card'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.orders
    add constraint orders_payment_status_chk
    check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded'));
exception when duplicate_object then null; end $$;

create index if not exists orders_payment_method_idx on public.orders (payment_method);

-- ----------------------------------------------------------------------------
-- Atomic, guarded stock decrement. Returns TRUE when the stock was available
-- and taken, FALSE when there wasn't enough (no change made). The order
-- pipeline reserves stock line-by-line and rolls back with restore_variant_stock
-- if any line can't be satisfied.
-- ----------------------------------------------------------------------------
create or replace function public.try_decrement_variant_stock(
  p_variant_id uuid,
  p_qty integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated integer;
begin
  if p_qty is null or p_qty <= 0 then
    return false;
  end if;
  update public.product_variants
     set stock_quantity = stock_quantity - p_qty,
         updated_at = now()
   where id = p_variant_id
     and stock_quantity >= p_qty;
  get diagnostics updated = row_count;
  return updated = 1;
end;
$$;

create or replace function public.restore_variant_stock(
  p_variant_id uuid,
  p_qty integer
) returns void
language sql
security definer
set search_path = public
as $$
  update public.product_variants
     set stock_quantity = stock_quantity + greatest(p_qty, 0),
         updated_at = now()
   where id = p_variant_id;
$$;

grant execute on function public.try_decrement_variant_stock(uuid, integer)
  to anon, authenticated, service_role;
grant execute on function public.restore_variant_stock(uuid, integer)
  to anon, authenticated, service_role;

comment on function public.try_decrement_variant_stock(uuid, integer) is
  'Guarded stock reservation: subtracts p_qty only if enough is in stock; returns whether it succeeded.';
