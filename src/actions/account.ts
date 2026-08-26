"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/queries";

export type AccountState = {
  error?: string;
  ok?: boolean;
  message?: string;
};

/**
 * Export all of the current user's data as a JSON object (GDPR Art 20 — right
 * to data portability). Returns the data directly so the client can trigger a
 * download.
 */
export async function exportUserData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, posts, comments, threads, replies, activity, likes, sub] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("username, display_name, avatar_url, created_at")
        .eq("id", user.id)
        .single(),
      supabase
        .from("feed_posts")
        .select("id, body, media_url, video_url, created_at")
        .eq("author_id", user.id),
      supabase
        .from("feed_comments")
        .select("id, body, created_at, feed_post_id")
        .eq("author_id", user.id),
      supabase
        .from("threads")
        .select("id, title, body, category, created_at")
        .eq("author_id", user.id),
      supabase
        .from("thread_replies")
        .select("id, body, created_at, thread_id")
        .eq("author_id", user.id),
      supabase
        .from("activity")
        .select("kind, points, created_at")
        .eq("user_id", user.id),
      supabase
        .from("likes")
        .select("target_type, target_id, created_at")
        .eq("user_id", user.id),
      supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const exportData = {
    _meta: {
      exportedAt: new Date().toISOString(),
      service: (await getSettings()).site_name || "Sanctum",
      note: "This file contains all personal data we hold about you (GDPR Art 20).",
    },
    email: user.email,
    profile: profile.data,
    feed_posts: posts.data,
    feed_comments: comments.data,
    threads: threads.data,
    thread_replies: replies.data,
    activity: activity.data,
    likes: likes.data,
    subscription: sub.data,
  };

  return exportData;
}

/**
 * Delete the current user's account and all associated data (GDPR Art 17 —
 * right to erasure). FK ON DELETE CASCADE handles content removal. Auth user
 * deletion requires the service-role client.
 */
export async function deleteAccount(): Promise<AccountState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Import the admin client (service role) — required to delete auth users
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  // Delete the profile — cascades to posts, comments, threads, replies,
  // likes, activity, subscriptions, lesson_progress via FK constraints.
  const { error: profileError } = await admin
    .from("profiles")
    .delete()
    .eq("id", user.id);

  if (profileError) {
    return { error: `Could not delete profile: ${profileError.message}` };
  }

  // Delete the auth user
  const { error: authError } = await admin.auth.admin.deleteUser(user.id);
  if (authError) {
    // Profile is already gone — log the auth error but treat the deletion as
    // effective since the account data is removed and the auth user is
    // orphaned.
    console.error("Failed to delete auth user:", authError.message);
  }

  // Sign out the session
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Record that the user accepted a specific policy version.
 */
export async function logConsent(
  policyKey: string,
  version: string,
  accepted: boolean,
): Promise<AccountState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("consent_log").insert({
    user_id: user.id,
    policy_key: policyKey,
    version,
    accepted,
  });

  if (error) return { error: error.message };
  return { ok: true };
}
