"use client";

import { useActionState } from "react";
import Link from "next/link";
import { massEmailTag, type TagActionState } from "@/actions/tags";

export function EmailTagForm({
  tagId,
  tagName,
  memberCount,
}: {
  tagId: string;
  tagName: string;
  memberCount: number;
}) {
  const [state, formAction, pending] = useActionState<TagActionState, FormData>(
    massEmailTag,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="tag_id" value={tagId} />

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <label className="mb-1 block text-sm font-semibold">Subject</label>
        <p className="mb-3 text-xs text-stone-400">
          This email will be sent to {memberCount} member{memberCount !== 1 && "s"} tagged &ldquo;{tagName}&rdquo;.
        </p>
        <input
          type="text"
          name="subject"
          required
          maxLength={200}
          placeholder="e.g. Welcome to the community!"
          className="w-full rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <label className="mb-1 block text-sm font-semibold">Email body</label>
        <p className="mb-3 text-xs text-stone-400">
          Plain text. Each recipient will see their own name in the greeting.
        </p>
        <textarea
          name="body"
          rows={8}
          required
          placeholder={"Hi {name},\n\nWe wanted to reach out because..."}
          className="w-full resize-y rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state.ok && (
        <p className="text-sm text-[var(--primary)]">Emails sent successfully.</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={state.ok || pending}
          className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-60"
        >
          {state.ok ? "Sent" : (pending ? "Sending..." : "Send emails")}
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
