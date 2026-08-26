"use client";

import { useTransition } from "react";
import { addTagToProfile, removeTagFromProfile } from "@/actions/tags";

type Tag = { id: string; name: string };

export function TagAssigner({
  profileId,
  allTags,
  assignedTagIds,
}: {
  profileId: string;
  allTags: Tag[];
  assignedTagIds: string[];
}) {
  const [pending, startTransition] = useTransition();

  if (allTags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {allTags.map((tag) => {
        const isAssigned = assignedTagIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(() => {
                if (isAssigned) {
                  removeTagFromProfile(tag.id, profileId);
                } else {
                  addTagToProfile(tag.id, profileId);
                }
              });
            }}
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
              isAssigned
                ? "bg-[var(--primary)] text-white"
                : "bg-stone-100 text-stone-500 hover:bg-stone-200 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800/80"
            }`}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}

export function TagFilter({
  allTags,
  activeTagId,
}: {
  allTags: Tag[];
  activeTagId: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href="/admin/members"
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition ${
          !activeTagId
            ? "bg-[var(--primary)] text-white"
            : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800/80"
        }`}
      >
        All
      </a>
      {allTags.map((tag) => (
        <a
          key={tag.id}
          href={`/admin/members?tag=${tag.id}`}
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition ${
            activeTagId === tag.id
              ? "bg-[var(--primary)] text-white"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800/80"
          }`}
        >
          {tag.name}
        </a>
      ))}
    </div>
  );
}
