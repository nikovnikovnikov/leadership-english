-- ============================================================================
-- Skool-clone schema
-- Run this in the Supabase SQL editor (or via supabase db push).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language plpgsql stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from profiles
    where id = auth.uid() and is_admin = true
  );
end;
$$;

create or replace function public.total_points(p_user_id uuid)
returns int
language plpgsql stable
as $$
begin
  return coalesce((select sum(points) from activity where user_id = p_user_id), 0);
end;
$$;

-- Award points to a user if they are still under the daily cap.
-- Used by triggers on content creation and by toggle_like().
create or replace function public.award_points(p_kind text, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points int;
  v_cap    int;
  v_today  int;
begin
  if p_user_id is null then
    return;
  end if;

  select coalesce((select value::int from settings where key = 'points_' || p_kind), 0)
    into v_points;
  select coalesce((select value::int from settings where key = 'points_daily_cap'), 50)
    into v_cap;

  select coalesce(sum(points), 0)
    into v_today
  from activity
  where user_id = p_user_id
    and created_at >= date_trunc('day', now());

  if v_today + v_points <= v_cap then
    insert into activity (user_id, kind, points)
    values (p_user_id, p_kind, v_points);
  end if;
end;
$$;

-- Toggle a like on any content type. Awards like_received points to the author.
create or replace function public.toggle_like(p_target_type text, p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if exists (
    select 1 from likes
    where user_id = auth.uid() and target_type = p_target_type and target_id = p_target_id
  ) then
    delete from likes
    where user_id = auth.uid() and target_type = p_target_type and target_id = p_target_id;
    return;
  end if;

  insert into likes (user_id, target_type, target_id)
  values (auth.uid(), p_target_type, p_target_id);

  case p_target_type
    when 'feed_post' then
      select author_id into v_author from feed_posts where id = p_target_id;
    when 'feed_comment' then
      select author_id into v_author from feed_comments where id = p_target_id;
    when 'thread' then
      select author_id into v_author from threads where id = p_target_id;
    when 'thread_reply' then
      select author_id into v_author from thread_replies where id = p_target_id;
    else
      v_author := null;
  end case;

  perform public.award_points('like_received', v_author);
end;
$$;

-- Mark a lesson complete (idempotent).
create or replace function public.complete_lesson(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into lesson_progress (user_id, lesson_id)
  values (auth.uid(), p_lesson_id)
  on conflict (user_id, lesson_id) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Settings (configurable point values etc.)
-- ---------------------------------------------------------------------------

create table if not exists public.settings (
  key   text primary key,
  value text not null
);

insert into public.settings (key, value) values
  ('points_feed_post',    '10'),
  ('points_thread',       '8'),
  ('points_feed_comment', '3'),
  ('points_thread_reply', '3'),
  ('points_like_received','1'),
  ('points_daily_cap',    '50')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  username         text unique not null,
  display_name     text,
  avatar_url       text,
  is_admin         boolean not null default false,
  instagram_url    text,
  substack_url     text,
  x_url            text,
  youtube_url      text,
  custom_link_url  text,
  custom_link_label text,
  created_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles select"        on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles insert self"   on public.profiles for insert with check (id = auth.uid());
create policy "profiles update self"   on public.profiles for update using (id = auth.uid());
create policy "profiles update admin"  on public.profiles for update using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Feed (social feed)
-- ---------------------------------------------------------------------------

create table if not exists public.feed_posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 5000),
  media_url  text,
  video_url  text,
  created_at timestamptz not null default now()
);

alter table public.feed_posts enable row level security;

create policy "feed_posts select"  on public.feed_posts for select using (auth.role() = 'authenticated');
create policy "feed_posts insert"  on public.feed_posts for insert with check (author_id = auth.uid());
create policy "feed_posts update"  on public.feed_posts for update using (author_id = auth.uid() or public.is_admin());
create policy "feed_posts delete"  on public.feed_posts for delete using (author_id = auth.uid() or public.is_admin());

create index if not exists feed_posts_created_idx on public.feed_posts (created_at desc);

create table if not exists public.feed_comments (
  id           uuid primary key default gen_random_uuid(),
  feed_post_id uuid not null references public.feed_posts (id) on delete cascade,
  author_id    uuid not null references public.profiles (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 2000),
  created_at   timestamptz not null default now()
);

alter table public.feed_comments enable row level security;

create policy "feed_comments select" on public.feed_comments for select using (auth.role() = 'authenticated');
create policy "feed_comments insert" on public.feed_comments for insert with check (author_id = auth.uid());
create policy "feed_comments update" on public.feed_comments for update using (author_id = auth.uid() or public.is_admin());
create policy "feed_comments delete" on public.feed_comments for delete using (author_id = auth.uid() or public.is_admin());

create index if not exists feed_comments_post_idx on public.feed_comments (feed_post_id, created_at);

-- ---------------------------------------------------------------------------
-- Threads (message board)
-- ---------------------------------------------------------------------------

create table if not exists public.threads (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid not null references public.profiles (id) on delete cascade,
  category         text not null check (category in ('general','philosophy','body','spirit','world-news','vent','questions')),
  title            text not null check (char_length(title) between 3 and 200),
  body             text not null check (char_length(body) between 1 and 5000),
  pinned           boolean not null default false,
  last_activity_at timestamptz not null default now(),
  reply_count      int not null default 0,
  created_at       timestamptz not null default now()
);

alter table public.threads enable row level security;

create policy "threads select"  on public.threads for select using (auth.role() = 'authenticated');
create policy "threads insert"  on public.threads for insert with check (author_id = auth.uid());
create policy "threads update"  on public.threads for update using (author_id = auth.uid() or public.is_admin());
create policy "threads delete"  on public.threads for delete using (author_id = auth.uid() or public.is_admin());

create index if not exists threads_category_idx on public.threads (category, pinned desc, last_activity_at desc);

create table if not exists public.thread_replies (
  id              uuid primary key default gen_random_uuid(),
  thread_id       uuid not null references public.threads (id) on delete cascade,
  author_id       uuid not null references public.profiles (id) on delete cascade,
  parent_reply_id uuid references public.thread_replies (id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 5000),
  created_at      timestamptz not null default now()
);

alter table public.thread_replies enable row level security;

create policy "thread_replies select" on public.thread_replies for select using (auth.role() = 'authenticated');
create policy "thread_replies insert" on public.thread_replies for insert with check (author_id = auth.uid());
create policy "thread_replies update" on public.thread_replies for update using (author_id = auth.uid() or public.is_admin());
create policy "thread_replies delete" on public.thread_replies for delete using (author_id = auth.uid() or public.is_admin());

create index if not exists thread_replies_thread_idx on public.thread_replies (thread_id, created_at);

-- ---------------------------------------------------------------------------
-- Likes (polymorphic)
-- ---------------------------------------------------------------------------

create table if not exists public.likes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('feed_post','feed_comment','thread','thread_reply')),
  target_id   uuid not null,
  created_at  timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

