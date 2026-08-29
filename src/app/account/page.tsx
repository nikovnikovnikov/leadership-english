import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTotalPoints, getActivity, isSubscriptionActive } from "@/lib/queries";
import { formatRelative } from "@/lib/utils";
import { StripeActions } from "@/components/account/stripe-actions";
import { DataExportButton } from "@/components/account/data-export-button";
import { DeleteAccountButton } from "@/components/account/delete-account-button";
import { ProfileLinksForm } from "@/components/account/profile-links-form";
import { AccountAvatar } from "@/components/account/account-avatar";
import { getInviteSettings } from "@/actions/invites";
import Link from "next/link";

const KIND_LABELS: Record<string, string> = {
  feed_post: "Posted to the feed (+10)",
  feed_comment: "Commented on a post (+3)",
  thread: "Started a thread (+8)",
  thread_reply: "Replied in a thread (+3)",
  like_received: "Received a like (+1)",
};

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const [
    { data: sub },
    [points, activity],
    onboardingSettings,
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", profile.id)
      .maybeSingle(),
    Promise.all([
      getTotalPoints(profile.id),
      getActivity(profile.id, 25),
    ]),
    getInviteSettings(),
  ]);

  const stripeEnabled = process.env.ENABLE_STRIPE === "true";
  const subscribed = isSubscriptionActive(sub);
  const invitesEnabled = onboardingSettings.invites_enabled === "true";

  // Get user access type
  const { data: accessRow } = await supabase
    .from("user_access")
    .select("access_type")
    .eq("user_id", profile.id)
    .maybeSingle();
  const accessType = accessRow?.access_type ?? "open";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Signed in as @{profile.username}
        </p>
      </div>

      <AccountAvatar userId={profile.id} currentAvatarUrl={profile.avatar_url} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
          <p className="text-xs font-medium text-stone-400 dark:text-stone-400">Total points</p>
          <p className="mt-1 text-3xl font-bold text-[var(--primary)] dark:text-[var(--primary)]">{points}</p>
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-400">
            Earned by being part of the community
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
          <p className="text-xs font-medium text-stone-400 dark:text-stone-400">Membership</p>
          {stripeEnabled ? (
            <>
              <p className="mt-1 text-lg font-semibold">
                {subscribed ? "Subscribed" : accessType === "beta" ? "Beta member" : accessType === "invite" ? "Invitee" : "Free member"}
              </p>
              <p className="mt-1 text-xs text-stone-400 dark:text-stone-400">
                {subscribed || accessType === "beta" || accessType === "invite"
                  ? "Thank you for supporting the community"
                  : "All courses are open to you — no access required"}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-lg font-semibold">Development mode</p>
              <p className="mt-1 text-xs text-stone-400 dark:text-stone-400">
                Subscriptions are off — set ENABLE_STRIPE=true to turn on
                billing.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <h2 className="mb-2 font-semibold">Subscription</h2>
        {stripeEnabled ? (
          <StripeActions
            subscribed={subscribed}
            yearlyEnabled={onboardingSettings.yearly_enabled === "true"}
            accessType={accessType}
          />
        ) : (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Stripe isn&apos;t configured yet. Add{" "}
            <code className="rounded bg-stone-100 dark:bg-stone-900 px-1 text-xs">
              STRIPE_PRICE_ID
            </code>{" "}
            and set{" "}
            <code className="rounded bg-stone-100 dark:bg-stone-900 px-1 text-xs">
              ENABLE_STRIPE=true
            </code>{" "}
            to accept payments.
          </p>
        )}
      </div>

      {invitesEnabled && (
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
          <h2 className="mb-2 font-semibold">Invite people</h2>
          <p className="mb-3 text-sm text-stone-500 dark:text-stone-400">
            Share invite codes to bring new members into the community.
          </p>
          <Link
            href="/invites"
            className="rounded-lg border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-700 dark:text-stone-200 transition hover:bg-stone-50 dark:hover:bg-stone-800/80"
          >
            Manage invites →
          </Link>
        </div>
      )}

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <h2 className="mb-2 font-semibold">Social links</h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          Add links to your social profiles. These will appear on your member
          profile.
        </p>
        <ProfileLinksForm
          instagram_url={profile.instagram_url}
          substack_url={profile.substack_url}
          x_url={profile.x_url}
          youtube_url={profile.youtube_url}
          custom_link_url={profile.custom_link_url}
          custom_link_label={profile.custom_link_label}
        />
      </div>

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">How points add up</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-stone-400 dark:text-stone-400">No activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {activity.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-stone-600 dark:text-stone-300">
                  {KIND_LABELS[a.kind] ?? a.kind}
                </span>
                <span className="flex items-center gap-3 text-xs text-stone-400 dark:text-stone-400">
                  {formatRelative(a.created_at)}
                  <span className="font-semibold text-[var(--primary)] dark:text-[var(--primary)]">
                    +{a.points}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
        <h2 className="mb-2 font-semibold">Your data</h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          Under GDPR (Art. 20) and CCPA, you have the right to export or
          delete your personal data at any time.
        </p>
        <DataExportButton />
      </div>

      <div className="rounded-2xl border-2 border-red-200 bg-red-50 dark:bg-red-500/15 p-5">
        <h2 className="mb-2 font-semibold text-red-800 dark:text-red-400">Danger zone</h2>
        <p className="mb-4 text-sm text-red-700 dark:text-red-300">
          Deleting your account is permanent. All your posts, comments, threads,
          and points will be removed immediately. This cannot be undone.
        </p>
        <DeleteAccountButton />
      </div>
    </div>
  );
}
