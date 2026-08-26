import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getCourse,
  getLesson,
  getLessons,
  getCompletedLessonIds,
  getTotalPoints,
  isSubscribed,
} from "@/lib/queries";
import { videoEmbedUrl } from "@/lib/utils";
import { CompleteButton } from "@/components/lessons/complete-button";

export const metadata = { title: "Lesson" };

export default async function LessonPage({
  params,
}: PageProps<"/lesson/[id]">) {
  const { id } = await params;
  const profile = await requireUser();

  const lesson = await getLesson(id);
  if (!lesson || !lesson.published) notFound();

  const [course, points, subscribed, completedSet, lessons] = await Promise.all([
    getCourse(lesson.course_id),
    getTotalPoints(profile.id),
    isSubscribed(profile.id),
    getCompletedLessonIds(profile.id),
    getLessons(lesson.course_id),
  ]);
  if (!course) notFound();

  const completed = completedSet.has(lesson.id);
  const unlocked = subscribed || points >= lesson.required_points;

  const index = lessons.findIndex((l) => l.id === lesson.id);
  const prev = index > 0 ? lessons[index - 1] : null;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
  const embedUrl = unlocked ? videoEmbedUrl(lesson.video_url) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/course/${course.id}`}
          className="text-xs font-medium text-stone-400 hover:text-stone-600 dark:text-stone-400 dark:hover:text-stone-300"
        >
          ← {course.title}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {lesson.title}
        </h1>
      </div>

      {!unlocked ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mx-auto h-10 w-10 text-stone-300 dark:text-stone-400"
          >
            <path
              fillRule="evenodd"
              d="M10 2a4.5 4.5 0 0 0-4.5 4.5V8H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V6.5A4.5 4.5 0 0 0 10 2Zm3 6V6.5a3 3 0 1 0-6 0V8h6Z"
              clipRule="evenodd"
            />
          </svg>
          <h2 className="mt-4 text-lg font-semibold">Lesson locked</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            This lesson requires{" "}
            <span className="font-semibold text-stone-700 dark:text-stone-200">
              {lesson.required_points} points
            </span>
            . You currently have{" "}
            <span className="font-semibold text-stone-700 dark:text-stone-200">{points}</span>.
            Post, comment, and engage with the community to earn your way in.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/feed"
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90"
            >
              Earn points in the feed
            </Link>
            <Link
              href="/account"
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-white/5 dark:text-stone-200 dark:hover:bg-stone-800/80"
            >
              Or subscribe for full access
            </Link>
          </div>
        </div>
      ) : (
        <>
          {embedUrl ? (
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-sm">
              <iframe
                src={embedUrl}
                title={lesson.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center dark:border-stone-800 dark:bg-stone-900">
              <p className="text-sm text-stone-500 dark:text-stone-400">
                No video attached yet.
              </p>
            </div>
          )}

          {lesson.description && (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed dark:text-stone-200">
                {lesson.description}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <CompleteButton lessonId={lesson.id} completed={completed} />
            <div className="flex gap-2">
              {prev && (
                <Link
                  href={`/lesson/${prev.id}`}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-white/5 dark:text-stone-300 dark:hover:bg-stone-800/80"
                >
                  ← Previous
                </Link>
              )}
              {next && (
                <Link
                  href={`/lesson/${next.id}`}
                  className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-stone-700 dark:bg-[var(--primary)] dark:hover:brightness-90"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
