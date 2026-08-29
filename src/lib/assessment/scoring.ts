// Server-side scoring for the CEFR placement assessment.
// Imports the answer key, so it must never be imported from client components.

import { CEFR_LEVELS, PUBLIC_QUESTIONS, type CefrLevel } from "./questions";
import { ANSWER_KEY } from "./answer-key";

const LEVEL_WEIGHT: Record<CefrLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

export type SkillScores = {
  grammar: number;
  vocabulary: number;
  reading: number;
};

export type ScoreResult = {
  raw: number;
  scaled: number;
  band: CefrLevel;
  mastery: Record<CefrLevel, number>;
  skills: SkillScores;
};

export type AssessmentAnswers = Record<string, number>;

export function scoreAnswers(answers: AssessmentAnswers): ScoreResult {
  const totalWeight = PUBLIC_QUESTIONS.reduce(
    (sum, q) => sum + LEVEL_WEIGHT[q.level],
    0,
  );

  let correctWeight = 0;
  let raw = 0;

  const levelTotals = Object.fromEntries(CEFR_LEVELS.map((l) => [l, 0])) as Record<
    CefrLevel,
    number
  >;
  const levelCorrect = Object.fromEntries(CEFR_LEVELS.map((l) => [l, 0])) as Record<
    CefrLevel,
    number
  >;
  const skillTotals: SkillScores = { grammar: 0, vocabulary: 0, reading: 0 };
  const skillCorrect: SkillScores = { grammar: 0, vocabulary: 0, reading: 0 };

  for (const q of PUBLIC_QUESTIONS) {
    const chosen = answers[q.id];
    const isCorrect = typeof chosen === "number" && chosen === ANSWER_KEY[q.id];

    levelTotals[q.level]++;
    skillTotals[q.skill]++;

    if (isCorrect) {
      raw++;
      correctWeight += LEVEL_WEIGHT[q.level];
      levelCorrect[q.level]++;
      skillCorrect[q.skill]++;
    }
  }

  const mastery = Object.fromEntries(
    CEFR_LEVELS.map((l) => [
      l,
      levelTotals[l] > 0
        ? Math.round((levelCorrect[l] / levelTotals[l]) * 100)
        : 0,
    ]),
  ) as Record<CefrLevel, number>;

  const skills: SkillScores = {
    grammar:
      skillTotals.grammar > 0
        ? Math.round((skillCorrect.grammar / skillTotals.grammar) * 100)
        : 0,
    vocabulary:
      skillTotals.vocabulary > 0
        ? Math.round((skillCorrect.vocabulary / skillTotals.vocabulary) * 100)
        : 0,
    reading:
      skillTotals.reading > 0
        ? Math.round((skillCorrect.reading / skillTotals.reading) * 100)
        : 0,
  };

  return {
    raw,
    scaled: Math.min(
      100,
      Math.max(0, Math.round((correctWeight / totalWeight) * 100)),
    ),
    band: determineBand(mastery),
    mastery,
    skills,
  };
}

/**
 * Band determination (cumulative ladder model).
 *
 * Primary rule: a band L is awarded when mastery at L is ≥ 60% AND every
 * level below it (A1 … L-1) is ≥ 50%. The highest such band wins.
 *
 * Fallback: if no band meets the primary rule, the highest level whose entire
 * ladder from A1 through that level is ≥ 50% is used. A candidate with a
 * broken lower ladder therefore stays at the highest contiguous ceiling —
 * a pure guesser cannot snag an upper band by luck on a handful of items.
 *
 * Levels below A1 do not exist — the scale bottoms out at A1.
 */
export function determineBand(mastery: Record<CefrLevel, number>): CefrLevel {
  for (let i = CEFR_LEVELS.length - 1; i >= 0; i--) {
    if (mastery[CEFR_LEVELS[i]] < 60) continue;
    if (ladderAtLeast(mastery, i, 0, 50)) return CEFR_LEVELS[i];
  }

  for (let i = CEFR_LEVELS.length - 1; i >= 0; i--) {
    if (ladderAtLeast(mastery, i, 0, 50)) return CEFR_LEVELS[i];
  }

  return "A1";
}

/** True when every level in [from, to] has mastery ≥ threshold. */
function ladderAtLeast(
  mastery: Record<CefrLevel, number>,
  to: number,
  from: number,
  threshold: number,
): boolean {
  for (let j = from; j <= to; j++) {
    if (mastery[CEFR_LEVELS[j]] < threshold) return false;
  }
  return true;
}