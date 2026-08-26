"use client";

import { useActionState } from "react";
import { updateSettings, type AdminActionState } from "@/actions/admin";

const FIELDS = [
  { key: "points_feed_post", label: "Feed post" },
  { key: "points_thread", label: "New thread" },
  { key: "points_feed_comment", label: "Post comment" },
  { key: "points_thread_reply", label: "Thread reply" },
  { key: "points_like_received", label: "Like received" },
  { key: "points_daily_cap", label: "Daily cap" },
] as const;

export function SettingsForm({ values }: { values: Record<string, string> }) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(
    updateSettings,
    {},
  );

  return (
    <form
      action={formAction}
      className="max-w-sm space-y-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm"
    >
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label className="mb-1 block text-sm font-medium">{f.label}</label>
          <input
            name={f.key}
            type="number"
            min={0}
            defaultValue={values[f.key] ?? "0"}
            className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
      ))}
      <p className="text-xs text-stone-400 dark:text-stone-400">
        The daily cap prevents members from farming unlimited points in one day.
      </p>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save point values"}
      </button>
    </form>
  );
}