alter table public.likes enable row level security;

create policy "likes select" on public.likes for select using (auth.role() = 'authenticated');

-- Inserts/deletes go through toggle_like() (security definer), no direct policy.

create index if not exists likes_target_idx on public.likes (target_type, target_id);

-- ---------------------------------------------------------------------------
-- Activity / points
-- ---------------------------------------------------------------------------

create table if not exists public.activity (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('feed_post','feed_comment','thread','thread_reply','like_received')),
  points     int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.activity enable row level security;

create policy "activity select" on public.activity for select using (user_id = auth.uid() or public.is_admin());

-- Inserts only happen through award_points() (security definer).

create index if not exists activity_user_idx on public.activity (user_id, created_at desc);

-- Content creation triggers award points to the author.
create or replace function public.trigger_award_feed_post()
returns trigger language plpgsql security definer set search_path = public as
$$ begin perform public.award_points('feed_post', new.author_id); return new; end; $$;

create or replace function public.trigger_award_feed_comment()
returns trigger language plpgsql security definer set search_path = public as
$$ begin perform public.award_points('feed_comment', new.author_id); return new; end; $$;

create or replace function public.trigger_award_thread()
returns trigger language plpgsql security definer set search_path = public as
$$ begin perform public.award_points('thread', new.author_id); return new; end; $$;

