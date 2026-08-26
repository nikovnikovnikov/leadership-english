"use client";

import { useTransition } from "react";

export function DeleteButton({
  action,
  confirmText = "Delete this?",
}: {
  action: () => Promise<void>;
  confirmText?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (!window.confirm(confirmText)) return;
        startTransition(() => action());
      }}
      disabled={pending}
      className="text-sm text-stone-400 dark:text-stone-400 transition hover:text-red-600 dark:hover:text-red-400"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
