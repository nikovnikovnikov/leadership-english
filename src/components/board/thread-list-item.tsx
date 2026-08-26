import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import { formatRelative } from "@/lib/utils";
import type { ThreadWithAuthor } from "@/lib/queries";

export function ThreadListItem({ thread }: { thread: ThreadWithAuthor }) {
  return (
    <Link
      href={`/thread/${thread.id}`}
      className="block p-3 transition hover:bg-stone-50 dark:hover:bg-stone-800/80"
    >
      <div className="flex items-center gap-2">
        {thread.pinned && (
          <span className="rounded-full bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            Pinned
          </span>
        )}
        <h3 className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
          {thread.title}
        </h3>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
        <UserAvatar profile={thread.author} size={16} />
        <span>{formatRelative(thread.last_activity_at)}</span>
        <span className="ml-auto">
          {thread.reply_count} repl{thread.reply_count === 1 ? "y" : "ies"}
        </span>
      </div>
    </Link>
  );
}
