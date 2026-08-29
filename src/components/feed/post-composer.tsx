"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createThread, type ThreadActionState } from "@/actions/threads";
import { FormattingToolbar } from "@/components/formatting-toolbar";
import { useDraft } from "@/lib/hooks/use-draft";
import { ImageUploaderButton } from "@/components/image-uploader-button";
import { PollComposer } from "@/components/feed/poll-composer";

type Category = { id: string; label: string };

export function FeedComposer({ categories }: { categories: Category[] }) {
  const [state, formAction, pending] = useActionState<ThreadActionState, FormData>(
    createThread,
    {},
  );
  const ref = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const succeeded = state && !("error" in state);
  const { value: bodyValue, update: updateBody, clear: clearBody } = useDraft("feed-composer-body");
  const { value: titleValue, update: updateTitle, clear: clearTitle } = useDraft("feed-composer-title");
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (succeeded) {
      ref.current?.reset();
      clearBody();
      clearTitle();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={ref}
      action={formAction}
      id="new-thread"
      className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex gap-2">
        <select
          name="category"
          required
          className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-[var(--primary)]"
        >
          <option value="">Board…</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
        <input
          name="title"
          required
          maxLength={200}
          value={titleValue}
          onChange={(e) => updateTitle(e.target.value)}
          placeholder="Thread title"
          className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
        />
      </div>

      <FormattingToolbar textareaRef={textareaRef} />
      <textarea
        ref={textareaRef}
        name="body"
        rows={3}
        required
        maxLength={5000}
        value={bodyValue}
        onChange={(e) => updateBody(e.target.value)}
        placeholder="What's on your mind?"
        className="w-full resize-none rounded-b-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none placeholder:text-stone-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
      />

      {showVideo && (
        <div className="mt-2">
          <input
            name="video_url"
            type="url"
            placeholder="YouTube / Vimeo / Instagram Reel link"
            autoFocus
            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
          />
        </div>
      )}

      {state.error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <div className="mt-2 flex items-center gap-1.5">
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
        <p className="text-xs text-stone-400 dark:text-stone-400">
          +8 pts
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
        >
          {pending ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}
