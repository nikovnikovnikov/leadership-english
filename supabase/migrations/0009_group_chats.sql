-- Group chats: conversation_participants table + conversation metadata
-- Run this in Supabase SQL Editor.

-- 1. Add group metadata to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS name text;

-- 2. Conversation participants (supports both 1:1 and group)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Participants can see who's in the conversation
DO $$ BEGIN
  CREATE POLICY "participants select"
    ON public.conversation_participants FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = conversation_participants.conversation_id
          AND cp.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- System inserts participants via trigger/RPC (no direct user insert)
DO $$ BEGIN
  CREATE POLICY "participants insert system"
    ON public.conversation_participants FOR INSERT
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Backfill existing 1:1 conversations into conversation_participants
INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT id, user1_id FROM public.conversations
ON CONFLICT DO NOTHING;

INSERT INTO public.conversation_participants (conversation_id, user_id)
SELECT id, user2_id FROM public.conversations
ON CONFLICT DO NOTHING;

-- 4. Trigger: auto-add participants for new 1:1 conversations
CREATE OR REPLACE FUNCTION public.sync_conversation_participants()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT NEW.is_group THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (NEW.id, NEW.user1_id)
    ON CONFLICT DO NOTHING;
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (NEW.id, NEW.user2_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS sync_participants_on_insert ON public.conversations;
CREATE TRIGGER sync_participants_on_insert
  AFTER INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.sync_conversation_participants();

-- 5. RPC: create a group conversation
CREATE OR REPLACE FUNCTION public.create_group_conversation(
  p_name text,
  p_member_ids uuid[]
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF array_length(p_member_ids, 1) IS NULL OR array_length(p_member_ids, 1) < 1 THEN
    RAISE EXCEPTION 'need at least 1 other member';
  END IF;
  IF array_length(p_member_ids, 1) > 49 THEN
    RAISE EXCEPTION 'group chats support up to 50 members';
  END IF;

  -- Create the conversation (user1_id/user2_id set to auth.uid() as placeholder)
  INSERT INTO public.conversations (user1_id, user2_id, is_group, name)
  VALUES (auth.uid(), auth.uid(), true, p_name)
  RETURNING id INTO v_id;

  -- Add creator
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (v_id, auth.uid());

  -- Add other members
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT v_id, unnest(p_member_ids)
  ON CONFLICT DO NOTHING;

  RETURN v_id;
END; $$;

-- 6. RPC: add members to an existing group
CREATE OR REPLACE FUNCTION public.add_group_participants(
  p_conversation_id uuid,
  p_member_ids uuid[]
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id AND is_group = true
  ) THEN
    RAISE EXCEPTION 'not a group conversation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not a participant';
  END IF;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT p_conversation_id, unnest(p_member_ids)
  ON CONFLICT DO NOTHING;
END; $$;
