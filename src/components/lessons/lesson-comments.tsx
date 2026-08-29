"use client";

import { useState, useTransition, useEffect } from "react";
import { useActionState, useRef } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import { formatRelative } from "@/lib/utils";
import {
  createLessonComment,
  deleteLessonComment,
  type LessonCommentActionState,
} from "@/actions/lesson-comments";
import type { LessonComment } from "@/lib/queries";

function CommentBody({ body, className = "" }: { body: string; className?: string }) {
  return (
    <p className={`whitespace-pre-wrap text-sm leading-relaxed text-stone-700 dark:text-stone-200 ${className}`}>
      {body}
    </p>
  );
}

function CommentForm({
  lessonId,
  parentId,
  placeholder,
  autoFocus,
  onDone,
}: {
  lessonId: string;
  parentId?: string;
  placeholder: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState<LessonCommentActionState, FormData>(
    createLessonComment,
    {},
  );
  const ref = useRef<HTMLFormElement>(null);
  const succeeded = state && !("error" in state);

  useEffect(() => {
    if (succeeded) {
      ref.current?.reset();
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-2">
      <input type="hidden" name="lesson_id" value={lessonId} />
      {parentId && <input type="hidden" name="parent_id" value={parentId} />}
      <textarea
        name="body"
        rows={parentId ? 2 : 3}
        required
        maxLength={2000}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full resize-none rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400"
      />
      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <div className="flex items-center justify-end gap-2">
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-500 transition hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
        >
          {parentId ? (pending ? "Replying..." : "Reply") : (pending ? "Posting..." : "Post")}
        </button>
      </div>
    </form>
  );
}

function DeleteButton({
  commentId,
  lessonId,
  onDeleted,
}: {
  commentId: string;
  lessonId: string;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => {
        if (!window.confirm("Delete this comment?")) return;
        startTransition(() => {
          deleteLessonComment(commentId, lessonId);
          onDeleted();
        });
      }}
      disabled={pending}
      className="text-xs text-stone-400 transition hover:text-red-600 dark:text-stone-500 dark:hover:text-red-400 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

export function LessonComments({
  lessonId,
  comments,
  currentUserId,
  isAdmin,
}: {
  lessonId: string;
  comments: LessonComment[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [replyTo, setReplyTo] = useState<LessonComment | null>(null);
  const [localDeleted, setLocalDeleted] = useState<Set<string>>(new Set());

  const visible = comments.filter((c) => !localDeleted.has(c.id));
  const roots = visible.filter((c) => !c.parent_id);
  const repliesByParent = new Map<string, LessonComment[]>();
  for (const c of visible) {
    if (c.parent_id) {
      const list = repliesByParent.get(c.parent_id) ?? [];
      list.push(c);
      repliesByParent.set(c.parent_id, list);
    }
  }

  function canModerate(c: LessonComment): boolean {
    return isAdmin || c.author_id === currentUserId;
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <h2 className="mb-1 font-semibold">Discussion</h2>
      <p className="mb-4 text-xs text-stone-400 dark:text-stone-400">
        Ask a question or chat about this lesson with the community.
      </p>

      <CommentForm lessonId={lessonId} placeholder="Share a thought, ask a question…" />

      {roots.length === 0 ? (
        <p className="mt-6 text-sm text-stone-400 dark:text-stone-400">
          No discussion yet. Be the first to comment.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {roots.map((comment) => (
            <div key={comment.id}>
              <div className="flex items-start gap-3">
                <UserAvatar profile={comment.author} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <Link
                      href={`/member/${comment.author?.username ?? ""}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {comment.author?.display_name ?? comment.author?.username ?? "Member"}
                    </Link>
                    <span className="text-xs text-stone-400 dark:text-stone-400">
                      {formatRelative(comment.created_at)}
                    </span>
                  </div>
                  <CommentBody body={comment.body} className="mt-1" />
                  <div className="mt-1.5 flex items-center gap-3">
                    <button
                      onClick={() => setReplyTo(replyTo?.id === comment.id ? null : comment)}
                      className="text-xs font-medium text-stone-400 transition hover:text-[var(--primary)] dark:text-stone-500 dark:hover:text-[var(--primary)]"
                    >
                      {replyTo?.id === comment.id ? "Cancel reply" : "Reply"}
                    </button>
                    {canModerate(comment) && (
                      <DeleteButton
                        commentId={comment.id}
                        lessonId={lessonId}
                        onDeleted={() => {
                          setLocalDeleted((prev) => new Set(prev).add(comment.id));
                          if (replyTo?.id === comment.id) setReplyTo(null);
                        }}
                      />
                    )}
                  </div>

                  {replyTo?.id === comment.id && (
                    <div className="mt-2">
                      <CommentForm
                        lessonId={lessonId}
                        parentId={comment.id}
                        placeholder={`Reply to ${comment.author?.username ?? "Member"}…`}
                        autoFocus
                        onDone={() => setReplyTo(null)}
                      />
                    </div>
                  )}

                  {(repliesByParent.get(comment.id) ?? []).length > 0 && (
                    <div className="mt-3 space-y-3 border-l-2 border-stone-100 pl-3 dark:border-stone-800">
                      {(repliesByParent.get(comment.id) ?? []).map((reply) => (
                        <div key={reply.id} className="flex items-start gap-3">
                          <UserAvatar profile={reply.author} size={28} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <Link
                                href={`/member/${reply.author?.username ?? ""}`}
                                className="text-sm font-medium hover:underline"
                              >
                                {reply.author?.display_name ?? reply.author?.username ?? "Member"}
                              </Link>
                              <span className="text-xs text-stone-400 dark:text-stone-400">
                                {formatRelative(reply.created_at)}
                              </span>
                            </div>
                            <CommentBody body={reply.body} className="mt-1" />
                            {canModerate(reply) && (
                              <div className="mt-1.5">
                                <DeleteButton
                                  commentId={reply.id}
                                  lessonId={lessonId}
                                  onDeleted={() =>
                                    setLocalDeleted((prev) => new Set(prev).add(reply.id))
                                  }
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}