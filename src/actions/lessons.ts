"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function completeLesson(lessonId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lesson } = await supabase
    .from("lessons")
    .select("course_id")
    .eq("id", lessonId)
    .single();
  if (!lesson) redirect("/courses");

  const { error } = await supabase.rpc("complete_lesson", {
    p_lesson_id: lessonId,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/lesson/${lessonId}`);
  revalidatePath(`/course/${lesson.course_id}`);
}
