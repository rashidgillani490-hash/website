-- ============================================================================
-- Maison Lumière — Phase 5
-- 09 · Supabase Storage bucket for customer-uploaded personalisation images.
--
--   * bucket `customer-uploads` — images only, ≤ 5 MB.
--   * Objects are written ONLY by the server (service-role key) at
--     unguessable UUID paths; direct client writes are denied.
--   * Public read so the customer can preview and the Admin can view the image
--     inside the order.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-uploads',
  'customer-uploads',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "customer_uploads_public_read" on storage.objects;
create policy "customer_uploads_public_read" on storage.objects
  for select
  using (bucket_id = 'customer-uploads');

-- No client insert/update/delete policy → only the service role (which bypasses
-- RLS) can write. Staff may also manage them.
drop policy if exists "customer_uploads_staff_write" on storage.objects;
create policy "customer_uploads_staff_write" on storage.objects
  for insert
  with check (bucket_id = 'customer-uploads' and public.is_staff());

drop policy if exists "customer_uploads_staff_delete" on storage.objects;
create policy "customer_uploads_staff_delete" on storage.objects
  for delete
  using (bucket_id = 'customer-uploads' and public.is_staff());
