-- Migration 0014: Role system, public tags, auto-tag thresholds
-- Adds moderator role, tag visibility, and configurable auto-assignment tags

-- 1. Add is_moderator() SQL function (returns true for moderators AND admins)
CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('moderator', 'admin')
  );
END;
$$;

-- 2. Add role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'moderator', 'admin'));

-- 3. Backfill: set role = 'admin' where is_admin = true
UPDATE profiles SET role = 'admin' WHERE is_admin = true;

-- 4. Add visibility to tags
ALTER TABLE tags ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'admin';
ALTER TABLE tags ADD CONSTRAINT tags_visibility_check CHECK (visibility IN ('admin', 'public'));

-- 5. RLS: allow all authenticated users to read tags
CREATE POLICY "Authenticated users can read tags"
  ON tags FOR SELECT
  TO authenticated
  USING (true);

-- 6. Update content RLS policies to allow moderators
-- Drop and recreate delete/update policies on content tables
DROP POLICY IF EXISTS "feed_posts delete" ON feed_posts;
CREATE POLICY "feed_posts delete" ON feed_posts
  FOR DELETE USING (author_id = auth.uid() OR public.is_moderator());

DROP POLICY IF EXISTS "feed_posts update" ON feed_posts;
CREATE POLICY "feed_posts update" ON feed_posts
  FOR UPDATE USING (author_id = auth.uid() OR public.is_moderator());

DROP POLICY IF EXISTS "feed_comments delete" ON feed_comments;
CREATE POLICY "feed_comments delete" ON feed_comments
  FOR DELETE USING (author_id = auth.uid() OR public.is_moderator());

DROP POLICY IF EXISTS "feed_comments update" ON feed_comments;
CREATE POLICY "feed_comments update" ON feed_comments
  FOR UPDATE USING (author_id = auth.uid() OR public.is_moderator());

DROP POLICY IF EXISTS "threads delete" ON threads;
CREATE POLICY "threads delete" ON threads
  FOR DELETE USING (author_id = auth.uid() OR public.is_moderator());

DROP POLICY IF EXISTS "threads update" ON threads;
CREATE POLICY "threads update" ON threads
  FOR UPDATE USING (author_id = auth.uid() OR public.is_moderator());

DROP POLICY IF EXISTS "thread_replies delete" ON thread_replies;
CREATE POLICY "thread_replies delete" ON thread_replies
  FOR DELETE USING (author_id = auth.uid() OR public.is_moderator());

DROP POLICY IF EXISTS "thread_replies update" ON thread_replies;
CREATE POLICY "thread_replies update" ON thread_replies
  FOR UPDATE USING (author_id = auth.uid() OR public.is_moderator());

-- 7. Auto-tag threshold settings (insert defaults if not present)
INSERT INTO settings (key, value) VALUES
  ('auto_tag_1_name', ''),
  ('auto_tag_1_threshold', ''),
  ('auto_tag_1_id', ''),
  ('auto_tag_2_name', ''),
  ('auto_tag_2_threshold', ''),
  ('auto_tag_2_id', '')
ON CONFLICT (key) DO NOTHING;