create or replace function public.trigger_award_thread_reply()
returns trigger language plpgsql security definer set search_path = public as
$$ begin perform public.award_points('thread_reply', new.author_id); return new; end; $$;

drop trigger if exists trg_award_feed_post     on public.feed_posts;
drop trigger if exists trg_award_feed_comment  on public.feed_comments;
drop trigger if exists trg_award_thread        on public.threads;
drop trigger if exists trg_award_thread_reply  on public.thread_replies;

create trigger trg_award_feed_post    after insert on public.feed_posts    for each row execute function public.trigger_award_feed_post();
create trigger trg_award_feed_comment after insert on public.feed_comments for each row execute function public.trigger_award_feed_comment();
create trigger trg_award_thread       after insert on public.threads       for each row execute function public.trigger_award_thread();
create trigger trg_award_thread_reply after insert on public.thread_replies for each row execute function public.trigger_award_thread_reply();

-- Bump thread last_activity when a reply is added.
create or replace function public.bump_thread()
returns trigger language plpgsql security definer set search_path = public as
$$ begin
  update public.threads
     set last_activity_at = now(), reply_count = reply_count + 1
   where id = new.thread_id;
  return new;
end; $$;

drop trigger if exists trg_bump_thread on public.thread_replies;
create trigger trg_bump_thread after insert on public.thread_replies
  for each row execute function public.bump_thread();

-- ---------------------------------------------------------------------------
-- Courses & lessons
-- ---------------------------------------------------------------------------

create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 200),
  description text,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.courses enable row level security;

create policy "courses select"  on public.courses for select using (auth.role() = 'authenticated');
create policy "courses write"   on public.courses for all using (public.is_admin());

create table if not exists public.lessons (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.courses (id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 200),
  description      text,
  video_url        text,
  order_index      int not null default 0,
  required_points  int not null default 0,
  published        boolean not null default false,
  created_at       timestamptz not null default now()
);

alter table public.lessons enable row level security;

create policy "lessons select" on public.lessons for select using (auth.role() = 'authenticated');
create policy "lessons write"  on public.lessons for all using (public.is_admin());

create table if not exists public.lesson_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

alter table public.lesson_progress enable row level security;

create policy "lesson_progress select" on public.lesson_progress for select using (user_id = auth.uid());
create policy "lesson_progress insert" on public.lesson_progress for insert with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------------------------

create table if not exists public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.profiles (id) on delete cascade,
  stripe_customer_id       text,
  stripe_subscription_id   text,
  status                   text not null default 'inactive',
  current_period_end       timestamptz
);

alter table public.subscriptions enable row level security;

create policy "subscriptions select" on public.subscriptions for select using (user_id = auth.uid() or public.is_admin());

-- Writes happen via the Stripe webhook (service role) only.

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('feed_post','feed_comment','thread','thread_reply')),
  target_id   uuid not null,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason      text not null,
  status      text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at  timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "reports insert" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reports select" on public.reports for select using (public.is_admin());
create policy "reports update" on public.reports for update using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Consent log (GDPR Art 7 — record of consent)
-- ---------------------------------------------------------------------------

create table if not exists public.consent_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  policy_key text not null,
  version    text not null,
  accepted   boolean not null,
  ip_address text,
  created_at timestamptz not null default now()
);

alter table public.consent_log enable row level security;

create policy "consent_log insert"        on public.consent_log for insert with check (user_id = auth.uid());
create policy "consent_log select admin"  on public.consent_log for select using (public.is_admin());

