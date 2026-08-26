import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/config";

export type ProfileRef = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type FeedPost = {
  id: string;
  author_id: string;
  body: string;
  media_url: string | null;
  video_url: string | null;
  created_at: string;
  author: ProfileRef | null;
  comment_count: number;
  like_count: number;
  liked_by_me: boolean;
  comments: FeedComment[];
};

export type FeedComment = {
  id: string;
  feed_post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: ProfileRef | null;
};

const PROFILE_FIELDS =
  "id, username, display_name, avatar_url, instagram_url, substack_url, x_url, youtube_url, custom_link_url, custom_link_label";

export async function getFeedPosts(
  currentUserId: string | null,
  limit = 20,
  cursor?: string,
): Promise<FeedPost[]> {
  const supabase = await createClient();

  // Get blocked user IDs
  let blockedIds: string[] = [];
  if (currentUserId) {
    const { data: blocks } = await supabase
      .from("user_blocks")
      .select("blocked_id")
      .eq("blocker_id", currentUserId);
    blockedIds = (blocks ?? []).map((b) => b.blocked_id);
  }

  let query = supabase
    .from("feed_posts")
    .select(`*, author:profiles(${PROFILE_FIELDS})`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  if (blockedIds.length) {
    query = query.not("author_id", "in", `(${blockedIds.join(",")})`);
  }

  const { data: posts, error } = await query;

  if (error) throw new Error(error.message);
  if (!posts.length) return [];

  const postIds = posts.map((p) => p.id);

  const [{ data: comments }, { data: likes }] = await Promise.all([
    supabase
      .from("feed_comments")
      .select(`*, author:profiles(${PROFILE_FIELDS})`)
      .in("feed_post_id", postIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("likes")
      .select("id, target_id, user_id")
      .in("target_id", postIds)
      .eq("target_type", "feed_post"),
  ]);

  const commentsByPost = new Map<string, FeedComment[]>();
  for (const c of comments ?? []) {
    const list = commentsByPost.get(c.feed_post_id) ?? [];
    list.push(c as FeedComment);
    commentsByPost.set(c.feed_post_id, list);
  }

  const likeByPost = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of likes ?? []) {
    likeByPost.set(l.target_id, (likeByPost.get(l.target_id) ?? 0) + 1);
    if (l.user_id === currentUserId) likedByMe.add(l.target_id);
  }

  return posts.map((p) => ({
    ...(p as object),
    author: p.author as ProfileRef | null,
    comment_count: commentsByPost.get(p.id)?.length ?? 0,
    like_count: likeByPost.get(p.id) ?? 0,
    liked_by_me: likedByMe.has(p.id),
    comments: commentsByPost.get(p.id) ?? [],
  })) as unknown as FeedPost[];
}

export type ThreadWithAuthor = {
  id: string;
  author_id: string;
  category: string;
  title: string;
  body: string;
  media_url: string | null;
  video_url: string | null;
  pinned: boolean;
  last_activity_at: string;
  reply_count: number;
  created_at: string;
  author: ProfileRef | null;
};

export type FeedThread = ThreadWithAuthor & {
  like_count: number;
  liked_by_me: boolean;
};

export async function getFeedThreads(
  currentUserId: string | null,
  limit = 20,
  cursor?: string,
): Promise<FeedThread[]> {
  const supabase = await createClient();

  let blockedIds: string[] = [];
  if (currentUserId) {
    const { data: blocks } = await supabase
      .from("user_blocks")
      .select("blocked_id")
      .eq("user_id", currentUserId);
    blockedIds = (blocks ?? []).map((b) => b.blocked_id);
  }

  let query = supabase
    .from("threads")
    .select("*")
    .order("last_activity_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("last_activity_at", cursor);
  }

  if (blockedIds.length) {
    query = query.not("author_id", "in", `(${blockedIds.join(",")})`);
  }

  const { data: threads, error } = await query;
  if (error) throw new Error(error.message);
  if (!threads?.length) return [];

  const authorIds = [...new Set(threads.map((t) => t.author_id))];
  const { data: authors } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .in("id", authorIds);
  const authorMap = new Map((authors ?? []).map((a) => [a.id, a as ProfileRef]));

  const threadIds = threads.map((t) => t.id);

  const { data: likes } = await supabase
    .from("likes")
    .select("id, target_id, user_id")
    .in("target_id", threadIds)
    .eq("target_type", "thread");

  const likeByThread = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of likes ?? []) {
    likeByThread.set(l.target_id, (likeByThread.get(l.target_id) ?? 0) + 1);
    if (l.user_id === currentUserId) likedByMe.add(l.target_id);
  }

  return threads.map((t) => ({
    ...t,
    author: authorMap.get(t.author_id) ?? null,
    like_count: likeByThread.get(t.id) ?? 0,
    liked_by_me: likedByMe.has(t.id),
  })) as FeedThread[];
}

