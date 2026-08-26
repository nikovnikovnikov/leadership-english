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
