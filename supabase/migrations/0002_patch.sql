-- 0002_patch.sql
-- Run this in Supabase SQL Editor to add missing tables and columns.
-- This is idempotent (uses IF NOT EXISTS).

-- 1. Add social-link columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url     text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS substack_url      text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS x_url             text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_url       text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_link_url   text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_link_label text;

-- 2. Consent log (GDPR Art 7)
CREATE TABLE IF NOT EXISTS public.consent_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  policy_key text NOT NULL,
  version    text NOT NULL,
  accepted   boolean NOT NULL,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "consent_log insert" ON public.consent_log FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "consent_log select admin" ON public.consent_log FOR SELECT USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS consent_log_user_idx ON public.consent_log (user_id, created_at DESC);

-- 3. Direct messages — conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id         uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  user2_id         uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  last_message_at  timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user1_id, user2_id),
  CHECK (user1_id < user2_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "conversations select" ON public.conversations
    FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS conversations_users_idx ON public.conversations (user1_id, user2_id);

-- 4. Direct messages — messages
CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body            text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "messages select" ON public.messages
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.conversations
        WHERE id = conversation_id
          AND (auth.uid() = user1_id OR auth.uid() = user2_id)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "messages insert" ON public.messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages (conversation_id, created_at);

-- 5. RPCs for direct messages
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_other_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user1 uuid; v_user2 uuid; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF auth.uid() = p_other_user THEN RAISE EXCEPTION 'cannot message yourself'; END IF;

  IF auth.uid() < p_other_user THEN
    v_user1 := auth.uid(); v_user2 := p_other_user;
  ELSE
    v_user1 := p_other_user; v_user2 := auth.uid();
  END IF;

  SELECT id INTO v_id FROM public.conversations
    WHERE user1_id = v_user1 AND user2_id = v_user2;

  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.conversations (user1_id, user2_id) VALUES (v_user1, v_user2)
    RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.messages SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id != auth.uid()
    AND read_at IS NULL;
END; $$;
