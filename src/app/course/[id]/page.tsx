import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getCourse,
  getLessons,
  getCompletedLessonIds,
} from "@/lib/queries";

export const metadata = { title: "Course" };

export default async function CoursePage({
  params,
}: PageProps<"/course/[id]">) {
  const { id } = await params;
  const profile = await requireUser();

  const [course, lessons, completed] = await Promise.all([
    getCourse(id),
    getLessons(id),
    getCompletedLessonIds(profile.id),
  ]);

  if (!course) notFound();

  const totalLessons = lessons.length;
  const completedCount = lessons.filter((l) => completed.has(l.id)).length;
  const nextLesson = lessons.find((l) => !completed.has(l.id)) ?? null;
  const finished = totalLessons > 0 && completedCount >= totalLessons;

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
              {finished
                ? "Course complete"
                : `${completedCount} of ${totalLessons} lessons complete`}
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

      {nextLesson && !finished && (
        <Link
          href={`/lesson/${nextLesson.id}`}
          className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary-light)] p-4 transition hover:brightness-95"
        >
          <div>
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
              {completedCount === 0 ? "Start the course" : "Continue learning"}
            </p>
            <p className="mt-0.5 font-medium">
              {nextLesson.title}
            </p>
          </div>
          <span className="shrink-0 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white">
            {completedCount === 0 ? "Start →" : "Continue →"}
          </span>
        </Link>
      )}

      <div className="space-y-2">
        {lessons.map((lesson, i) => {
          const isDone = completed.has(lesson.id);
          return (
            <div
              key={lesson.id}
              className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                  isDone
                    ? "bg-[var(--primary)] text-white"
                    : "bg-stone-100 text-stone-600 dark:bg-white/10 dark:text-stone-300"
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

              <Link
                href={`/lesson/${lesson.id}`}
                className="min-w-0 flex-1 font-medium hover:brightness-90 dark:hover:brightness-110"
              >
                {lesson.title}
                {isDone && (
                  <span className="ml-2 text-xs font-normal text-stone-400 dark:text-stone-400">
                    Complete
                  </span>
                )}
              </Link>

              <span className="shrink-0 text-xs text-stone-400 dark:text-stone-400">
                {isDone ? "Done" : "Open lesson"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}