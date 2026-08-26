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
