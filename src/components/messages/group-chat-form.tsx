"use client";

import { useActionState, useState } from "react";
import { createGroupConversation, type MessageState } from "@/actions/messages";
import { UserAvatar } from "@/components/user-avatar";
import type { ProfileRef } from "@/lib/queries";

export function GroupChatForm({ members }: { members: ProfileRef[] }) {
  const [state, formAction, pending] = useActionState<MessageState, FormData>(
    createGroupConversation,
    {},
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const filtered = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.username.toLowerCase().includes(q) ||
      (m.display_name ?? "").toLowerCase().includes(q)
    );
  });

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Group name
        </label>
        <input
          name="name"
          required
          maxLength={60}
          placeholder="e.g. Book Club, Running Crew"
          className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Add members
        </label>
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400"
        />

        {selected.size > 0 && (
          <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            {selected.size} member{selected.size === 1 ? "" : "s"} selected
          </p>
        )}

        <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
          {filtered.length === 0 && (
            <p className="p-3 text-sm text-stone-400 dark:text-stone-500">
              No members found.
            </p>
          )}
          {filtered.map((m) => (
            <label
              key={m.id}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition hover:bg-stone-50 dark:hover:bg-stone-800/80 ${
                selected.has(m.id) ? "bg-[var(--primary-light)] dark:bg-[var(--primary-light)]" : ""
              }`}
            >
              <input
                type="checkbox"
                name="members"
                value={m.id}
                checked={selected.has(m.id)}
                onChange={() => toggle(m.id)}
                className="h-4 w-4 rounded border-stone-300 text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <UserAvatar profile={m} size={28} />
              <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
                {m.display_name ?? m.username}
              </span>
              <span className="text-xs text-stone-400 dark:text-stone-500">
                @{m.username}
              </span>
            </label>
          ))}
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={selected.size === 0 || pending}
        className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create group"}
      </button>
    </form>
  );
}
