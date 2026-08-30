"use client";

import { useTransition } from "react";
import { moveCourse } from "@/actions/admin";

export function CourseOrderButtons({
  courseId,
  isFirst,
  isLast,
}: {
  courseId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const buttonClass =
    "disabled:pointer-events-none disabled:opacity-30 rounded-md p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200";

  return (
    <div className="flex items-center gap-1">
      <button
        aria-label="Move course up"
        disabled={pending || isFirst}
        className={buttonClass}
        onClick={() => startTransition(() => moveCourse(courseId, "up"))}
      >
        ↑
      </button>
      <button
        aria-label="Move course down"
        disabled={pending || isLast}
        className={buttonClass}
        onClick={() => startTransition(() => moveCourse(courseId, "down"))}
      >
        ↓
      </button>
    </div>
  );
}