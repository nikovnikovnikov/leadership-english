"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createReply, type ThreadActionState } from "@/actions/threads";
import { ImageUploaderButton } from "@/components/image-uploader-button";
import { FormattingToolbar } from "@/components/formatting-toolbar";
import { useDraft } from "@/lib/hooks/use-draft";

export function ReplyForm({
  threadId,
  parentReplyId,
  parentAuthorName,
  onCancel,
}: {
  threadId: string;
  parentReplyId?: string;
  parentAuthorName?: string;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState<ThreadActionState, FormData>(
    createReply,
    {},
  );
  const ref = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const succeeded = state && !("error" in state);
  const draftKey = parentReplyId ? `reply-${parentReplyId}` : `reply-root-${threadId}`;
  const { value, update, clear } = useDraft(draftKey);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (succeeded) {
      ref.current?.reset();
      clear();
      onCancel?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={ref}
      action={formAction}
      className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <input type="hidden" name="thread_id" value={threadId} />
      {parentReplyId && (
        <input type="hidden" name="parent_reply_id" value={parentReplyId} />
      )}

      {parentAuthorName && (
        <p className="mb-2 text-xs text-stone-400 dark:text-stone-400">
          Replying to <span className="font-medium text-stone-600 dark:text-stone-300">@{parentAuthorName}</span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="ml-2 text-stone-400 underline hover:text-stone-600 dark:text-stone-400 dark:hover:text-stone-300"
            >
              cancel
            </button>
          )}
        </p>
      )}

      <FormattingToolbar textareaRef={textareaRef} />
      <textarea
        ref={textareaRef}
        name="body"
        rows={parentReplyId ? 3 : 4}
        required
        maxLength={5000}
        value={value}
        onChange={(e) => update(e.target.value)}
        placeholder="Share your thoughts…"
        className="w-full resize-none rounded-b-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
      />

      {showVideo && (
        <div className="mt-2">
          <input
            name="video_url"
            type="url"
            placeholder="YouTube / Vimeo link"
            autoFocus
            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
          />
        </div>
      )}

      {state.error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <div className="mt-2 flex items-center gap-1.5">
        <ImageUploaderButton key={succeeded ? "reset" : "active"} />
        <button
          type="button"
          onClick={() => setShowVideo((v) => !v)}
          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
            showVideo
              ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]"
               : "border-stone-200 text-stone-500 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-800"
          }`}
        >
          + Video
        </button>
        <div className="flex-1" />
        <p className="text-xs text-stone-400 dark:text-stone-400">+3 pts</p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
        >
          {pending ? "Replying..." : "Reply"}
        </button>
      </div>
    </form>
  );
}
