import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRef } from "@/lib/queries";

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type Notification = {
  id: string;
  actor: ProfileRef | null;
  type: string;
  target_type: string;
  target_id: string | null;
  message: string | null;
  read_at: string | null;
  created_at: string;
};

export async function getNotifications(userId: string, limit = 30): Promise<Notification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, target_type, target_id, message, read_at, created_at, actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Notification[];
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Mentions — extract @username from text and resolve to user IDs
// ---------------------------------------------------------------------------

const MENTION_RE = /@([a-z0-9_]{3,20})/g;

export function extractMentions(text: string): string[] {
  const matches = text.matchAll(MENTION_RE);
  const usernames = new Set<string>();
  for (const m of matches) usernames.add(m[1].toLowerCase());
  return [...usernames];
}

export async function resolveMentions(
  supabase: SupabaseClient,
  usernames: string[],
): Promise<Map<string, ProfileRef>> {
  if (!usernames.length) return new Map();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("username", usernames);
  const map = new Map<string, ProfileRef>();
  for (const p of data ?? []) map.set(p.username, p as ProfileRef);
  return map;
}

// ---------------------------------------------------------------------------
// Create notification helpers
// ---------------------------------------------------------------------------

export async function createNotification(opts: {
  supabase: SupabaseClient;
  userId: string;
  actorId: string;
  type: string;
  targetType: string;
  targetId?: string;
  message?: string;
}) {
  // Don't notify yourself
  if (opts.userId === opts.actorId) return;

  // Check if blocked
  const { data: block } = await opts.supabase
    .from("user_blocks")
    .select("blocker_id")
    .or(`and(blocker_id.eq.${opts.userId},blocked_id.eq.${opts.actorId}),and(blocker_id.eq.${opts.actorId},blocked_id.eq.${opts.userId})`)
    .maybeSingle();
  if (block) return;

  await opts.supabase.from("notifications").insert({
    user_id: opts.userId,
    actor_id: opts.actorId,
    type: opts.type,
    target_type: opts.targetType,
    target_id: opts.targetId ?? null,
    message: opts.message ?? null,
  });
}

/** Notify thread subscribers (excluding the actor) about a new reply. */
export async function notifyThreadSubscribers(opts: {
  supabase: SupabaseClient;
  threadId: string;
  actorId: string;
  threadTitle: string;
  replyPreview: string;
}) {
  const { data: subscribers } = await opts.supabase
    .from("thread_subscriptions")
    .select("user_id")
    .eq("thread_id", opts.threadId);

  for (const sub of subscribers ?? []) {
    await createNotification({
      supabase: opts.supabase,
      userId: sub.user_id,
      actorId: opts.actorId,
      type: "reply",
      targetType: "thread",
      targetId: opts.threadId,
      message: `Replied in "${opts.threadTitle}": ${opts.replyPreview.slice(0, 120)}`,
    });
  }
}

/** Notify mentioned users. */
export async function notifyMentionedUsers(opts: {
  supabase: SupabaseClient;
  mentionedUsernames: string[];
  actorId: string;
  targetType: string;
  targetId: string;
  message: string;
}) {
  const mentionMap = await resolveMentions(opts.supabase, opts.mentionedUsernames);
  for (const [, profile] of mentionMap) {
    await createNotification({
      supabase: opts.supabase,
      userId: profile.id,
      actorId: opts.actorId,
      type: "mention",
      targetType: opts.targetType,
      targetId: opts.targetId,
      message: opts.message,
    });
  }
}

// ---------------------------------------------------------------------------
// Blocking helpers
// ---------------------------------------------------------------------------

export async function getBlockedIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", userId);
  return new Set((data ?? []).map((r) => r.blocked_id));
}

export async function isBlockedBy(blockerId: string, blockedId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_blocks")
    .select("blocker_id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId)
    .maybeSingle();
  return !!data;
}
