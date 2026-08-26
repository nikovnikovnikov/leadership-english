"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategory, reorderCategories } from "@/actions/boards";
import { CategoryForm, EditCategoryForm } from "@/components/admin/category-form";
import type { Category } from "@/lib/queries";

type TagOption = { id: string; name: string };

export function BoardsList({
  categories,
  tags,
}: {
  categories: Category[];
  tags: TagOption[];
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete(id: string, label: string) {
    if (!window.confirm(`Delete the "${label}" board? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteCategory(id);
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Failed to delete");
      }
    });
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const ids = categories.map((c) => c.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    startTransition(async () => {
      await reorderCategories(ids);
      router.refresh();
    });
  }

  function handleMoveDown(index: number) {
    if (index === categories.length - 1) return;
    const ids = categories.map((c) => c.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    startTransition(async () => {
      await reorderCategories(ids);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {categories.map((cat, i) => (
          <div
            key={cat.id}
            className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400 dark:text-stone-500 tabular-nums">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold text-stone-800 dark:text-stone-100">
                    {cat.label}
                  </h3>
                  <span className="rounded-full bg-stone-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-medium text-stone-500 dark:text-stone-400">
                    {cat.id}
                  </span>
                </div>
                {cat.description && (
                  <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-400">
                    {cat.description}
                  </p>
                )}

                <div className="mt-2">
                  <EditCategoryForm category={cat} tags={tags} />
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={i === 0 || pending}
                  onClick={() => handleMoveUp(i)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 dark:text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200 disabled:opacity-30"
                  aria-label="Move up"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 0 1-1.06-.02L10 8.832 6.29 12.77a.75.75 0 1 1-1.08-1.04l4.25-4.5a.75.75 0 0 1 1.08 0l4.25 4.5a.75.75 0 0 1-.02 1.06Z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={i === categories.length - 1 || pending}
                  onClick={() => handleMoveDown(i)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 dark:text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200 disabled:opacity-30"
                  aria-label="Move down"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.5a.75.75 0 0 1-1.06 0l-4.25-4.5a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleDelete(cat.id, cat.label)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 dark:text-stone-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 disabled:opacity-30"
                  aria-label="Delete"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}

        {!categories.length && (
          <p className="text-sm text-stone-400 dark:text-stone-500">No boards yet.</p>
        )}
      </div>

      <CategoryForm tags={tags} />
    </div>
  );
}
