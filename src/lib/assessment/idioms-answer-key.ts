// Answer key for the Idioms knowledge assessment.
// SERVER-ONLY: never import from client components. Recomputes the correct
// option index for each idiom question using the same deterministic layout
// as `idioms.ts`, so the correct answer never ships to the browser.

import { IDIOM_QUESTIONS } from "./idioms";

// Mirrors the private getOptionKeys in idioms.ts. The correct answer sits at
// index (i % 4) where i is the idiom's row in the list (see id "idiom_<i>").
function correctIndexFor(id: string): number {
  const match = /^idiom_(\d+)$/.exec(id);
  if (!match) throw new Error(`unexpected idiom id: ${id}`);
  return Number(match[1]) % 4;
}

export const IDIOM_ANSWER_KEY: Readonly<Record<string, number>> =
  IDIOM_QUESTIONS.reduce<Record<string, number>>((acc, q) => {
    acc[q.id] = correctIndexFor(q.id);
    return acc;
  }, {});