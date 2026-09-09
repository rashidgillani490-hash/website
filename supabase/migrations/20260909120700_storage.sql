-- ============================================================================
-- Maison Lumière — Phase 3
-- 07 · Supabase Storage bucket + policies for product media
--      (images and GLB / GLTF 3D models).
--
--   * Bucket `product-media` — PUBLIC read (storefront <img> / <model-viewer>).
--   * Writes / updates / deletes restricted to staff & admin via public.is_staff().
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  52428800, -- 50 MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/avif',
    'model/gltf-binary', 'model/gltf+json', 'application/octet-stream'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read of everything in the bucket
drop policy if exists "product_media_public_read" on storage.objects;
create policy "product_media_public_read" on storage.objects
  for select
  using (bucket_id = 'product-media');

-- Staff-only write
drop policy if exists "product_media_staff_insert" on storage.objects;
create policy "product_media_staff_insert" on storage.objects
  for insert
  with check (bucket_id = 'product-media' and public.is_staff());

drop policy if exists "product_media_staff_update" on storage.objects;
create policy "product_media_staff_update" on storage.objects
  for update
  using (bucket_id = 'product-media' and public.is_staff())
  with check (bucket_id = 'product-media' and public.is_staff());

drop policy if exists "product_media_staff_delete" on storage.objects;
create policy "product_media_staff_delete" on storage.objects
  for delete
  using (bucket_id = 'product-media' and public.is_staff());
