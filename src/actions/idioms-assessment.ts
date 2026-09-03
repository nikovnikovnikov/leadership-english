"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  scoreIdiomAnswers,
  type IdiomAnswers,
  type IdiomScoreResult,
} from "@/lib/assessment/idioms-scoring";
import { IDIOM_VERSION } from "@/lib/assessment/idioms";

export type IdiomAssessmentState = {
  error?: string;
  result?: IdiomScoreResult;
};

function parseAnswers(formData: FormData): IdiomAnswers {
  const answers: IdiomAnswers = {};
  for (const [key, raw] of formData.entries()) {
    if (!key.startsWith("answer_")) continue;
    const id = key.slice("answer_".length);
    const index = Number(raw);
    if (Number.isInteger(index) && index >= 0 && index <= 3) answers[id] = index;
  }
  return answers;
}

export async function submitIdiomAssessment(
  _prev: IdiomAssessmentState,
  formData: FormData,
): Promise<IdiomAssessmentState> {
  await requireUser();

  const answers = parseAnswers(formData);
  const result = scoreIdiomAnswers(answers);

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_assessment", {
    p_assessment_type: "idioms",
    p_version: IDIOM_VERSION,
    p_score_raw: result.raw,
    p_score_scaled: result.scaled,
    p_band: null,
    p_skill_scores: {},
    p_answers: answers,
  });
  if (error) return { error: "We couldn't save your result. Please try again." };

  revalidatePath("/assessments");
  revalidatePath("/idioms");

  return { result };
}