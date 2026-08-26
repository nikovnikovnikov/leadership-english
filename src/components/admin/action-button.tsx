"use client";

import { useTransition } from "react";

export function AdminActionButton({
  action,
  label,
  className,
}: {
  action: () => Promise<void>;
  label: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => action())}
      disabled={pending}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${className ?? ""}`}
    >
      {pending ? "…" : label}
    </button>
  );
}
