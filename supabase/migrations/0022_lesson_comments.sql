-- ---------------------------------------------------------------------------
-- Lesson comments (per-lesson discussion)
-- ---------------------------------------------------------------------------

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