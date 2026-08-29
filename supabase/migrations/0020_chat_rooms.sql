-- ============================================================================
-- 0020: Live chat rooms — Discord-style rooms with realtime messages
-- ============================================================================

-- Rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Room messages (subscribed via Supabase Realtime)
CREATE TABLE IF NOT EXISTS chat_room_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body       text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Deliver full rows on UPDATE/DELETE realtime events
ALTER TABLE chat_room_messages REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS chat_room_messages_room_idx
  ON public.chat_room_messages (room_id, created_at);

-- Add to the realtime publication so clients can subscribe to INSERT events
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_room_messages;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_messages ENABLE ROW LEVEL SECURITY;

-- Table-level grants (RLS handles row filtering within these)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_room_messages TO authenticated;

-- Rooms: all authenticated members can read; only admins manage
DROP POLICY IF EXISTS "chat_rooms select" ON public.chat_rooms;
CREATE POLICY "chat_rooms select" ON public.chat_rooms
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "chat_rooms insert admin" ON public.chat_rooms;
CREATE POLICY "chat_rooms insert admin" ON public.chat_rooms
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "chat_rooms update admin" ON public.chat_rooms;
CREATE POLICY "chat_rooms update admin" ON public.chat_rooms
  FOR UPDATE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "chat_rooms delete admin" ON public.chat_rooms;
CREATE POLICY "chat_rooms delete admin" ON public.chat_rooms
  FOR DELETE TO authenticated USING (public.is_admin());

-- Messages: all authenticated members can read; anyone can post their own
DROP POLICY IF EXISTS "chat_room_messages select" ON public.chat_room_messages;
CREATE POLICY "chat_room_messages select" ON public.chat_room_messages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "chat_room_messages insert" ON public.chat_room_messages;
CREATE POLICY "chat_room_messages insert" ON public.chat_room_messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "chat_room_messages delete admin" ON public.chat_room_messages;
CREATE POLICY "chat_room_messages delete admin" ON public.chat_room_messages
  FOR DELETE TO authenticated USING (public.is_admin());