import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/queries";
import { ChatRoomsAdmin } from "@/components/admin/chat-rooms";
import { ChatSettings } from "@/components/admin/chat-settings";

export const metadata = { title: "Chat — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminChatPage() {
  await requireAdmin();
  const supabase = await createClient();
  const settings = await getSettings();

  const { data: rooms } = await supabase
    .from("chat_rooms")
    .select("id, name, description")
    .order("created_at", { ascending: true });

  const rows = rooms ?? [];

  const counts = await Promise.all(
    rows.map(async (room) => {
      const { count } = await supabase
        .from("chat_room_messages")
        .select("id", { count: "exact", head: true })
        .eq("room_id", room.id);
      return { id: room.id, count };
    }),
  );
  const countMap = new Map(counts.map((c) => [c.id, c.count]));

  const roomsWithCounts = rows.map((room) => ({
    ...room,
    message_count: countMap.get(room.id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Manage live chat rooms. Members see rooms in real time under the Chat link.
      </p>
      <ChatSettings chatEnabled={settings.chat_enabled !== "false"} />
      <ChatRoomsAdmin rooms={roomsWithCounts} />
    </div>
  );
}