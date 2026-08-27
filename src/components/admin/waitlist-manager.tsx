"use client";

import { useState, useTransition } from "react";
import { admitWaitlistUser, declineWaitlistUser, admitNextBatch } from "@/actions/waitlist";

type WaitlistEntry = {
  id: string;
  email: string;
  position: number;
  status: string;
  note: string | null;
  created_at: string;
  admitted_at: string | null;
};

type Filter = "all" | "pending" | "admitted" | "declined";

export function WaitlistManager({
  entries: initialEntries,
  stats,
}: {
  entries: WaitlistEntry[];
  stats: { total: number; pending: number; admitted: number; declined: number };
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, startTransition] = useTransition();
  const [batchSize, setBatchSize] = useState(20);

  const filtered = filter === "all" ? entries : entries.filter((e) => e.status === filter);

  function handleAdmit(id: string) {
    startTransition(async () => {
      await admitWaitlistUser(id);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, status: "admitted", admitted_at: new Date().toISOString() } : e,
        ),
      );
    });
  }

  function handleDecline(id: string) {
    startTransition(async () => {
      await declineWaitlistUser(id);
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status: "declined" } : e)));
    });
  }

  function handleBatchAdmit() {
    startTransition(async () => {
      await admitNextBatch(batchSize);
      setEntries((prev) => {
        let count = 0;
        return prev.map((e) => {
          if (e.status === "pending" && count < batchSize) {
            count++;
            return { ...e, status: "admitted", admitted_at: new Date().toISOString() };
          }
          return e;
        });
      });
    });
  }

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "admitted", label: "Admitted", count: stats.admitted },
    { key: "declined", label: "Declined", count: stats.declined },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-2xl border p-4 text-left transition ${
              filter === tab.key
                ? "border-[var(--primary)] bg-[var(--primary-light)]"
                : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900"
            }`}
          >
            <p className="text-xs font-medium text-stone-400 dark:text-stone-500">{tab.label}</p>
            <p className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{tab.count}</p>
          </button>
        ))}
      </div>

      {/* Batch admit */}
      {stats.pending > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Admit next
          </p>
          <input
            type="number"
            min={1}
            max={stats.pending}
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e.target.value) || 1)}
            className="w-20 rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-2 py-1 text-sm outline-none focus:border-[var(--primary)]"
          />
          <p className="text-sm text-stone-600 dark:text-stone-300">
            {batchSize === 1 ? "person" : "people"} ({stats.pending} pending)
          </p>
          <button
            onClick={handleBatchAdmit}
            disabled={pending}
            className="ml-auto rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
          >
            {pending ? "Sending..." : "Admit & email"}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
              <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">#</th>
              <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Email</th>
              <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Joined</th>
              <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Status</th>
              <th className="px-4 py-3 font-medium text-stone-500 dark:text-stone-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-400 dark:text-stone-500">
                  No entries match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-stone-100 dark:border-stone-800/50 last:border-0"
                >
                  <td className="px-4 py-3 text-stone-400 dark:text-stone-500">{entry.position}</td>
                  <td className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">
                    {entry.email}
                  </td>
                  <td className="px-4 py-3 text-stone-500 dark:text-stone-400">
                    {new Date(entry.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        entry.status === "pending"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                          : entry.status === "admitted"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                      }`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {entry.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAdmit(entry.id)}
                          disabled={pending}
                          className="rounded-lg bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white transition hover:brightness-90 disabled:opacity-50"
                        >
                          Admit
                        </button>
                        <button
                          onClick={() => handleDecline(entry.id)}
                          disabled={pending}
                          className="rounded-lg border border-stone-200 dark:border-stone-800 px-3 py-1 text-xs font-medium text-stone-600 dark:text-stone-300 transition hover:bg-stone-50 dark:hover:bg-stone-800/50 disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {entry.status === "admitted" && entry.admitted_at && (
                      <span className="text-xs text-stone-400 dark:text-stone-500">
                        Sent {new Date(entry.admitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
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
