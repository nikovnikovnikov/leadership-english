"use client";

import { useActionState } from "react";
import { postEventUpdate, type EventState } from "@/actions/events";

export function EventUpdateForm({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState<EventState, FormData>(
    postEventUpdate.bind(null, eventId),
    {},
  );
  const succeeded = state && !("error" in state);

  return (
    <form
      action={formAction}
      className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <textarea
        name="body"
        rows={2}
        required
        maxLength={2000}
        placeholder="Post an update for attendees…"
        className="w-full resize-none rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none placeholder:text-stone-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
      />
      {state.error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {succeeded && (
        <p className="mt-1 text-sm text-green-600 dark:text-green-400">Update posted.</p>
      )}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
        >
          {pending ? "Posting…" : "Post Update"}
        </button>
      </div>
    </form>
  );
}