export async function getThreads(category: string): Promise<ThreadWithAuthor[]> {
  const supabase = await createClient();
  const { data: threads, error } = await supabase
    .from("threads")
    .select("*")
    .eq("category", category)
    .order("pinned", { ascending: false })
    .order("last_activity_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  if (!threads?.length) return [];

  const authorIds = [...new Set(threads.map((t) => t.author_id))];
  const { data: authors } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .in("id", authorIds);
  const authorMap = new Map((authors ?? []).map((a) => [a.id, a as ProfileRef]));

  return threads.map((t) => ({
    ...t,
    author: authorMap.get(t.author_id) ?? null,
  })) as ThreadWithAuthor[];
}

export async function getThread(id: string) {
  const supabase = await createClient();
  const { data: thread, error } = await supabase
    .from("threads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!thread) return null;

  const { data: author } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", thread.author_id)
    .single();

  return { ...thread, author: (author as ProfileRef) ?? null };
}

export async function getThreadReplies(threadId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("thread_replies")
    .select(`*, author:profiles(${PROFILE_FIELDS})`)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type ThreadReply = Awaited<ReturnType<typeof getThreadReplies>>[number];

export async function getCourses() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, description, created_at, required_tag_id")
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type Course = Awaited<ReturnType<typeof getCourses>>[number];

export async function getCourse(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, description, created_at, required_tag_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getLessons(courseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(
      "id, course_id, title, description, video_url, order_index, required_points, published",
    )
    .eq("course_id", courseId)
    .eq("published", true)
    .order("order_index", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type Lesson = Awaited<ReturnType<typeof getLessons>>[number];

export async function getLesson(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(
      "id, course_id, title, description, video_url, order_index, required_points, published",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getCompletedLessonIds(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((p) => p.lesson_id));
}

export async function getTotalPoints(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("total_points", {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  return data ?? 0;
}

export async function getTotalPointsBatch(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("points")
    .select("user_id, points")
    .in("user_id", userIds);
  if (error) return new Map();
  const map = new Map<string, number>();
  for (const id of userIds) map.set(id, 0);
  for (const row of data ?? []) {
    map.set(row.user_id, (map.get(row.user_id) ?? 0) + row.points);
  }
  return map;
}

export const getSettings = cache(async function getSettings(): Promise<Record<string, string>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("settings").select("key, value");
    if (error) return {};
    const map: Record<string, string> = {};
    for (const row of data ?? []) map[row.key] = row.value;
    return map;
  } catch {
    return {};
  }
});


export async function getMembers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_admin, role, created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type Member = Awaited<ReturnType<typeof getMembers>>[number];

export async function getActivity(userId: string, limit = 50) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity")
    .select("id, kind, points, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function isSubscriptionActive(sub: {
  status: string;
  current_period_end: string | null;
} | null): boolean {
  if (!sub) return false;
  return (
    (sub.status === "active" || sub.status === "trialing") &&
    (!sub.current_period_end ||
      new Date(sub.current_period_end).getTime() > Date.now())
  );
}

export async function isSubscribed(userId: string): Promise<boolean> {
  if (process.env.ENABLE_STRIPE !== "true") return true;

  const supabase = await createClient();

  // Check if user joined via beta or invite (free full access)
  const { data: access } = await supabase
    .from("user_access")
    .select("access_type")
    .eq("user_id", userId)
    .maybeSingle();
  if (access?.access_type === "beta" || access?.access_type === "invite") return true;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return isSubscriptionActive(data);
}

// ---------------------------------------------------------------------------
// Direct messages + group chats
// ---------------------------------------------------------------------------

export type ConversationSummary = {
  id: string;
  name: string | null;
  is_group: boolean;
  partner: ProfileRef | null;
  participants: ProfileRef[];
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
};

/** Get all conversations (1:1 + group) the user participates in. */
export async function getConversations(
  userId: string,
): Promise<ConversationSummary[]> {
  const supabase = await createClient();

  // 1. Get conversation IDs the user belongs to
  const { data: myParts } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  const convIds = (myParts ?? []).map((p) => p.conversation_id);
  if (!convIds.length) return [];

  // 2. Fetch conversation metadata
  const { data: convos } = await supabase
    .from("conversations")
    .select("id, is_group, name, last_message_at")
    .in("id", convIds)
    .order("last_message_at", { ascending: false });

  if (!convos?.length) return [];

  // 3. Fetch all participants for these conversations
  const { data: allParts } = await supabase
    .from("conversation_participants")
    .select("conversation_id, user_id")
    .in("conversation_id", convIds);

  const partsByConv = new Map<string, string[]>();
  for (const p of allParts ?? []) {
    const arr = partsByConv.get(p.conversation_id) ?? [];
    arr.push(p.user_id);
    partsByConv.set(p.conversation_id, arr);
  }

  // 4. Fetch all unique profiles (partners / participants)
  const allUserIds = new Set<string>();
  for (const ids of partsByConv.values()) {
    for (const id of ids) allUserIds.add(id);
  }
  const { data: profiles } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .in("id", [...allUserIds]);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p as ProfileRef]),
  );

  // 5. Last messages
  const { data: lastMsgs } = await supabase
    .from("messages")
    .select("conversation_id, body")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false })
    .limit(convIds.length);

  const lastMsgMap = new Map(
    (lastMsgs ?? []).map((m) => [m.conversation_id, m]),
  );

  // 6. Unread counts
  const { data: unreadRows } = await supabase
    .from("messages")
    .select("conversation_id")
    .in("conversation_id", convIds)
    .neq("sender_id", userId)
    .is("read_at", null);

  const unreadMap = new Map<string, number>();
  for (const row of unreadRows ?? []) {
    unreadMap.set(
      row.conversation_id,
      (unreadMap.get(row.conversation_id) ?? 0) + 1,
    );
  }

  // 7. Assemble
  return convos.map((c) => {
    const memberIds = partsByConv.get(c.id) ?? [];
    const participants = memberIds
      .map((id) => profileMap.get(id))
      .filter(Boolean) as ProfileRef[];

    // For 1:1: partner is the other person. For group: null (use participants).
    const partnerId = memberIds.find((id) => id !== userId);
    const lastMsg = lastMsgMap.get(c.id);

    return {
      id: c.id,
      name: c.name,
      is_group: c.is_group,
      partner: c.is_group ? null : (partnerId ? profileMap.get(partnerId) ?? null : null),
      participants,
      last_message: lastMsg?.body ?? null,
      last_message_at: c.last_message_at,
      unread_count: unreadMap.get(c.id) ?? 0,
    };
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data: myParts } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);
  const ids = (myParts ?? []).map((p) => p.conversation_id);
  if (!ids.length) return 0;
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", ids)
    .neq("sender_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

export async function getMessages(conversationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select(`*, sender:profiles(${PROFILE_FIELDS})`)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type Message = Awaited<ReturnType<typeof getMessages>>[number];

/** Get conversation metadata (name, is_group). */
export async function getConversationMeta(
  conversationId: string,
): Promise<{ name: string | null; is_group: boolean } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("name, is_group")
    .eq("id", conversationId)
    .single();
  return data ?? null;
}

/** Get all participants of a conversation. */
export async function getConversationParticipants(
  conversationId: string,
): Promise<ProfileRef[]> {
  const supabase = await createClient();
  const { data: parts } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId);

  if (!parts?.length) return [];

  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .in("id", parts.map((p) => p.user_id));

  return (data as ProfileRef[]) ?? [];
}

/**
 * For 1:1: returns the other person.
 * For group: returns the current user's own profile (or null).
 */
export async function getConversationPartner(
  conversationId: string,
  currentUserId: string,
): Promise<ProfileRef | null> {
  const supabase = await createClient();
  const { data: conv } = await supabase
    .from("conversations")
    .select("is_group")
    .eq("id", conversationId)
    .single();
  if (!conv) return null;

  if (conv.is_group) return null;

  const { data: part } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", currentUserId)
    .limit(1)
    .single();

  if (!part) return null;

  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", part.user_id)
    .single();
  return (data as ProfileRef) ?? null;
}

/** Check if a user is a participant in a conversation. */
export async function isConversationParticipant(
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("conversation_participants")
    .select("user_id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}

/** Get all other participant IDs (for block checking). */
export async function getOtherParticipantIds(
  conversationId: string,
  userId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", userId);
  return (data ?? []).map((p) => p.user_id);
}

// ---------------------------------------------------------------------------
// Admin analytics
// ---------------------------------------------------------------------------

export type DailyMetric = {
  date: string;
  count: number;
};

export type CategoryActivity = {
  category: string;
  thread_count: number;
  reply_count: number;
};

export async function getAnalytics() {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Daily active users (last 30 days)
  const { data: dauRaw } = await supabase
    .from("activity")
    .select("created_at, user_id")
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: true });

  // Daily content creation (last 30 days)
  const [{ data: posts }, { data: threads }, { data: replies }] = await Promise.all([
    supabase
      .from("feed_posts")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true }),
    supabase
      .from("threads")
      .select("created_at, category")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true }),
    supabase
      .from("thread_replies")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true }),
  ]);

  // Category breakdown
  const { data: allThreads } = await supabase
    .from("threads")
    .select("category, reply_count");

  const categoryMap = new Map<string, { thread_count: number; reply_count: number }>();
  for (const t of allThreads ?? []) {
    const existing = categoryMap.get(t.category) ?? { thread_count: 0, reply_count: 0 };
    existing.thread_count += 1;
    existing.reply_count += t.reply_count ?? 0;
    categoryMap.set(t.category, existing);
  }
  const categoryActivity: CategoryActivity[] = [...categoryMap.entries()]
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => (b.thread_count + b.reply_count) - (a.thread_count + a.reply_count));

  // DAU: unique users per day
  const dauMap = new Map<string, Set<string>>();
  for (const a of dauRaw ?? []) {
    const day = a.created_at.slice(0, 10);
    if (!dauMap.has(day)) dauMap.set(day, new Set());
    dauMap.get(day)!.add(a.user_id);
  }
  const dau: DailyMetric[] = [...dauMap.entries()]
    .map(([date, users]) => ({ date, count: users.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Posts per day
  const postsMap = new Map<string, number>();
  for (const p of posts ?? []) {
    const day = p.created_at.slice(0, 10);
    postsMap.set(day, (postsMap.get(day) ?? 0) + 1);
  }

  // Threads per day
  const threadsMap = new Map<string, number>();
  for (const t of threads ?? []) {
    const day = t.created_at.slice(0, 10);
    threadsMap.set(day, (threadsMap.get(day) ?? 0) + 1);
  }

  // Replies per day
  const repliesMap = new Map<string, number>();
  for (const r of replies ?? []) {
    const day = r.created_at.slice(0, 10);
    repliesMap.set(day, (repliesMap.get(day) ?? 0) + 1);
  }

  // Merge all dates
  const allDates = new Set([
    ...dauMap.keys(),
    ...postsMap.keys(),
    ...threadsMap.keys(),
    ...repliesMap.keys(),
  ]);
  const sortedDates = [...allDates].sort();

  const engagement: DailyMetric[] = sortedDates.map((date) => ({
    date,
    count: (postsMap.get(date) ?? 0) + (threadsMap.get(date) ?? 0) + (repliesMap.get(date) ?? 0),
  }));

  // New members per day
  const { data: profiles } = await supabase
    .from("profiles")
    .select("created_at")
    .gte("created_at", thirtyDaysAgo);

  const membersMap = new Map<string, number>();
  for (const p of profiles ?? []) {
    const day = p.created_at.slice(0, 10);
    membersMap.set(day, (membersMap.get(day) ?? 0) + 1);
  }
  const newMembers: DailyMetric[] = sortedDates.map((date) => ({
    date,
    count: membersMap.get(date) ?? 0,
  }));

  // Retention: members who posted in the last 7 days / total members
  const { count: totalMembers } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const activeLast7Days = new Set(
    (dauRaw ?? [])
      .filter((a) => new Date(a.created_at).getTime() >= new Date(sevenDaysAgo).getTime())
      .map((a) => a.user_id),
  );

  const retentionRate = totalMembers
    ? Math.round((activeLast7Days.size / totalMembers) * 100)
    : 0;

  return {
    dau,
    engagement,
    categoryActivity,
    newMembers,
    retentionRate,
    totalMembers: totalMembers ?? 0,
    activeThisWeek: activeLast7Days.size,
  };
}

export type Category = {
  id: string;
  label: string;
  description: string;
  sort_order: number;
  required_tag_id: string | null;
};

/** Fetch categories from DB, falling back to hardcoded config. */
export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, label, description, sort_order, required_tag_id")
    .order("sort_order", { ascending: true });

  if (data?.length) return data;

  // Fallback to hardcoded config if table doesn't exist yet
  return CATEGORIES.map((c, i) => ({
    id: c.id,
    label: c.label,
    description: "",
    sort_order: i,
    required_tag_id: null,
  }));
}

/** Get a single category by ID. */
export async function getCategory(id: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, label, description, sort_order, required_tag_id")
    .eq("id", id)
    .single();

  if (data) return data;

  // Fallback to config
  const fallback = CATEGORIES.find((c) => c.id === id);
  if (fallback) {
    return { id: fallback.id, label: fallback.label, description: "", sort_order: 0, required_tag_id: null };
  }
  return null;
}

/** Get category label by ID (for rendering). */
export async function getCategoryLabel(id: string): Promise<string> {
  const cat = await getCategory(id);
  return cat?.label ?? id;
}

// ── Events ────────────────────────────────────────────────────────────────────

export type EventSummary = {
  id: string;
  title: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string | null;
  cover_url: string | null;
  created_by: string;
  created_at: string;
  signup_count: number;
  signed_up_by_me: boolean;
  recurring_frequency: string | null;
  recurring_group_id: string | null;
  special_guest: string | null;
  special_guest_url: string | null;
  event_link: string | null;
  required_tag_id: string | null;
  creator: ProfileRef | null;
};

export type EventDetail = EventSummary & {
  updates: EventUpdate[];
  group_events: { id: string; title: string; starts_at: string }[];
};

export type EventUpdate = {
  id: string;
  event_id: string;
  created_by: string;
  body: string;
  created_at: string;
  author: ProfileRef | null;
};

export async function getEvents(userId: string): Promise<EventSummary[]> {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: true });

  if (!events?.length) return [];

  const eventIds = events.map((e) => e.id);
  const creatorIds = [...new Set(events.map((e) => e.created_by))];

  const [{ data: signups }, { data: creators }] = await Promise.all([
    supabase
      .from("event_signups")
      .select("event_id, user_id")
      .in("event_id", eventIds),
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", creatorIds),
  ]);

  const signupCounts = new Map<string, number>();
  const mySignups = new Set<string>();
  for (const s of signups ?? []) {
    signupCounts.set(s.event_id, (signupCounts.get(s.event_id) ?? 0) + 1);
    if (s.user_id === userId) mySignups.add(s.event_id);
  }

  const creatorMap = new Map<string, ProfileRef>();
  for (const p of creators ?? []) creatorMap.set(p.id, p as ProfileRef);

  return events.map((e) => ({
    ...e,
    signup_count: signupCounts.get(e.id) ?? 0,
    signed_up_by_me: mySignups.has(e.id),
    creator: creatorMap.get(e.created_by) ?? null,
  }));
}

