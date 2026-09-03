import { describe, expect, it } from "vitest";
import { IDIOM_QUESTIONS, IDIOM_MEANINGS } from "./idioms";
import { IDIOM_ANSWER_KEY } from "./idioms-answer-key";
import { scoreIdiomAnswers, type IdiomAnswers } from "./idioms-scoring";

describe("idioms answer key shape", () => {
  it("has full coverage: one question+key entry per idiom", () => {
    expect(IDIOM_QUESTIONS).toHaveLength(81);
    expect(Object.keys(IDIOM_ANSWER_KEY).length).toBe(81);
    expect(IDIOM_MEANINGS).toHaveLength(81);
  });

  it("has unique question ids", () => {
    const ids = IDIOM_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has exactly four options per question", () => {
    for (const q of IDIOM_QUESTIONS) expect(q.options).toHaveLength(4);
  });

  it("keys cover every question and point into range", () => {
    for (const q of IDIOM_QUESTIONS) {
      const idx = IDIOM_ANSWER_KEY[q.id];
      expect(typeof idx).toBe("number");
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(4);
    }
    expect(Object.keys(IDIOM_ANSWER_KEY).length).toBe(IDIOM_QUESTIONS.length);
  });

  it("distributes correct positions across all four indices", () => {
    const counts = [0, 0, 0, 0];
    for (const q of IDIOM_QUESTIONS) counts[IDIOM_ANSWER_KEY[q.id]]++;
    for (const c of counts) expect(c).toBeGreaterThan(0);
  });
});

describe("idioms answer-key correctness (ground truth)", () => {
  it("the keyed option is the idiom's own meaning", () => {
    IDIOM_QUESTIONS.forEach((q, i) => {
      const keyedOption = q.options[IDIOM_ANSWER_KEY[q.id]];
      expect(keyedOption).toBe(IDIOM_MEANINGS[i].meaning);
    });
  });

  it("exactly one option matches the idiom's meaning (no ambiguous choices)", () => {
    IDIOM_QUESTIONS.forEach((q, i) => {
      const matches = q.options.filter((o) => o === IDIOM_MEANINGS[i].meaning);
      expect(matches.length).toBe(1);
    });
  });

  it("the stem names the idiom itself", () => {
    IDIOM_QUESTIONS.forEach((q, i) => {
      expect(q.idiom).toBe(IDIOM_MEANINGS[i].idiom);
    });
  });
});

describe("scoreIdiomAnswers", () => {
  const allCorrect: IdiomAnswers = Object.fromEntries(
    IDIOM_QUESTIONS.map((q) => [q.id, IDIOM_ANSWER_KEY[q.id]]),
  );

  it("scores all-correct as 81/81 (100%)", () => {
    const result = scoreIdiomAnswers(allCorrect);
    expect(result.raw).toBe(81);
    expect(result.scaled).toBe(100);
    expect(result.total).toBe(81);
  });

  it("scores empty as 0", () => {
    const result = scoreIdiomAnswers({});
    expect(result.raw).toBe(0);
    expect(result.scaled).toBe(0);
  });

  it("scores a subset correctly", () => {
    const answers: IdiomAnswers = {};
    IDIOM_QUESTIONS.slice(0, 10).forEach((q) => {
      answers[q.id] = IDIOM_ANSWER_KEY[q.id];
    });
    const result = scoreIdiomAnswers(answers);
    expect(result.raw).toBe(10);
  });

  it("ignores malformed answer values", () => {
    const answers: IdiomAnswers = {};
    IDIOM_QUESTIONS.forEach((q) => {
      answers[q.id] = 9;
    });
    const result = scoreIdiomAnswers(answers);
    expect(result.raw).toBe(0);
  });
});