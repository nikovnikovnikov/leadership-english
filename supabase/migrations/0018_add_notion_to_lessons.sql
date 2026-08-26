-- Add Notion page ID support to lessons
-- When set, the lesson renders content from a Notion page instead of (or alongside) the description field.

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS notion_page_id text;
