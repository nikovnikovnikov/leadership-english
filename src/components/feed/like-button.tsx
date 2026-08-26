"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ReportTargetType } from "@/lib/config";

export function LikeButton({
  targetType,
  targetId,
  initialCount,
  initialLiked,
}: {
  targetType: ReportTargetType;
  targetId: string;
  initialCount: number;
  initialLiked: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    const prevLiked = liked;
    setLiked(!prevLiked);
    setCount((c) => (prevLiked ? c - 1 : c + 1));

    const supabase = createClient();
    const { error } = await supabase.rpc("toggle_like", {
      p_target_type: targetType,
      p_target_id: targetId,
    });
    if (error) {
      setLiked(prevLiked);
      setCount((c) => (prevLiked ? c + 1 : c - 1));
    }
    setBusy(false);
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-sm transition ${
        liked ? "text-[var(--primary)]" : "text-stone-400 hover:text-[var(--primary)]"
      }`}
    >
      <svg
        viewBox="0 0 20 20"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.6 9.3h-1.1A2.5 2.5 0 0 0 3 11.8v1.1a2.5 2.5 0 0 0 2.5 2.5h1.1m0-6.1L11 5.2a1.6 1.6 0 0 1 2.2 2.1l-1 2h1.6a1.6 1.6 0 0 1 1.5 2.1l-.8 2.4a1.6 1.6 0 0 1-1.5 1.1H6.6m0-6.1v6.1"
        />
      </svg>
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
