"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.rpc("mark_notifications_read");
  revalidatePath("/notifications");
}

export async function toggleThreadSubscription(threadId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("thread_subscriptions")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("thread_id", threadId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("thread_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("thread_id", threadId);
  } else {
    await supabase.from("thread_subscriptions").insert({
      user_id: user.id,
      thread_id: threadId,
    });
  }

  revalidatePath(`/thread/${threadId}`);
}

export async function toggleBlock(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("user_blocks")
    .select("blocker_id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", userId);
  } else {
    await supabase.from("user_blocks").insert({
      blocker_id: user.id,
      blocked_id: userId,
    });
  }

  revalidatePath("/feed");
}
