-- Fix ALL RLS policies at once
-- Run this in Supabase SQL Editor

-- Helper function
CREATE OR REPLACE FUNCTION _fix_policies(tbl text) RETURNS void AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, tbl);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- PROFILES
-- =====================================================================
SELECT _fix_policies('profiles');
CREATE POLICY "profiles select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles insert self" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles update self" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles update admin" ON profiles FOR UPDATE USING (public.is_admin());

-- =====================================================================
-- FEED POSTS
-- =====================================================================
SELECT _fix_policies('feed_posts');
CREATE POLICY "feed_posts select" ON feed_posts FOR SELECT USING (true);
CREATE POLICY "feed_posts insert" ON feed_posts FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "feed_posts update" ON feed_posts FOR UPDATE USING (author_id = auth.uid() OR public.is_moderator());
CREATE POLICY "feed_posts delete" ON feed_posts FOR DELETE USING (author_id = auth.uid() OR public.is_moderator());

-- =====================================================================
-- FEED COMMENTS
-- =====================================================================
SELECT _fix_policies('feed_comments');
CREATE POLICY "feed_comments select" ON feed_comments FOR SELECT USING (true);
CREATE POLICY "feed_comments insert" ON feed_comments FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "feed_comments update" ON feed_comments FOR UPDATE USING (author_id = auth.uid() OR public.is_moderator());
CREATE POLICY "feed_comments delete" ON feed_comments FOR DELETE USING (author_id = auth.uid() OR public.is_moderator());

-- =====================================================================
-- LIKES
-- =====================================================================
SELECT _fix_policies('likes');
CREATE POLICY "likes select" ON likes FOR SELECT USING (true);

-- =====================================================================
-- THREADS
-- =====================================================================
SELECT _fix_policies('threads');
CREATE POLICY "threads select" ON threads FOR SELECT USING (true);
CREATE POLICY "threads insert" ON threads FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "threads update" ON threads FOR UPDATE USING (author_id = auth.uid() OR public.is_moderator());
CREATE POLICY "threads delete" ON threads FOR DELETE USING (author_id = auth.uid() OR public.is_moderator());

-- =====================================================================
-- THREAD REPLIES
-- =====================================================================
SELECT _fix_policies('thread_replies');
CREATE POLICY "thread_replies select" ON thread_replies FOR SELECT USING (true);
CREATE POLICY "thread_replies insert" ON thread_replies FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "thread_replies update" ON thread_replies FOR UPDATE USING (author_id = auth.uid() OR public.is_moderator());
CREATE POLICY "thread_replies delete" ON thread_replies FOR DELETE USING (author_id = auth.uid() OR public.is_moderator());

-- =====================================================================
-- THREAD SUBSCRIPTIONS
-- =====================================================================
SELECT _fix_policies('thread_subscriptions');
CREATE POLICY "thread_subscriptions select own" ON thread_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "thread_subscriptions insert own" ON thread_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "thread_subscriptions delete own" ON thread_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- =====================================================================
-- USER BLOCKS
-- =====================================================================
SELECT _fix_policies('user_blocks');
CREATE POLICY "user_blocks select own" ON user_blocks FOR SELECT USING (blocker_id = auth.uid());
CREATE POLICY "user_blocks insert own" ON user_blocks FOR INSERT WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "user_blocks delete own" ON user_blocks FOR DELETE USING (blocker_id = auth.uid());

-- =====================================================================
-- CATEGORIES
-- =====================================================================
SELECT _fix_policies('categories');
CREATE POLICY "categories select" ON categories FOR SELECT USING (true);
CREATE POLICY "categories insert admin" ON categories FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "categories update admin" ON categories FOR UPDATE USING (public.is_admin());
CREATE POLICY "categories delete admin" ON categories FOR DELETE USING (public.is_admin());

-- =====================================================================
-- COURSES
-- =====================================================================
SELECT _fix_policies('courses');
CREATE POLICY "courses select" ON courses FOR SELECT USING (true);
CREATE POLICY "courses admin all" ON courses FOR ALL USING (public.is_admin());

-- =====================================================================
-- LESSONS
-- =====================================================================
SELECT _fix_policies('lessons');
CREATE POLICY "lessons select" ON lessons FOR SELECT USING (true);
CREATE POLICY "lessons admin all" ON lessons FOR ALL USING (public.is_admin());

-- =====================================================================
-- LESSON PROGRESS
-- =====================================================================
SELECT _fix_policies('lesson_progress');
CREATE POLICY "lesson_progress select" ON lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lesson_progress insert" ON lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lesson_progress update" ON lesson_progress FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================================
-- ACTIVITY
-- =====================================================================
SELECT _fix_policies('activity');
CREATE POLICY "activity select" ON activity FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- =====================================================================
-- SETTINGS
-- =====================================================================
SELECT _fix_policies('settings');
CREATE POLICY "settings select" ON settings FOR SELECT USING (true);
CREATE POLICY "settings admin all" ON settings FOR ALL USING (public.is_admin());

