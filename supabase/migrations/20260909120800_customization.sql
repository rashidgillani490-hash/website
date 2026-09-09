-- ============================================================================
-- Maison Lumière — Phase 5
-- 08 · Per-product customisation config + a dedicated customisation kind.
-- ============================================================================

-- A single personalised line-item customisation (image + text + bottle /
-- packaging options), distinct from the pre-existing engraving/refill/etc.
alter type public.customization_kind add value if not exists 'personalisation';

-- Per-product customisation configuration, edited from the Admin product editor.
-- Shape:
--   {
--     "enabled": bool,
--     "allowImage": bool, "imagePriceCents": int,
--     "allowText": bool, "textMaxLength": int, "textPriceCents": int,
--     "bottleOptions":   [{ "id": str, "label": str, "priceCents": int }],
--     "packagingOptions":[{ "id": str, "label": str, "priceCents": int }]
--   }
alter table public.products
  add column if not exists customization jsonb not null default '{}'::jsonb;

comment on column public.products.customization is
  'Per-product personalisation options & price deltas. Edited from Admin → product → Customisation.';

-- ----------------------------------------------------------------------------
-- Rebuild the catalog view to expose `customization`. DROP first (column order
-- changes; CREATE OR REPLACE VIEW cannot reorder columns).
-- ----------------------------------------------------------------------------
drop view if exists public.product_catalog;

create view public.product_catalog
with (security_invoker = true) as
select
  p.id,
  p.slug,
  p.name,
  p.tagline,
  p.short_description,
  p.description,
  p.ingredients,
  p.story,
  p.base_sku,
  p.concentration,
  p.gender,
  p.perfumer,
  p.sillage,
  p.longevity,
  p.accent_color,
  p.families,
  p.customization,
  p.status,
  p.is_featured,
  p.is_new,
  p.release_year,
  p.rating,
  p.review_count,
  p.metadata,
  p.published_at,
  p.created_at,
  p.updated_at,
  p.category_id,
  c.slug as category_slug,
  c.name as category_name,
  coalesce(
    (
      select jsonb_agg(v_ord order by v_ord.position, v_ord.volume_ml)
      from (
        select v.id, v.sku, v.volume_ml, v.price_cents, v.compare_at_price_cents,
               v.currency, v.stock_quantity, v.is_default, v.position
        from public.product_variants v
        where v.product_id = p.id
      ) as v_ord
    ),
    '[]'::jsonb
  ) as variants,
  coalesce(
    (
      select jsonb_agg(i_ord order by i_ord.position)
      from (
        select img.id, img.url, img.alt, img.position, img.is_primary
        from public.product_images img
        where img.product_id = p.id
      ) as i_ord
    ),
    '[]'::jsonb
  ) as images,
  coalesce(
    (
      select jsonb_agg(n_ord order by n_ord.tier, n_ord.position)
      from (
        select pn.tier, pn.position, fn.slug, fn.name, fn.family
        from public.product_notes pn
        join public.fragrance_notes fn on fn.id = pn.note_id
        where pn.product_id = p.id
      ) as n_ord
    ),
    '[]'::jsonb
  ) as notes,
  (
    select to_jsonb(m)
    from (
      select m3.model_url, m3.format, m3.poster_url, m3.accent_color, m3.scale
      from public.product_3d_models m3
      where m3.product_id = p.id and m3.is_active
      limit 1
    ) as m
  ) as model
from public.products p
left join public.categories c on c.id = p.category_id;

comment on view public.product_catalog is
  'Storefront read model: one product per row with variants, images, notes, 3D model and customisation config folded in.';
