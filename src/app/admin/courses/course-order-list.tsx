"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { reorderCourses } from "@/actions/admin";
import { ReorderableList } from "@/components/admin/reorderable-list";

export type AdminCourse = {
  id: string;
  title: string;
  published: boolean;
};

export function AdminCourseOrderList({
  courses,
}: {
  courses: AdminCourse[];
}) {
  const router = useRouter();
  const startTransition = useTransition()[1];
  const byId = new Map(courses.map((c) => [c.id, c]));

  return (
    <ReorderableList
      items={courses}
      onReorder={(orderedIds) =>
        startTransition(async () => {
          await reorderCourses(orderedIds);
          router.refresh();
        })
      }
      render={(_i, id) => {
        const course = byId.get(id);
        if (!course) return null;
        return (
          <div className="flex items-center justify-between gap-3 py-4 pr-4">
            <div className="min-w-0">
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
            <Link
              href={`/admin/course/${course.id}`}
              className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50"
            >
              Manage
            </Link>
          </div>
        );
      }}
    />
  );
}