create index if not exists consent_log_user_idx on public.consent_log (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Direct messages
-- ---------------------------------------------------------------------------

create table if not exists public.conversations (
  id               uuid primary key default gen_random_uuid(),
  user1_id         uuid not null references public.profiles (id) on delete cascade,
  user2_id         uuid not null references public.profiles (id) on delete cascade,
  last_message_at  timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (user1_id, user2_id),
  check (user1_id < user2_id)
);

alter table public.conversations enable row level security;

create policy "conversations select" on public.conversations
  for select using (auth.uid() = user1_id or auth.uid() = user2_id);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 5000),
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages select" on public.messages
  for select using (
    exists (
      select 1 from public.conversations
      where id = conversation_id
        and (auth.uid() = user1_id or auth.uid() = user2_id)
    )
  );

create policy "messages insert" on public.messages
  for insert with check (sender_id = auth.uid());

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists conversations_users_idx  on public.conversations (user1_id, user2_id);

-- Find or create a 1:1 conversation, returning its id.
create or replace function public.get_or_create_conversation(p_other_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user1 uuid; v_user2 uuid; v_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if auth.uid() = p_other_user then raise exception 'cannot message yourself'; end if;

  if auth.uid() < p_other_user then
    v_user1 := auth.uid(); v_user2 := p_other_user;
  else
    v_user1 := p_other_user; v_user2 := auth.uid();
  end if;

  select id into v_id from public.conversations
    where user1_id = v_user1 and user2_id = v_user2;

  if v_id is not null then return v_id; end if;

  insert into public.conversations (user1_id, user2_id) values (v_user1, v_user2)
    returning id into v_id;
  return v_id;
end; $$;

-- Mark all messages in a conversation as read (by the recipient).
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.messages set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id != auth.uid()
    and read_at is null;
end; $$;
-- 0002_patch.sql
-- Run this in Supabase SQL Editor to add missing tables and columns.
-- This is idempotent (uses IF NOT EXISTS).

-- 1. Add social-link columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url     text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS substack_url      text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS x_url             text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_url       text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_link_url   text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_link_label text;

-- 2. Consent log (GDPR Art 7)
CREATE TABLE IF NOT EXISTS public.consent_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  policy_key text NOT NULL,
  version    text NOT NULL,
  accepted   boolean NOT NULL,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "consent_log insert" ON public.consent_log FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "consent_log select admin" ON public.consent_log FOR SELECT USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS consent_log_user_idx ON public.consent_log (user_id, created_at DESC);

-- 3. Direct messages — conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id         uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  user2_id         uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  last_message_at  timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user1_id, user2_id),
  CHECK (user1_id < user2_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "conversations select" ON public.conversations
    FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS conversations_users_idx ON public.conversations (user1_id, user2_id);

-- 4. Direct messages — messages
CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body            text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "messages select" ON public.messages
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.conversations
        WHERE id = conversation_id
          AND (auth.uid() = user1_id OR auth.uid() = user2_id)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "messages insert" ON public.messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages (conversation_id, created_at);

-- 5. RPCs for direct messages
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_other_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user1 uuid; v_user2 uuid; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF auth.uid() = p_other_user THEN RAISE EXCEPTION 'cannot message yourself'; END IF;

  IF auth.uid() < p_other_user THEN
    v_user1 := auth.uid(); v_user2 := p_other_user;
  ELSE
    v_user1 := p_other_user; v_user2 := auth.uid();
  END IF;

  SELECT id INTO v_id FROM public.conversations
    WHERE user1_id = v_user1 AND user2_id = v_user2;

  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.conversations (user1_id, user2_id) VALUES (v_user1, v_user2)
    RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.messages SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id != auth.uid()
    AND read_at IS NULL;
END; $$;
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
-- 0004_tier2.sql
-- Run this in Supabase SQL Editor to add notifications, subscriptions, blocks, and search indexes.

-- =========================================================================
-- 1. Notifications
-- =========================================================================
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  type        text not null, -- 'reply', 'mention', 'like', 'welcome'
  target_type text not null, -- 'thread', 'thread_reply', 'feed_post', 'feed_comment'
  target_id   uuid,
  message     text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.notifications enable row level security;

do $$ begin
  create policy "notifications select own"
    on public.notifications for select using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "notifications insert own"
    on public.notifications for insert with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "notifications update own"
    on public.notifications for update using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

create index if not exists notifications_user_idx on public.notifications (user_id, read_at, created_at desc);

-- RPC: mark all notifications as read for a user
create or replace function public.mark_notifications_read()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null;
end; $$;

-- RPC: get unread notification count
create or replace function public.unread_notification_count()
returns int language sql security definer set search_path = public as $$
  select count(*)::int from public.notifications where user_id = auth.uid() and read_at is null;
$$;

-- =========================================================================
-- 2. Thread subscriptions (auto-subscribe on thread creation + replies)
-- =========================================================================
create table if not exists public.thread_subscriptions (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  thread_id  uuid not null references public.threads (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, thread_id)
);

alter table public.thread_subscriptions enable row level security;

do $$ begin
  create policy "thread_subscriptions select own"
    on public.thread_subscriptions for select using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "thread_subscriptions insert own"
    on public.thread_subscriptions for insert with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "thread_subscriptions delete own"
    on public.thread_subscriptions for delete using (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- =========================================================================
-- 3. User blocks
-- =========================================================================
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id != blocked_id)
);

