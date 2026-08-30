-- ============================================================================
-- FULL SCHEMA: idempotent version (safe on fresh OR existing databases)
-- All 15 migrations combined. Uses DO/EXCEPTION blocks for policies.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: safely add a column
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION _safe_add_col(tbl text, col text, typ text) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = col
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN %I ' || typ, tbl, col);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 0001: Core schema
-- ============================================================================

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true);
END; $$;

CREATE OR REPLACE FUNCTION public.total_points(p_user_id uuid)
RETURNS int LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN coalesce((SELECT sum(points) FROM activity WHERE user_id = p_user_id), 0);
END; $$;

CREATE OR REPLACE FUNCTION public.award_points(p_kind text, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_points int; v_cap int; v_today int;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;
  SELECT coalesce((SELECT value::int FROM settings WHERE key = 'points_' || p_kind), 0) INTO v_points;
  SELECT coalesce((SELECT value::int FROM settings WHERE key = 'points_daily_cap'), 50) INTO v_cap;
  SELECT coalesce(sum(points), 0) INTO v_today FROM activity
    WHERE user_id = p_user_id AND created_at >= date_trunc('day', now());
  IF v_today + v_points <= v_cap THEN
    INSERT INTO activity (user_id, kind, points) VALUES (p_user_id, p_kind, v_points);
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.toggle_like(p_target_type text, p_target_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_author uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM likes WHERE user_id = auth.uid() AND target_type = p_target_type AND target_id = p_target_id) THEN
    DELETE FROM likes WHERE user_id = auth.uid() AND target_type = p_target_type AND target_id = p_target_id;
    RETURN;
  END IF;
  INSERT INTO likes (user_id, target_type, target_id) VALUES (auth.uid(), p_target_type, p_target_id);
  CASE p_target_type
    WHEN 'feed_post' THEN SELECT author_id INTO v_author FROM feed_posts WHERE id = p_target_id;
    WHEN 'feed_comment' THEN SELECT author_id INTO v_author FROM feed_comments WHERE id = p_target_id;
    WHEN 'thread' THEN SELECT author_id INTO v_author FROM threads WHERE id = p_target_id;
    WHEN 'thread_reply' THEN SELECT author_id INTO v_author FROM thread_replies WHERE id = p_target_id;
    ELSE v_author := null;
  END CASE;
  PERFORM public.award_points('like_received', v_author);
END; $$;

CREATE OR REPLACE FUNCTION public.complete_lesson(p_lesson_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO lesson_progress (user_id, lesson_id) VALUES (auth.uid(), p_lesson_id)
    ON CONFLICT (user_id, lesson_id) DO NOTHING;
END; $$;

-- Settings
CREATE TABLE IF NOT EXISTS public.settings (key text PRIMARY KEY, value text NOT NULL);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "settings select" ON public.settings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "settings admin all" ON public.settings FOR ALL USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

INSERT INTO public.settings (key, value) VALUES
  ('points_feed_post','10'), ('points_thread','8'), ('points_feed_comment','3'),
  ('points_thread_reply','3'), ('points_like_received','1'), ('points_daily_cap','50')
ON CONFLICT (key) DO NOTHING;

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username         text UNIQUE NOT NULL,
  display_name     text,
  avatar_url       text,
  is_admin         boolean NOT NULL DEFAULT false,
  instagram_url    text,
  substack_url     text,
  x_url            text,
  youtube_url      text,
  custom_link_url  text,
  custom_link_label text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "profiles select" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "profiles insert self" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "profiles update self" ON public.profiles FOR UPDATE USING (id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "profiles update admin" ON public.profiles FOR UPDATE USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Feed posts
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body       text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  media_url  text,
  video_url  text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "feed_posts select" ON public.feed_posts FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "feed_posts insert" ON public.feed_posts FOR INSERT WITH CHECK (author_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "feed_posts update" ON public.feed_posts FOR UPDATE USING (author_id = auth.uid() OR public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "feed_posts delete" ON public.feed_posts FOR DELETE USING (author_id = auth.uid() OR public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS feed_posts_created_idx ON public.feed_posts (created_at DESC);

-- Feed comments
CREATE TABLE IF NOT EXISTS public.feed_comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  author_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body         text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "feed_comments select" ON public.feed_comments FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "feed_comments insert" ON public.feed_comments FOR INSERT WITH CHECK (author_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "feed_comments update" ON public.feed_comments FOR UPDATE USING (author_id = auth.uid() OR public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "feed_comments delete" ON public.feed_comments FOR DELETE USING (author_id = auth.uid() OR public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS feed_comments_post_idx ON public.feed_comments (feed_post_id, created_at);

-- Threads
CREATE TABLE IF NOT EXISTS public.threads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category         text NOT NULL,
  title            text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  body             text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  pinned           boolean NOT NULL DEFAULT false,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  reply_count      int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "threads select" ON public.threads FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "threads insert" ON public.threads FOR INSERT WITH CHECK (author_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "threads update" ON public.threads FOR UPDATE USING (author_id = auth.uid() OR public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "threads delete" ON public.threads FOR DELETE USING (author_id = auth.uid() OR public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS threads_category_idx ON public.threads (category, pinned DESC, last_activity_at DESC);

-- Thread replies
CREATE TABLE IF NOT EXISTS public.thread_replies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  author_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_reply_id uuid REFERENCES public.thread_replies(id) ON DELETE CASCADE,
  body            text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  media_url       text,
  video_url       text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.thread_replies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "thread_replies select" ON public.thread_replies FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "thread_replies insert" ON public.thread_replies FOR INSERT WITH CHECK (author_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "thread_replies update" ON public.thread_replies FOR UPDATE USING (author_id = auth.uid() OR public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "thread_replies delete" ON public.thread_replies FOR DELETE USING (author_id = auth.uid() OR public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS thread_replies_thread_idx ON public.thread_replies (thread_id, created_at);

-- Likes (polymorphic)
CREATE TABLE IF NOT EXISTS public.likes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('feed_post','feed_comment','thread','thread_reply')),
  target_id   uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "likes select" ON public.likes FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS likes_target_idx ON public.likes (target_type, target_id);

-- Activity / points
CREATE TABLE IF NOT EXISTS public.activity (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN ('feed_post','feed_comment','thread','thread_reply','like_received')),
  points     int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "activity select" ON public.activity FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS activity_user_idx ON public.activity (user_id, created_at DESC);

-- Content creation triggers
CREATE OR REPLACE FUNCTION public.trigger_award_feed_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS
$$ BEGIN PERFORM public.award_points('feed_post', new.author_id); RETURN new; END; $$;

CREATE OR REPLACE FUNCTION public.trigger_award_feed_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS
$$ BEGIN PERFORM public.award_points('feed_comment', new.author_id); RETURN new; END; $$;

CREATE OR REPLACE FUNCTION public.trigger_award_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS
$$ BEGIN PERFORM public.award_points('thread', new.author_id); RETURN new; END; $$;

CREATE OR REPLACE FUNCTION public.trigger_award_thread_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS
$$ BEGIN PERFORM public.award_points('thread_reply', new.author_id); RETURN new; END; $$;

DROP TRIGGER IF EXISTS trg_award_feed_post ON public.feed_posts;
DROP TRIGGER IF EXISTS trg_award_feed_comment ON public.feed_comments;
DROP TRIGGER IF EXISTS trg_award_thread ON public.threads;
DROP TRIGGER IF EXISTS trg_award_thread_reply ON public.thread_replies;

CREATE TRIGGER trg_award_feed_post AFTER INSERT ON public.feed_posts FOR EACH ROW EXECUTE FUNCTION public.trigger_award_feed_post();
CREATE TRIGGER trg_award_feed_comment AFTER INSERT ON public.feed_comments FOR EACH ROW EXECUTE FUNCTION public.trigger_award_feed_comment();
CREATE TRIGGER trg_award_thread AFTER INSERT ON public.threads FOR EACH ROW EXECUTE FUNCTION public.trigger_award_thread();
CREATE TRIGGER trg_award_thread_reply AFTER INSERT ON public.thread_replies FOR EACH ROW EXECUTE FUNCTION public.trigger_award_thread_reply();

-- Bump thread on reply
CREATE OR REPLACE FUNCTION public.bump_thread()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.threads SET last_activity_at = now(), reply_count = reply_count + 1 WHERE id = new.thread_id;
  RETURN new;
END; $$;

DROP TRIGGER IF EXISTS trg_bump_thread ON public.thread_replies;
CREATE TRIGGER trg_bump_thread AFTER INSERT ON public.thread_replies FOR EACH ROW EXECUTE FUNCTION public.bump_thread();

-- Courses
CREATE TABLE IF NOT EXISTS public.courses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text,
  published   boolean NOT NULL DEFAULT false,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "courses select" ON public.courses FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "courses write" ON public.courses FOR ALL USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Lessons
CREATE TABLE IF NOT EXISTS public.lessons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title           text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description     text,
  body            text NOT NULL DEFAULT '',
  video_url       text,
  order_index     int NOT NULL DEFAULT 0,
  required_points int NOT NULL DEFAULT 0,
  points          int NOT NULL DEFAULT 0,
  published       boolean NOT NULL DEFAULT false,
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "lessons select" ON public.lessons FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "lessons write" ON public.lessons FOR ALL USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Lesson progress
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id    uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed    boolean NOT NULL DEFAULT false,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "lesson_progress select" ON public.lesson_progress FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "lesson_progress insert" ON public.lesson_progress FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "lesson_progress update" ON public.lesson_progress FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id       text,
  stripe_subscription_id   text,
  stripe_price_id          text,
  status                   text NOT NULL DEFAULT 'inactive',
  current_period_end       timestamptz,
  cancel_at_period_end     boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "subscriptions select" ON public.subscriptions FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('feed_post','feed_comment','thread','thread_reply')),
  target_id   uuid NOT NULL,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason      text NOT NULL,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "reports insert" ON public.reports FOR INSERT WITH CHECK (reporter_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "reports select" ON public.reports FOR SELECT USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "reports update" ON public.reports FOR UPDATE USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Consent log
CREATE TABLE IF NOT EXISTS public.consent_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  policy_key text NOT NULL,
  version    text NOT NULL,
  accepted   boolean NOT NULL,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "consent_log insert" ON public.consent_log FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "consent_log select admin" ON public.consent_log FOR SELECT USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS consent_log_user_idx ON public.consent_log (user_id, created_at DESC);

-- Conversations (1:1 DMs)
CREATE TABLE IF NOT EXISTS public.conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_group        boolean NOT NULL DEFAULT false,
  name            text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user1_id, user2_id),
  CHECK (user1_id < user2_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "conversations select" ON public.conversations
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body            text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "messages select" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (auth.uid() = user1_id OR auth.uid() = user2_id))
);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "messages insert" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS conversations_users_idx ON public.conversations (user1_id, user2_id);

-- DM RPCs
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_other_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user1 uuid; v_user2 uuid; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF auth.uid() = p_other_user THEN RAISE EXCEPTION 'cannot message yourself'; END IF;
  IF auth.uid() < p_other_user THEN v_user1 := auth.uid(); v_user2 := p_other_user;
  ELSE v_user1 := p_other_user; v_user2 := auth.uid(); END IF;
  SELECT id INTO v_id FROM public.conversations WHERE user1_id = v_user1 AND user2_id = v_user2;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  INSERT INTO public.conversations (user1_id, user2_id) VALUES (v_user1, v_user2) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.messages SET read_at = now()
  WHERE conversation_id = p_conversation_id AND sender_id != auth.uid() AND read_at IS NULL;
END; $$;

-- ============================================================================
-- 0002: Points triggers (already built into 0001 above)
-- ============================================================================

-- ============================================================================
-- 0003: Avatars storage
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN CREATE POLICY "avatars upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "avatars read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "avatars delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 0004: Notifications, thread subscriptions, user blocks, FTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type        text NOT NULL,
  target_type text NOT NULL,
  target_id   uuid,
  message     text,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "notifications select own" ON public.notifications FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "notifications update own" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, read_at, created_at DESC);

CREATE OR REPLACE FUNCTION public.mark_notifications_read()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.notifications SET read_at = now() WHERE user_id = auth.uid() AND read_at IS NULL; END; $$;

CREATE OR REPLACE FUNCTION public.unread_notification_count()
RETURNS int LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.notifications WHERE user_id = auth.uid() AND read_at IS NULL; $$;

-- Thread subscriptions
CREATE TABLE IF NOT EXISTS public.thread_subscriptions (
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  thread_id  uuid NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, thread_id)
);

ALTER TABLE public.thread_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "thread_subscriptions select own" ON public.thread_subscriptions FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "thread_subscriptions insert own" ON public.thread_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "thread_subscriptions delete own" ON public.thread_subscriptions FOR DELETE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- User blocks
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "user_blocks select own" ON public.user_blocks FOR SELECT USING (blocker_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "user_blocks insert own" ON public.user_blocks FOR INSERT WITH CHECK (blocker_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "user_blocks delete own" ON public.user_blocks FOR DELETE USING (blocker_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- FTS indexes
SELECT _safe_add_col('feed_posts', 'fts', 'tsvector');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'feed_posts_fts_idx') THEN
    CREATE INDEX feed_posts_fts_idx ON public.feed_posts USING gin (fts);
  END IF;
END $$;

SELECT _safe_add_col('threads', 'fts', 'tsvector');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'threads_fts_idx') THEN
    CREATE INDEX threads_fts_idx ON public.threads USING gin (fts);
  END IF;
END $$;

-- ============================================================================
-- 0005: Community info settings
-- ============================================================================

INSERT INTO public.settings (key, value) VALUES
  ('community_start_here', 'Welcome to **Leadership English Community**! This is a space for thoughtful conversation and learning. Here''s how to get started:

1. **Introduce yourself** — Post in the General category and tell us who you are.
2. **Explore the courses** — Every lesson is open. Start wherever you like and work at your own pace.
3. **Join the conversation** — Comment on posts, reply in threads, and discuss lessons with the community.

Your points recognize how much you show up and share — post, comment, and receive likes to build yours up.'),
  ('community_about', 'Leadership English Community is a private community for people who want to go deeper. No algorithms, no ads, no noise — just real conversation between real people.'),
  ('community_rules', '## Community Guidelines

**Be respectful.** Treat everyone with dignity. Disagreement is welcome; personal attacks are not.

**Stay on topic.** Post in the right category. Keep conversations constructive.

**No spam or self-promotion.** Share value, not links to your latest launch.

**Protect privacy.** What''s shared here stays here. Don''t screenshot or redistribute members'' posts.

**No medical or legal advice.** Share experiences, not prescriptions. Always consult a professional.')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 0006: Post images storage + thread_replies media
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true) ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN CREATE POLICY "post-images select" ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "post-images insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "post-images delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN null; END $$;

SELECT _safe_add_col('thread_replies', 'media_url', 'text');

-- ============================================================================
-- 0007: Typing indicators + online status
-- ============================================================================

SELECT _safe_add_col('profiles', 'last_seen_at', 'timestamptz');

CREATE TABLE IF NOT EXISTS public.typing_indicators (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  typed_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "typing select" ON public.typing_indicators FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (auth.uid() = user1_id OR auth.uid() = user2_id))
);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "typing upsert" ON public.typing_indicators FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "typing delete" ON public.typing_indicators FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 0008: Categories table
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id          text PRIMARY KEY,
  label       text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order  int NOT NULL DEFAULT 0,
  emoji       text NOT NULL DEFAULT '📁',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "Anyone can read categories" ON categories FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "Admins can insert categories" ON categories FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "Admins can update categories" ON categories FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "Admins can delete categories" ON categories FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
EXCEPTION WHEN duplicate_object THEN null; END $$;

INSERT INTO categories (id, label, description, sort_order) VALUES
  ('general', 'General', 'Everyday conversation and updates', 0),
  ('philosophy', 'Philosophy', 'Big questions and ideas', 1),
  ('body', 'Body', 'Health, movement, and embodiment', 2),
  ('spirit', 'Spirit', 'Inner work and practice', 3),
  ('world-news', 'World News', 'What''s happening in the world', 4),
  ('vent', 'Vent', 'A safe place to let it out', 5),
  ('questions', 'Questions', 'Ask anything — get thoughtful answers', 6)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 0009: Group chats
-- ============================================================================

-- Backfill conversation_participants for existing 1:1 conversations
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "participants select" ON public.conversation_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid())
);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "participants insert system" ON public.conversation_participants FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Backfill existing 1:1 conversations
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT id, user1_id FROM public.conversations ON CONFLICT DO NOTHING;
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT id, user2_id FROM public.conversations ON CONFLICT DO NOTHING;

-- Auto-add participants for new 1:1 conversations
CREATE OR REPLACE FUNCTION public.sync_conversation_participants()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT NEW.is_group THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (NEW.id, NEW.user1_id) ON CONFLICT DO NOTHING;
    INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (NEW.id, NEW.user2_id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS sync_participants_on_insert ON public.conversations;
CREATE TRIGGER sync_participants_on_insert AFTER INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.sync_conversation_participants();

-- Group chat RPCs
CREATE OR REPLACE FUNCTION public.create_group_conversation(p_name text, p_member_ids uuid[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF array_length(p_member_ids, 1) IS NULL OR array_length(p_member_ids, 1) < 1 THEN RAISE EXCEPTION 'need at least 1 other member'; END IF;
  IF array_length(p_member_ids, 1) > 49 THEN RAISE EXCEPTION 'group chats support up to 50 members'; END IF;
  INSERT INTO public.conversations (user1_id, user2_id, is_group, name) VALUES (auth.uid(), auth.uid(), true, p_name) RETURNING id INTO v_id;
  INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (v_id, auth.uid());
  INSERT INTO public.conversation_participants (conversation_id, user_id) SELECT v_id, unnest(p_member_ids) ON CONFLICT DO NOTHING;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.add_group_participants(p_conversation_id uuid, p_member_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.conversations WHERE id = p_conversation_id AND is_group = true) THEN RAISE EXCEPTION 'not a group conversation'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = p_conversation_id AND user_id = auth.uid()) THEN RAISE EXCEPTION 'not a participant'; END IF;
  INSERT INTO public.conversation_participants (conversation_id, user_id) SELECT p_conversation_id, unnest(p_member_ids) ON CONFLICT DO NOTHING;
END; $$;

-- ============================================================================
-- 0010: Admin tags
-- ============================================================================

CREATE TABLE IF NOT EXISTS tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "Admins can manage tags" ON tags FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS profile_tags (
  profile_id  uuid REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id      uuid REFERENCES tags(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id),
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, tag_id)
);

ALTER TABLE profile_tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "Admins can manage profile tags" ON profile_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS idx_profile_tags_tag ON profile_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_profile_tags_profile ON profile_tags(profile_id);

-- ============================================================================
-- 0011: Thread media (already added in 0001 above)
-- ============================================================================

SELECT _safe_add_col('threads', 'media_url', 'text');
SELECT _safe_add_col('threads', 'video_url', 'text');
SELECT _safe_add_col('thread_replies', 'video_url', 'text');

-- ============================================================================
-- 0012: Events
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  description text NOT NULL DEFAULT '',
  location    text NOT NULL DEFAULT '',
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz,
  cover_url   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "events select" ON public.events FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "events insert" ON public.events FOR INSERT WITH CHECK (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "events update" ON public.events FOR UPDATE USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "events delete" ON public.events FOR DELETE USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS events_starts_at_idx ON public.events (starts_at DESC);

CREATE TABLE IF NOT EXISTS public.event_signups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_signups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "event_signups select" ON public.event_signups FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "event_signups insert" ON public.event_signups FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "event_signups delete" ON public.event_signups FOR DELETE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.event_updates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body       text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_updates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "event_updates select" ON public.event_updates FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "event_updates insert" ON public.event_updates FOR INSERT WITH CHECK (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 0013: Tag-based access gating
-- ============================================================================

SELECT _safe_add_col('categories', 'required_tag_id', 'uuid REFERENCES public.tags(id) ON DELETE SET NULL');
SELECT _safe_add_col('courses', 'required_tag_id', 'uuid REFERENCES public.tags(id) ON DELETE SET NULL');

-- ============================================================================
-- 0014: Roles + public tags
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_moderator()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin'));
END; $$;

SELECT _safe_add_col('profiles', 'role', 'text NOT NULL DEFAULT ''user''');

DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'moderator', 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

UPDATE profiles SET role = 'admin' WHERE is_admin = true;

SELECT _safe_add_col('tags', 'visibility', 'text NOT NULL DEFAULT ''admin''');

DO $$ BEGIN
  ALTER TABLE tags ADD CONSTRAINT tags_visibility_check CHECK (visibility IN ('admin', 'public'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Allow all authenticated users to read tags
DO $$ BEGIN CREATE POLICY "Authenticated users can read tags" ON tags FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Update content policies to allow moderators
DROP POLICY IF EXISTS "feed_posts delete" ON feed_posts;
CREATE POLICY "feed_posts delete" ON feed_posts FOR DELETE USING (author_id = auth.uid() OR public.is_moderator());
DROP POLICY IF EXISTS "feed_posts update" ON feed_posts;
CREATE POLICY "feed_posts update" ON feed_posts FOR UPDATE USING (author_id = auth.uid() OR public.is_moderator());

DROP POLICY IF EXISTS "feed_comments delete" ON feed_comments;
CREATE POLICY "feed_comments delete" ON feed_comments FOR DELETE USING (author_id = auth.uid() OR public.is_moderator());
DROP POLICY IF EXISTS "feed_comments update" ON feed_comments;
CREATE POLICY "feed_comments update" ON feed_comments FOR UPDATE USING (author_id = auth.uid() OR public.is_moderator());

DROP POLICY IF EXISTS "threads delete" ON threads;
CREATE POLICY "threads delete" ON threads FOR DELETE USING (author_id = auth.uid() OR public.is_moderator());
DROP POLICY IF EXISTS "threads update" ON threads;
CREATE POLICY "threads update" ON threads FOR UPDATE USING (author_id = auth.uid() OR public.is_moderator());

DROP POLICY IF EXISTS "thread_replies delete" ON thread_replies;
CREATE POLICY "thread_replies delete" ON thread_replies FOR DELETE USING (author_id = auth.uid() OR public.is_moderator());
DROP POLICY IF EXISTS "thread_replies update" ON thread_replies;
CREATE POLICY "thread_replies update" ON thread_replies FOR UPDATE USING (author_id = auth.uid() OR public.is_moderator());

-- Auto-tag settings
INSERT INTO settings (key, value) VALUES
  ('auto_tag_1_name',''), ('auto_tag_1_threshold',''), ('auto_tag_1_id',''),
  ('auto_tag_2_name',''), ('auto_tag_2_threshold',''), ('auto_tag_2_id','')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 0015: Invites + subscription tiers
-- ============================================================================

CREATE TABLE IF NOT EXISTS invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  used_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at    timestamptz
);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "Authenticated users can read invites" ON invites FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "Users can create invites" ON invites FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "Users can claim unused invites" ON invites FOR UPDATE TO authenticated USING (used_by IS NULL) WITH CHECK (used_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS user_access (
  user_id     uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  access_type text NOT NULL CHECK (access_type IN ('beta', 'invite', 'subscription', 'open')),
  invite_id   uuid REFERENCES invites(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_access ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "Users can read own access" ON user_access FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "Admins can read all access" ON user_access FOR SELECT TO authenticated USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "Users can insert own access" ON user_access FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

INSERT INTO settings (key, value) VALUES
  ('beta_mode','false'), ('beta_max_spots','10'),
  ('invites_enabled','false'), ('invites_per_member','3'),
  ('subscription_required','false'),
  ('stripe_price_monthly',''), ('stripe_price_yearly',''), ('yearly_enabled','false')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 0016: Enhanced events — recurrence, host, guest, event link, tag gating
-- ============================================================================

SELECT _safe_add_col('events', 'recurring_frequency', 'text');
SELECT _safe_add_col('events', 'recurring_group_id', 'uuid REFERENCES public.events(id) ON DELETE SET NULL');
SELECT _safe_add_col('events', 'special_guest', 'text');
SELECT _safe_add_col('events', 'special_guest_url', 'text');
SELECT _safe_add_col('events', 'event_link', 'text');
SELECT _safe_add_col('events', 'required_tag_id', 'uuid REFERENCES public.tags(id) ON DELETE SET NULL');

DO $$ BEGIN
  ALTER TABLE events ADD CONSTRAINT events_recurring_frequency_check
    CHECK (recurring_frequency IN ('daily', 'weekly', 'biweekly', 'monthly'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS events_recurring_group_idx ON public.events (recurring_group_id);

-- Update RLS to allow moderators
DROP POLICY IF EXISTS "events insert" ON public.events;
DROP POLICY IF EXISTS "events update" ON public.events;
DROP POLICY IF EXISTS "events delete" ON public.events;
DROP POLICY IF EXISTS "event_updates insert" ON public.event_updates;

DO $$ BEGIN CREATE POLICY "events insert" ON public.events FOR INSERT WITH CHECK (public.is_moderator());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "events update" ON public.events FOR UPDATE USING (public.is_moderator());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "events delete" ON public.events FOR DELETE USING (public.is_moderator());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "event_updates insert" ON public.event_updates FOR INSERT WITH CHECK (public.is_moderator());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- Cleanup
-- ============================================================================
DROP FUNCTION IF EXISTS _safe_add_col(text, text, text);

-- ============================================================================


-- ---------------------------------------------------------------------------
-- Migrations 0017-0021 (constituent + added features, idempotent)
-- ---------------------------------------------------------------------------
-- Fix: remove INSERT policy on notifications.
-- Server actions insert notifications for OTHER users (mentions, replies, etc.)
-- so the user_id = auth.uid() check blocks all cross-user notification creation.
-- SELECT and UPDATE policies remain (users can only read/update their own).

DROP POLICY IF EXISTS "notifications insert own" ON public.notifications;


-- Add Notion page ID support to lessons
-- When set, the lesson renders content from a Notion page instead of (or alongside) the description field.

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS notion_page_id text;


-- Waitlist table for gated community access
CREATE TABLE IF NOT EXISTS waitlist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL UNIQUE,
  position    bigint GENERATED ALWAYS AS IDENTITY,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'admitted', 'declined')),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  admitted_at timestamptz
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert to join the waitlist
DO $$ BEGIN CREATE POLICY "Anyone can join waitlist"
  ON waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Only admins can read the waitlist
DO $$ BEGIN CREATE POLICY "Admins can read waitlist"
  ON waitlist FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Only admins can update waitlist entries (admit/decline)
DO $$ BEGIN CREATE POLICY "Admins can update waitlist"
  ON waitlist FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Only admins can delete waitlist entries
DO $$ BEGIN CREATE POLICY "Admins can delete waitlist"
  ON waitlist FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ============================================================================
-- 0020: Live chat rooms — Discord-style rooms with realtime messages
-- ============================================================================

-- Rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Room messages (subscribed via Supabase Realtime)
CREATE TABLE IF NOT EXISTS chat_room_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body       text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Deliver full rows on UPDATE/DELETE realtime events
ALTER TABLE chat_room_messages REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS chat_room_messages_room_idx
  ON public.chat_room_messages (room_id, created_at);

-- Add to the realtime publication so clients can subscribe to INSERT events
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_room_messages;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_messages ENABLE ROW LEVEL SECURITY;

-- Table-level grants (RLS handles row filtering within these)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_room_messages TO authenticated;

-- Rooms: all authenticated members can read; only admins manage
DROP POLICY IF EXISTS "chat_rooms select" ON public.chat_rooms;
DO $$ BEGIN CREATE POLICY "chat_rooms select" ON public.chat_rooms
  FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DROP POLICY IF EXISTS "chat_rooms insert admin" ON public.chat_rooms;
DO $$ BEGIN CREATE POLICY "chat_rooms insert admin" ON public.chat_rooms
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DROP POLICY IF EXISTS "chat_rooms update admin" ON public.chat_rooms;
DO $$ BEGIN CREATE POLICY "chat_rooms update admin" ON public.chat_rooms
  FOR UPDATE TO authenticated USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DROP POLICY IF EXISTS "chat_rooms delete admin" ON public.chat_rooms;
DO $$ BEGIN CREATE POLICY "chat_rooms delete admin" ON public.chat_rooms
  FOR DELETE TO authenticated USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Messages: all authenticated members can read; anyone can post their own
DROP POLICY IF EXISTS "chat_room_messages select" ON public.chat_room_messages;
DO $$ BEGIN CREATE POLICY "chat_room_messages select" ON public.chat_room_messages
  FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DROP POLICY IF EXISTS "chat_room_messages insert" ON public.chat_room_messages;
DO $$ BEGIN CREATE POLICY "chat_room_messages insert" ON public.chat_room_messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DROP POLICY IF EXISTS "chat_room_messages delete admin" ON public.chat_room_messages;
DO $$ BEGIN CREATE POLICY "chat_room_messages delete admin" ON public.chat_room_messages
  FOR DELETE TO authenticated USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 0021: Thread polls — question + options on threads, one vote per member
-- ============================================================================

-- Poll fields on threads (nullable = no poll)
ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS poll_question text;
ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS poll_options text[];

-- One row per (thread, user) — a user can only have one option selected.
-- Re-voting switches the option; voting the same option again removes it.
CREATE TABLE IF NOT EXISTS public.thread_poll_votes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    uuid NOT NULL REFERENCES public.threads (id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  option_index int  NOT NULL CHECK (option_index >= 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, user_id)
);

ALTER TABLE public.thread_poll_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "poll votes select" ON public.thread_poll_votes
  FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "poll votes insert" ON public.thread_poll_votes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "poll votes update" ON public.thread_poll_votes
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE POLICY "poll votes delete" ON public.thread_poll_votes
  FOR DELETE TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS thread_poll_votes_thread_idx
  ON public.thread_poll_votes (thread_id);

-- Toggle a vote atomically (security definer, validates poll + option range)
CREATE OR REPLACE FUNCTION public.toggle_poll_vote(p_thread_id uuid, p_option_index int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_existing int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_option_index IS NULL OR p_option_index < 0 THEN
    RAISE EXCEPTION 'Invalid option';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.threads
    WHERE id = p_thread_id
      AND poll_question IS NOT NULL
      AND poll_options IS NOT NULL
      AND p_option_index < cardinality(poll_options)
  ) THEN
    RAISE EXCEPTION 'Invalid poll or option';
  END IF;

  SELECT option_index INTO v_existing
  FROM public.thread_poll_votes
  WHERE thread_id = p_thread_id AND user_id = v_uid;

  IF v_existing IS NULL THEN
    INSERT INTO public.thread_poll_votes (thread_id, user_id, option_index)
    VALUES (p_thread_id, v_uid, p_option_index);
  ELSIF v_existing = p_option_index THEN
    DELETE FROM public.thread_poll_votes
    WHERE thread_id = p_thread_id AND user_id = v_uid;
  ELSE
    UPDATE public.thread_poll_votes
    SET option_index = p_option_index
    WHERE thread_id = p_thread_id AND user_id = v_uid;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_poll_vote(uuid, int) FROM public;
GRANT EXECUTE ON FUNCTION public.toggle_poll_vote(uuid, int) TO authenticated;

-- Table-level grants for authenticated (RLS filters within these)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_poll_votes TO authenticated;

-- Lesson comments (migration 0022)
-- ============================================================================
create table if not exists public.lesson_comments (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  parent_id  uuid references public.lesson_comments (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table public.lesson_comments enable row level security;
DO $$ BEGIN CREATE POLICY "lesson_comments select" ON public.lesson_comments
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "lesson_comments insert" ON public.lesson_comments
    FOR INSERT WITH CHECK (author_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "lesson_comments delete" ON public.lesson_comments
    FOR DELETE USING (author_id = auth.uid() or public.is_admin());
EXCEPTION WHEN duplicate_object THEN null; END $$;
create index if not exists lesson_comments_lesson_idx on public.lesson_comments (lesson_id, created_at);

-- ============================================================================
-- CEFR placement assessment (migration 0023)
-- ============================================================================
create table if not exists public.user_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  version text not null default '1.0',
  score_raw int not null,
  score_scaled int not null,
  band text not null check (band in ('A1','A2','B1','B2','C1','C2')),
  skill_scores jsonb not null,
  answers jsonb not null,
  taken_at timestamptz not null default now()
);
create index if not exists idx_user_assessments_user on user_assessments(user_id, taken_at desc);
alter table public.user_assessments enable row level security;
DO $$ BEGIN CREATE POLICY "Assessment select own or admin"
  ON public.user_assessments FOR SELECT
  USING (user_id = auth.uid() or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Assessment insert own"
  ON public.user_assessments FOR INSERT
  WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;
alter table profiles add column if not exists assessment_skipped_at timestamptz;

create or replace function public.record_assessment(
  p_version text, p_score_raw int, p_score_scaled int, p_band text, p_skill_scores jsonb, p_answers jsonb
) returns text language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tag_id uuid;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_band not in ('A1','A2','B1','B2','C1','C2') then raise exception 'invalid band'; end if;
  insert into user_assessments (user_id, version, score_raw, score_scaled, band, skill_scores, answers)
  values (v_user_id, p_version, p_score_raw, p_score_scaled, p_band, p_skill_scores, p_answers);
  insert into tags (name, visibility)
  values ('CEFR ' || p_band, 'admin')
  on conflict (name) do update set name = excluded.name
  returning id into v_tag_id;
  delete from profile_tags
  where profile_id = v_user_id
    and tag_id in (select id from tags where name like 'CEFR %');
  insert into profile_tags (profile_id, tag_id, assigned_by)
  values (v_user_id, v_tag_id, v_user_id)
  on conflict (profile_id, tag_id) do nothing;
  return p_band;
end;
$$;
-- ---------------------------------------------------------------------------
-- 0024: Admin-defined course ordering (sort_order)
-- ---------------------------------------------------------------------------

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at DESC) AS rn
  FROM public.courses
)
UPDATE public.courses c
SET sort_order = r.rn
FROM ranked r
WHERE r.id = c.id AND c.sort_order = 0;

CREATE INDEX IF NOT EXISTS courses_sort_order_idx ON public.courses (sort_order);
