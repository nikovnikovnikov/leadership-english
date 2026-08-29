"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSetting } from "@/actions/admin";

export function ChatSettings({ chatEnabled }: { chatEnabled: boolean }) {
  const [enabled, setEnabled] = useState(chatEnabled);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      try {
        await updateSetting("chat_enabled", String(next));
        router.refresh();
      } catch {
        setEnabled(chatEnabled);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
      <h3 className="text-sm font-semibold mb-1">Live chat</h3>
      <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
        Turning chat off hides the Chat link from the member menu. Rooms and messages are preserved
        and reappear when you turn it back on.
      </p>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          disabled={pending}
          onChange={toggle}
          className="h-4 w-4 rounded border-stone-300 dark:border-stone-800 text-[var(--primary)] focus:ring-[var(--primary)]/20"
        />
        <span className="text-sm font-medium">
          {pending ? "Saving..." : enabled ? "Chat is on" : "Chat is off"}
        </span>
      </label>
    </div>
  );
}