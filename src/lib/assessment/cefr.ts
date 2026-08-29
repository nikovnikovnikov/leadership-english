// CEFR Can-Do summary lines (leadership/business flavored) shown on the result screen.
// Client-safe and server-safe: no answer keys here.

import type { CefrLevel } from "./questions";

export const BAND_LABEL: Record<CefrLevel, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper Intermediate",
  C1: "Advanced",
  C2: "Proficient",
};

/** One-paragraph, plain-language "You can…" summaries grounded in CEFR descriptors. */
export const CAN_DO_SUMMARY: Record<CefrLevel, string> = {
  A1: "You can use and understand very basic phrases for everyday workplace needs — simple introductions, familiar words for jobs and common objects, and very short notices. You can say who you are and what you do, and recognise basic instructions with visual or written support.",
  A2: "You can handle routine workday exchanges: scheduling appointments, reading short emails and notices, and describing simple tasks and timetables. You can ask and answer familiar questions about your work, and keep a short conversation going with a sympathetic colleague.",
  B1: "You can manage everyday workplace communication with some independence: taking part in routine meetings, writing short emails about familiar topics, and reading straightforward reports. You can explain the main points of an idea, give a brief update, and express opinions on matters you know well — though complex language may still slow you down.",
  B2: "You can communicate clearly and confidently on a wide range of workplace subjects. You can argue a point in a meeting, summarise and comment on reports, discuss strategy at a good level of detail, and write well-organised emails and proposals. You handle most challenging business language with only occasional support.",
  C1: "You can use the language flexibly and effectively for most professional purposes. You can present and defend a position clearly and at length, negotiate with nuance, follow and contribute to fast-moving discussions, and write precise, well-structured documents. You can adapt your register to the audience and grasp implicit meaning in texts.",
  C2: "You can express yourself with a degree of precision, fluency, and subtlety close to that of a skilled native speaker. You understand virtually everything you read or hear, command specialised and idiomatic business language, and can argue fine points and handle sensitive negotiations with complete ease.",
};

export function bandDescription(band: CefrLevel): { label: string; summary: string } {
  return { label: BAND_LABEL[band], summary: CAN_DO_SUMMARY[band] };
}