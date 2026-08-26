-- 0003_avatars.sql
-- Run this in Supabase SQL Editor to enable avatar uploads.

-- 1. Create storage bucket for avatars
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Allow authenticated users to upload to their own folder
create policy "avatars upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Allow anyone to read avatar files (public bucket)
create policy "avatars read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- 4. Allow owners to delete their own avatars
create policy "avatars delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
