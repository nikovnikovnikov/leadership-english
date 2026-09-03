// Server-side scoring for the Idioms knowledge assessment.
// Imports the answer key, so it must never be imported from client components.

import { IDIOM_COUNT, IDIOM_QUESTIONS } from "./idioms";
import { IDIOM_ANSWER_KEY } from "./idioms-answer-key";

export type IdiomScoreResult = {
  raw: number;
  scaled: number; // percentage of idioms known
  total: number;
};

export type IdiomAnswers = Record<string, number>;

export function scoreIdiomAnswers(answers: IdiomAnswers): IdiomScoreResult {
  let raw = 0;
  for (const q of IDIOM_QUESTIONS) {
    const chosen = answers[q.id];
    if (typeof chosen === "number" && chosen === IDIOM_ANSWER_KEY[q.id]) {
      raw++;
    }
  }
  return {
    raw,
    total: IDIOM_COUNT,
    scaled: IDIOM_COUNT > 0 ? Math.round((raw / IDIOM_COUNT) * 100) : 0,
  };
}