export async function getEvent(
  eventId: string,
  userId: string,
): Promise<EventDetail | null> {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) return null;

  const [{ data: signups }, { data: updates }, { data: creator }] =
    await Promise.all([
      supabase
        .from("event_signups")
        .select("user_id")
        .eq("event_id", eventId),
      supabase
        .from("event_updates")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", event.created_by)
        .single(),
    ]);

  const signedUpByMe = signups?.some((s) => s.user_id === userId) ?? false;

  // Fetch author profiles for updates
  const updateAuthorIds = [...new Set(updates?.map((u) => u.created_by) ?? [])];
  const { data: authorProfiles } = updateAuthorIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", updateAuthorIds)
    : { data: [] };

  const authorMap = new Map<string, ProfileRef>();
  for (const p of authorProfiles ?? []) authorMap.set(p.id, p as ProfileRef);

  // Fetch sibling events in the same recurring group (excluding this one)
  let groupEvents: { id: string; title: string; starts_at: string }[] = [];
  if (event.recurring_group_id) {
    const { data: siblings } = await supabase
      .from("events")
      .select("id, title, starts_at")
      .eq("recurring_group_id", event.recurring_group_id)
      .neq("id", eventId)
      .order("starts_at", { ascending: true });
    groupEvents = siblings ?? [];
  }

  return {
    ...event,
    signup_count: signups?.length ?? 0,
    signed_up_by_me: signedUpByMe,
    creator: creator as ProfileRef | null,
    updates: (updates ?? []).map((u) => ({
      ...u,
      author: authorMap.get(u.created_by) ?? null,
    })),
    group_events: groupEvents,
  };
}

