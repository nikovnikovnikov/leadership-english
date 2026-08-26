"use client";

import { useState, useSyncExternalStore } from "react";

const CONSENT_KEY = "cookie-consent";
const CONSENT_VERSION = "1.0";

function getConsentSnapshot() {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored && JSON.parse(stored).version === CONSENT_VERSION) return "accepted";
  } catch {
    /* localStorage unavailable */
  }
  return "pending";
}

function subscribe() {
  return () => {};
}

export function CookieConsent() {
  const consent = useSyncExternalStore(subscribe, getConsentSnapshot, () => "pending");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || consent === "accepted") return null;

  function accept() {
    try {
      localStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({ version: CONSENT_VERSION, acceptedAt: Date.now() }),
      );
    } catch {
      /* storage unavailable — banner reappears next visit */
    }
    setDismissed(true);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-stone-800 dark:bg-stone-900/95">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-600 dark:text-stone-300">
          We use only strictly necessary session cookies to keep you logged in.
          No analytics or tracking cookies are used. See our{" "}
          <a
            href="/legal/privacy"
            className="font-medium text-[var(--primary)] hover:underline dark:text-[var(--primary)]"
          >
            Privacy Policy
          </a>{" "}
          for details.
        </p>
        <button
          onClick={accept}
          className="shrink-0 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
