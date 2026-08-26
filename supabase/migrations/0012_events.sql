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
