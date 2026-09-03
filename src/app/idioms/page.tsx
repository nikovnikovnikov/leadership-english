import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { IdiomAssessmentClient } from "@/components/assessment/idioms-client";

export const metadata = { title: "Idioms Assessment" };
export const dynamic = "force-dynamic";

export default async function IdiomsPage({
  searchParams,
}: {
  searchParams: Promise<{ take?: string }>;
}) {
  const profile = await requireUser();
  const { take } = await searchParams;
  const start = take === "1";

  const supabase = await createClient();
  const { data: latest } = await supabase
    .from("user_assessments")
    .select("score_raw, score_scaled, taken_at")
    .eq("user_id", profile.id)
    .eq("assessment_type", "idioms")
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (start || !latest) {
    return (
      <IdiomAssessmentClient
        userName={profile.display_name ?? profile.username}
        previousRaw={latest?.score_raw ?? null}
        previousScaled={latest?.score_scaled ?? null}
      />
    );
  }

  redirect("/assessments");
}