"use client";

import { useActionState, useState } from "react";
import { createReport, type ReportActionState } from "@/actions/reports";
import type { ReportTargetType } from "@/lib/config";

const REASONS = [
  "Spam",
  "Harassment",
  "Hate speech",
  "Self-harm or crisis",
  "Misinformation",
  "Other",
];

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: ReportTargetType;
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ReportActionState, FormData>(
    createReport,
    {},
  );

  if (state.ok) {
    return (
      <span className="text-xs text-[var(--primary)]">
        Thanks — reported for review.
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm text-stone-400 dark:text-stone-400 transition hover:text-amber-600 dark:hover:text-amber-400"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.6 9.3h-1.1A2.5 2.5 0 0 0 3 11.8v1.1a2.5 2.5 0 0 0 2.5 2.5h1.1m0-6.1L11 5.2a1.6 1.6 0 0 1 2.2 2.1l-1 2h1.6a1.6 1.6 0 0 1 1.5 2.1l-.8 2.4a1.6 1.6 0 0 1-1.5 1.1H6.6m0-6.1v6.1"
          />
        </svg>
      </button>

      {open && (
        <form
          action={formAction}
          className="absolute right-0 top-6 z-10 w-64 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3 shadow-lg"
        >
          <input type="hidden" name="target_type" value={targetType} />
          <input type="hidden" name="target_id" value={targetId} />
          <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-300">
            Flag this content
          </label>
          <select
            name="reason"
            required
            className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 px-2 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {state.error && (
            <p className="mt-1 text-xs text-red-600">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 w-full rounded-lg bg-stone-800 dark:bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-stone-700 dark:hover:bg-stone-800/80 disabled:opacity-50"
          >
            {pending ? "Submitting..." : "Submit report"}
          </button>
        </form>
      )}
    </div>
  );
}
