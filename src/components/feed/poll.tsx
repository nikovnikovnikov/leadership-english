"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PollData } from "@/lib/queries";

export function Poll({ threadId, poll }: { threadId: string; poll: PollData }) {
  const [data, setData] = useState(poll);
  const [busy, setBusy] = useState(false);

  async function vote(optionIndex: number) {
    if (busy) return;
    const prev = data;
    const prevVoted = prev.votedOption;

    const nextCounts = [...prev.counts];
    if (prevVoted !== null) nextCounts[prevVoted] = Math.max(0, nextCounts[prevVoted] - 1);
    if (prevVoted === optionIndex) {
      // Toggling off your current choice
      setData((d) => ({
        ...d,
        counts: nextCounts,
        total: nextCounts.reduce((a, b) => a + b, 0),
        votedOption: null,
      }));
    } else {
      nextCounts[optionIndex] = (nextCounts[optionIndex] ?? 0) + 1;
      setData((d) => ({
        ...d,
        counts: nextCounts,
        total: nextCounts.reduce((a, b) => a + b, 0),
        votedOption: optionIndex,
      }));
    }

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("toggle_poll_vote", {
      p_thread_id: threadId,
      p_option_index: optionIndex,
    });
    if (error) setData(prev);
    setBusy(false);
  }

  return (
    <div className="mt-3 rounded-xl border border-stone-100 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/60">
      <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{data.question}</p>
      <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">
        {data.total} {data.total === 1 ? "vote" : "votes"}
      </p>

      <div className="mt-2 space-y-1.5">
        {data.options.map((option, i) => {
          const count = data.counts[i] ?? 0;
          const pct = data.total ? Math.round((count / data.total) * 100) : 0;
          const mine = data.votedOption === i;
          return (
            <button
              key={i}
              type="button"
              disabled={busy}
              onClick={() => vote(i)}
              className={`block w-full rounded-lg border px-3 py-2 text-left transition disabled:opacity-60 ${
                mine
                  ? "border-[var(--primary)] bg-[var(--primary-light)]"
                  : "border-stone-200 bg-white hover:border-[var(--primary)]/40 dark:border-stone-700 dark:bg-stone-900"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium text-stone-700 dark:text-stone-200">
                  {option}
                </span>
                <span className="shrink-0 text-xs font-semibold text-stone-500 dark:text-stone-400">
                  {data.total ? `${count} · ${pct}%` : "0"}
                </span>
              </span>
              <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                <span
                  className={`block h-full rounded-full transition-all ${mine ? "bg-[var(--primary)]" : "bg-stone-300 dark:bg-stone-600"}`}
                  style={{ width: `${pct}%` }}
                />
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-stone-400 dark:text-stone-500">
        {data.votedOption !== null
          ? "Click your choice again to remove your vote."
          : "Tap an option to vote."}
      </p>
    </div>
  );
}