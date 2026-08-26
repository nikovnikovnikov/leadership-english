"use client";

import { useTransition } from "react";
import { deleteAccount } from "@/actions/account";

export function DeleteAccountButton() {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      "Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone. All your posts, comments, threads, and points will be removed.",
    );
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteAccount();
      if (result?.error) alert(result.error);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete my account"}
    </button>
  );
}
