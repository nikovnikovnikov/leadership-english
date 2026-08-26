-- Storage bucket for post images (separate from avatars)

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- RLS policies for post-images bucket
-- Anyone authenticated can read
create policy "post-images select"
  on storage.objects for select
  using (bucket_id = 'post-images' and auth.role() = 'authenticated');

-- Authenticated users can upload their own images
create policy "post-images insert"
  on storage.objects for insert
  with check (
    bucket_id = 'post-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own images
create policy "post-images delete"
  on storage.objects for delete
  using (
    bucket_id = 'post-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Add media_url to thread_replies for image attachments
ALTER TABLE public.thread_replies ADD COLUMN IF NOT EXISTS media_url text;
