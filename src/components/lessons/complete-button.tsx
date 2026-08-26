"use client";

import { useTransition } from "react";
import { completeLesson } from "@/actions/lessons";

export function CompleteButton({
  lessonId,
  completed,
}: {
  lessonId: string;
  completed: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (completed) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary-light)] dark:bg-[var(--primary-light)] px-4 py-2 text-sm font-semibold text-[var(--primary)] dark:text-[var(--primary)]">
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.79 6.8-6.8a1 1 0 0 1 1.4 0Z"
            clipRule="evenodd"
          />
        </svg>
        Completed
      </span>
    );
  }

  return (
    <button
      onClick={() => startTransition(() => completeLesson(lessonId))}
      disabled={pending}
      className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-60"
    >
      {pending ? "Marking…" : "Mark lesson complete"}
    </button>
  );
}
