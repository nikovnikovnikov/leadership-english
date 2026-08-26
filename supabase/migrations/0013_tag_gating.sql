-- Add required_tag_id to categories (board gating)
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS required_tag_id uuid REFERENCES public.tags(id) ON DELETE SET NULL;

-- Add required_tag_id to courses (course gating)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS required_tag_id uuid REFERENCES public.tags(id) ON DELETE SET NULL;
