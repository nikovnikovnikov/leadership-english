"use client";

import { useActionState } from "react";
import { saveAutoTagConfig, type TagActionState } from "@/actions/tags";

type TagOption = { id: string; name: string };

function AutoTagSlot({
  slot,
  settings,
  allTags,
}: {
  slot: "1" | "2";
  settings: Record<string, string>;
  allTags: TagOption[];
}) {
  const prefix = `auto_tag_${slot}`;
  const currentName = settings[`${prefix}_name`] ?? "";
  const currentThreshold = settings[`${prefix}_threshold`] ?? "";
  const currentTagId = settings[`${prefix}_id`] ?? "";

  const [state, formAction, pending] = useActionState<TagActionState, FormData>(
    (_prev: TagActionState, formData: FormData) => saveAutoTagConfig(formData),
    {},
  );

  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-200">
        Auto-tag {slot === "1" ? "1 (first batch)" : "2 (second batch)"}
      </h3>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="slot" value={slot} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">Display name</label>
            <input
              name="name"
              defaultValue={currentName}
              placeholder="e.g. Founder"
              className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">Max user # (threshold)</label>
            <input
              name="threshold"
              type="number"
              min={1}
              defaultValue={currentThreshold}
              placeholder="e.g. 50"
              className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">Tag to assign</label>
            <select
              name="tag_id"
              defaultValue={currentTagId}
              className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            >
              <option value="">Select a tag</option>
              {allTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

export function AutoTagConfig({
  settings,
  allTags,
}: {
  settings: Record<string, string>;
  allTags: TagOption[];
}) {
  return (
    <div className="mt-4 space-y-4">
      <AutoTagSlot slot="1" settings={settings} allTags={allTags} />
      <AutoTagSlot slot="2" settings={settings} allTags={allTags} />
    </div>
  );
}
