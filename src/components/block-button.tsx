"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleBlock } from "@/actions/notifications";

export function BlockButton({
  targetUserId,
  isBlocked,
}: {
  targetUserId: string;
  isBlocked: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(isBlocked ? "Unblock this user?" : "Block this user? They won't be able to see your content or message you.")) return;
        startTransition(async () => {
          await toggleBlock(targetUserId);
          router.refresh();
        });
      }}
      className={`text-xs transition ${isBlocked ? "text-[var(--primary)] hover:text-[var(--primary)] dark:text-[var(--primary)] dark:hover:brightness-110" : "text-stone-400 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400"}`}
    >
      {pending ? "..." : isBlocked ? "Unblock" : "Block"}
    </button>
  );
}
