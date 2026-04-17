-- Scan to Connect + Notes upload + Compact mode cleanup
-- Run this in Supabase SQL editor (safe to run multiple times)

-- 1) Ensure compact mode is fully removed from backend settings
alter table if exists public.user_settings
  drop column if exists compact_mode;

-- 2) Ensure notes table supports multi-image uploads
alter table if exists public.notes
  add column if not exists image_urls text[] not null default '{}';

-- 3) Ensure notes storage bucket exists and is public-readable
insert into storage.buckets (id, name, public)
values ('notes', 'notes', true)
on conflict (id) do update set public = excluded.public;

-- 4) Storage RLS policies for notes bucket
drop policy if exists "Notes files are public" on storage.objects;
create policy "Notes files are public" on storage.objects
  for select
  using (bucket_id = 'notes');

drop policy if exists "Authenticated users can upload own notes files" on storage.objects;
create policy "Authenticated users can upload own notes files" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'notes'
    and ((storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists "Users can update own notes files" on storage.objects;
create policy "Users can update own notes files" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'notes'
    and owner = auth.uid()
  )
  with check (
    bucket_id = 'notes'
    and owner = auth.uid()
  );

drop policy if exists "Users can delete own notes files" on storage.objects;
create policy "Users can delete own notes files" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'notes'
    and owner = auth.uid()
  );
