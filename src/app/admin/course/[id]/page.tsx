import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CourseForm } from "@/components/admin/course-form";
import { LessonForm } from "@/components/admin/lesson-form";
import { DeleteButton } from "@/components/delete-button";
import { TutorCompletionManager, type RecordedMember } from "@/components/admin/tutor-completion-manager";
import { getTutorCompletionsForCourse } from "@/lib/queries";
import { deleteCourse, deleteLesson } from "@/actions/admin";

export const metadata = { title: "Manage course" };

export default async function AdminCoursePage({
  params,
}: PageProps<"/admin/course/[id]">) {
  const { id } = await params;
  await requireAdmin();
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, description, published")
    .eq("id", id)
    .single();
  if (!course) notFound();

  const { data: lessons } = await supabase
    .from("lessons")
    .select(
      "id, course_id, title, description, video_url, order_index, published",
    )
    .eq("course_id", id)
    .order("order_index", { ascending: true });

  const [{ data: completionRows }, { data: allProfiles }] = await Promise.all([
    getTutorCompletionsForCourse(id).then((rows) => ({
      data: rows,
      error: null,
    })),
    supabase
      .from("profiles")
      .select("id, username, display_name")
      .order("display_name", { ascending: true }),
  ]);

  const recorded = (completionRows ?? []).map((r) => ({
    id: r.profile!.id,
    username: r.profile!.username,
    display_name: r.profile!.display_name,
    completionId: r.id,
    note: r.note,
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/admin/courses"
        className="text-xs font-medium text-stone-400 hover:text-stone-600 dark:text-stone-400 dark:hover:text-stone-300"
      >
        ← All courses
      </Link>

      <CourseForm initial={course} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Lessons</h2>
          <DeleteButton
            action={deleteCourse.bind(null, course.id)}
            confirmText="Delete this course and all its lessons?"
          />
        </div>

        <div className="space-y-2">
          {lessons?.map((lesson) => (
            <div
              key={lesson.id}
              className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
            >
              <Link
                href={`/admin/lesson/${lesson.id}`}
                className="flex min-w-0 items-center gap-3"
              >
                <span className="w-6 text-center text-xs text-stone-400">
                  {lesson.order_index}
                </span>
                <span className="truncate text-sm font-medium hover:text-[var(--primary)]">
                  {lesson.title}
                </span>
                {!lesson.published && (
                  <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                    Draft
                  </span>
                )}
              </Link>
              <DeleteButton
                action={deleteLesson.bind(null, lesson.id, course.id)}
              />
            </div>
          ))}
          {!lessons?.length && (
            <p className="text-sm text-stone-400">
              No lessons yet — add the first one below.
            </p>
          )}
        </div>
      </div>

      <TutorCompletionManager
        courseId={course.id}
        recorded={recorded as RecordedMember[]}
        members={(allProfiles ?? []).map((p) => ({
          id: p.id,
          username: p.username,
          display_name: p.display_name,
        }))}
      />

      <div>
        <h2 className="mb-2 font-semibold">Add a lesson</h2>
        <LessonForm courseId={course.id} />
      </div>
    </div>
  );
}