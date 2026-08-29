import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";
import { getAuthUser, getCurrentProfile } from "@/lib/auth";
import { SITE_NAME } from "@/lib/config";
import { getSettings } from "@/lib/queries";
import { getInviteSettings, getBetaSpotsRemaining, validateInviteCode } from "@/actions/invites";
import { createClient } from "@/lib/supabase/server";
import { WaitlistForm } from "@/components/waitlist-form";

export const metadata = { title: "Sign up" };

async function SignupPageContent({
  inviteCode,
  waitlistToken,
}: {
  inviteCode?: string;
  waitlistToken?: string;
}) {
  const supabase = await createClient();
  const [allSettings, onboardingSettings] = await Promise.all([
    getSettings(),
    getInviteSettings(),
  ]);
  const name = SITE_NAME;
  const heading = allSettings.signup_heading
    ? allSettings.signup_heading.replace("{name}", name)
    : `Join ${name}`;
  const betaMode = onboardingSettings.beta_mode === "true";
  const waitlistEnabled = onboardingSettings.waitlist_enabled === "true";
  const invitesRequired = onboardingSettings.invites_enabled === "true"
    && onboardingSettings.subscription_required !== "true"
    && !betaMode && !waitlistEnabled;

  let betaSpots: number | undefined;
  if (betaMode) {
    const spots = await getBetaSpotsRemaining();
    betaSpots = spots;
  }

  let validInvite = false;
  if (inviteCode) {
    const result = await validateInviteCode(inviteCode);
    validInvite = result.valid;
  }

  // Waitlist gating: validate token if provided
  let validWaitlist = false;
  if (waitlistEnabled && waitlistToken) {
    const { data: entry } = await supabase
      .from("waitlist")
      .select("id, status")
      .eq("id", waitlistToken)
      .eq("status", "admitted")
      .maybeSingle();
    validWaitlist = !!entry;
  }

  // If waitlist is enabled and user doesn't have a valid token, show waitlist form
  if (waitlistEnabled && !validWaitlist) {
    return (
      <div className="mx-auto max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            We&apos;re letting people in gradually. Join the waitlist to get notified when it&apos;s your turn.
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-sm">
          <WaitlistForm siteName={name} />
        </div>
        <p className="mt-4 text-center text-sm text-stone-500 dark:text-stone-400">
          Already a member?{" "}
          <a href="/login" className="font-medium text-[var(--primary)] hover:underline">
            Log in
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          A private space to learn, share, and grow together.
        </p>
      </div>
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-sm">
        <SignupForm
          inviteCode={validInvite ? inviteCode : undefined}
          betaMode={betaMode}
          betaSpots={betaSpots}
          invitesRequired={invitesRequired && !validInvite}
        />
      </div>
    </div>
  );
}

export default async function SignupPage(props: {
  searchParams?: Promise<{ invite?: string; waitlist_token?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (profile) redirect("/learn");

  if (await getAuthUser()) redirect("/setup");

  const searchParams = await props.searchParams;
  const inviteCode = searchParams?.invite;
  const waitlistToken = searchParams?.waitlist_token;

  return (
    <Suspense>
      <SignupPageContent inviteCode={inviteCode} waitlistToken={waitlistToken} />
    </Suspense>
  );
}
