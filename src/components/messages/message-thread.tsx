"use client";

import { useCallback, useEffect, useRef } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import { formatRelative } from "@/lib/utils";
import { sendMessage, type MessageState } from "@/actions/messages";
import { setTyping } from "@/actions/online";
import { TypingIndicator } from "@/components/messages/typing-indicator";
import type { Message, ProfileRef } from "@/lib/queries";

export function MessageThread({
  conversationId,
  messages,
  partner,
  participants,
  isGroup,
  groupName,
  currentUserId,
}: {
  conversationId: string;
  messages: Message[];
  partner: ProfileRef | null;
  participants: ProfileRef[];
  isGroup: boolean;
  groupName: string | null;
  currentUserId: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const participantMap = new Map(participants.map((p) => [p.id, p]));

  return (
    <>
      {/* Header */}
      <div className="border-b border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
        {isGroup ? (
          <div>
            <p className="text-sm font-semibold dark:text-stone-100">
              {groupName ?? "Unnamed group"}
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-500">
              {participants.length} member{participants.length === 1 ? "" : "s"}
              {" · "}
              {participants
                .slice(0, 4)
                .map((p) => p.display_name ?? p.username)
                .join(", ")}
              {participants.length > 4 && ` +${participants.length - 4} more`}
            </p>
          </div>
        ) : partner ? (
          <Link
            href={`/member/${partner.username}`}
            className="flex items-center gap-2 hover:opacity-80"
          >
            <UserAvatar profile={partner} size={32} />
            <span className="text-sm font-semibold">
              {partner.display_name ?? partner.username}
            </span>
          </Link>
        ) : null}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-400">
            Start the conversation.
          </p>
        )}
        <div className="space-y-3">
          {messages.map((m) => {
            const isMine = m.sender_id === currentUserId;
            const sender = participantMap.get(m.sender_id);
            return (
              <div
                key={m.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs rounded-2xl px-4 py-2.5 ${
                    isMine
                      ? "bg-[var(--primary)] text-white"
                       : "bg-stone-100 text-stone-900 dark:bg-stone-900 dark:text-stone-100"
                  }`}
                >
                  {/* Show sender name in group chats for messages from others */}
                  {!isMine && isGroup && sender && (
                    <p className="mb-0.5 text-xs font-semibold text-[var(--primary)] dark:text-[var(--primary)]">
                      {sender.display_name ?? sender.username}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isMine ? "text-emerald-200 dark:text-emerald-300" : "text-stone-400 dark:text-stone-400"
                    }`}
                  >
                    {formatRelative(m.created_at)}
                    {isMine && m.read_at && (
                      <span className="ml-1">· read</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Typing indicator */}
      <TypingIndicator
        conversationId={conversationId}
        currentUserId={currentUserId}
      />

      {/* Composer */}
      <MessageComposer conversationId={conversationId} />
    </>
  );
}

function MessageComposer({
  conversationId,
}: {
  conversationId: string;
}) {
  const [state, formAction, pending] = useActionState<MessageState, FormData>(
    sendMessage,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !("error" in state)) formRef.current?.reset();
  }, [state]);

  const handleInput = useCallback(() => {
    setTyping(conversationId).catch(() => {});
  }, [conversationId]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex items-center gap-2 border-t border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900"
    >
      <input type="hidden" name="conversation_id" value={conversationId} />
      <input
        name="body"
        maxLength={5000}
        placeholder="Type a message…"
        autoComplete="off"
        onChange={handleInput}
        className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-400 dark:focus:border-[var(--primary)]"
      />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
      >
        {pending ? "Sending..." : "Send"}
      </button>
      {state.error && (
        <span className="text-xs text-red-600 dark:text-red-400">{state.error}</span>
      )}
    </form>
  );
}
