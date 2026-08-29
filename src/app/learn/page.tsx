import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getLearningOverview } from "@/lib/queries";
import { AssessmentNudge } from "@/components/assessment/nudge";

export const metadata = { title: "Learning" };

export default async function LearnPage() {
  const profile = await requireUser();
  const overview = await getLearningOverview(profile.id);

  const overallPercent =
    overview.totalLessons > 0
      ? Math.round((overview.totalCompleted / overview.totalLessons) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Learning</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Your courses, progress, and where to pick up next.
        </p>
      </div>

      <AssessmentNudge />

      {overview.courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No courses published yet. Check back soon.
          </p>
        </div>
      ) : (
        <>
          {overview.resume && (
            <Link
              href={`/lesson/${overview.resume.lesson.id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary-light)] p-5 transition hover:brightness-95"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                  {overview.resume.inProgress
                    ? "Continue where you left off"
                    : "Start with your first lesson"}
                </p>
                <p className="mt-0.5 truncate font-semibold">
                  {overview.resume.lesson.title}
                </p>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                  {overview.resume.course.title}
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white">
                {overview.resume.inProgress ? "Resume →" : "Start →"}
              </span>
            </Link>
          )}

          {overview.allFinished && (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-5 text-sm text-emerald-800 dark:text-emerald-300">
              You&apos;ve worked through every course. Review a lesson below or
              keep contributing to the community.
            </div>
          )}

          {overview.totalLessons > 0 && (
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {overview.totalCompleted} of {overview.totalLessons} lessons complete
                </span>
                <span className="text-stone-400">{overallPercent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all"
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            {overview.courses.map(({ course, completedCount, totalLessons, nextLesson, finished }) => {
              const percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
              return (
                <div
                  key={course.id}
                  className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold">{course.title}</h2>
                      <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                        {totalLessons === 0
                          ? "No lessons yet"
                          : finished
                            ? "Course complete"
                            : `${completedCount} of ${totalLessons} lessons · ${percent}%`}
                      </p>
                    </div>
                    <Link
                      href={nextLesson ? `/lesson/${nextLesson.id}` : `/course/${course.id}`}
                      className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--primary)] transition hover:brightness-90"
                    >
                      {totalLessons === 0
                        ? "View course"
                        : finished
                          ? "Review"
                          : completedCount === 0
                            ? "Start"
                            : "Continue"}
                    </Link>
                  </div>
                  {totalLessons > 0 && (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-[var(--primary)] transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-stone-400 dark:text-stone-400">
            Marking a lesson complete updates your progress instantly.
          </p>
        </>
      )}
    </div>
  );
}