"use client";

import { useState } from "react";

export type SortMode = "new" | "popular" | "discussed";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "new", label: "New" },
  { value: "popular", label: "Popular" },
  { value: "discussed", label: "Most discussed" },
];

export function FeedSort({
  initial,
  onChange,
}: {
  initial: SortMode;
  onChange: (mode: SortMode) => void;
}) {
  const [mode, setMode] = useState(initial);

  return (
    <div className="flex items-center gap-1 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-1">
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => {
            setMode(opt.value);
            onChange(opt.value);
          }}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            mode === opt.value
              ? "bg-[var(--primary)] text-white"
              : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
