import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getCourse,
  getLessons,
  getCompletedLessonIds,
  getTotalPoints,
  isSubscribed,
  getUserTagIds,
  hasTagAccess,
  getAllTags,
} from "@/lib/queries";

export const metadata = { title: "Course" };

export default async function CoursePage({
  params,
}: PageProps<"/course/[id]">) {
  const { id } = await params;
  const profile = await requireUser();

  const [course, lessons, completed, points, subscribed, userTagIds] = await Promise.all([
    getCourse(id),
    getLessons(id),
    getCompletedLessonIds(profile.id),
    getTotalPoints(profile.id),
    isSubscribed(profile.id),
    getUserTagIds(profile.id),
  ]);

  if (!course) notFound();

  const locked = !hasTagAccess(course.required_tag_id, userTagIds);

  if (locked) {
    let tagName = "restricted";
    if (course.required_tag_id) {
      const allTags = await getAllTags();
      tagName = allTags.find((t) => t.id === course.required_tag_id)?.name ?? tagName;
    }
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/courses"
            className="text-xs font-medium text-stone-400 hover:text-stone-600 dark:text-stone-400 dark:hover:text-stone-300"
          >
            ← All courses
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-400 dark:text-stone-500">
            {course.title}
          </h1>
          {course.description && (
            <p className="mt-2 text-sm leading-relaxed text-stone-400 dark:text-stone-500">
              {course.description}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center">
          <svg viewBox="0 0 20 20" fill="currentColor" className="mx-auto h-10 w-10 text-stone-300 dark:text-stone-600">
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
          </svg>
          <p className="mt-3 text-sm font-medium text-stone-500 dark:text-stone-400">
            This course is gated
          </p>
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            You need the <span className="font-semibold">{tagName}</span> tag to access it.
            Contact an admin to get access.
          </p>
        </div>
      </div>
    );
  }

  const totalLessons = lessons.length;
  const completedCount = lessons.filter((l) => completed.has(l.id)).length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/courses"
          className="text-xs font-medium text-stone-400 hover:text-stone-600 dark:text-stone-400 dark:hover:text-stone-300"
        >
          ← All courses
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {course.title}
        </h1>
        {course.description && (
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            {course.description}
          </p>
        )}
      </div>

      {totalLessons > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {completedCount} of {totalLessons} lessons complete
            </span>
            <span className="text-stone-400">
              {Math.round((completedCount / totalLessons) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all"
              style={{
                width: `${(completedCount / totalLessons) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {lessons.map((lesson, i) => {
          const isDone = completed.has(lesson.id);
          const unlocked = subscribed || points >= lesson.required_points;
          return (
            <div
              key={lesson.id}
              className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                  isDone
                    ? "bg-[var(--primary)] text-white"
                    : unlocked
                      ? "bg-stone-100 text-stone-600 dark:bg-white/10 dark:text-stone-300"
                      : "bg-stone-100 text-stone-400 dark:bg-stone-900 dark:text-stone-400"
                }`}
              >
                {isDone ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.79 6.8-6.8a1 1 0 0 1 1.4 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>

              <div className="min-w-0 flex-1">
                {unlocked ? (
                  <Link
                    href={`/lesson/${lesson.id}`}
                    className="font-medium hover:brightness-90 dark:hover:brightness-110"
                  >
                    {lesson.title}
                  </Link>
                ) : (
                  <span className="font-medium text-stone-500 dark:text-stone-400">
                    {lesson.title}
                  </span>
                )}
                {lesson.required_points > 0 && (
                  <p className="text-xs text-stone-400 dark:text-stone-400">
                    {unlocked
                      ? "Unlocked"
                      : `Requires ${lesson.required_points} points · you have ${points}`}
                  </p>
                )}
              </div>

              {!unlocked && (
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4 shrink-0 text-stone-300 dark:text-stone-400"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a4.5 4.5 0 0 0-4.5 4.5V8H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V6.5A4.5 4.5 0 0 0 10 2Zm3 6V6.5a3 3 0 1 0-6 0V8h6Z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
