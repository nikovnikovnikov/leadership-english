import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getConversations } from "@/lib/queries";
import { ConversationList } from "@/components/messages/conversation-list";

export const metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const profile = await requireUser();
  const conversations = await getConversations(profile.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight dark:text-stone-100">Messages</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Private conversations with other members.
          </p>
        </div>
        <Link
          href="/messages/new-group"
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90"
        >
          New group
        </Link>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No conversations yet. Visit a member&apos;s profile to start one, or create a group chat.
          </p>
        </div>
      ) : (
        <ConversationList conversations={conversations} />
      )}
    </div>
  );
}
