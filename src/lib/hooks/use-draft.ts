"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DRAFT_PREFIX = "sanctum-draft-";
const DEBOUNCE_MS = 1000;

function readDraft(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/**
 * Auto-saves textarea drafts to localStorage.
 * Restores on mount, clears on submit.
 */
export function useDraft(draftKey: string) {
  const storageKey = DRAFT_PREFIX + draftKey;
  const [value, setValue] = useState<string>(() => readDraft(storageKey));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save
  const update = useCallback(
    (newValue: string) => {
      setValue(newValue);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          if (newValue.trim()) {
            localStorage.setItem(storageKey, newValue);
          } else {
            localStorage.removeItem(storageKey);
          }
        } catch { /* ignore */ }
      }, DEBOUNCE_MS);
    },
    [storageKey],
  );

  // Clear draft
  const clear = useCallback(() => {
    setValue("");
    try {
      localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
  }, [storageKey]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { value, update, clear };
}
