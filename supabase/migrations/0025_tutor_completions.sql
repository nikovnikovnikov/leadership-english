-- 0025_tutor_completions.sql
-- Public "completed a course with a tutor" credential.
-- Admins mark a member as having completed a specific course with a tutor;
-- this is public (readable by any authenticated member) and shows as a
-- badge on the member's profile and as a status on that course's card.

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