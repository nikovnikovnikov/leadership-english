import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LessonForm } from "@/components/admin/lesson-form";

export const metadata = { title: "Edit lesson" };

export default async function AdminLessonPage({
  params,
}: PageProps<"/admin/lesson/[id]">) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      "id, course_id, title, description, video_url, order_index, required_points, published, notion_page_id",
    )
    .eq("id", id)
    .single();
  if (!lesson) notFound();

  return (
    <div className="max-w-lg space-y-4">
      <Link
        href={`/admin/course/${lesson.course_id}`}
        className="text-xs font-medium text-stone-400 hover:text-stone-600 dark:text-stone-400 dark:hover:text-stone-300"
      >
        ← Back to course
      </Link>
      <h1 className="text-xl font-semibold">Edit lesson</h1>
      <LessonForm courseId={lesson.course_id} initial={lesson} />
    </div>
  );
}
