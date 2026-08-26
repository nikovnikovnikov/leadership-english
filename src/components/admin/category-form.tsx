"use client";

import { useActionState, useState } from "react";
import { createCategory, updateCategory, type CategoryActionState } from "@/actions/boards";
import type { Category } from "@/lib/queries";

type TagOption = { id: string; name: string };

function TagSelect({
  name,
  tags,
  defaultValue,
}: {
  name: string;
  tags: TagOption[];
  defaultValue?: string | null;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:text-stone-100"
    >
      <option value="">No access restriction</option>
      {tags.map((tag) => (
        <option key={tag.id} value={tag.id}>
          Require: {tag.name}
        </option>
      ))}
    </select>
  );
}

export function CategoryForm({ tags }: { tags: TagOption[] }) {
  const [state, formAction, pending] = useActionState<CategoryActionState, FormData>(
    createCategory,
    {},
  );

  return (
    <form action={formAction} className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
      <h3 className="mb-3 font-semibold">Add a new board</h3>
      <div className="space-y-3">
        <input
          name="label"
          required
          maxLength={60}
          placeholder="Board name (e.g. Resources)"
          className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:text-stone-100 dark:placeholder:text-stone-400"
        />
        <input
          name="description"
          maxLength={200}
          placeholder="Short description (optional)"
          className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:text-stone-100 dark:placeholder:text-stone-400"
        />
        <TagSelect name="required_tag_id" tags={tags} />
      </div>
      {state.error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add board"}
      </button>
    </form>
  );
}

export function EditCategoryForm({
  category,
  tags,
}: {
  category: Category;
  tags: TagOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<CategoryActionState, FormData>(
    (prev, formData) => updateCategory(category.id, prev, formData),
    {},
  );

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-stone-400 dark:text-stone-400 transition hover:text-stone-600 dark:hover:text-stone-300"
        >
          Edit
        </button>
        {category.required_tag_id && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
            Gated
          </span>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input
        name="label"
        required
        maxLength={60}
        defaultValue={category.label}
      className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:text-stone-100"
      />
      <input
        name="description"
        maxLength={200}
        defaultValue={category.description}
        placeholder="Short description"
        className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:text-stone-100 dark:placeholder:text-stone-400"
      />
      <TagSelect
        name="required_tag_id"
        tags={tags}
        defaultValue={category.required_tag_id}
      />
      {state.error && (
        <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-stone-300 dark:border-stone-800 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 transition hover:bg-stone-50 dark:hover:bg-stone-800/80"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
