"use client";

import { useState } from "react";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

export function PollComposer() {
  const [active, setActive] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);

  function updateOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }

  function removeOption(i: number) {
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setActive((a) => !a)}
        className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
          active
            ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]"
            : "border-stone-200 text-stone-500 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-800"
        }`}
      >
        + Poll
      </button>

      {active && (
        <div className="mt-2 space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/50">
          <input
            name="poll_question"
            required
            maxLength={200}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Poll question"
            autoFocus
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500"
          />
          {options.map((value, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                name="poll_options"
                required
                maxLength={80}
                value={value}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500"
              />
              {options.length > MIN_OPTIONS && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-stone-400 transition hover:text-red-500"
                  aria-label={`Remove option ${i + 1}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {options.length < MAX_OPTIONS && (
            <button
              type="button"
              onClick={() => setOptions((prev) => [...prev, ""])}
              className="text-xs font-medium text-[var(--primary)] hover:underline"
            >
              + Add option
            </button>
          )}
        </div>
      )}
    </>
  );
}