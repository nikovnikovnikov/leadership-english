"use client";

import { useEffect, useState } from "react";
import { getTypingUsers, setTyping } from "@/actions/online";

export function TypingIndicator({
  conversationId,
  currentUserId,
}: {
  conversationId: string;
  currentUserId: string;
}) {
  const [typingUsers, setTypingUsers] = useState<
    { id: string; username: string; display_name: string | null }[]
  >([]);

  // Poll for typing users every 2 seconds
  useEffect(() => {
    let active = true;
    const poll = async () => {
      const users = await getTypingUsers(conversationId, currentUserId);
      if (active) setTypingUsers(users);
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [conversationId, currentUserId]);

  if (typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => u.display_name ?? u.username);
  const text =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-1.5 px-4 py-1 text-xs text-stone-400 dark:text-stone-400">
      <span className="flex gap-0.5">
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 dark:bg-stone-500 [animation-delay:0ms]" />
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 dark:bg-stone-500 [animation-delay:150ms]" />
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400 dark:bg-stone-500 [animation-delay:300ms]" />
      </span>
      <span>{text}</span>
    </div>
  );
}

/** Fires setTyping on a debounced basis. Attach to input onChange. */
export function useTypingEmitter(conversationId: string) {
  const emit = () => {
    setTyping(conversationId).catch(() => {});
  };
  return emit;
}
