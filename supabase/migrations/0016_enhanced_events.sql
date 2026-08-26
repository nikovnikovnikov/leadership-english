-- ============================================================================
-- 0016: Enhanced events — recurrence, host, guest, event link, tag gating
-- ============================================================================

-- New columns on events
SELECT _safe_add_col('events', 'recurring_frequency', 'text');
SELECT _safe_add_col('events', 'recurring_group_id', 'uuid REFERENCES public.events(id) ON DELETE SET NULL');
SELECT _safe_add_col('events', 'special_guest', 'text');
SELECT _safe_add_col('events', 'special_guest_url', 'text');
SELECT _safe_add_col('events', 'event_link', 'text');
SELECT _safe_add_col('events', 'required_tag_id', 'uuid REFERENCES public.tags(id) ON DELETE SET NULL');

DO $$ BEGIN
  ALTER TABLE events ADD CONSTRAINT events_recurring_frequency_check
    CHECK (recurring_frequency IN ('daily', 'weekly', 'biweekly', 'monthly'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS events_recurring_group_idx ON public.events (recurring_group_id);

-- RLS: allow moderators to create/update/delete events
DROP POLICY IF EXISTS "events insert" ON public.events;
DROP POLICY IF EXISTS "events update" ON public.events;
DROP POLICY IF EXISTS "events delete" ON public.events;
DROP POLICY IF EXISTS "event_updates insert" ON public.event_updates;

DO $$ BEGIN CREATE POLICY "events insert" ON public.events FOR INSERT WITH CHECK (public.is_moderator());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "events update" ON public.events FOR UPDATE USING (public.is_moderator());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "events delete" ON public.events FOR DELETE USING (public.is_moderator());
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE POLICY "event_updates insert" ON public.event_updates FOR INSERT WITH CHECK (public.is_moderator());
EXCEPTION WHEN duplicate_object THEN null; END $$;
