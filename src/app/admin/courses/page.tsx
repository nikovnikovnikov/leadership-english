import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CourseForm } from "@/components/admin/course-form";
import { AdminCourseOrderList } from "./course-order-list";

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
        Create and manage courses and their lessons. Drag a course to change
        the order it appears in.
      </p>

      {courses?.length ? (
        <AdminCourseOrderList courses={courses} />
      ) : (
        <p className="text-sm text-stone-400">No courses yet.</p>
      )}

      <CourseForm />
    </div>
  );
}