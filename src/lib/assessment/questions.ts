// Question bank for the CEFR placement assessment.
// This module is CLIENT-SAFE: it carries no answer keys. The correct indices
// live in `answer-key.ts` (server-only) and are matched by id.
// Level distribution: A1 5 · A2 7 · B1 8 · B2 8 · C1 7 · C2 5 (40 total)
// Skill distribution: grammar 16 · vocabulary 12 · reading 12

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const CEFR_LEVELS: readonly CefrLevel[] = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
];

export type QuestionSkill = "grammar" | "vocabulary" | "reading";

export type PublicAssessmentQuestion = {
  id: string;
  level: CefrLevel;
  skill: QuestionSkill;
  /** Optional lead-in / passage text shown above the stem. */
  context?: string;
  stem: string;
  options: readonly [string, string, string, string];
};

export const QUESTION_VERSION = "1.0";

const MEMO_NOTICE = `Tea room notice

Please use the new cups in the cupboard on the left.
The kitchen closes at 5pm. Please clean your cup after you drink.
Thank you.`;

const MEETING_EMAIL = `Hello,

Thank you for your email. The project meeting is on Tuesday at 10am in Room 4.
Please bring your notes about the budget and your calendar. We will decide the
dates for the training sessions.

See you on Tuesday.
Marta`;

const SERVICE_REVIEW = `A six-month review of the customer service department found that response
times improved by 30% after the new ticketing system was introduced. However,
the report also notes that satisfaction scores rose only slightly, because
many customers still felt they were being transferred between teams. The
consultant recommends assigning a single case owner to each query, a change
that is expected to cut average resolution time by a further two days.`;

const STRATEGY_MEMO = `While the board is broadly sanguine about the outlook for the North American
division, it remains circumspect with regard to the European portfolio. The
stagnation reported there, the directors argue, stems less from market
saturation than from structural inefficiencies — duplicated roles,
fragmented decision-making, and a sales force whose incentives are
misaligned with the stated strategy. Corrective measures, they concede, will
require a degree of candour that many regional managers have thus far been
reluctant to offer.`;

