-- Fix: remove INSERT policy on notifications.
-- Server actions insert notifications for OTHER users (mentions, replies, etc.)
-- so the user_id = auth.uid() check blocks all cross-user notification creation.
-- SELECT and UPDATE policies remain (users can only read/update their own).

DROP POLICY IF EXISTS "notifications insert own" ON public.notifications;
