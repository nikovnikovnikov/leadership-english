import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { SettingsForm } from "@/components/admin/settings-form";
import { OnboardingConfig } from "@/components/admin/onboarding-config";
import { getInviteSettings } from "@/actions/invites";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const [settings, onboardingSettings] = await Promise.all([
    getSettings(),
    getInviteSettings(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-2">Onboarding</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Control how new members join: beta test, invite-only, or paid subscriptions.
          These modes can be combined — invite codes bypass payment, beta users get free access.
        </p>
        <div className="mt-4">
          <OnboardingConfig settings={onboardingSettings} />
        </div>
      </div>

      <div className="border-t border-stone-200 dark:border-stone-800 pt-8">
        <h2 className="text-lg font-semibold mb-2">Points</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Points are awarded automatically when members create content. Changes
          apply immediately.
        </p>
        <div className="mt-4">
          <SettingsForm values={settings} />
        </div>
      </div>

      <Link
        href="/admin"
        className="block text-xs font-medium text-stone-400 hover:text-stone-600 dark:text-stone-400 dark:hover:text-stone-300"
      >
        ← Back to overview
      </Link>
    </div>
  );
}
