"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFeedThreads, type FeedThread } from "@/lib/queries";
import { safeDbError } from "@/lib/sanitize";

export type FeedActionState = { error?: string };

const EDIT_WINDOW_MS = 5 * 60 * 1000;

async function requireAuthorOrModerator(table: string, id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from(table)
    .select("author_id, created_at")
    .eq("id", id)
    .single();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "user";
  if (!row) return null;
  if (row.author_id !== user.id && role !== "admin" && role !== "moderator") return null;
  return { supabase, user, row, isAdmin: role === "admin" || role === "moderator" };
}

export async function editPost(id: string, body: string) {
  const ctx = await requireAuthorOrModerator("feed_posts", id);
  if (!ctx) return { error: "Not allowed." };

  if (!ctx.isAdmin && Date.now() - new Date(ctx.row.created_at).getTime() > EDIT_WINDOW_MS) {
    return { error: "Edit window expired (5 minutes)." };
  }

  if (!body.trim()) return { error: "Cannot be empty." };

  const { error } = await ctx.supabase
    .from("feed_posts")
    .update({ body: body.trim() })
    .eq("id", id);
  if (error) return { error: safeDbError(error) };

  revalidatePath("/feed");
  return {};
}

export async function editComment(id: string, body: string) {
  const ctx = await requireAuthorOrModerator("feed_comments", id);
  if (!ctx) return { error: "Not allowed." };

  if (!ctx.isAdmin && Date.now() - new Date(ctx.row.created_at).getTime() > EDIT_WINDOW_MS) {
    return { error: "Edit window expired (5 minutes)." };
  }

  if (!body.trim()) return { error: "Cannot be empty." };

  const { error } = await ctx.supabase
    .from("feed_comments")
    .update({ body: body.trim() })
    .eq("id", id);
  if (error) return { error: safeDbError(error) };

  revalidatePath("/feed");
  return {};
}

export async function createPost(
  _prev: FeedActionState,
  formData: FormData,
): Promise<FeedActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const body = String(formData.get("body") ?? "").trim();
  const mediaUrl = String(formData.get("media_url") ?? "").trim() || null;
  const videoUrl = String(formData.get("video_url") ?? "").trim() || null;

  if (!body) return { error: "Write something first." };

  const { error } = await supabase.from("feed_posts").insert({
    author_id: user.id,
    body,
    media_url: mediaUrl,
    video_url: videoUrl,
  });
  if (error) return { error: safeDbError(error) };

  // Create @mention notifications
  const { extractMentions, notifyMentionedUsers } = await import("@/lib/notifications");
  const mentions = extractMentions(body);
  if (mentions.length) {
    const { data: newPost } = await supabase
      .from("feed_posts")
      .select("id")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (newPost) {
      await notifyMentionedUsers({
        supabase,
        mentionedUsernames: mentions,
        actorId: user.id,
        targetType: "feed_post",
        targetId: newPost.id,
        message: `Mentioned you in a post: ${body.slice(0, 120)}`,
      });
    }
  }

  revalidatePath("/feed");
  return {};
}

export async function deletePost(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: post } = await supabase
    .from("feed_posts")
    .select("author_id")
    .eq("id", id)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "user";
  if (!post || (post.author_id !== user.id && role !== "admin" && role !== "moderator")) {
    redirect("/feed");
  }

  await supabase.from("feed_posts").delete().eq("id", id);
  revalidatePath("/feed");
}

export async function createComment(
  _prev: FeedActionState,
  formData: FormData,
): Promise<FeedActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const postId = String(formData.get("post_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write something first." };

  const { error } = await supabase.from("feed_comments").insert({
    feed_post_id: postId,
    author_id: user.id,
    body,
  });
  if (error) return { error: safeDbError(error) };

  // Create @mention notifications
  const { extractMentions, notifyMentionedUsers } = await import("@/lib/notifications");
  const mentions = extractMentions(body);
  if (mentions.length) {
    await notifyMentionedUsers({
      supabase,
      mentionedUsernames: mentions,
      actorId: user.id,
      targetType: "feed_comment",
      targetId: postId,
      message: `Mentioned you in a comment: ${body.slice(0, 120)}`,
    });
  }

  revalidatePath("/feed");
  return {};
}

export async function loadMoreFeedThreads(
  cursor: string,
): Promise<{ threads: FeedThread[]; hasMore: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { threads: [], hasMore: false };

  const threads = await getFeedThreads(user.id, 20, cursor);

  return {
    threads,
    hasMore: threads.length === 20,
  };
}
