import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";
import { getAuthUser, getCurrentProfile } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { getInviteSettings, getBetaSpotsRemaining, validateInviteCode } from "@/actions/invites";

export const metadata = { title: "Sign up" };

async function SignupPageContent({ inviteCode }: { inviteCode?: string }) {
  const [allSettings, onboardingSettings] = await Promise.all([
    getSettings(),
    getInviteSettings(),
  ]);
  const name = allSettings.site_name || "Sanctum";
  const heading = allSettings.signup_heading
    ? allSettings.signup_heading.replace("{name}", name)
    : `Join ${name}`;
  const betaMode = onboardingSettings.beta_mode === "true";
  const invitesRequired = onboardingSettings.invites_enabled === "true"
    && onboardingSettings.subscription_required !== "true"
    && !betaMode;

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

export default async function SignupPage(props: { searchParams?: Promise<{ invite?: string }> }) {
  const profile = await getCurrentProfile();
  if (profile) redirect("/feed");

  if (await getAuthUser()) redirect("/setup");

  const searchParams = await props.searchParams;
  const inviteCode = searchParams?.invite;

  return (
    <Suspense>
      <SignupPageContent inviteCode={inviteCode} />
    </Suspense>
  );
}
