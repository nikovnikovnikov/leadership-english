"use client";

import { useState } from "react";
import Link from "next/link";

export type OnboardingProgress = {
  hasAvatar: boolean;
  postCount: number;
  commentCount: number;
  points: number;
  lessonsUnlocked: number;
};

const CHECKLIST = [
  {
    key: "avatar" as const,
    label: "Complete your profile",
    sublabel: "Add a profile photo",
    href: "/account",
  },
  {
    key: "post" as const,
    label: "Make your first post",
    sublabel: "Share something with the community",
    href: "/feed",
  },
  {
    key: "comment" as const,
    label: "Comment on a post",
    sublabel: "Join the conversation",
    href: "/feed",
  },
  {
    key: "point" as const,
    label: "Earn your first point",
    sublabel: "Points unlock lessons",
    href: "/feed",
  },
  {
    key: "lesson" as const,
    label: "Unlock a lesson",
    sublabel: "Browse the course library",
    href: "/courses",
  },
];

function isDone(
  key: "avatar" | "post" | "comment" | "point" | "lesson",
  progress: OnboardingProgress,
): boolean {
  switch (key) {
    case "avatar":
      return progress.hasAvatar;
    case "post":
      return progress.postCount > 0;
    case "comment":
      return progress.commentCount > 0;
    case "point":
      return progress.points > 0;
    case "lesson":
      return progress.lessonsUnlocked > 0;
    default:
      return false;
  }
}

export function OnboardingChecklist({
  progress,
}: {
  progress: OnboardingProgress;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const completed = CHECKLIST.filter((item) => isDone(item.key, progress)).length;
  const total = CHECKLIST.length;
  const allDone = completed === total;

  if (allDone) return null;

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
            Getting started
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {completed} of {total} complete
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
          <svg
            className={`h-4 w-4 text-stone-400 transition-transform ${collapsed ? "" : "rotate-180"}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {!collapsed && (
        <div className="mt-3 space-y-1">
          {CHECKLIST.map((item) => {
            const done = isDone(item.key, progress);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${
                  done
                    ? "bg-emerald-50 dark:bg-emerald-500/10"
                    : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                    done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-stone-300 dark:border-stone-700"
                  }`}
                >
                  {done && (
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      done
                        ? "text-emerald-700 dark:text-emerald-300 line-through"
                        : "text-stone-700 dark:text-stone-200"
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    {item.sublabel}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
