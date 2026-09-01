import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCourses, getLessons, getCompletedLessonIds, getTutorCompletedCourseIds } from "@/lib/queries";

export const metadata = { title: "Courses" };

export default async function CoursesPage() {
  const profile = await requireUser();
  const [courses, completed, tutorCompleted] = await Promise.all([
    getCourses(),
    getCompletedLessonIds(profile.id),
    getTutorCompletedCourseIds(profile.id),
  ]);

  const coursesWithProgress = await Promise.all(
    courses.map(async (course) => {
      const lessons = await getLessons(course.id);
      const completedCount = lessons.filter((l) => completed.has(l.id)).length;
      return {
        course,
        lessons,
        completedCount,
        totalLessons: lessons.length,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Every course is open to you. Work through lessons at your own pace,
          track your progress, and pick up where you left off.
        </p>
      </div>

      {coursesWithProgress.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No courses published yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {coursesWithProgress.map(({ course, lessons, completedCount, totalLessons }) => {
            const started = completedCount > 0;
            const finished = totalLessons > 0 && completedCount >= totalLessons;
            const nextLesson = lessons.find((l) => !completed.has(l.id)) ?? null;
            const isTutorCompleted = tutorCompleted.has(course.id);

            return (
              <Link
                key={course.id}
                href={nextLesson ? `/lesson/${nextLesson.id}` : `/course/${course.id}`}
                className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition dark:border-stone-800 dark:bg-stone-900 hover:border-[var(--primary)] hover:shadow"
              >
                <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100 group-hover:text-[var(--primary)] dark:group-hover:brightness-110">
                  {course.title}
                </h2>
                {course.description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                    {course.description}
                  </p>
                )}

                {totalLessons > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                      <span>
                        {isTutorCompleted ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                            Completed with a tutor
                          </span>
                        ) : finished ? (
                          "Course complete"
                        ) : started ? (
                          "In progress"
                        ) : (
                          "Not started"
                        )}
                      </span>
                      <span>
                        {completedCount} of {totalLessons} lessons
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-[var(--primary)] transition-all"
                        style={{ width: `${(completedCount / totalLessons) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                  {totalLessons === 0
                    ? "View course"
                    : finished
                      ? "Review course"
                      : started
                        ? nextLesson
                          ? "Continue →"
                          : "Review course"
                        : "Start learning →"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}