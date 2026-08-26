"use server";

import { createClient } from "@/lib/supabase/server";

/** Update the current user's last_seen_at. Called from middleware or page loads. */
export async function updateLastSeen() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", user.id);
}

/** Mark the user as typing in a conversation (expires after 5s). */
export async function setTyping(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("typing_indicators").upsert(
    {
      conversation_id: conversationId,
      user_id: user.id,
      typed_at: new Date().toISOString(),
    },
    { onConflict: "conversation_id,user_id" },
  );
}

/** Get who is currently typing in a conversation (typed within last 5 seconds). */
export async function getTypingUsers(
  conversationId: string,
  currentUserId: string,
): Promise<{ id: string; username: string; display_name: string | null }[]> {
  const supabase = await createClient();
  const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();

  const { data } = await supabase
    .from("typing_indicators")
    .select("user_id, profiles!typing_indicators_user_id_fkey(id, username, display_name)")
    .eq("conversation_id", conversationId)
    .neq("user_id", currentUserId)
    .gte("typed_at", fiveSecondsAgo);

  if (!data) return [];

  return (data as unknown as { profiles: { id: string; username: string; display_name: string | null } | null }[])
    .map((r) => r.profiles)
    .filter(Boolean) as { id: string; username: string; display_name: string | null }[];
}

/** Get online status for a list of user IDs. */
export async function getOnlineStatuses(
  userIds: string[],
): Promise<Map<string, boolean>> {
  if (!userIds.length) return new Map();
  const supabase = await createClient();
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("profiles")
    .select("id, last_seen_at")
    .in("id", userIds);

  const map = new Map<string, boolean>();
  for (const p of data ?? []) {
    map.set(
      p.id,
      p.last_seen_at ? new Date(p.last_seen_at).getTime() > new Date(twoMinutesAgo).getTime() : false,
    );
  }
  return map;
}