// ── Tag access helpers ────────────────────────────────────────────────────────

/** Get all tag IDs assigned to a user. */
export async function getUserTagIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_tags")
    .select("tag_id")
    .eq("profile_id", userId);
  return new Set(data?.map((r) => r.tag_id) ?? []);
}

/** Check if a user has access to a tag-gated resource. Returns true if no tag is required or user has the tag. */
export function hasTagAccess(
  requiredTagId: string | null,
  userTagIds: Set<string>,
): boolean {
  return !requiredTagId || userTagIds.has(requiredTagId);
}

/** Get all tags (for admin dropdowns). */
export async function getAllTags(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tags")
    .select("id, name")
    .order("name", { ascending: true });
  return data ?? [];
}

/** Get public tags assigned to a specific user. */
export async function getPublicTagsForUser(profileId: string): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_tags")
    .select("tag:tags!profile_tags_tag_id_fkey(id, name, visibility)")
    .eq("profile_id", profileId);
  if (!data) return [];
  return (data ?? [])
    .map((row) => (row as unknown as { tag: { id: string; name: string; visibility: string } }).tag)
    .filter((tag) => tag && tag.visibility === "public")
    .map((tag) => ({ id: tag.id, name: tag.name }));
}

// ── User profile feeds ──────────────────────────────────────────────────────

