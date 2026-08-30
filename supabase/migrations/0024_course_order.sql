-- 0024_course_order.sql
-- Admin-defined course ordering on the /learn and /courses pages.
-- Mirrors the existing `sort_order` convention used by categories.

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Seed an initial order (newest first, matching the previous display) only for
-- courses that have never been explicitly ordered, so re-running is safe.
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at DESC) AS rn
  FROM public.courses
)
UPDATE public.courses c
SET sort_order = r.rn
FROM ranked r
WHERE r.id = c.id AND c.sort_order = 0;

CREATE INDEX IF NOT EXISTS courses_sort_order_idx ON public.courses (sort_order);