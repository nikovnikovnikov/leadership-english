"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeDbError } from "@/lib/sanitize";

export type LessonCommentActionState = { error?: string };

export async function createLessonComment(
  _prev: LessonCommentActionState,
  formData: FormData,
): Promise<LessonCommentActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const lessonId = String(formData.get("lesson_id") ?? "");
  const parentId = String(formData.get("parent_id") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim();

  if (!body) return { error: "Write something first." };
  if (body.length > 2000) return { error: "Keep it under 2000 characters." };

  const { error } = await supabase.from("lesson_comments").insert({
    lesson_id: lessonId,
    author_id: user.id,
    parent_id: parentId,
    body,
  });
  if (error) return { error: safeDbError(error) };

  revalidatePath(`/lesson/${lessonId}`);
  return {};
}

export async function deleteLessonComment(commentId: string, lessonId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: comment } = await supabase
    .from("lesson_comments")
    .select("author_id")
    .eq("id", commentId)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "user";
  if (!comment || (comment.author_id !== user.id && role !== "admin" && role !== "moderator")) {
    redirect(`/lesson/${lessonId}`);
  }

  await supabase.from("lesson_comments").delete().eq("id", commentId);
  revalidatePath(`/lesson/${lessonId}`);
}