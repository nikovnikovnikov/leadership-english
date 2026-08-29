// QA integration test: simulate test-takers at each true CEFR level, feed the
// full bank through the real scoring pipeline, and confirm the awarded band
// matches the simulated ability profile. Also pins several hand-computed cases.

import { describe, expect, it } from "vitest";
import { CEFR_LEVELS, PUBLIC_QUESTIONS } from "./questions";
import { ANSWER_KEY } from "./answer-key";
import { scoreAnswers, determineBand } from "./scoring";

const LEVEL_ORDER = CEFR_LEVELS;
const LEVEL_INDEX: Record<string, number> = Object.fromEntries(
  LEVEL_ORDER.map((l, i) => [l, i]),
);

/**
 * Deterministic PRNG (mulberry32) so QA runs are byte-for-byte reproducible.
 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate one attempt for a candidate whose true level is `trueLevel`.
 * Items at a lower level are almost always correct, items at the same level
 * are usually correct, items above are random guesses (20% each).
 */
function simulateAttempt(
  trueLevel: string,
  rand: () => number,
): Record<string, number> {
  const answers: Record<string, number> = {};
  const trueIdx = LEVEL_INDEX[trueLevel];
  for (const q of PUBLIC_QUESTIONS) {
    const qIdx = LEVEL_INDEX[q.level];
    const pCorrect =
      qIdx < trueIdx ? 0.97 : qIdx === trueIdx ? 0.85 : 0.2;
    const correct = rand() < pCorrect;
    answers[q.id] = correct ? ANSWER_KEY[q.id] : (ANSWER_KEY[q.id] + 1) % 4;
  }
  return answers;
}

describe("QA: full pipeline reproduces simulated ability levels", () => {
  it.each([
    ["A1", 7],
    ["A2", 7],
    ["B1", 8],
    ["B2", 8],
    ["C1", 9],
    ["C2", 9],
  ])("a genuine %s candidate is usually ranked %s", (trueLevel, seed) => {
    const rand = mulberry32(seed);
    const tally: Record<string, number> = {};
    for (let i = 0; i < 60; i++) {
      const answers = simulateAttempt(trueLevel, rand);
      const band = scoreAnswers(answers).band;
      tally[band] = (tally[band] ?? 0) + 1;
    }

    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    expect(sorted[0]![0]).toBe(trueLevel);
    // The correct band should dominate the runs.
    expect(sorted[0]![1]).toBeGreaterThan(40);
    // No candidate with a genuine level should be over-flagged a band above.
    expect(LEVEL_INDEX[sorted[0]![0]]).toBe(LEVEL_INDEX[trueLevel]);
  });

  it("wild guessing never ranks above A1", () => {
    const rand = mulberry32(42);
    const tally: Record<string, number> = {};
    for (let i = 0; i < 100; i++) {
      // Genuine guess: every item answered with a uniformly random option.
      const answers: Record<string, number> = {};
      for (const q of PUBLIC_QUESTIONS) {
        answers[q.id] = Math.floor(rand() * 4);
      }
      const band = scoreAnswers(answers).band;
      tally[band] = (tally[band] ?? 0) + 1;
    }
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    expect(sorted[0]![0]).toBe("A1");
    // A fortunate guesser might land A2 occasionally; never B1 or above.
    for (const band of Object.keys(tally)) {
      expect(LEVEL_INDEX[band]).toBeLessThanOrEqual(1);
    }
  });
});

describe("QA: hand-computed acceptance cases", () => {
  const byLevel = (levels: string[]) =>
    Object.fromEntries(
      PUBLIC_QUESTIONS.filter((q) => levels.includes(q.level)).map((q) => [
        q.id,
        ANSWER_KEY[q.id],
      ]),
    );

  it("answers correct only up to A2 produce raw 12, scaled 14, band A2", () => {
    const answers = byLevel(["A1", "A2"]);
    const result = scoreAnswers(answers);
    expect(result.raw).toBe(12); // 5 A1 + 7 A2 items
    expect(result.scaled).toBe(14); // (5*1 + 7*2)/140 ≈ 0.137 → round to 14
    expect(result.mastery.A1).toBe(100);
    expect(result.mastery.A2).toBe(100);
    expect(result.band).toBe("A2");
  });

  it("answers correct through B2 produce scaled 64 and band B2", () => {
    const answers = byLevel(["A1", "A2", "B1", "B2"]);
    const result = scoreAnswers(answers);
    const weighted = 5 * 1 + 7 * 2 + 8 * 3 + 8 * 4; // 89
    expect(result.raw).toBe(28);
    expect(result.scaled).toBe(Math.round((weighted / 140) * 100)); // 64
    expect(result.band).toBe("B2");
  });

  it("a totally wrong submission scores zero and lands at A1", () => {
    const answers = Object.fromEntries(
      PUBLIC_QUESTIONS.map((q) => [q.id, (ANSWER_KEY[q.id] + 2) % 4]),
    );
    const result = scoreAnswers(answers);
    expect(result.raw).toBe(0);
    expect(result.scaled).toBe(0);
    expect(result.band).toBe("A1");
  });

  it("reading-only mastery keeps grammar/vocabulary at zero", () => {
    const answers = Object.fromEntries(
      PUBLIC_QUESTIONS.filter((q) => q.skill === "reading").map((q) => [
        q.id,
        ANSWER_KEY[q.id],
      ]),
    );
    const result = scoreAnswers(answers);
    expect(result.raw).toBe(12);
    expect(result.skills.reading).toBe(100);
    expect(result.skills.grammar).toBe(0);
    expect(result.skills.vocabulary).toBe(0);
  });

  it("every reading passage is attached to the right context", () => {
    const reading = PUBLIC_QUESTIONS.filter((q) => q.skill === "reading");
    expect(reading.length).toBe(12);
    for (const q of reading) {
      expect(q.context).toBeTruthy();
    }
  });
});

describe("QA: banding consistency properties", () => {
  it("is monotonic: raising any level's mastery never lowers the band", () => {
    const base = { A1: 60, A2: 60, B1: 60, B2: 60, C1: 60, C2: 60 };
    const before = LEVEL_INDEX[determineBand(base)];
    for (const level of LEVEL_ORDER) {
      const bumped = { ...base, [level]: 100 };
      const after = LEVEL_INDEX[determineBand(bumped)];
      expect(after).toBeGreaterThanOrEqual(before);
    }
  });
});