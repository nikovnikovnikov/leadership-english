-- FIX: Grant service_role table access and fix conversation_participants recursion
-- Run this in Supabase SQL Editor

-- Grant full access to service_role (needed for admin queries)
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role', tbl.tablename);
  END LOOP;
END;
$$;

DO $$
DECLARE
  seq RECORD;
BEGIN
  FOR seq IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' LOOP
    EXECUTE format('GRANT USAGE, SELECT ON public.%I TO service_role', seq.sequencename);
  END LOOP;
END;
$$;

-- FIX: conversation_participants infinite recursion
-- The old policy queried the same table it was protecting
DROP POLICY IF EXISTS "participants select" ON conversation_participants;
CREATE POLICY "participants select" ON conversation_participants FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
      AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id)
  )
);
