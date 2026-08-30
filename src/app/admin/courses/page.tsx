import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CourseForm } from "@/components/admin/course-form";
import { CourseOrderButtons } from "@/components/admin/course-order-buttons";

export const metadata = { title: "Courses" };

export default async function AdminCoursesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, description, published, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500">
        Create and manage courses and their lessons. Every course is open to
        all members by default.
      </p>

      <div className="space-y-2">
        {courses?.map((course, i) => (
          <div
            key={course.id}
            className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <CourseOrderButtons
                courseId={course.id}
                isFirst={i === 0}
                isLast={i === (courses?.length ?? 0) - 1}
              />
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
                </div>
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

      <CourseForm />
    </div>
  );
}