"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { FeedPost } from "@/lib/queries";
import { formatRelative } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { VideoEmbed } from "@/components/video-embed";
import { LikeButton } from "@/components/feed/like-button";
import { CommentForm } from "@/components/feed/comment-form";
import { ReportButton } from "@/components/report-button";
import { DeleteButton } from "@/components/delete-button";
import { EditButton, EditForm } from "@/components/edit-button";
import { MarkdownContent } from "@/components/markdown-content";
import { editPost, editComment, deletePost } from "@/actions/feed";

export function PostCard({
  post,
  currentUserId,
  isAdmin,
  canEditPost = false,
  editableCommentIds = [],
}: {
  post: FeedPost;
  currentUserId: string;
  isAdmin: boolean;
  canEditPost?: boolean;
  editableCommentIds?: string[];
}) {
  const canDelete = isAdmin || post.author_id === currentUserId;

  const [editingPost, setEditingPost] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center gap-3">
        <Link href={`/member/${post.author?.username ?? ""}`}>
          <UserAvatar profile={post.author} size={38} />
        </Link>
        <div className="min-w-0">
          <Link
            href={`/member/${post.author?.username ?? ""}`}
            className="block truncate text-sm font-semibold hover:underline"
          >
            {post.author?.display_name ?? post.author?.username ?? "Member"}
          </Link>
          <p className="text-xs text-stone-400 dark:text-stone-400">
            {formatRelative(post.created_at)}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {canEditPost && !editingPost && (
            <EditButton onClick={() => setEditingPost(true)} />
          )}
          {canDelete && (
            <DeleteButton action={deletePost.bind(null, post.id)} />
          )}
        </div>
      </div>

      {editingPost ? (
        <div className="mt-3">
          <EditForm
            initialBody={post.body}
            onSave={(body) => editPost(post.id, body)}
            onCancel={() => setEditingPost(false)}
          />
        </div>
      ) : (
        <div className="mt-3 text-[15px] leading-relaxed">
          <MarkdownContent content={post.body} />
        </div>
      )}

      {post.media_url && (
        <Image
          src={post.media_url}
          alt=""
          width={600}
          height={400}
          className="mt-3 w-full rounded-xl object-contain"
        />
      )}

      {post.video_url && (
        <div className="mt-3">
          <VideoEmbed url={post.video_url} />
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 border-t border-stone-100 pt-3 dark:border-stone-800">
        <LikeButton
          targetType="feed_post"
          targetId={post.id}
          initialCount={post.like_count}
          initialLiked={post.liked_by_me}
        />
        <span className="flex items-center gap-1 text-sm text-stone-400 dark:text-stone-400">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 13.5h3.5M6.5 4.5h7A2.5 2.5 0 0 1 16 7v4.5a2.5 2.5 0 0 1-2.5 2.5H9l-3.6 2.9c-.4.3-1 .1-1-.5V7A2.5 2.5 0 0 1 6.9 4.5Z"
            />
          </svg>
          {post.comment_count > 0 && <span>{post.comment_count}</span>}
        </span>
        <div className="ml-auto">
          <ReportButton targetType="feed_post" targetId={post.id} />
        </div>
      </div>

      {post.comments.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
          {post.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <UserAvatar profile={c.author} size={24} />
              <div className="min-w-0 flex-1 rounded-xl bg-stone-50 px-3 py-2 dark:bg-stone-800/80">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold">
                    {c.author?.display_name ?? c.author?.username ?? "Member"}
                    <span className="ml-1.5 font-normal text-stone-400 dark:text-stone-400">
                      {formatRelative(c.created_at)}
                    </span>
                  </p>
                  {editableCommentIds.includes(c.id) && editingComment !== c.id && (
                    <button
                      type="button"
                      onClick={() => setEditingComment(c.id)}
                      className="text-xs text-stone-300 hover:text-stone-500 dark:text-stone-400 dark:hover:text-stone-300">
                      Edit
                    </button>
                  )}
                </div>
                {editingComment === c.id ? (
                  <div className="mt-1">
                    <EditForm
                      initialBody={c.body}
                      onSave={(body) => editComment(c.id, body)}
                      onCancel={() => setEditingComment(null)}
                      maxLength={2000}
                    />
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed">
                    <MarkdownContent content={c.body} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CommentForm postId={post.id} />
    </article>
  );
}
