import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser, getCurrentProfile } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { getInviteSettings, getBetaSpotsRemaining } from "@/actions/invites";
import { createClient } from "@/lib/supabase/server";
import { MarkdownContent } from "@/components/markdown-content";
import { WaitlistForm } from "@/components/waitlist-form";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  if (profile) redirect("/feed");

  if (await getAuthUser()) redirect("/setup");

  const [settings, onboardingSettings] = await Promise.all([
    getSettings(),
    getInviteSettings(),
  ]);
  const heading = settings.landing_heading || "A space built for real growth";
  const subtext = settings.landing_subtext || "A small, private community for learning and real conversation. Earn access to the vault by showing up and sharing.";

  const betaMode = onboardingSettings.beta_mode === "true";
  const waitlistEnabled = onboardingSettings.waitlist_enabled === "true";
  const invitesRequired = onboardingSettings.invites_enabled === "true"
    && onboardingSettings.subscription_required !== "true"
    && !betaMode && !waitlistEnabled;
  const subscriptionRequired = onboardingSettings.subscription_required === "true"
    && !betaMode && !invitesRequired && !waitlistEnabled;

  let betaSpots: number | undefined;
  if (betaMode) {
    betaSpots = await getBetaSpotsRemaining();
  }

  const ctaLabel = betaMode
    ? "Join the beta"
    : subscriptionRequired
      ? "Start your subscription"
      : invitesRequired
        ? "Join with invite"
        : "Join the community";

  // Member count for social proof
  const supabase = await createClient();
  const [{ count: memberCount }, { count: waitlistCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true }),
    waitlistEnabled
      ? supabase
          .from("waitlist")
          .select("id", { count: "exact", head: true })
      : { count: 0 },
  ]);

  const startHere = settings.community_start_here || "";

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <span className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--primary)] text-2xl font-bold text-white">
        {settings.logo_initial || "S"}
      </span>
      <h1 className="text-4xl font-semibold tracking-tight dark:text-stone-100">{heading}</h1>
      <p className="mt-3 max-w-md text-lg text-stone-600 dark:text-stone-300">
        {subtext}
      </p>

      {/* Social proof */}
      {memberCount != null && memberCount > 0 && (
        <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
          <strong className="text-stone-700 dark:text-stone-200">{memberCount}</strong>
          {" "}{memberCount === 1 ? "member" : "members"} and growing
        </p>
      )}

      {betaMode && betaSpots !== undefined && (
        <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-800 px-4 py-2 text-sm text-amber-800 dark:text-amber-300">
          Beta spots remaining: <strong>{betaSpots}</strong>
        </div>
      )}

      {waitlistEnabled && (waitlistCount ?? 0) > 0 && (
        <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
          <strong className="text-stone-700 dark:text-stone-200">{waitlistCount}</strong>
          {" "}{waitlistCount === 1 ? "person" : "people"} on the waitlist
        </p>
      )}

      {waitlistEnabled ? (
        <div className="mt-8">
          <WaitlistForm siteName={settings.site_name || "Sanctum"} />
          <div className="mt-4 flex justify-center">
            <Link
              href="/login"
              className="text-sm font-medium text-stone-500 dark:text-stone-400 transition hover:text-stone-700 dark:hover:text-stone-200"
            >
              Already a member? Log in
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 flex items-center gap-3">
          <Link
            href="/signup"
            className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-90"
          >
            {ctaLabel}
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-2.5 text-sm font-semibold text-stone-700 dark:text-stone-200 transition hover:bg-stone-50 dark:hover:bg-stone-800/80"
          >
            Log in
          </Link>
        </div>
      )}

      {/* Community preview — start here content */}
      {startHere && (
        <div className="mt-12 w-full max-w-xl rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 text-left shadow-sm">
          <h2 className="mb-3 text-sm font-bold tracking-wide uppercase text-stone-400 dark:text-stone-500">
            Welcome to {settings.site_name || "Sanctum"}
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-stone-600 dark:text-stone-300">
            <MarkdownContent content={startHere} />
          </div>
        </div>
      )}

      {/* Feature preview */}
      <div className="mt-8 grid w-full max-w-xl grid-cols-2 gap-3 text-left sm:grid-cols-3">
        {[
          { icon: "📝", label: "Feed", desc: "Share thoughts and ideas" },
          { icon: "💬", label: "Board", desc: "Threaded discussions" },
          { icon: "🎓", label: "Courses", desc: "Unlock lessons with points" },
          { icon: "📅", label: "Events", desc: "Meetups and gatherings" },
          { icon: "✉️", label: "Messaging", desc: "Private conversations" },
          { icon: "⚡", label: "Points", desc: "Earn by contributing" },
        ].map((f) => (
          <div
            key={f.label}
            className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3"
          >
            <span className="text-lg">{f.icon}</span>
            <p className="mt-1 text-sm font-medium text-stone-700 dark:text-stone-200">{f.label}</p>
            <p className="text-xs text-stone-400 dark:text-stone-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
