"use client";

import { useTransition } from "react";
import { logout } from "@/actions/auth";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => logout())}
      disabled={pending}
      className="text-sm text-stone-500 dark:text-stone-400 transition hover:text-stone-900 dark:hover:text-stone-100"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
