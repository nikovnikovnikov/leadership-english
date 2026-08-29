import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/queries";

export const metadata = { title: "Chat" };
export const dynamic = "force-dynamic";

export default async function ChatRoomsPage() {
  await requireUser();
  const settings = await getSettings();
  if (settings.chat_enabled === "false") redirect("/feed");
  const supabase = await createClient();

  const { data: rooms } = await supabase
    .from("chat_rooms")
    .select("id, name, description")
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight dark:text-stone-100">Chat</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Live chat rooms. Messages appear in real time.
        </p>
      </div>

      {!rooms || rooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No chat rooms yet. Ask an admin to create one.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/chat/${room.id}`}
              className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm transition hover:border-[var(--primary)]/40 hover:shadow-md"
            >
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                #{room.name}
              </p>
              {room.description && (
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  {room.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}