"use client";

import { useActionState } from "react";
import { createCourse, updateCourse, type AdminActionState } from "@/actions/admin";

type TagOption = { id: string; name: string };

export function CourseForm({
  initial,
  tags,
}: {
  initial?: { id: string; title: string; description: string | null; published: boolean; required_tag_id: string | null };
  tags: TagOption[];
}) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(
    initial ? updateCourse : createCourse,
    {},
  );

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm">
      {initial && <input type="hidden" name="id" value={initial.id} />}
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
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          name="description"
          rows={2}
          defaultValue={initial?.description ?? ""}
          className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Access restriction</label>
        <select
          name="required_tag_id"
          defaultValue={initial?.required_tag_id ?? ""}
          className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        >
          <option value="">No restriction</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              Require: {tag.name}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="published"
          defaultChecked={initial?.published ?? false}
          className="h-4 w-4 accent-[var(--primary)]"
        />
        Published (visible to members)
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
      >
        {pending ? "Saving..." : (initial ? "Save course" : "Create course")}
      </button>
    </form>
  );
}
