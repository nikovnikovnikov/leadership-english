"use client";

import { useActionState } from "react";
import { createLesson, updateLesson, type AdminActionState } from "@/actions/admin";

type LessonFields = {
  id?: string;
  title: string;
  description: string | null;
  video_url: string | null;
  notion_page_id: string | null;
  order_index: number;
  published: boolean;
};

export function LessonForm({
  courseId,
  initial,
}: {
  courseId: string;
  initial?: LessonFields;
}) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(
    initial ? updateLesson : createLesson,
    {},
  );

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="course_id" value={courseId} />
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <input
          name="title"
          required
          maxLength={200}
          defaultValue={initial?.title}
          className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Video URL <span className="text-stone-400 dark:text-stone-400">(YouTube / Vimeo)</span>
        </label>
        <input
          name="video_url"
          type="url"
          defaultValue={initial?.video_url ?? ""}
          className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Description / notes</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Notion Page ID <span className="text-stone-400 dark:text-stone-400">(optional)</span>
        </label>
        <input
          name="notion_page_id"
          defaultValue={initial?.notion_page_id ?? ""}
          placeholder="e.g. 1a2b3c4d5e6f..."
          className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
        <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
          Paste a Notion page ID to render rich content (tables, callouts, toggles, etc.) below the description.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Order</label>
          <input
            name="order_index"
            type="number"
            defaultValue={initial?.order_index ?? 0}
            className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="published"
              defaultChecked={initial?.published ?? false}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            Published
          </label>
        </div>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
      >
        {pending ? "Saving..." : (initial ? "Save lesson" : "Add lesson")}
      </button>
    </form>
  );
}
