"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { sendChatMessage, type ChatActionState } from "@/actions/chat";
import { UserAvatar } from "@/components/user-avatar";
import { formatRelative } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  room_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type ChatProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export function ChatRoom({
  roomId,
  roomName,
  roomDescription,
  otherRooms,
  initialMessages,
  roster,
  currentUserId,
}: {
  roomId: string;
  roomName: string;
  roomDescription: string | null;
  otherRooms: { id: string; name: string }[];
  initialMessages: ChatMessage[];
  roster: Record<string, ChatProfile>;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Live messages via Supabase Realtime
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const incoming = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Keep the newest message in view
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const [state, formAction, pending] = useActionState<ChatActionState, FormData>(
    sendChatMessage,
    {},
  );

  useEffect(() => {
    if (state && !("error" in state)) formRef.current?.reset();
  }, [state]);

  function profileFor(userId: string): ChatProfile {
    return (
      roster[userId] ?? {
        id: userId,
        username: "member",
        display_name: "Member",
        avatar_url: null,
      }
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
        <div>
          <p className="text-sm font-semibold dark:text-stone-100">{roomName}</p>
          {roomDescription && (
            <p className="text-xs text-stone-400 dark:text-stone-500">{roomDescription}</p>
          )}
        </div>
        <Link
          href="/chat"
          className="rounded-lg border border-stone-200 px-3 py-1 text-xs font-medium text-stone-500 transition hover:bg-stone-50 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-800"
        >
          All rooms
        </Link>
      </div>

      {/* Room switcher */}
      {otherRooms.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-stone-100 bg-white px-4 py-2 dark:border-stone-800 dark:bg-stone-900">
          {otherRooms.map((r) => (
            <Link
              key={r.id}
              href={`/chat/${r.id}`}
              className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-500 transition hover:bg-stone-50 hover:text-stone-900 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            >
              {r.name}
            </Link>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-400">
            No messages yet. Say hello!
          </p>
        )}
        <div className="space-y-3">
          {messages.map((m) => {
            const isMine = m.user_id === currentUserId;
            const sender = profileFor(m.user_id);
            return (
              <div
                key={m.id}
                className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
              >
                {!isMine && <UserAvatar profile={sender} size={28} />}
                <div
                  className={`max-w-xs rounded-2xl px-4 py-2.5 ${
                    isMine
                      ? "bg-[var(--primary)] text-white"
                      : "bg-stone-100 text-stone-900 dark:bg-stone-900 dark:text-stone-100"
                  }`}
                >
                  {!isMine && (
                    <p className="mb-0.5 text-xs font-semibold text-[var(--primary)]">
                      {sender.display_name ?? sender.username}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isMine ? "text-emerald-200 dark:text-emerald-300" : "text-stone-400"
                    }`}
                  >
                    {formatRelative(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <form
        ref={formRef}
        action={formAction}
        className="flex items-center gap-2 border-t border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900"
      >
        <input type="hidden" name="room_id" value={roomId} />
        <input
          name="body"
          maxLength={2000}
          placeholder={`Message #${roomName}…`}
          autoComplete="off"
          className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
        >
          {pending ? "Sending..." : "Send"}
        </button>
        {state.error && (
          <span className="hidden text-xs text-red-600 sm:inline dark:text-red-400">
            {state.error}
          </span>
        )}
      </form>
    </>
  );
}