-- =====================================================================
-- REPORTS
-- =====================================================================
SELECT _fix_policies('reports');
CREATE POLICY "reports insert" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports select admin" ON reports FOR SELECT USING (public.is_admin() OR public.is_moderator());
CREATE POLICY "reports update admin" ON reports FOR UPDATE USING (public.is_admin() OR public.is_moderator());

-- =====================================================================
-- SUBSCRIPTIONS
-- =====================================================================
SELECT _fix_policies('subscriptions');
CREATE POLICY "subscriptions select" ON subscriptions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- =====================================================================
-- NOTIFICATIONS
-- =====================================================================
SELECT _fix_policies('notifications');
CREATE POLICY "notifications select own" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications insert own" ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications update own" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================================
-- CONVERSATIONS
-- =====================================================================
SELECT _fix_policies('conversations');
CREATE POLICY "conversations select" ON conversations FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- =====================================================================
-- CONVERSATION PARTICIPANTS
-- =====================================================================
SELECT _fix_policies('conversation_participants');
CREATE POLICY "participants select" ON conversation_participants FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid())
);
CREATE POLICY "participants insert system" ON conversation_participants FOR INSERT WITH CHECK (true);

-- =====================================================================
-- MESSAGES
-- =====================================================================
SELECT _fix_policies('messages');
CREATE POLICY "messages select" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND (auth.uid() = user1_id OR auth.uid() = user2_id))
);
CREATE POLICY "messages insert" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- =====================================================================
-- TYPING INDICATORS
-- =====================================================================
SELECT _fix_policies('typing_indicators');
CREATE POLICY "typing select" ON typing_indicators FOR SELECT USING (true);
CREATE POLICY "typing upsert" ON typing_indicators FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "typing update" ON typing_indicators FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "typing delete" ON typing_indicators FOR DELETE USING (auth.uid() = user_id);

-- =====================================================================
-- TAGS
-- =====================================================================
SELECT _fix_policies('tags');
CREATE POLICY "tags select" ON tags FOR SELECT USING (true);
CREATE POLICY "tags admin all" ON tags FOR ALL USING (public.is_admin());

-- =====================================================================
-- PROFILE TAGS
-- =====================================================================
SELECT _fix_policies('profile_tags');
CREATE POLICY "profile_tags select" ON profile_tags FOR SELECT USING (true);
CREATE POLICY "profile_tags admin all" ON profile_tags FOR ALL USING (public.is_admin());

-- =====================================================================
-- EVENTS
-- =====================================================================
SELECT _fix_policies('events');
CREATE POLICY "events select" ON events FOR SELECT USING (true);
CREATE POLICY "events insert" ON events FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "events update" ON events FOR UPDATE USING (public.is_admin());
CREATE POLICY "events delete" ON events FOR DELETE USING (public.is_admin());

-- =====================================================================
-- EVENT SIGNUPS
-- =====================================================================
SELECT _fix_policies('event_signups');
CREATE POLICY "event_signups select" ON event_signups FOR SELECT USING (true);
CREATE POLICY "event_signups insert" ON event_signups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "event_signups delete" ON event_signups FOR DELETE USING (auth.uid() = user_id);

-- =====================================================================
-- EVENT UPDATES
-- =====================================================================
SELECT _fix_policies('event_updates');
CREATE POLICY "event_updates select" ON event_updates FOR SELECT USING (true);
CREATE POLICY "event_updates insert" ON event_updates FOR INSERT WITH CHECK (public.is_admin());

-- =====================================================================
-- INVITES
-- =====================================================================
SELECT _fix_policies('invites');
CREATE POLICY "invites select" ON invites FOR SELECT USING (true);
CREATE POLICY "invites insert" ON invites FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "invites update" ON invites FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (used_by = auth.uid());

-- =====================================================================
-- USER ACCESS
-- =====================================================================
SELECT _fix_policies('user_access');
CREATE POLICY "user_access select own" ON user_access FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_access select admin" ON user_access FOR SELECT USING (public.is_admin());
CREATE POLICY "user_access insert" ON user_access FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- CONSENT LOG
-- =====================================================================
SELECT _fix_policies('consent_log');
CREATE POLICY "consent_log insert" ON consent_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "consent_log select admin" ON consent_log FOR SELECT USING (public.is_admin());

-- Cleanup
DROP FUNCTION IF EXISTS _fix_policies(text);
