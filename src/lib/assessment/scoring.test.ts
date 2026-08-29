import { describe, expect, it } from "vitest";
import { CEFR_LEVELS, PUBLIC_QUESTIONS } from "./questions";
import { ANSWER_KEY } from "./answer-key";
import { scoreAnswers, determineBand, type AssessmentAnswers } from "./scoring";

const allCorrect: AssessmentAnswers = Object.fromEntries(
  PUBLIC_QUESTIONS.map((q) => [q.id, ANSWER_KEY[q.id]]),
);

describe("self-consistency: all-answers-correct baseline", () => {
  it("reaches the top band with a high score when every item is answered correctly", () => {
    const result = scoreAnswers(allCorrect);
    expect(result.raw).toBe(40);
    expect(result.scaled).toBe(100);
    expect(result.band).toBe("C2");
  });
});

describe("answer key shape", () => {
  it("has exactly 40 questions", () => {
    expect(PUBLIC_QUESTIONS).toHaveLength(40);
    expect(Object.keys(ANSWER_KEY).length).toBe(40);
  });

  it("has a unique id per question", () => {
    const ids = PUBLIC_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has exactly four options per question", () => {
    for (const q of PUBLIC_QUESTIONS) {
      expect(q.options).toHaveLength(4);
    }
  });

  it("covers every question id", () => {
    const missing = PUBLIC_QUESTIONS.filter((q) => !(q.id in ANSWER_KEY));
    expect(missing.map((q) => q.id)).toEqual([]);
  });

  it("distributes correct positions across the four indices", () => {
    const counts = [0, 0, 0, 0];
    for (const id of PUBLIC_QUESTIONS.map((q) => q.id)) {
      const idx = ANSWER_KEY[id];
      expect(typeof idx).toBe("number");
      counts[idx] = (counts[idx] ?? 0) + 1;
    }
    for (const c of counts) expect(c).toBeGreaterThan(0);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2);
  });
});

describe("determineBand", () => {
  it("returns A1 for effectively no mastery", () => {
    expect(
      determineBand({ A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 }),
    ).toBe("A1");
  });

  it("awards a band when the level and the one below are strong", () => {
    expect(
      determineBand({ A1: 100, A2: 75, B1: 80, B2: 30, C1: 0, C2: 0 }),
    ).toBe("B1");
  });

  it("blocks a band when a lower rung of the ladder collapses", () => {
    // C1 mastery is perfect, but its B2 support level collapses — the C1
    // band must not be awarded; the B1 band wins instead.
    expect(
      determineBand({ A1: 100, A2: 100, B1: 60, B2: 30, C1: 100, C2: 0 }),
    ).toBe("B1");
  });

  it("drops to the highest contiguous ceiling when a lower rung is weak", () => {
    // B1 is strong, but A2 (below it) is weak, so the ladder is broken —
    // the candidate is rated at the highest solid prefix, A1.
    expect(
      determineBand({ A1: 100, A2: 40, B1: 70, B2: 40, C1: 0, C2: 0 }),
    ).toBe("A1");
  });
});

describe("scoreAnswers", () => {
  it("computes raw and scaled scores from per-item indices", () => {
    const answers: AssessmentAnswers = {};
    PUBLIC_QUESTIONS.slice(0, 10).forEach((q) => {
      answers[q.id] = ANSWER_KEY[q.id];
    });

    const result = scoreAnswers(answers);
    expect(result.raw).toBe(10);
    expect(result.scaled).toBeGreaterThan(0);
    expect(result.scaled).toBeLessThan(100);
  });

  it("reports per-level mastery", () => {
    const answers: AssessmentAnswers = {};
    PUBLIC_QUESTIONS.filter((q) => q.level === "A1").forEach((q) => {
      answers[q.id] = ANSWER_KEY[q.id];
    });

    const result = scoreAnswers(answers);
    expect(result.mastery.A1).toBe(100);
    expect(result.mastery.C2).toBe(0);
  });

  it("reports per-skill percentages", () => {
    const readingIds = PUBLIC_QUESTIONS.filter((q) => q.skill === "reading");
    const answers: AssessmentAnswers = {};
    readingIds.forEach((q) => {
      answers[q.id] = ANSWER_KEY[q.id];
    });

    const result = scoreAnswers(answers);
    expect(result.skills.reading).toBe(100);
    expect(result.skills.grammar).toBe(0);
    expect(result.skills.vocabulary).toBe(0);
  });

  it("ignores malformed answer values", () => {
    const result = scoreAnswers({ q01: 9, q02: -1, q03: 1.5 });
    expect(result.raw).toBe(0);
  });
});

describe("bank coverage", () => {
  it("has all six levels represented", () => {
    const present = new Set(PUBLIC_QUESTIONS.map((q) => q.level));
    for (const level of CEFR_LEVELS) expect(present.has(level)).toBe(true);
  });

  it("has all three skills represented", () => {
    const present = new Set(PUBLIC_QUESTIONS.map((q) => q.skill));
    expect(present.has("grammar")).toBe(true);
    expect(present.has("vocabulary")).toBe(true);
    expect(present.has("reading")).toBe(true);
  });

  it("keeps the level distribution at A1 5 · A2 7 · B1 8 · B2 8 · C1 7 · C2 5", () => {
    const counts = Object.fromEntries(CEFR_LEVELS.map((l) => [l, 0])) as Record<
      string,
      number
    >;
    for (const q of PUBLIC_QUESTIONS) counts[q.level]++;
    expect(counts).toEqual({ A1: 5, A2: 7, B1: 8, B2: 8, C1: 7, C2: 5 });
  });
});