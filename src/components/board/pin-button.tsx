"use client";

import { useTransition } from "react";

export function PinButton({
  pinned,
  action,
}: {
  pinned: boolean;
  action: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => action())}
      disabled={pending}
      className="text-sm text-stone-400 transition hover:text-amber-600"
    >
      {pending ? "…" : pinned ? "Unpin" : "Pin"}
    </button>
  );
}
