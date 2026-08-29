"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createChatRoom, deleteChatRoom } from "@/actions/chat";

type Room = {
  id: string;
  name: string;
  description: string | null;
  message_count: number | null;
};

export function ChatRoomsAdmin({ rooms }: { rooms: Room[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result = await createChatRoom({}, formData);
      if (result && result.error) {
        setError(result.error);
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this room and all its messages?")) return;
    startTransition(async () => {
      const result = await deleteChatRoom(id);
      if (result && result.error) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Create room */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-4">Create a room</h3>
        <form onSubmit={handleCreate} className="space-y-3">
          <input
            name="name"
            placeholder="Room name (e.g. general)"
            maxLength={60}
            required
            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          />
          <input
            name="description"
            placeholder="Short description (optional)"
            maxLength={200}
            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          />
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
          >
            {pending ? "Creating..." : "Create room"}
          </button>
        </form>
      </div>

      {/* Rooms list */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
              <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Room</th>
              <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Messages</th>
              <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-stone-400 dark:text-stone-500">
                  No rooms yet.
                </td>
              </tr>
            ) : (
              rooms.map((room) => (
                <tr
                  key={room.id}
                  className="border-b border-stone-100 dark:border-stone-800/50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-800 dark:text-stone-100">#{room.name}</p>
                    {room.description && (
                      <p className="text-xs text-stone-400 dark:text-stone-500">{room.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-500 dark:text-stone-400">
                    {room.message_count ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/chat/${room.id}`}
                        className="rounded-lg border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 transition hover:bg-stone-50 dark:border-stone-200 dark:text-stone-300 dark:hover:bg-stone-800/50"
                      >
                        Open
                      </a>
                      <button
                        onClick={() => handleDelete(room.id)}
                        disabled={pending}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}