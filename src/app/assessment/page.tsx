import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AssessmentClient } from "@/components/assessment/assessment-client";
import { ResultCard } from "@/components/assessment/result-card";

export const metadata = { title: "English Assessment" };
export const dynamic = "force-dynamic";

export default async function AssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ take?: string; retake?: string }>;
}) {
  const profile = await requireUser();
  const { take, retake } = await searchParams;
  const start = take === "1" || retake === "1";
  const supabase = await createClient();

  const { data: latest } = await supabase
    .from("user_assessments")
    .select("band, score_raw, score_scaled, skill_scores, taken_at")
    .eq("user_id", profile.id)
    .eq("assessment_type", "placement")
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const alreadyAssessed = Boolean(latest);

  // Admins are not gated; they may take it deliberately via ?take=1.
  if (profile.role === "admin" && !start) redirect("/learn");

  // First time (or a fresh attempt): run the test itself.
  if (start || !latest) {
    return (
      <AssessmentClient
        userName={profile.display_name ?? profile.username}
        alreadyAssessed={alreadyAssessed}
        previousLevel={latest?.band ?? null}
      />
    );
  }

  const skills = latest.skill_scores ?? { grammar: 0, vocabulary: 0, reading: 0 };

  // Returning member: show their latest result with the option to retake.
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ResultCard
        band={latest.band}
        raw={latest.score_raw}
        scaled={latest.score_scaled}
        skills={skills}
        takenAt={latest.taken_at}
        primaryHref="/learn"
        primaryLabel="Back to your dashboard"
        retakeHref="/assessment?take=1"
      />
    </div>
  );
}