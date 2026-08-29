import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AssessmentClient } from "@/components/assessment/assessment-client";

export const metadata = { title: "English Assessment" };
export const dynamic = "force-dynamic";

export default async function AssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ retake?: string }>;
}) {
  const profile = await requireUser();
  const { retake } = await searchParams;
  const supabase = await createClient();

  const { data: latest } = await supabase
    .from("user_assessments")
    .select("band, score_scaled, taken_at")
    .eq("user_id", profile.id)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const alreadyAssessed = Boolean(latest);

  // Admins are not gated; they may reach it explicitly via ?retake=1.
  if (profile.role === "admin" && !retake) redirect("/learn");
  // Members who have already completed or skipped it go home unless retaking.
  if (alreadyAssessed && !retake) redirect("/learn");
  if (profile.assessment_skipped_at && !retake) redirect("/learn");

  return (
    <AssessmentClient
      userName={profile.display_name ?? profile.username}
      alreadyAssessed={alreadyAssessed}
      previousLevel={latest?.band ?? null}
    />
  );
}