"use client";

import { useActionState, useEffect, useRef } from "react";
import { createComment, type FeedActionState } from "@/actions/feed";

export function CommentForm({ postId }: { postId: string }) {
  const [state, formAction, pending] = useActionState<FeedActionState, FormData>(
    createComment,
    {},
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !("error" in state)) ref.current?.reset();
  }, [state]);

  return (
    <form
      ref={ref}
      action={formAction}
      className="mt-3 flex gap-2"
    >
      <input type="hidden" name="post_id" value={postId} />
      <input
        name="body"
        maxLength={2000}
        placeholder="Reply…"
        className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
      />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
      >
        {pending ? "Replying..." : "Reply"}
      </button>
      {state.error && (
        <span className="text-xs text-red-600 dark:text-red-400">{state.error}</span>
      )}
    </form>
  );
}
