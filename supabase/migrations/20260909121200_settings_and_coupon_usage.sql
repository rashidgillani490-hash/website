-- ============================================================================
-- Maison Lumière — Phase 8
-- 12 · Store settings & discount system:
--        * `coupon_usage` needs an email so a GUEST checkout's per-customer
--          usage limit is enforceable too, not just signed-in accounts.
--        * indexes for the redemption-count lookups the order pipeline now
--          runs on every coupon application.
-- Store settings themselves (brand, logo, contact, shipping fee, free-shipping
-- threshold, COD on/off, social links) need no schema change — they are the
-- existing `store_settings` key/value JSONB rows (`site_content`, `commerce`),
-- already covered by migration …120100/…120400 (world-readable, staff-write).
-- ============================================================================

alter table public.coupon_usage
  add column if not exists email citext;

-- Backfill from the order it came from, for any pre-existing rows.
update public.coupon_usage cu
   set email = o.email
  from public.orders o
 where cu.order_id = o.id
   and cu.email is null;

alter table public.coupon_usage
  alter column email set not null;

create index if not exists coupon_usage_coupon_user_idx
  on public.coupon_usage (coupon_id, user_id);
create index if not exists coupon_usage_coupon_email_idx
  on public.coupon_usage (coupon_id, email);

comment on column public.coupon_usage.email is
  'The order''s contact email at redemption time. Lets a guest checkout''s per-customer usage limit (coupons.per_user_limit) be enforced by email when there is no user_id.';
