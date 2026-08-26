"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type AuthState } from "@/actions/auth";

export function SignupForm({ inviteCode, betaMode, betaSpots, invitesRequired }: {
  inviteCode?: string;
  betaMode?: boolean;
  betaSpots?: number;
  invitesRequired?: boolean;
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signup, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-500/15 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.ok && state.message && (
        <p className="rounded-lg bg-[var(--primary-light)] dark:bg-[var(--primary-light)] px-3 py-2 text-sm text-[var(--primary)] dark:text-[var(--primary)]">
          {state.message}
        </p>
      )}

      {betaMode && betaSpots !== undefined && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          Beta mode — <strong>{betaSpots}</strong> spot{betaSpots !== 1 ? "s" : ""} remaining
        </div>
      )}

      {invitesRequired && !inviteCode && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          This community requires an invite code to join.
        </div>
      )}

      {!inviteCode && (
        <div>
          <label htmlFor="invite_code" className="mb-1 block text-sm font-medium">
            Invite code <span className="text-stone-400">(optional)</span>
          </label>
          <input
            id="invite_code"
            name="invite_code"
            placeholder="e.g. ABC12345"
            defaultValue=""
            className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </div>
      )}
      {inviteCode && (
        <input type="hidden" name="invite_code" value={inviteCode} />
      )}
      <div>
        <label htmlFor="display_name" className="mb-1 block text-sm font-medium">
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          placeholder="How you'll appear to members"
          className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
        />
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          At least 8 characters.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <input
          id="agree_terms"
          name="agree_terms"
          type="checkbox"
          required
          className="mt-0.5 h-4 w-4 rounded border-stone-300 dark:border-stone-800 text-[var(--primary)] focus:ring-[var(--primary)]/20"
        />
        <label htmlFor="agree_terms" className="text-sm text-stone-600 dark:text-stone-300">
          I agree to the{" "}
          <a
            href="/legal/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--primary)] dark:text-[var(--primary)] hover:underline"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--primary)] dark:text-[var(--primary)] hover:underline"
          >
            Privacy Policy
          </a>
          .
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create account"}
      </button>
      <p className="text-center text-sm text-stone-500 dark:text-stone-400">
        Already a member?{" "}
        <Link href="/login" className="font-medium text-[var(--primary)] dark:text-[var(--primary)] hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
