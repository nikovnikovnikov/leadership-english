import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCourses, getUserTagIds, hasTagAccess, getAllTags } from "@/lib/queries";

export const metadata = { title: "Courses" };

export default async function CoursesPage() {
  const profile = await requireUser();
  const [courses, userTagIds] = await Promise.all([
    getCourses(),
    getUserTagIds(profile.id),
  ]);

  // Fetch tag names for locked courses
  const requiredTagIds = [...new Set(courses.map((c) => c.required_tag_id).filter(Boolean))] as string[];
  const allTags = requiredTagIds.length ? await getAllTags() : [];
  const tagMap = new Map(allTags.map((t) => [t.id, t.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Lessons unlock with points earned from being part of the community —
          or with a subscription.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No courses published yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => {
            const locked = !hasTagAccess(course.required_tag_id, userTagIds);

            return (
              <Link
                key={course.id}
                href={locked ? "#" : `/course/${course.id}`}
                className={`group rounded-2xl border p-5 shadow-sm transition ${
                  locked
                    ? "border-stone-200 bg-stone-50 opacity-60 dark:border-stone-800 dark:bg-stone-900/50"
                    : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 hover:border-[var(--primary)] hover:shadow"
                }`}
              >
                <div className="flex items-start justify-between">
                  <h2 className={`text-lg font-semibold ${locked ? "text-stone-400 dark:text-stone-500" : "text-stone-800 dark:text-stone-100 group-hover:text-[var(--primary)] dark:group-hover:brightness-110"}`}>
                    {course.title}
                  </h2>
                  {locked && (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 text-stone-400 dark:text-stone-500">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                {course.description && (
                  <p className={`mt-1.5 text-sm leading-relaxed ${locked ? "text-stone-400 dark:text-stone-500" : "text-stone-500 dark:text-stone-400"}`}>
                    {course.description}
                  </p>
                )}
                {locked && course.required_tag_id && (
                  <p className="mt-3 text-xs font-medium text-stone-400 dark:text-stone-500">
                    Requires: {tagMap.get(course.required_tag_id) ?? "restricted"} tag
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <p className="text-xs text-stone-400 dark:text-stone-400">
        Earn points by posting, commenting, and contributing. Points unlock course lessons.
      </p>
    </div>
  );
}