alter table public.user_blocks enable row level security;

do $$ begin
  create policy "user_blocks select own"
    on public.user_blocks for select using (blocker_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "user_blocks insert own"
    on public.user_blocks for insert with check (blocker_id = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "user_blocks delete own"
    on public.user_blocks for delete using (blocker_id = auth.uid());
exception when duplicate_object then null;
end $$;

-- =========================================================================
-- 4. Full-text search indexes
-- =========================================================================

-- Feed posts: add tsvector column + GIN index
alter table public.feed_posts add column if not exists fts tsvector
  generated always as (to_tsvector('english', coalesce(body, ''))) stored;

create index if not exists feed_posts_fts_idx on public.feed_posts using gin (fts);

-- Threads: add tsvector column + GIN index
alter table public.threads add column if not exists fts tsvector
  generated always as (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))) stored;

create index if not exists threads_fts_idx on public.threads using gin (fts);
-- Community info settings (Start Here, About, Rules)
-- Admin-editable markdown content displayed on the feed page.

insert into public.settings (key, value) values
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
on conflict (key) do nothing;
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
-- Online status: add last_seen_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Typing indicators: lightweight table
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  typed_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "typing select" ON public.typing_indicators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
        AND (auth.uid() = user1_id OR auth.uid() = user2_id)
    )
  );

CREATE POLICY "typing upsert" ON public.typing_indicators
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "typing delete" ON public.typing_indicators
  FOR DELETE USING (auth.uid() = user_id);
-- Categories table: dynamic boards managed by admins
create table if not exists categories (
  id text primary key,
  label text not null,
  description text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Seed with the original 7 categories
insert into categories (id, label, description, sort_order) values
  ('general', 'General', 'Everyday conversation and updates', 0),
  ('philosophy', 'Philosophy', 'Big questions and ideas', 1),
  ('body', 'Body', 'Health, movement, and embodiment', 2),
  ('spirit', 'Spirit', 'Inner work and practice', 3),
  ('world-news', 'World News', 'What''s happening in the world', 4),
  ('vent', 'Vent', 'A safe place to let it out', 5),
  ('questions', 'Questions', 'Ask anything — get thoughtful answers', 6)
on conflict (id) do nothing;

-- RLS: anyone authenticated can read, only admins can write
alter table categories enable row level security;

create policy "Anyone can read categories"
  on categories for select
  using (auth.role() = 'authenticated');

create policy "Admins can insert categories"
  on categories for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

create policy "Admins can update categories"
  on categories for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

create policy "Admins can delete categories"
  on categories for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );
