import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/queries";
import { ChatRoom, type ChatProfile } from "@/components/chat/chat-room";

export const metadata = { title: "Chat" };
export const dynamic = "force-dynamic";

export default async function ChatRoomPage({ params }: PageProps<"/chat/[roomId]">) {
  const { roomId } = await params;
  const profile = await requireUser();
  const settings = await getSettings();
  if (settings.chat_enabled === "false") redirect("/feed");
  const supabase = await createClient();

  const [{ data: room }, { data: rooms }] = await Promise.all([
    supabase.from("chat_rooms").select("id, name, description").eq("id", roomId).maybeSingle(),
    supabase.from("chat_rooms").select("id, name").order("created_at", { ascending: true }),
  ]);
  if (!room) notFound();

  const [{ data: messages }, { data: profiles }] = await Promise.all([
    supabase
      .from("chat_room_messages")
      .select("id, room_id, user_id, body, created_at")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(200),
    supabase.from("profiles").select("id, username, display_name, avatar_url"),
  ]);

  const roster = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p as ChatProfile]),
  );
  const otherRooms = (rooms ?? []).filter((r) => r.id !== roomId);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <ChatRoom
        roomId={room.id}
        roomName={room.name}
        roomDescription={room.description}
        otherRooms={otherRooms}
        initialMessages={messages ?? []}
        roster={roster}
        currentUserId={profile.id}
      />
    </div>
  );
}