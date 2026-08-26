"use client";

import { useActionState } from "react";
import Link from "next/link";
import { messageTag, type TagActionState } from "@/actions/tags";

export function MessageTagForm({
  tagId,
  tagName,
  memberCount,
}: {
  tagId: string;
  tagName: string;
  memberCount: number;
}) {
  const [state, formAction, pending] = useActionState<TagActionState, FormData>(
    messageTag,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="tag_id" value={tagId} />

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <label className="mb-1 block text-sm font-semibold">Group name</label>
        <p className="mb-3 text-xs text-stone-400">
          This will create a group conversation with {memberCount} member{memberCount !== 1 && "s"} tagged &ldquo;{tagName}&rdquo;.
        </p>
        <input
          type="text"
          name="group_name"
          maxLength={60}
          required
          placeholder="e.g. Announcement — Early Adopters"
          className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <label className="mb-1 block text-sm font-semibold">First message</label>
        <p className="mb-3 text-xs text-stone-400">
          This message will be sent immediately to the group.
        </p>
        <textarea
          name="body"
          rows={4}
          required
          maxLength={5000}
          placeholder="Write your message..."
          className="w-full resize-y rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
        >
          {pending ? "Sending..." : "Send message"}
        </button>
        <Link
          href={`/admin/tags/${tagId}`}
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
