"use client";

import { useTransition } from "react";
import { toggleEventSignup } from "@/actions/events";

export function EventSignupButton({
  eventId,
  signedUp,
  signupCount,
}: {
  eventId: string;
  signedUp: boolean;
  signupCount: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => { void toggleEventSignup(eventId); })}
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
          signedUp
            ? "border border-stone-200 text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
            : "bg-[var(--primary)] text-white hover:brightness-90"
        }`}
      >
        {pending ? "..." : signedUp ? "Cancel RSVP" : "Join Event"}
      </button>
      <span className="text-sm text-stone-500 dark:text-stone-400">
        {signupCount} {signupCount === 1 ? "attendee" : "attendees"}
      </span>
    </div>
  );
}
