"use client";

import { useState, useEffect } from "react";

export function OnlineDot({ lastSeenAt }: { lastSeenAt: string | null }) {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!lastSeenAt) return;
    const check = () => {
      setIsOnline(Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000);
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [lastSeenAt]);

  if (!isOnline) return null;

  return (
    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-stone-800" />
  );
}
