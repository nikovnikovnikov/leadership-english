"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { reorderLessons, deleteLesson } from "@/actions/admin";
import { ReorderableList } from "@/components/admin/reorderable-list";
import { DeleteButton } from "@/components/delete-button";

export type AdminLesson = {
  id: string;
  title: string;
  order_index: number;
  published: boolean;
};

export function AdminLessonOrderList({
  courseId,
  lessons,
}: {
  courseId: string;
  lessons: AdminLesson[];
}) {
  const router = useRouter();
  const startTransition = useTransition()[1];
  const byId = new Map(lessons.map((l) => [l.id, l]));

  return (
    <ReorderableList
      items={lessons}
      onReorder={(orderedIds) =>
        startTransition(async () => {
          await reorderLessons(courseId, orderedIds);
          router.refresh();
        })
      }
      render={(_i, id) => {
        const lesson = byId.get(id);
        if (!lesson) return null;
        return (
          <div className="flex items-center justify-between gap-3 py-3 pr-3">
            <Link
              href={`/admin/lesson/${lesson.id}`}
              className="flex min-w-0 items-center gap-3"
            >
              <span className="w-6 text-center text-xs text-stone-400">
                {lesson.order_index}
              </span>
              <span className="truncate text-sm font-medium hover:text-[var(--primary)]">
                {lesson.title}
              </span>
              {!lesson.published && (
                <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                  Draft
                </span>
              )}
            </Link>
            <DeleteButton action={deleteLesson.bind(null, lesson.id, courseId)} />
          </div>
        );
      }}
    />
  );
}