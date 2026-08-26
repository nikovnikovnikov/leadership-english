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
