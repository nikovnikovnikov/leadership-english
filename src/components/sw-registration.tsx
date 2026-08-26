"use client";

import { useEffect } from "react";

export function SWRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Unregister any old service workers to avoid stale chunk caching
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) reg.unregister();
      });
    }
  }, []);

  return null;
}
