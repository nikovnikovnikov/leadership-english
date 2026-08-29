"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createThread, type ThreadActionState } from "@/actions/threads";
import { FormattingToolbar } from "@/components/formatting-toolbar";
import { ImageUploaderButton } from "@/components/image-uploader-button";
import { PollComposer } from "@/components/feed/poll-composer";
import { useDraft } from "@/lib/hooks/use-draft";

export function ThreadComposer({ category }: { category: string }) {
  const [state, formAction, pending] = useActionState<ThreadActionState, FormData>(
    createThread,
    {},
  );
  const ref = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const succeeded = state && !("error" in state);
  const titleDraft = useDraft(`thread-title-${category}`);
  const bodyDraft = useDraft(`thread-body-${category}`);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (succeeded) {
      ref.current?.reset();
      titleDraft.clear();
      bodyDraft.clear();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={ref}
      action={formAction}
      className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <input type="hidden" name="category" value={category} />
      <input
        name="title"
        required
        maxLength={200}
        value={titleDraft.value}
        onChange={(e) => titleDraft.update(e.target.value)}
        placeholder="Thread title"
        className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
      />
      <FormattingToolbar textareaRef={textareaRef} />
      <textarea
        ref={textareaRef}
        name="body"
        rows={4}
        required
        maxLength={5000}
        value={bodyDraft.value}
        onChange={(e) => bodyDraft.update(e.target.value)}
        placeholder="Start the discussion…"
        className="mt-2 w-full resize-none rounded-b-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
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
      <div className="mt-3 flex items-center gap-1.5">
        <PollComposer key={succeeded ? "reset" : "active"} />
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
        <p className="text-xs text-stone-400 dark:text-stone-400">+8 pts</p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
        >
          {pending ? "Posting..." : "Start thread"}
        </button>
      </div>
    </form>
  );
}
