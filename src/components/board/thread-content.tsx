"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { ThreadWithAuthor, ThreadReply } from "@/lib/queries";
import type { ReplyTreeNode } from "@/lib/utils";
import { formatRelative } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { VideoEmbed } from "@/components/video-embed";
import { LikeButton } from "@/components/feed/like-button";
import { ReportButton } from "@/components/report-button";
import { DeleteButton } from "@/components/delete-button";
import { EditButton, EditForm } from "@/components/edit-button";
import { MarkdownContent } from "@/components/markdown-content";
import { ReplyForm } from "@/components/board/reply-form";
import { Poll } from "@/components/feed/poll";
import { editThread, editReply, togglePin, deleteThread, deleteReply } from "@/actions/threads";
import { toggleThreadSubscription } from "@/actions/notifications";

function ReplyNode({
  node,
  threadId,
  likeCounts,
  likedByMe,
  currentUserId,
  isAdmin,
  editableReplyIds,
  replyingTo,
  setReplyingTo,
}: {
  node: ReplyTreeNode<ThreadReply>;
  threadId: string;
  likeCounts: Map<string, number>;
  likedByMe: Set<string>;
  currentUserId: string;
  isAdmin: boolean;
  editableReplyIds: string[];
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
}) {
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const canDeleteReply = isAdmin || node.author_id === currentUserId;

  return (
    <div>
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-start gap-3">
          <Link href={`/member/${node.author?.username ?? ""}`}>
            <UserAvatar profile={node.author} size={32} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {node.author?.display_name ?? node.author?.username}
              </span>
              <span className="text-xs text-stone-400 dark:text-stone-400">
                {formatRelative(node.created_at)}
              </span>
              <div className="ml-auto flex items-center gap-3">
                <LikeButton
                  targetType="thread_reply"
                  targetId={node.id}
                  initialCount={likeCounts.get(node.id) ?? 0}
                  initialLiked={likedByMe.has(node.id)}
                />
                <ReportButton targetType="thread_reply" targetId={node.id} />
                {editableReplyIds.includes(node.id) && editingReply !== node.id && (
                  <EditButton onClick={() => setEditingReply(node.id)} />
                )}
                {canDeleteReply && (
                  <DeleteButton
                    action={() => deleteReply(node.id, threadId)}
                  />
                )}
              </div>
            </div>
            {editingReply === node.id ? (
              <div className="mt-2">
                <EditForm
                  initialBody={node.body}
                  onSave={(body) => editReply(node.id, body, threadId)}
                  onCancel={() => setEditingReply(null)}
                />
              </div>
            ) : (
              <div className="mt-1.5 text-sm leading-relaxed">
                <MarkdownContent content={node.body} />
                {node.media_url && (
                  <div className="mt-2">
                    <Image
                      src={node.media_url}
                      alt="Attached image"
                      width={500}
                      height={300}
                      className="max-h-64 rounded-lg border border-stone-200 object-cover dark:border-stone-800"
                    />
                  </div>
                )}
                {node.video_url && (
                  <div className="mt-2">
                    <VideoEmbed url={node.video_url} />
                  </div>
                )}
              </div>
            )}

            {/* Reply button */}
            {replyingTo !== node.id && (
              <button
                type="button"
                onClick={() => setReplyingTo(node.id)}
                className="mt-2 text-xs font-medium text-stone-400 transition hover:text-[var(--primary)] dark:text-stone-400 dark:hover:brightness-110"
              >
                Reply
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline reply form */}
      {replyingTo === node.id && (
        <div className="ml-8 mt-2">
          <ReplyForm
            threadId={threadId}
            parentReplyId={node.id}
            parentAuthorName={node.author?.username ?? undefined}
            onCancel={() => setReplyingTo(null)}
          />
        </div>
      )}

      {/* Nested children */}
      {node.children.length > 0 && (
        <div className="ml-6 mt-2 space-y-2 border-l-2 border-stone-100 pl-3 dark:border-stone-800">
          {node.children.map((child: ReplyTreeNode<ThreadReply>) => (
            <ReplyNode
              key={child.id}
              node={child}
              threadId={threadId}
              likeCounts={likeCounts}
              likedByMe={likedByMe}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              editableReplyIds={editableReplyIds}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ThreadContent({
  thread,
  replies,
  likeCounts,
  likedByMe,
  currentUserId,
  isAdmin,
  canEditThread = false,
  editableReplyIds = [],
  isSubscribed = false,
  replyTree,
}: {
  thread: ThreadWithAuthor;
  replies: ThreadReply[];
  likeCounts: Map<string, number>;
  likedByMe: Set<string>;
  currentUserId: string;
  isAdmin: boolean;
  canEditThread?: boolean;
  editableReplyIds?: string[];
  isSubscribed?: boolean;
  replyTree: ReplyTreeNode<ThreadReply>[];
}) {
  const canDeleteThread = isAdmin || thread.author_id === currentUserId;

  const [editingThread, setEditingThread] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-start gap-3">
          <Link href={`/member/${thread.author?.username ?? ""}`}>
            <UserAvatar profile={thread.author} size={40} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {thread.pinned && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                  Pinned
                </span>
              )}
              <h1 className="text-xl font-semibold tracking-tight">
                {thread.title}
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-400">
              {thread.author?.display_name ?? thread.author?.username} ·{" "}
              {formatRelative(thread.created_at)}
            </p>

            {editingThread ? (
              <div className="mt-3">
                <EditForm
                  initialBody={thread.body}
                  onSave={(body) => editThread(thread.id, body)}
                  onCancel={() => setEditingThread(false)}
                />
              </div>
            ) : (
              <div className="mt-3 text-[15px] leading-relaxed">
                <MarkdownContent content={thread.body} />
                {thread.media_url && (
                  <div className="mt-3">
                    <Image
                      src={thread.media_url}
                      alt="Attached image"
                      width={600}
                      height={400}
                      className="max-h-80 rounded-xl border border-stone-200 object-cover dark:border-stone-800"
                    />
                  </div>
                )}
                {thread.video_url && (
                  <div className="mt-3">
                    <VideoEmbed url={thread.video_url} />
                  </div>
                )}
                {thread.poll && <Poll threadId={thread.id} poll={thread.poll} />}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 border-t border-stone-100 pt-3 dark:border-stone-800">
          <LikeButton
            targetType="thread"
            targetId={thread.id}
            initialCount={likeCounts.get(thread.id) ?? 0}
            initialLiked={likedByMe.has(thread.id)}
          />
          <span className="text-sm text-stone-400 dark:text-stone-400">
            {replies.length} repl{replies.length === 1 ? "y" : "ies"}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <ReportButton targetType="thread" targetId={thread.id} />
            {canEditThread && !editingThread && (
              <EditButton onClick={() => setEditingThread(true)} />
            )}
            <button
              type="button"
              onClick={() => toggleThreadSubscription(thread.id)}
              className={`text-sm transition ${isSubscribed ? "text-[var(--primary)] font-medium dark:text-[var(--primary)]" : "text-stone-400 hover:text-stone-600 dark:text-stone-400 dark:hover:text-stone-200"}`}
            >
              {isSubscribed ? "Subscribed" : "Subscribe"}
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => togglePin(thread.id)}
                className="text-sm text-stone-400 transition hover:text-amber-600 dark:text-stone-400 dark:hover:text-amber-400"
              >
                {thread.pinned ? "Unpin" : "Pin"}
              </button>
            )}
            {canDeleteThread && (
              <DeleteButton
                action={() => deleteThread(thread.id)}
                confirmText="Delete this thread and all its replies?"
              />
            )}
          </div>
        </div>
      </article>

      {/* Nested replies */}
      {replyTree.length > 0 && (
        <div className="space-y-3">
          {replyTree.map((node) => (
            <ReplyNode
              key={node.id}
              node={node}
              threadId={thread.id}
              likeCounts={likeCounts}
              likedByMe={likedByMe}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              editableReplyIds={editableReplyIds}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
            />
          ))}
        </div>
      )}
    </div>
  );
}
