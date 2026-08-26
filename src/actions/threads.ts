"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ThreadActionState = { error?: string };

const EDIT_WINDOW_MS = 5 * 60 * 1000;

async function getRoleForUser(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return profile?.role ?? "user";
}

export async function editThread(id: string, body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: thread } = await supabase
    .from("threads")
    .select("author_id, created_at")
    .eq("id", id)
    .single();
  const role = await getRoleForUser(user.id);

  if (!thread) return { error: "Thread not found." };
  if (thread.author_id !== user.id && role !== "admin" && role !== "moderator") return { error: "Not allowed." };

  if (role === "user" && Date.now() - new Date(thread.created_at).getTime() > EDIT_WINDOW_MS) {
    return { error: "Edit window expired (5 minutes)." };
  }

  if (!body.trim()) return { error: "Cannot be empty." };

  const { error } = await supabase
    .from("threads")
    .update({ body: body.trim() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/thread/${id}`);
  return {};
}

export async function editReply(id: string, body: string, threadId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reply } = await supabase
    .from("thread_replies")
    .select("author_id, created_at")
    .eq("id", id)
    .single();
  const role = await getRoleForUser(user.id);

  if (!reply) return { error: "Reply not found." };
  if (reply.author_id !== user.id && role !== "admin" && role !== "moderator") return { error: "Not allowed." };

  if (role === "user" && Date.now() - new Date(reply.created_at).getTime() > EDIT_WINDOW_MS) {
    return { error: "Edit window expired (5 minutes)." };
  }

  if (!body.trim()) return { error: "Cannot be empty." };

  const { error } = await supabase
    .from("thread_replies")
    .update({ body: body.trim() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/thread/${threadId}`);
  return {};
}

export async function createThread(
  _prev: ThreadActionState,
  formData: FormData,
): Promise<ThreadActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const category = String(formData.get("category") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const mediaUrl = String(formData.get("media_url") ?? "").trim() || null;
  const videoUrl = String(formData.get("video_url") ?? "").trim() || null;

  if (!category)
    return { error: "Pick a category." };
  const { data: catExists } = await supabase
    .from("categories")
    .select("id")
    .eq("id", category)
    .maybeSingle();
  if (!catExists) return { error: "Pick a valid category." };
  if (title.length < 3) return { error: "Title must be at least 3 characters." };
  if (!body) return { error: "Write something first." };

  const { data, error } = await supabase
    .from("threads")
    .insert({ author_id: user.id, category, title, body, media_url: mediaUrl, video_url: videoUrl })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // Auto-subscribe thread author to their own thread
  try {
    await supabase.from("thread_subscriptions").insert({
      user_id: user.id,
      thread_id: data.id,
    });
  } catch { /* best effort */ }

  // Create @mention notifications
  const { extractMentions, notifyMentionedUsers } = await import("@/lib/notifications");
  const mentions = extractMentions(body);
  if (mentions.length) {
    await notifyMentionedUsers({
      supabase,
      mentionedUsernames: mentions,
      actorId: user.id,
      targetType: "thread",
      targetId: data.id,
      message: `Mentioned you in "${title}": ${body.slice(0, 120)}`,
    });
  }

  revalidatePath(`/board/${category}`);
  redirect(`/thread/${data.id}`);
}

export async function createReply(
  _prev: ThreadActionState,
  formData: FormData,
): Promise<ThreadActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const threadId = String(formData.get("thread_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const mediaUrl = String(formData.get("media_url") ?? "").trim() || null;
  const videoUrl = String(formData.get("video_url") ?? "").trim() || null;
  const parentReplyId = String(formData.get("parent_reply_id") ?? "").trim() || null;
  if (!body) return { error: "Write something first." };

  const { error } = await supabase.from("thread_replies").insert({
    thread_id: threadId,
    author_id: user.id,
    body,
    media_url: mediaUrl,
    video_url: videoUrl,
    parent_reply_id: parentReplyId,
  });
  if (error) return { error: error.message };

  // Auto-subscribe replier to the thread
  try {
    await supabase.from("thread_subscriptions").insert({
      user_id: user.id,
      thread_id: threadId,
    });
  } catch { /* best effort */ }

  // Notify subscribers + @mentions
  const { extractMentions, notifyThreadSubscribers, notifyMentionedUsers } = await import("@/lib/notifications");
  const { data: thread } = await supabase
    .from("threads")
    .select("title")
    .eq("id", threadId)
    .single();

  if (thread) {
    await notifyThreadSubscribers({
      supabase,
      threadId,
      actorId: user.id,
      threadTitle: thread.title,
      replyPreview: body,
    });
  }

  const mentions = extractMentions(body);
  if (mentions.length) {
    await notifyMentionedUsers({
      supabase,
      mentionedUsernames: mentions,
      actorId: user.id,
      targetType: "thread_reply",
      targetId: threadId,
      message: `Mentioned you in "${thread?.title ?? "a thread"}": ${body.slice(0, 120)}`,
    });
  }

  revalidatePath(`/thread/${threadId}`);
  return {};
}

export async function deleteThread(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: thread } = await supabase
    .from("threads")
    .select("author_id, category")
    .eq("id", id)
    .single();
  const role = await getRoleForUser(user.id);

  if (!thread || (thread.author_id !== user.id && role !== "admin" && role !== "moderator")) {
    redirect(`/thread/${id}`);
  }

  await supabase.from("threads").delete().eq("id", id);
  redirect(`/board/${thread.category}`);
}

export async function deleteReply(id: string, threadId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reply } = await supabase
    .from("thread_replies")
    .select("author_id")
    .eq("id", id)
    .single();
  const role = await getRoleForUser(user.id);

  if (!reply || (reply.author_id !== user.id && role !== "admin" && role !== "moderator")) {
    redirect(`/thread/${threadId}`);
  }

  await supabase.from("thread_replies").delete().eq("id", id);
  revalidatePath(`/thread/${threadId}`);
}

export async function togglePin(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await getRoleForUser(user.id);
  if (role !== "admin" && role !== "moderator") redirect("/board");

  const { data: thread } = await supabase
    .from("threads")
    .select("id, pinned, category")
    .eq("id", id)
    .single();
  if (!thread) redirect("/board");

  await supabase
    .from("threads")
    .update({ pinned: !thread.pinned })
    .eq("id", id);
  revalidatePath(`/board/${thread.category}`);
  revalidatePath(`/thread/${id}`);
}
