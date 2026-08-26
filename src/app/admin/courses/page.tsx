import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAllTags } from "@/lib/queries";
import { CourseForm } from "@/components/admin/course-form";

export const metadata = { title: "Courses" };

export default async function AdminCoursesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const tags = await getAllTags();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, description, published, required_tag_id")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500">
        Create and manage courses and their lessons. Use &ldquo;Access restriction&rdquo; to gate a course behind a user tag.
      </p>

      <div className="space-y-2">
        {courses?.map((course) => (
          <div
            key={course.id}
            className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div>
              <Link
                href={`/admin/course/${course.id}`}
                className="font-semibold hover:text-[var(--primary)]"
              >
                {course.title}
              </Link>
              <div className="flex items-center gap-2">
                <p className="text-xs text-stone-400">
                  {course.published ? "Published" : "Draft"}
                </p>
                {course.required_tag_id && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                    Gated
                  </span>
                )}
              </div>
            </div>
            <Link
              href={`/admin/course/${course.id}`}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              Manage
            </Link>
          </div>
        ))}
        {!courses?.length && (
          <p className="text-sm text-stone-400">No courses yet.</p>
        )}
      </div>

      <CourseForm tags={tags} />
    </div>
  );
}
