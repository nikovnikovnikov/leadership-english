"use client";

import { useTransition } from "react";
import { deleteEvent } from "@/actions/events";
import Link from "next/link";

export function EventAdminActions({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/admin/events/new?edit=${eventId}`}
        className="text-sm font-medium text-stone-400 transition hover:text-stone-600 dark:text-stone-400 dark:hover:text-stone-200"
      >
        Edit
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this event?")) {
            startTransition(() => { void deleteEvent(eventId); });
          }
        }}
        className="text-sm font-medium text-red-500 transition hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
