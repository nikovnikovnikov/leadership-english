"use client";

import Link from "next/link";
import Image from "next/image";
import { UserAvatar } from "@/components/user-avatar";
import { LikeButton } from "@/components/feed/like-button";
import { VideoEmbed } from "@/components/video-embed";
import { formatRelative } from "@/lib/utils";
import { categoryLabel } from "@/lib/config";
import type { FeedThread } from "@/lib/queries";

export function ThreadCard({ thread }: { thread: FeedThread }) {
  const truncatedBody =
    thread.body.length > 200
      ? thread.body.slice(0, 200) + "…"
      : thread.body;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      {/* Author row */}
      <div className="flex items-center gap-3">
        <Link href={`/member/${thread.author?.username ?? ""}`}>
          <UserAvatar profile={thread.author} size={38} />
        </Link>
        <div className="min-w-0">
          <Link
            href={`/member/${thread.author?.username ?? ""}`}
            className="block truncate text-sm font-semibold hover:underline"
          >
            {thread.author?.display_name ?? thread.author?.username ?? "Member"}
          </Link>
          <p className="text-xs text-stone-400 dark:text-stone-400">
            {formatRelative(thread.created_at)}
          </p>
        </div>
        <span className="ml-auto rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          {categoryLabel(thread.category)}
        </span>
      </div>

      {/* Title + body */}
      <Link href={`/thread/${thread.id}`} className="mt-3 block">
        <h3 className="text-base font-semibold leading-snug hover:underline dark:text-stone-100">
          {thread.title}
        </h3>
        {truncatedBody && (
          <div className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-400 line-clamp-3">
            {truncatedBody}
          </div>
        )}
      </Link>

      {/* Media */}
      {thread.media_url && (
        <Link href={`/thread/${thread.id}`} className="mt-3 block">
          <Image
            src={thread.media_url}
            alt="Thread image"
            width={600}
            height={340}
            className="mt-2 w-full rounded-xl object-cover"
          />
        </Link>
      )}

      {thread.video_url && (
        <div className="mt-3">
          <VideoEmbed url={thread.video_url} />
        </div>
      )}

      {/* Footer: replies + likes */}
      <div className="mt-3 flex items-center gap-4 border-t border-stone-100 pt-3 dark:border-stone-800">
        <Link
          href={`/thread/${thread.id}`}
          className="flex items-center gap-1 text-sm text-stone-400 transition hover:text-[var(--primary)] dark:hover:text-[var(--primary)]"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902 1.168.188 2.352.327 3.55.414.28.02.521.18.642.413l1.713 3.293a.75.75 0 001.33 0l1.713-3.293a.783.783 0 01.642-.413 41.102 41.102 0 003.55-.414c1.437-.231 2.43-1.49 2.43-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0010 2z"
              clipRule="evenodd"
            />
          </svg>
          {thread.reply_count} {thread.reply_count === 1 ? "reply" : "replies"}
        </Link>
        <LikeButton
          targetType="thread"
          targetId={thread.id}
          initialCount={thread.like_count}
          initialLiked={thread.liked_by_me}
        />
      </div>
    </div>
  );
}
