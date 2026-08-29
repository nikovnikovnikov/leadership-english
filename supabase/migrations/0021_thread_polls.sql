-- ============================================================================
-- 0021: Thread polls — question + options on threads, one vote per member
-- ============================================================================

-- Poll fields on threads (nullable = no poll)
ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS poll_question text;
ALTER TABLE public.threads ADD COLUMN IF NOT EXISTS poll_options text[];

-- One row per (thread, user) — a user can only have one option selected.
-- Re-voting switches the option; voting the same option again removes it.
CREATE TABLE IF NOT EXISTS public.thread_poll_votes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    uuid NOT NULL REFERENCES public.threads (id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  option_index int  NOT NULL CHECK (option_index >= 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, user_id)
);

ALTER TABLE public.thread_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poll votes select" ON public.thread_poll_votes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "poll votes insert" ON public.thread_poll_votes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "poll votes update" ON public.thread_poll_votes
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "poll votes delete" ON public.thread_poll_votes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS thread_poll_votes_thread_idx
  ON public.thread_poll_votes (thread_id);

-- Toggle a vote atomically (security definer, validates poll + option range)
CREATE OR REPLACE FUNCTION public.toggle_poll_vote(p_thread_id uuid, p_option_index int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_existing int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_option_index IS NULL OR p_option_index < 0 THEN
    RAISE EXCEPTION 'Invalid option';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.threads
    WHERE id = p_thread_id
      AND poll_question IS NOT NULL
      AND poll_options IS NOT NULL
      AND p_option_index < cardinality(poll_options)
  ) THEN
    RAISE EXCEPTION 'Invalid poll or option';
  END IF;

  SELECT option_index INTO v_existing
  FROM public.thread_poll_votes
  WHERE thread_id = p_thread_id AND user_id = v_uid;

  IF v_existing IS NULL THEN
    INSERT INTO public.thread_poll_votes (thread_id, user_id, option_index)
    VALUES (p_thread_id, v_uid, p_option_index);
  ELSIF v_existing = p_option_index THEN
    DELETE FROM public.thread_poll_votes
    WHERE thread_id = p_thread_id AND user_id = v_uid;
  ELSE
    UPDATE public.thread_poll_votes
    SET option_index = p_option_index
    WHERE thread_id = p_thread_id AND user_id = v_uid;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_poll_vote(uuid, int) FROM public;
GRANT EXECUTE ON FUNCTION public.toggle_poll_vote(uuid, int) TO authenticated;

-- Table-level grants for authenticated (RLS filters within these)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_poll_votes TO authenticated;