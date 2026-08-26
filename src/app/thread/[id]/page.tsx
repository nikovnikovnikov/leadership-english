import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getThread, getThreadReplies, getCategoryLabel } from "@/lib/queries";
import { canEdit, getEditableReplyIds, buildReplyTree } from "@/lib/utils";
import { ReplyForm } from "@/components/board/reply-form";
import { ThreadContent } from "@/components/board/thread-content";

export const metadata = { title: "Thread" };

export default async function ThreadPage({
  params,
}: PageProps<"/thread/[id]">) {
  const { id } = await params;
  const profile = await requireUser();
  const supabase = await createClient();

  const thread = await getThread(id);
  if (!thread) notFound();

  const [replies, { data: sub }, label] = await Promise.all([
    getThreadReplies(id),
    supabase
      .from("thread_subscriptions")
      .select("user_id")
      .eq("user_id", profile.id)
      .eq("thread_id", id)
      .maybeSingle(),
    getCategoryLabel(thread.category),
  ]);

  const replyIds = replies.map((r) => r.id);
  const { data: likeRows } = await supabase
    .from("likes")
    .select("id, target_id, user_id")
    .in("target_id", [thread.id, ...replyIds])
    .in("target_type", ["thread", "thread_reply"]);

  const likeCounts = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of likeRows ?? []) {
    likeCounts.set(l.target_id, (likeCounts.get(l.target_id) ?? 0) + 1);
    if (l.user_id === profile.id) likedByMe.add(l.target_id);
  }

  const threadCanEdit = canEdit(thread.created_at, thread.author_id, profile.id, profile.role === "admin" || profile.role === "moderator");
  const editableReplyIds = getEditableReplyIds(replies, profile.id, profile.role === "admin" || profile.role === "moderator");
  const replyTree = buildReplyTree(replies);

  const isSubscribed = !!sub;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/board/${thread.category}`}
          className="text-xs font-medium text-stone-400 hover:text-stone-600 dark:text-stone-400 dark:hover:text-stone-300"
        >
          ← {label}
        </Link>
      </div>

      <ThreadContent
        thread={thread}
        replies={replies}
        likeCounts={likeCounts}
        likedByMe={likedByMe}
        currentUserId={profile.id}
        isAdmin={profile.role === "admin" || profile.role === "moderator"}
        canEditThread={threadCanEdit}
        editableReplyIds={editableReplyIds}
        isSubscribed={isSubscribed}
        replyTree={replyTree}
      />

      <ReplyForm threadId={thread.id} />
    </div>
  );
}