export async function getUserFeedPosts(
  userId: string,
  currentUserId: string,
  limit = 20,
): Promise<FeedPost[]> {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("feed_posts")
    .select(`*, author:profiles(${PROFILE_FIELDS})`)
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!posts?.length) return [];

  const postIds = posts.map((p) => p.id);

  const [{ data: comments }, { data: likes }] = await Promise.all([
    supabase
      .from("feed_comments")
      .select(`*, author:profiles(${PROFILE_FIELDS})`)
      .in("feed_post_id", postIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("likes")
      .select("id, target_id, user_id")
      .in("target_id", postIds)
      .eq("target_type", "feed_post"),
  ]);

  const commentsByPost = new Map<string, FeedComment[]>();
  for (const c of comments ?? []) {
    const list = commentsByPost.get(c.feed_post_id) ?? [];
    list.push(c as FeedComment);
    commentsByPost.set(c.feed_post_id, list);
  }

  const likeByPost = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of likes ?? []) {
    likeByPost.set(l.target_id, (likeByPost.get(l.target_id) ?? 0) + 1);
    if (l.user_id === currentUserId) likedByMe.add(l.target_id);
  }

  return posts.map((p) => ({
    ...(p as object),
    author: p.author as ProfileRef | null,
    comment_count: commentsByPost.get(p.id)?.length ?? 0,
    like_count: likeByPost.get(p.id) ?? 0,
    liked_by_me: likedByMe.has(p.id),
    comments: commentsByPost.get(p.id) ?? [],
  })) as unknown as FeedPost[];
}

export async function getUserThreads(
  userId: string,
  limit = 20,
): Promise<ThreadWithAuthor[]> {
  const supabase = await createClient();

  const { data: threads } = await supabase
    .from("threads")
    .select("*")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!threads?.length) return [];

  const { data: author } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", userId)
    .single();

  return threads.map((t) => ({
    ...t,
    author: (author as ProfileRef) ?? null,
  })) as unknown as ThreadWithAuthor[];
}

// ── Activity heat map ──────────────────────────────────────────────────────

export type HeatmapDay = { date: string; count: number };

export async function getActivityHeatmap(userId: string): Promise<HeatmapDay[]> {
  const supabase = await createClient();
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const { data, error } = await supabase
    .from("activity")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", yearAgo.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const date = row.created_at.slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  const days: HeatmapDay[] = [];
  const d = new Date(yearAgo);
  const today = new Date();
  while (d <= today) {
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: counts.get(key) ?? 0 });
    d.setDate(d.getDate() + 1);
  }
  return days;
}