-- Group chats: conversation_participants table + conversation metadata
-- Run this in Supabase SQL Editor.

-- 1. Add group metadata to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS name text;

-- 2. Conversation participants (supports both 1:1 and group)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Participants can see who's in the conversation
DO $$ BEGIN
  CREATE POLICY "participants select"
    ON public.conversation_participants FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_participants.conversation_id
          AND cp.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- System inserts participants via trigger/RPC (no direct user insert)
DO $$ BEGIN
  CREATE POLICY "participants insert system"
    ON public.conversation_participants FOR INSERT
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Backfill existing 1:1 conversations into conversation_participants
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT id, user1_id FROM public.conversations
ON CONFLICT DO NOTHING;

INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT id, user2_id FROM public.conversations
ON CONFLICT DO NOTHING;

-- 4. Trigger: auto-add participants for new 1:1 conversations
CREATE OR REPLACE FUNCTION public.sync_conversation_participants()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT NEW.is_group THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (NEW.id, NEW.user1_id)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (NEW.id, NEW.user2_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS sync_participants_on_insert ON public.conversations;
CREATE TRIGGER sync_participants_on_insert
  AFTER INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.sync_conversation_participants();

-- 5. RPC: create a group conversation
CREATE OR REPLACE FUNCTION public.create_group_conversation(
  p_name text,
  p_member_ids uuid[]
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF array_length(p_member_ids, 1) IS NULL OR array_length(p_member_ids, 1) < 1 THEN
    RAISE EXCEPTION 'need at least 1 other member';
  END IF;
  IF array_length(p_member_ids, 1) > 49 THEN
    RAISE EXCEPTION 'group chats support up to 50 members';
  END IF;

  -- Create the conversation (user1_id/user2_id set to auth.uid() as placeholder)
  INSERT INTO public.conversations (user1_id, user2_id, is_group, name)
  VALUES (auth.uid(), auth.uid(), true, p_name)
  RETURNING id INTO v_id;

  -- Add creator
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (v_id, auth.uid());

  -- Add other members
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT v_id, unnest(p_member_ids)
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END; $$;

-- 6. RPC: add members to an existing group
CREATE OR REPLACE FUNCTION public.add_group_participants(
  p_conversation_id uuid,
  p_member_ids uuid[]
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id AND is_group = true
  ) THEN
    RAISE EXCEPTION 'not a group conversation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT p_conversation_id, unnest(p_member_ids)
  ON CONFLICT DO NOTHING;
END; $$;
-- 0010_admin_tags.sql
-- Admin-only user tagging system for segmentation, mass DM, and mass email.

-- Tags table
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Profile-tag junction
CREATE TABLE profile_tags (
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, tag_id)
);

-- Indexes
CREATE INDEX idx_profile_tags_tag ON profile_tags(tag_id);
CREATE INDEX idx_profile_tags_profile ON profile_tags(profile_id);

-- RLS: Only admins can manage tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tags"
  ON tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can manage profile tags"
  ON profile_tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );
-- Add media_url and video_url to threads
ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS video_url text;

-- Add video_url to thread_replies
ALTER TABLE public.thread_replies ADD COLUMN IF NOT EXISTS video_url text;
-- Events: admin-created events that users can RSVP to
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  created_by   uuid not null references public.profiles (id) on delete cascade,
  title        text not null check (char_length(title) between 3 and 200),
  description  text not null default '',
  location     text not null default '',
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  cover_url    text,
  created_at   timestamptz not null default now()
);

alter table public.events enable row level security;

-- Everyone can read events
create policy "events select" on public.events
  for select using (auth.role() = 'authenticated');

-- Only admins can insert/update/delete
create policy "events insert" on public.events
  for insert with check (public.is_admin());

