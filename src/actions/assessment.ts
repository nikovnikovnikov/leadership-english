"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { scoreAnswers, type AssessmentAnswers, type ScoreResult } from "@/lib/assessment/scoring";
import { QUESTION_VERSION } from "@/lib/assessment/questions";

export type AssessmentState = {
  error?: string;
  result?: ScoreResult;
};

function parseAnswers(formData: FormData): AssessmentAnswers {
  const answers: AssessmentAnswers = {};
  for (const [key, raw] of formData.entries()) {
    if (!key.startsWith("answer_")) continue;
    const id = key.slice("answer_".length);
    const index = Number(raw);
    if (Number.isInteger(index) && index >= 0 && index <= 3) answers[id] = index;
  }
  return answers;
}

export async function submitAssessment(
  _prev: AssessmentState,
  formData: FormData,
): Promise<AssessmentState> {
  const profile = await requireUser();

  const answers = parseAnswers(formData);
  const result = scoreAnswers(answers);

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_assessment", {
    p_version: QUESTION_VERSION,
    p_score_raw: result.raw,
    p_score_scaled: result.scaled,
    p_band: result.band,
    p_skill_scores: result.skills,
    p_answers: answers,
  });
  if (error) return { error: "We couldn't save your result. Please try again." };

  // Clear any prior "skip" so the next login goes straight home.
  await supabase
    .from("profiles")
    .update({ assessment_skipped_at: null })
    .eq("id", profile.id);

  revalidatePath("/learn");
  revalidatePath("/assessment");
  revalidatePath("/assessments");
  revalidatePath("/admin/members");

  return { result };
}

export async function skipAssessment() {
  const profile = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ assessment_skipped_at: new Date().toISOString() })
    .eq("id", profile.id);
  revalidatePath("/assessment");
  redirect("/learn");
}