"use client";

import { useActionState } from "react";
import { joinWaitlist, type WaitlistActionState } from "@/actions/waitlist";

export function WaitlistForm({ siteName }: { siteName: string }) {
  const [state, formAction, pending] = useActionState<WaitlistActionState, FormData>(
    joinWaitlist,
    {},
  );

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary-light)] p-6 text-center">
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
          You&apos;re on the list!
        </p>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          {state.position != null && <>You&apos;re #{state.position} in line. </>}
          We&apos;ll email you when it&apos;s your turn to join {siteName}.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row">
        <input
          name="email"
          type="email"
          placeholder="Enter your email"
          required
          className="flex-1 rounded-xl border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-2.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
        >
          {pending ? "Joining..." : "Join waitlist"}
        </button>
      </form>
      {state.error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <p className="mt-2 text-center text-xs text-stone-400 dark:text-stone-500">
        No spam. You&apos;ll only hear from us when it&apos;s time to join.
      </p>
    </div>
  );
}
