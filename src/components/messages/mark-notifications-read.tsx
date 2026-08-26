"use client";

import { useEffect } from "react";
import { markNotificationsRead } from "@/actions/notifications";

export function MarkNotificationsRead() {
  useEffect(() => {
    markNotificationsRead().catch(() => {});
  }, []);

  return null;
}
