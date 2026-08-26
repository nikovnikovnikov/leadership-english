"use client";

import { useActionState } from "react";
import { startConversation, type MessageState } from "@/actions/messages";

export function MessageButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<MessageState, FormData>(
    startConversation,
    {},
  );

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="user_id" value={userId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800/80 disabled:opacity-50"
        >
          {pending ? "Sending..." : "Message"}
        </button>
      </form>
      {state.error && (
        <p className="mt-1 text-xs text-red-600">{state.error}</p>
      )}
    </div>
  );
}
