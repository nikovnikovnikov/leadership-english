"use client";

import { useState } from "react";

export function StripeActions({
  subscribed,
  yearlyEnabled,
  yearlyPriceLabel,
  monthlyPriceLabel,
  accessType,
}: {
  subscribed: boolean;
  yearlyEnabled?: boolean;
  yearlyPriceLabel?: string;
  monthlyPriceLabel?: string;
  accessType?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");

  async function callCheckout(plan: "monthly" | "yearly") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Something went wrong.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function callPortal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Something went wrong.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (accessType === "beta" || accessType === "invite") {
    return (
      <p className="text-sm text-stone-600 dark:text-stone-300">
        You joined via {accessType === "beta" ? "the beta program" : "an invite"} — welcome to the community.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-500/15 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      {subscribed ? (
        <>
<p className="text-sm text-stone-600 dark:text-stone-300">
        You have an active membership. Thank you for supporting the community.
      </p>
          <button
            onClick={callPortal}
            disabled={busy}
            className="rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-700 dark:text-stone-200 transition hover:bg-stone-50 dark:hover:bg-stone-800/80 disabled:opacity-60"
          >
            {busy ? "Opening…" : "Manage billing"}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-stone-600 dark:text-stone-300">
            All courses are open to you either way. Subscribe to support the
            community and help keep it growing.
          </p>

          {yearlyEnabled && (
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPlan("monthly")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  selectedPlan === "monthly"
                    ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]"
                    : "border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300"
                }`}
              >
                {monthlyPriceLabel || "Monthly"}
              </button>
              <button
                onClick={() => setSelectedPlan("yearly")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  selectedPlan === "yearly"
                    ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]"
                    : "border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300"
                }`}
              >
                {yearlyPriceLabel || "Yearly"}
              </button>
            </div>
          )}

          <button
            onClick={() => callCheckout(selectedPlan)}
            disabled={busy}
            className="w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-60"
          >
            {busy ? "Redirecting…" : `Subscribe ${yearlyEnabled ? `(${selectedPlan === "yearly" ? "yearly" : "monthly"})` : ""}`}
          </button>
        </>
      )}
    </div>
  );
}