export const PUBLIC_QUESTIONS: readonly PublicAssessmentQuestion[] = [
  // ── Grammar ──────────────────────────────────────────────────────────────
  {
    id: "q01",
    level: "A1",
    skill: "grammar",
    stem: "Please ______ the report on my desk before you leave.",
    options: ["puts", "putting", "put", "puted"],
  },
  {
    id: "q02",
    level: "A1",
    skill: "grammar",
    stem: "She is ______ an email to the team right now.",
    options: ["wrote", "writing", "writes", "write"],
  },
  {
    id: "q03",
    level: "A2",
    skill: "grammar",
    stem: "I have worked at this company ______ 2021.",
    options: ["for", "during", "from", "since"],
  },
  {
    id: "q04",
    level: "A2",
    skill: "grammar",
    stem: "The train to the office ______ at 8:15 every morning.",
    options: ["leaves", "leaving", "left", "leave"],
  },
  {
    id: "q05",
    level: "A2",
    skill: "grammar",
    stem: "Where ______ the sales meeting yesterday?",
    options: ["did", "is", "was", "does"],
  },
  {
    id: "q06",
    level: "B1",
    skill: "grammar",
    stem: "I'll call you as soon as I ______ the proposal.",
    options: ["will receive", "received", "have received", "receive"],
  },
  {
    id: "q07",
    level: "B1",
    skill: "grammar",
    stem: "The minutes ______ to all members by the end of the day.",
    options: ["will send", "will be sent", "sent", "are sending"],
  },
  {
    id: "q08",
    level: "B2",
    skill: "grammar",
    stem: "The manager suggested ______ the launch until January.",
    options: ["postponing", "to postpone", "postponed", "postpone"],
  },
  {
    id: "q09",
    level: "B2",
    skill: "grammar",
    stem: "Had we known about the budget cut, we ______ the project.",
    options: ["will pause", "would pause", "would have paused", "had paused"],
  },
  {
    id: "q10",
    level: "B2",
    skill: "grammar",
    stem: "The decision, ______ was controversial, divided the whole team.",
    options: ["that", "whose", "who", "which"],
  },
  {
    id: "q11",
    level: "B2",
    skill: "grammar",
    stem: "By the time the audit ends, the finance team ______ every transaction.",
    options: ["will review", "will have reviewed", "is reviewing", "reviews"],
  },
  {
    id: "q12",
    level: "C1",
    skill: "grammar",
    stem: "Only after the deadline ______ the supplier acknowledge the delay.",
    options: ["did", "had", "was", "would"],
  },
  {
    id: "q13",
    level: "C1",
    skill: "grammar",
    stem: "The board would rather the CEO ______ the figures in person next time.",
    options: ["presents", "to present", "presenting", "presented"],
  },
  {
    id: "q14",
    level: "C1",
    skill: "grammar",
    stem: "______ its strong brand, the firm still failed to attract investors.",
    options: ["As for", "But for", "For all", "Instead of"],
  },
  {
    id: "q15",
    level: "C2",
    skill: "grammar",
    stem: "The chairman intimated that further redundancies were ______ the question.",
    options: ["off", "out of", "on", "within"],
  },
  {
    id: "q16",
    level: "C2",
    skill: "grammar",
    stem: "No sooner had the deal been signed ______ the partner reneged on its terms.",
    options: ["than", "when", "then", "that"],
  },

  // ── Vocabulary ───────────────────────────────────────────────────────────
  {
    id: "q17",
    level: "A1",
    skill: "vocabulary",
    stem: "Let's have a ______ at 2pm to talk about the project.",
    options: ["holiday", "kitchen", "key", "meeting"],
  },
  {
    id: "q18",
    level: "A2",
    skill: "vocabulary",
    stem: "I have an ______ with the director at 10am.",
    options: ["apartment", "appointment", "advertisement", "achievement"],
  },
  {
    id: "q19",
    level: "A2",
    skill: "vocabulary",
    stem: "A ______ is a person who buys products from our company.",
    options: ["customer", "supplier", "competitor", "shareholder"],
  },
  {
    id: "q20",
    level: "B1",
    skill: "vocabulary",
    stem: "We need to ______ a decision by the end of this week.",
    options: ["do", "get", "make", "take"],
  },
  {
    id: "q21",
    level: "B1",
    skill: "vocabulary",
    stem: "The team works well together; there is a strong sense of ______.",
    options: ["conflict", "competition", "confusion", "collaboration"],
  },
  {
    id: "q22",
    level: "B1",
    skill: "vocabulary",
    stem: "Please ______ the client about the change in schedule before Friday.",
    options: ["inform", "informative", "information", "informs"],
  },
  {
    id: "q23",
    level: "B2",
    skill: "vocabulary",
    stem: "We need to ______ our marketing strategy with the company's new goals.",
    options: ["agree", "align", "appoint", "arrange"],
  },
  {
    id: "q24",
    level: "B2",
    skill: "vocabulary",
    stem: "The contractor failed to ______ on its promise to meet the deadline.",
    options: ["account", "decide", "deliver", "reason"],
  },
  {
    id: "q25",
    level: "C1",
    skill: "vocabulary",
    stem: "She was praised for her ______ handling of the delicate negotiations.",
    options: ["diplomatic", "deliverable", "documented", "durable"],
  },
  {
    id: "q26",
    level: "C1",
    skill: "vocabulary",
    stem: "The legal team advised us to ______ the wording of the contract.",
    options: ["afford", "assert", "attend", "amend"],
  },
  {
    id: "q27",
    level: "C2",
    skill: "vocabulary",
    stem: "The announcement did little to ______ the employees' deep-seated anxieties about the merger.",
    options: ["assign", "assuage", "assume", "assess"],
  },
  {
    id: "q28",
    level: "C2",
    skill: "vocabulary",
    stem: "The report's conclusions were ______ corroborated by the independent audit.",
    options: ["marginally", "roughly", "unequivocally", "somewhat"],
  },

  // ── Reading ──────────────────────────────────────────────────────────────
  {
    id: "q29",
    level: "A1",
    skill: "reading",
    context: MEMO_NOTICE,
    stem: "What should you use for your tea?",
    options: ["The new cups", "The old plates", "Your coat", "Your phone"],
  },
  {
    id: "q30",
    level: "A1",
    skill: "reading",
    context: MEMO_NOTICE,
    stem: "What time does the kitchen close?",
    options: ["3pm", "5pm", "6pm", "1pm"],
  },
  {
    id: "q31",
    level: "A2",
    skill: "reading",
    context: MEMO_NOTICE,
    stem: "What must you do after you drink?",
    options: [
      "Lock the cupboard",
      "Take the cups home",
      "Clean your cup",
      "Close the door",
    ],
  },
  {
    id: "q32",
    level: "A2",
    skill: "reading",
    context: MEETING_EMAIL,
    stem: "When is the project meeting?",
    options: [
      "Friday at 10am",
      "Monday at 10am",
      "Tuesday at 2pm",
      "Tuesday at 10am",
    ],
  },
  {
    id: "q33",
    level: "B1",
    skill: "reading",
    context: MEETING_EMAIL,
    stem: "What will they decide at the meeting?",
    options: [
      "The size of the office",
      "Dates for the training sessions",
      "Who will buy new computers",
      "The next holiday",
    ],
  },
  {
    id: "q34",
    level: "B1",
    skill: "reading",
    context: MEETING_EMAIL,
    stem: "What does the email say about the budget notes?",
    options: [
      "They should be brought to the meeting",
      "They can be left at home",
      "They were returned yesterday",
      "They must be given to the other teams",
    ],
  },
  {
    id: "q35",
    level: "B1",
    skill: "reading",
    context: SERVICE_REVIEW,
    stem: "What happened after the new ticketing system was introduced?",
    options: [
      "Satisfaction scores fell sharply",
      "Staff numbers doubled",
      "Response times improved by 30%",
      "The department was closed",
    ],
  },
  {
    id: "q36",
    level: "B2",
    skill: "reading",
    context: SERVICE_REVIEW,
    stem: "Why did satisfaction scores rise only slightly?",
    options: [
      "The system was down for a month",
      "The report was not finished",
      "Staff stopped answering the phones",
      "Customers still felt they were passed between teams",
    ],
  },
  {
    id: "q37",
    level: "B2",
    skill: "reading",
    context: SERVICE_REVIEW,
    stem: "What change is expected to help the department next?",
    options: [
      "Assigning a single case owner to each query",
      "Increasing the size of the team",
      "Moving offices",
      "Spending more on advertising",
    ],
  },
  {
    id: "q38",
    level: "C1",
    skill: "reading",
    context: STRATEGY_MEMO,
    stem: "According to the memo, why is growth stagnating in Europe?",
    options: [
      "A general market downturn across all regions",
      "Structural problems such as duplicated roles and misaligned incentives",
      "The retirement of the sales team",
      "New government regulation",
    ],
  },
  {
    id: "q39",
    level: "C1",
    skill: "reading",
    context: STRATEGY_MEMO,
    stem: "What does the board believe the corrective measures require?",
    options: [
      "A larger budget for advertising",
      "Help from an outside consultancy",
      "Candour that regional managers have been unwilling to provide",
      "More frequent meetings abroad",
    ],
  },
  {
    id: "q40",
    level: "C2",
    skill: "reading",
    context: STRATEGY_MEMO,
    stem: "In this context, “sanguine” most nearly means…",
    options: ["anxious", "indifferent", "resigned", "optimistic"],
  },
];

export function getQuestionById(id: string): PublicAssessmentQuestion | undefined {
  return PUBLIC_QUESTIONS.find((q) => q.id === id);
}