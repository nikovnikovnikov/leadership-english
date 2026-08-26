import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GroupChatForm } from "@/components/messages/group-chat-form";

export const metadata = { title: "New Group Chat" };

export default async function NewGroupPage() {
  const profile = await requireUser();

  // Fetch all members for the picker
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .neq("id", profile.id)
    .order("display_name", { ascending: true });

  const members = (data ?? []) as {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  }[];

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href="/messages"
          className="text-xs font-medium text-stone-400 dark:text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
        >
          ← Back to messages
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight dark:text-stone-100">
          New group chat
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Create a group conversation with multiple members.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <GroupChatForm members={members} />
      </div>
    </div>
  );
}
