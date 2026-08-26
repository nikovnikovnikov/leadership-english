"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

export function SearchForm({ initialQuery }: { initialQuery: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = inputRef.current?.value?.trim() ?? "";
        router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
      }}
      className="flex items-center gap-2"
    >
      <input
        ref={inputRef}
        type="search"
        defaultValue={initialQuery}
        placeholder="Search posts, threads, members…"
        className="w-full rounded-xl border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-2.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-90"
      >
        Search
      </button>
    </form>
  );
}
