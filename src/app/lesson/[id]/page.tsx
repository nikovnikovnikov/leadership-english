import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getCourse,
  getLesson,
  getLessons,
  getCompletedLessonIds,
  getLessonComments,
} from "@/lib/queries";
import { videoEmbedUrl } from "@/lib/utils";
import { getNotionRecordMap } from "@/lib/notion";
import { CompleteButton } from "@/components/lessons/complete-button";
import { LessonComments } from "@/components/lessons/lesson-comments";
import { NotionContent } from "@/components/notion-content";

export const metadata = { title: "Lesson" };

export default async function LessonPage({
  params,
}: PageProps<"/lesson/[id]">) {
  const { id } = await params;
  const profile = await requireUser();

  const lesson = await getLesson(id);
  if (!lesson || !lesson.published) notFound();

  const [course, completedSet, lessons, notionRecordMap, comments] = await Promise.all([
    getCourse(lesson.course_id),
    getCompletedLessonIds(profile.id),
    getLessons(lesson.course_id),
    lesson.notion_page_id ? getNotionRecordMap(lesson.notion_page_id) : null,
    getLessonComments(lesson.id),
  ]);
  if (!course) notFound();

  const completed = completedSet.has(lesson.id);

  const index = lessons.findIndex((l) => l.id === lesson.id);
  const prev = index > 0 ? lessons[index - 1] : null;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
  const embedUrl = videoEmbedUrl(lesson.video_url);

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

      {notionRecordMap && (
        <NotionContent recordMap={notionRecordMap} />
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

      <LessonComments
        lessonId={lesson.id}
        comments={comments}
        currentUserId={profile.id}
        isAdmin={profile.role === "admin" || profile.role === "moderator"}
      />
    </div>
  );
}