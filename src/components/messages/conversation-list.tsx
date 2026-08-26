"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import { formatRelative } from "@/lib/utils";
import type { ConversationSummary, ProfileRef } from "@/lib/queries";

function GroupAvatarStack({ participants }: { participants: ProfileRef[] }) {
  const shown = participants.slice(0, 3);
  return (
    <div className="relative h-10 w-10 shrink-0">
      {shown.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full border-2 border-white dark:border-stone-800"
          style={{
            width: 28,
            height: 28,
            top: i * 4,
            left: i * 6,
            zIndex: shown.length - i,
          }}
        >
          <UserAvatar profile={p} size={28} />
        </div>
      ))}
    </div>
  );
}

export function ConversationList({
  conversations,
}: {
  conversations: ConversationSummary[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      {conversations.map((c, i) => (
        <Link
          key={c.id}
          href={`/messages/${c.id}`}
          className={`flex items-center gap-3 p-4 transition hover:bg-stone-50 dark:hover:bg-stone-800/80 ${
            i > 0 ? "border-t border-stone-100 dark:border-stone-800" : ""
          }`}
        >
          {c.is_group ? (
            <GroupAvatarStack participants={c.participants} />
          ) : (
            <UserAvatar profile={c.partner} size={40} />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold">
                {c.is_group
                  ? c.name ?? "Unnamed group"
                  : c.partner?.display_name ?? c.partner?.username ?? "Unknown"}
              </p>
              <span className="shrink-0 text-xs text-stone-400 dark:text-stone-400">
                {formatRelative(c.last_message_at)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm text-stone-500 dark:text-stone-400">
                {c.is_group && (
                  <span className="text-stone-400 dark:text-stone-500">
                    {c.participants.length} members{c.last_message ? " · " : ""}
                  </span>
                )}
                {c.last_message ?? "No messages yet"}
              </p>
              {c.unread_count > 0 && (
                <span className="shrink-0 rounded-full bg-[var(--primary)] px-2 py-0.5 text-[10px] font-bold text-white">
                  {c.unread_count}
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
