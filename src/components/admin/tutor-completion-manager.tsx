"use client";

import { useState, useTransition } from "react";
import { addTutorCompletion, removeTutorCompletion } from "@/actions/admin";

type Member = {
  id: string;
  username: string;
  display_name: string | null;
};

export type RecordedMember = Member & {
  completionId: string;
  note: string | null;
};

export function TutorCompletionManager({
  courseId,
  recorded,
  members,
}: {
  courseId: string;
  recorded: RecordedMember[];
  members: Member[];
}) {
  const [pending, startTransition] = useTransition();
  const [userId, setUserId] = useState("");
  const [note, setNote] = useState("");

  const eligible = members.filter((m) => !recorded.some((r) => r.id === m.id));

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <h2 className="font-semibold dark:text-stone-100">Completed this course with a tutor</h2>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Mark members who finished this course with a tutor. This is public: the
        badge shows on their profile and on this course&apos;s card for them.
      </p>

      {recorded.length === 0 ? (
        <p className="mt-3 text-sm text-stone-400">No members recorded yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {recorded.map((m) => (
            <li
              key={m.completionId}
              className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-3 py-2 dark:border-stone-800"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium dark:text-stone-100">
                  {m.display_name ?? m.username}{" "}
                  <span className="font-normal text-stone-400">@{m.username}</span>
                </p>
                {m.note && (
                  <p className="truncate text-xs text-stone-500 dark:text-stone-400">{m.note}</p>
                )}
              </div>
              <button
                disabled={pending}
                className="shrink-0 text-xs font-medium text-red-600 transition hover:text-red-700 disabled:opacity-40 dark:hover:text-red-400"
                onClick={() => startTransition(() => removeTutorCompletion(m.completionId))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-4 flex flex-col gap-2 border-t border-stone-200 pt-4 dark:border-stone-800"
        action={() => {
          if (!userId) return;
          const selected = members.find((m) => m.id === userId);
          if (!selected) return;
          startTransition(async () => {
            await addTutorCompletion(courseId, selected.id, note);
            setUserId("");
            setNote("");
          });
        }}
      >
        <label className="text-xs font-medium text-stone-500 dark:text-stone-400">
          Member
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={pending || eligible.length === 0}
            className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-900"
          >
            <option value="">Select a member…</option>
            {eligible.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name ?? m.username} (@{m.username})
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-stone-500 dark:text-stone-400">
          Note (optional)
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={pending}
            maxLength={280}
            placeholder="e.g. Completed in 3 weeks"
            className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm placeholder:text-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-600"
          />
        </label>
        <button
          type="submit"
          disabled={pending || !userId}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-40"
        >
          Record completion
        </button>
        {eligible.length === 0 && recorded.length > 0 && (
          <p className="text-xs text-stone-400">All members are already recorded.</p>
        )}
      </form>
    </div>
  );
}