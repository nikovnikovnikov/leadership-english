"use client";

import { useState, useTransition } from "react";
import { updateSetting } from "@/actions/admin";

type Settings = Record<string, string>;

export function OnboardingConfig({ settings }: { settings: Settings }) {
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [local, setLocal] = useState<Settings>(settings);

  function set(key: string, value: string) {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }

  function save() {
    startTransition(async () => {
      for (const [key, value] of Object.entries(local)) {
        if (settings[key] !== value) {
          await updateSetting(key, value);
        }
      }
      setSuccess(true);
    });
  }

  const betaMode = local.beta_mode === "true";
  const invitesEnabled = local.invites_enabled === "true";
  const subscriptionRequired = local.subscription_required === "true";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-4">Beta Mode</h3>
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
          Limit signups to a fixed number of beta testers. Beta members get full access for free.
        </p>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={betaMode}
            onChange={(e) => set("beta_mode", String(e.target.checked))}
            className="h-4 w-4 rounded border-stone-300 dark:border-stone-800 text-[var(--primary)] focus:ring-[var(--primary)]/20"
          />
          <span className="text-sm font-medium">Enable beta mode</span>
        </label>
        {betaMode && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
              Max beta spots
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              value={local.beta_max_spots || "10"}
              onChange={(e) => set("beta_max_spots", e.target.value)}
              className="w-32 rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-4">Invite System</h3>
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
          Members get invite codes to share. Each code allows one person to join.
        </p>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={invitesEnabled}
            onChange={(e) => set("invites_enabled", String(e.target.checked))}
            className="h-4 w-4 rounded border-stone-300 dark:border-stone-800 text-[var(--primary)] focus:ring-[var(--primary)]/20"
          />
          <span className="text-sm font-medium">Enable invite system</span>
        </label>
        {invitesEnabled && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
              Invites per member
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={local.invites_per_member || "3"}
              onChange={(e) => set("invites_per_member", e.target.value)}
              className="w-32 rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-4">Paid Subscriptions</h3>
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
          Require new members to subscribe before accessing the community.
        </p>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={subscriptionRequired}
            onChange={(e) => set("subscription_required", String(e.target.checked))}
            className="h-4 w-4 rounded border-stone-300 dark:border-stone-800 text-[var(--primary)] focus:ring-[var(--primary)]/20"
          />
          <span className="text-sm font-medium">Require subscription to join</span>
        </label>
        {subscriptionRequired && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
                Stripe Price ID — Monthly
              </label>
              <input
                type="text"
                value={local.stripe_price_monthly || ""}
                onChange={(e) => set("stripe_price_monthly", e.target.value)}
                placeholder="price_xxx"
                className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1.5 text-sm font-mono outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={local.yearly_enabled === "true"}
                onChange={(e) => set("yearly_enabled", String(e.target.checked))}
                className="h-4 w-4 rounded border-stone-300 dark:border-stone-800 text-[var(--primary)] focus:ring-[var(--primary)]/20"
              />
              <span className="text-sm font-medium">Enable yearly plan</span>
            </label>
            {local.yearly_enabled === "true" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">
                  Stripe Price ID — Yearly
                </label>
                <input
                  type="text"
                  value={local.stripe_price_yearly || ""}
                  onChange={(e) => set("stripe_price_yearly", e.target.value)}
                  placeholder="price_xxx"
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1.5 text-sm font-mono outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        {success && (
          <span className="text-sm text-green-600 dark:text-green-400">
            Saved!
          </span>
        )}
      </div>
    </div>
  );
}
