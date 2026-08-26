-- Add media_url and video_url to threads
ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS video_url text;

-- Add video_url to thread_replies
ALTER TABLE public.thread_replies ADD COLUMN IF NOT EXISTS video_url text;