create policy "events update" on public.events
  for update using (public.is_admin());

create policy "events delete" on public.events
  for delete using (public.is_admin());

create index if not exists events_starts_at_idx on public.events (starts_at desc);

-- Event signups: users RSVP to events
create table if not exists public.event_signups (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.event_signups enable row level security;

-- Users can see signups for any event
create policy "event_signups select" on public.event_signups
  for select using (auth.role() = 'authenticated');

-- Users can sign up themselves
create policy "event_signups insert" on public.event_signups
  for insert with check (user_id = auth.uid());

-- Users can cancel their own signup
create policy "event_signups delete" on public.event_signups
  for delete using (user_id = auth.uid());

-- Event updates: admin announcements for an event
create table if not exists public.event_updates (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.event_updates enable row level security;

create policy "event_updates select" on public.event_updates
  for select using (auth.role() = 'authenticated');

create policy "event_updates insert" on public.event_updates
  for insert with check (public.is_admin());
-- Add required_tag_id to categories (board gating)
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS required_tag_id uuid REFERENCES public.tags(id) ON DELETE SET NULL;

-- Add required_tag_id to courses (course gating)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS required_tag_id uuid REFERENCES public.tags(id) ON DELETE SET NULL;
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
-- Migration 0015: Invites, user access tracking, subscription tiers

-- 1. Invites table
CREATE TABLE IF NOT EXISTS invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  used_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at    timestamptz
);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read invites (to validate codes)
CREATE POLICY "Authenticated users can read invites"
  ON invites FOR SELECT
  TO authenticated
  USING (true);

-- Users can create their own invites
CREATE POLICY "Users can create invites"
  ON invites FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Users can claim an unused invite (set used_by to themselves)
CREATE POLICY "Users can claim unused invites"
  ON invites FOR UPDATE
  TO authenticated
  USING (used_by IS NULL)
  WITH CHECK (used_by = auth.uid());

-- 2. User access table — tracks how each user gained access
CREATE TABLE IF NOT EXISTS user_access (
  user_id     uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  access_type text NOT NULL CHECK (access_type IN ('beta', 'invite', 'subscription', 'open')),
  invite_id   uuid REFERENCES invites(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_access ENABLE ROW LEVEL SECURITY;

-- Users can read their own access record
CREATE POLICY "Users can read own access"
  ON user_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all
CREATE POLICY "Admins can read all access"
  ON user_access FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Users can insert their own access record (during setup)
CREATE POLICY "Users can insert own access"
  ON user_access FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can insert any access record
CREATE POLICY "Admins can insert any access"
  ON user_access FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admins can update any access record (for subscription webhook)
CREATE POLICY "Admins can update any access"
  ON user_access FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Onboarding settings
INSERT INTO settings (key, value) VALUES
  ('beta_mode', 'false'),
  ('beta_max_spots', '10'),
  ('invites_enabled', 'false'),
  ('invites_per_member', '3'),
  ('subscription_required', 'false'),
  ('stripe_price_monthly', ''),
  ('stripe_price_yearly', ''),
  ('yearly_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================


-- ---------------------------------------------------------------------------
-- Migrations 0017-0021 (constituent + added features)
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
CREATE POLICY "Anyone can join waitlist"
  ON waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read the waitlist
CREATE POLICY "Admins can read waitlist"
  ON waitlist FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update waitlist entries (admit/decline)
CREATE POLICY "Admins can update waitlist"
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

-- Only admins can delete waitlist entries
CREATE POLICY "Admins can delete waitlist"
  ON waitlist FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );


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
CREATE POLICY "chat_rooms select" ON public.chat_rooms
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "chat_rooms insert admin" ON public.chat_rooms;
CREATE POLICY "chat_rooms insert admin" ON public.chat_rooms
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "chat_rooms update admin" ON public.chat_rooms;
CREATE POLICY "chat_rooms update admin" ON public.chat_rooms
  FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "chat_rooms delete admin" ON public.chat_rooms;
CREATE POLICY "chat_rooms delete admin" ON public.chat_rooms
  FOR DELETE TO authenticated USING (public.is_admin());

-- Messages: all authenticated members can read; anyone can post their own
DROP POLICY IF EXISTS "chat_room_messages select" ON public.chat_room_messages;
CREATE POLICY "chat_room_messages select" ON public.chat_room_messages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "chat_room_messages insert" ON public.chat_room_messages;
CREATE POLICY "chat_room_messages insert" ON public.chat_room_messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "chat_room_messages delete admin" ON public.chat_room_messages;
CREATE POLICY "chat_room_messages delete admin" ON public.chat_room_messages
  FOR DELETE TO authenticated USING (public.is_admin());

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

CREATE POLICY "poll votes select" ON public.thread_poll_votes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "poll votes insert" ON public.thread_poll_votes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "poll votes update" ON public.thread_poll_votes
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "poll votes delete" ON public.thread_poll_votes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

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
create policy "lesson_comments select" on public.lesson_comments for select using (auth.role() = 'authenticated');
create policy "lesson_comments insert" on public.lesson_comments for insert with check (author_id = auth.uid());
create policy "lesson_comments delete" on public.lesson_comments for delete using (author_id = auth.uid() or public.is_admin());
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
create policy "Assessment select own or admin"
  on public.user_assessments for select
  using (user_id = auth.uid() or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
create policy "Assessment insert own"
  on public.user_assessments for insert
  with check (user_id = auth.uid());
alter table profiles add column if not exists assessment_skipped_at timestamptz;

create or replace function public.record_assessment(
  p_assessment_type text,
  p_version text,
  p_score_raw int,
  p_score_scaled int,
  p_band text default null,
  p_skill_scores jsonb default '{}'::jsonb,
  p_answers jsonb default '{}'::jsonb
) returns text language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tag_id uuid;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  if p_assessment_type = 'placement' then
    if p_band is null or p_band not in ('A1','A2','B1','B2','C1','C2') then
      raise exception 'placement requires a valid CEFR band';
    end if;
  elsif p_assessment_type = 'idioms' then
    if p_band is not null then
      raise exception 'idioms assessment does not carry a CEFR band';
    end if;
  else
    raise exception 'unknown assessment type';
  end if;

  insert into user_assessments
    (user_id, assessment_type, version, score_raw, score_scaled, band, skill_scores, answers)
  values
    (v_user_id, p_assessment_type, p_version, p_score_raw, p_score_scaled, p_band, p_skill_scores, p_answers);

  if p_assessment_type = 'placement' then
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
  end if;

  return p_assessment_type;
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

-- ---------------------------------------------------------------------------
-- 0025: Public "completed a course with a tutor" credential
-- ---------------------------------------------------------------------------

create table if not exists public.course_tutor_completions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  course_id   uuid not null references public.courses (id) on delete cascade,
  note        text,
  assigned_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists course_tutor_completions_user_idx
  on public.course_tutor_completions (user_id);
create index if not exists course_tutor_completions_course_idx
  on public.course_tutor_completions (course_id);

alter table public.course_tutor_completions enable row level security;

create policy "course_tutor_completions select"
  on public.course_tutor_completions
  for select
  using (auth.role() = 'authenticated');

create policy "course_tutor_completions admin all"
  on public.course_tutor_completions
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 0026: Multi-assessment support (assessment_type on user_assessments)
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_assessments
  ADD COLUMN IF NOT EXISTS assessment_type text NOT NULL DEFAULT 'placement';

ALTER TABLE public.user_assessments ALTER COLUMN band DROP NOT NULL;
ALTER TABLE public.user_assessments DROP CONSTRAINT IF EXISTS user_assessments_band_check;

CREATE INDEX IF NOT EXISTS idx_user_assessments_type_user
  ON user_assessments(assessment_type, user_id, taken_at DESC);

