"use client";

import { useState } from "react";
import { useTransition } from "react";
import { generateInvite } from "@/actions/invites";

type Invite = {
  id: string;
  code: string;
  usedBy: { display_name?: string; username?: string } | null;
  usedAt: string | null;
  createdAt: string;
};

export function InviteManager({
  invites,
  maxInvites,
  usedCount,
}: {
  invites: Invite[];
  maxInvites: number;
  usedCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const available = maxInvites - usedCount;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  function handleGenerate() {
    startTransition(async () => {
      setError(null);
      const result = await generateInvite();
      if (result.error) setError(result.error);
    });
  }

  function handleCopy(code: string) {
    const url = `${baseUrl}/signup?invite=${code}`;
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {available} of {maxInvites} invite{maxInvites !== 1 ? "s" : ""} remaining
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {usedCount} used
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={available <= 0 || pending}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
          >
            {pending ? "Generating…" : "Generate invite"}
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 dark:bg-red-500/15 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      {invites.length === 0 && (
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No invite codes yet. Generate one above to invite someone.
          </p>
        </div>
      )}

      {invites.map((invite) => (
        <div
          key={invite.id}
          className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-lg font-semibold tracking-wider">
                {invite.code}
              </p>
              {invite.usedBy ? (
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  Used by @{invite.usedBy.username ?? "unknown"}
                </p>
              ) : (
                <p className="mt-1 text-xs text-stone-400 dark:text-stone-400">
                  Unused
                </p>
              )}
            </div>
            {!invite.usedBy && (
              <button
                onClick={() => handleCopy(invite.code)}
                className="rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1.5 text-sm font-medium text-stone-700 dark:text-stone-200 transition hover:bg-stone-50 dark:hover:bg-stone-800/80"
              >
                {copied === invite.code ? "Copied!" : "Copy link"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
