"use client";

import { useActionState } from "react";
import { updateCommunityInfo, type AdminActionState } from "@/actions/admin";

export function AnnouncementForm({
  values,
}: {
  values: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(
    updateCommunityInfo,
    {},
  );

  const isEnabled = values.announcements_enabled === "true";

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-semibold">Enable Announcement</label>
            <p className="text-xs text-stone-400 dark:text-stone-500">
              Show a &ldquo;What&apos;s New&rdquo; banner at the top of the feed.
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              name="announcements_enabled"
              value="true"
              defaultChecked={isEnabled}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-stone-300 peer-checked:bg-[var(--primary)] transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-semibold">Title</label>
            <input
              type="text"
              name="announcements_title"
              defaultValue={values.announcements_title ?? ""}
              placeholder="What's New"
              className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Body</label>
            <p className="mb-2 text-xs text-stone-400 dark:text-stone-500">
              Supports **markdown**. Keep it concise — this appears at the top of every feed visit.
            </p>
            <textarea
              name="announcements_body"
              rows={4}
              defaultValue={values.announcements_body ?? ""}
              placeholder="Share updates, launches, or important info with your community..."
              className="w-full resize-y rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save announcement"}
      </button>
    </form>
  );
}
