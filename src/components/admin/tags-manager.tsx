"use client";

import { useActionState, useTransition } from "react";
import Link from "next/link";
import {
  createTag,
  deleteTag,
  updateTagVisibility,
  type TagActionState,
} from "@/actions/tags";
import { AdminActionButton } from "@/components/admin/action-button";

type Tag = { id: string; name: string; visibility?: string; created_at: string };

export function TagsManager({
  tags,
  counts,
}: {
  tags: Tag[];
  counts: Record<string, number>;
}) {
  const [state, formAction, adding] = useActionState<TagActionState, FormData>(
    createTag,
    {},
  );
  const [pending, startTransition] = useTransition();

  function handleVisibilityToggle(tagId: string, currentVisibility: string) {
    const newVisibility = currentVisibility === "public" ? "admin" : "public";
    startTransition(async () => {
      await updateTagVisibility(tagId, newVisibility);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Create tag</h2>
        <form action={formAction} className="flex gap-3">
          <input
            type="text"
            name="name"
            maxLength={50}
            placeholder="e.g. early-adopter, coach, vip"
            className="flex-1 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add"}
          </button>
        </form>
        {state.error && (
          <p className="mt-2 text-sm text-red-600">{state.error}</p>
        )}
      </div>

      {tags.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No tags yet. Create one above to start segmenting members.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-[var(--primary-light)] px-2.5 py-0.5 text-xs font-semibold text-[var(--primary)]">
                  {tag.name}
                </span>
                <span className="text-xs text-stone-400">
                  {counts[tag.id] ?? 0} member{(counts[tag.id] ?? 0) !== 1 && "s"}
                </span>
                {tag.visibility === "public" && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-400">
                    PUBLIC
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleVisibilityToggle(tag.id, tag.visibility ?? "admin")}
                  className="rounded-lg border border-stone-200 dark:border-stone-800 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 transition hover:bg-stone-50 dark:hover:bg-stone-800/80 disabled:opacity-50"
                >
                  {tag.visibility === "public" ? "Make private" : "Make public"}
                </button>
                <Link
                  href={`/admin/tags/${tag.id}`}
                  className="rounded-lg border border-stone-200 dark:border-stone-800 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 transition hover:bg-stone-50 dark:hover:bg-stone-800/80"
                >
                  View members
                </Link>
                <Link
                  href={`/admin/tags/${tag.id}/message`}
                  className="rounded-lg border border-stone-200 dark:border-stone-800 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 transition hover:bg-stone-50 dark:hover:bg-stone-800/80"
                >
                  Message
                </Link>
                <Link
                  href={`/admin/tags/${tag.id}/email`}
                  className="rounded-lg border border-stone-200 dark:border-stone-800 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 transition hover:bg-stone-50 dark:hover:bg-stone-800/80"
                >
                  Email
                </Link>
                <AdminActionButton
                  action={deleteTag.bind(null, tag.id)}
                  label="Delete"
                  className="border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-500/15 dark:text-red-400"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
