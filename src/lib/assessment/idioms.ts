// Question bank for the Idioms knowledge assessment.
// This module is CLIENT-SAFE: it exposes stems + options only, never the
// correct index. The correct index for each question is derived in
// `idioms-answer-key.ts` (server-only) using the same deterministic layout,
// so the answer never reaches the browser bundle.
//
// The test asks "What does this idiom mean?" for every idiom in the community
// list — a high score tells us how many idioms the student already knows.

export type IdiomQuestion = {
  id: string;
  idiom: string;
  stem: string;
  options: readonly [string, string, string, string];
};

type Idiom = { idiom: string; meaning: string };

// Community idiom list (deduplicated; "the ball is in your court" appears
// twice in the source doc). Ordered by lesson.
const IDIOMS: readonly Idiom[] = [
  // Lesson 1
  { idiom: "on thin ice", meaning: "in a risky or dangerous position" },
  { idiom: "turn a blind eye", meaning: "ignore something on purpose" },
  { idiom: "clear the air", meaning: "resolve a disagreement or relieve tension" },
  { idiom: "holy cow", meaning: "an expression of surprise" },
  { idiom: "keep an eye out for", meaning: "watch carefully to notice something" },
  { idiom: "pie in the sky", meaning: "a hopeful plan that is unrealistic" },
  { idiom: "slippery slope", meaning: "a course of action likely to lead to serious trouble" },
  { idiom: "give someone the benefit of the doubt", meaning: "believe someone's account without proof" },
  // Lesson 2
  { idiom: "a bridge too far", meaning: "a step or goal that goes beyond what is possible" },
  { idiom: "rose-colored glasses", meaning: "seeing things in an unrealistically positive way" },
  { idiom: "a snowball's chance in hell", meaning: "no chance at all of success" },
  { idiom: "sacred cow", meaning: "something that must not be criticized or changed" },
  { idiom: "sow one's wild oats", meaning: "behave recklessly, especially in one's youth" },
  { idiom: "break bread", meaning: "share a meal with someone" },
  { idiom: "bite one's tongue", meaning: "stop oneself from saying something" },
  { idiom: "foot in one's mouth", meaning: "say something embarrassing or inappropriate" },
  { idiom: "call a spade a spade", meaning: "speak plainly and directly" },
  // Lesson 3
  { idiom: "burn bridges", meaning: "damage relationships so badly they cannot be restored" },
  { idiom: "an eye for an eye", meaning: "punishment made equal to the offense" },
  { idiom: "make a mountain out of a molehill", meaning: "treat a small problem as if it were huge" },
  { idiom: "have a cow", meaning: "become very angry or upset" },
  { idiom: "cross that bridge when you come to it", meaning: "deal with a future problem only when it happens" },
  { idiom: "like a duck to water", meaning: "naturally and quickly at ease doing something" },
  { idiom: "Achilles' heel", meaning: "a person's most vulnerable weakness" },
  { idiom: "beat around the bush", meaning: "avoid getting to the point" },
  // Lesson 4
  { idiom: "keep your eyes on the prize", meaning: "stay focused on the final goal" },
  { idiom: "herding cats", meaning: "trying to manage people who will not cooperate" },
  { idiom: "farmer's tan", meaning: "a tan that reaches only the forearms and neck" },
  { idiom: "water under the bridge", meaning: "past problems that no longer matter" },
  { idiom: "in the blink of an eye", meaning: "extremely quickly" },
  { idiom: "bite off more than one can chew", meaning: "take on more than one can handle" },
  { idiom: "stab someone in the back", meaning: "betray someone" },
  { idiom: "get one's act together", meaning: "become organized and well-behaved" },
  // Lesson 5
  { idiom: "bridge the divide", meaning: "reduce the gap between two opposing groups" },
  { idiom: "up in the air", meaning: "undecided or uncertain" },
  { idiom: "Gordian knot", meaning: "an extremely difficult or complex problem" },
  { idiom: "see eye to eye", meaning: "agree with someone about something" },
  { idiom: "air one's dirty laundry", meaning: "reveal embarrassing private matters in public" },
  { idiom: "reap what you sow", meaning: "experience the results of your own actions" },
  { idiom: "lame duck", meaning: "an official who has little power near the end of their term" },
  { idiom: "toe the line", meaning: "follow the rules and do what is required" },
  { idiom: "crazy as a fox", meaning: "seeming foolish but actually acting with clever intent" },
  // Lesson 6
  { idiom: "kill the goose that lays the golden egg", meaning: "destroy a reliable source of income or success" },
  { idiom: "sour grapes", meaning: "pretending to dislike what one could not obtain" },
  { idiom: "count one's eggs before they hatch", meaning: "depend on success before it is certain" },
  { idiom: "cry over spilled milk", meaning: "waste energy regretting something already done" },
  { idiom: "know which side one's bread is buttered on", meaning: "know where one's own advantage lies" },
  { idiom: "two left feet", meaning: "clumsy, especially at dancing" },
  { idiom: "hold one's peace", meaning: "stay silent or refrain from objecting" },
  { idiom: "tie the knot", meaning: "get married" },
  // Lesson 7
  { idiom: "bread and butter", meaning: "one's main source of income or livelihood" },
  { idiom: "go with the flow", meaning: "accept and adapt to events as they happen" },
  { idiom: "doesn't hold water", meaning: "not a valid or convincing argument" },
  { idiom: "wolf in sheep's clothing", meaning: "someone who hides harmful intentions behind a friendly manner" },
  { idiom: "bet the farm", meaning: "risk everything on a single outcome" },
  { idiom: "say one's piece", meaning: "express one's own opinion" },
  { idiom: "dark horse", meaning: "a little-known person who surprisingly achieves success" },
  { idiom: "leave no stone unturned", meaning: "make every possible effort to achieve something" },
  // Lesson 8
  { idiom: "take the bull by the horns", meaning: "deal directly and boldly with a problem" },
  { idiom: "the ball is in your court", meaning: "it is now your turn to act or decide" },
  { idiom: "burn the midnight oil", meaning: "work late into the night" },
  { idiom: "a blessing in disguise", meaning: "something that first seems bad but turns out to be good" },
  { idiom: "jump on the bandwagon", meaning: "join an activity that everyone else is doing" },
  { idiom: "up in arms", meaning: "very angry and protesting loudly" },
  { idiom: "throw in the towel", meaning: "give up" },
  { idiom: "cut corners", meaning: "do something in the easiest or cheapest way, often at a cost to quality" },
  // Lesson 9
  { idiom: "blood is thicker than water", meaning: "family bonds come before other relationships" },
  { idiom: "rising tide", meaning: "an overall improvement that benefits many people" },
  { idiom: "stomach in knots", meaning: "feeling very nervous or anxious" },
  { idiom: "Midas touch", meaning: "an unusual ability to make money or succeed greatly" },
  { idiom: "caught between a rock and a hard place", meaning: "forced to choose between two bad options" },
  { idiom: "cry wolf", meaning: "repeatedly raise false alarms until no one believes you" },
  { idiom: "rest on one's laurels", meaning: "rely on past achievements instead of trying further" },
  { idiom: "get the wrong end of the stick", meaning: "misunderstand a situation" },
  // Lesson 10
  { idiom: "power behind the throne", meaning: "the person who really controls things while someone else appears to lead" },
  { idiom: "a feather in one's cap", meaning: "an achievement one can be proud of" },
  { idiom: "move the goalposts", meaning: "change the rules or targets unfairly after they are set" },
  { idiom: "pass the buck", meaning: "avoid responsibility by shifting blame to someone else" },
  { idiom: "bite the bullet", meaning: "force oneself to face a difficult situation bravely" },
  { idiom: "at the helm", meaning: "in charge and leading the effort" },
  { idiom: "go the extra mile", meaning: "make more effort than is required or expected" },
];

export const IDIOM_VERSION = "1.0";

export const IDIOM_COUNT = IDIOMS.length;

/** Deterministic option layout. A question's options hold the idiom's own
 * meaning plus the meanings of the following idioms in the list, so every
 * option is a real meaning from the set. The correct index is derived in the
 * server-only answer key by re-running this same construction. */
export const IDIOM_QUESTIONS: readonly IdiomQuestion[] = IDIOMS.map((item, i) => {
  const id = `idiom_${i}`;
  const optionKeys = getOptionKeys(i);
  return {
    id,
    idiom: item.idiom,
    stem: `What does “${item.idiom}” mean?`,
    options: optionKeys.map((k) => IDIOMS[k].meaning) as [string, string, string, string],
  };
});

/** Returns the 4 element indexes for a question's options, with the correct
 * answer placed at position (i % 4). */
function getOptionKeys(i: number): number[] {
  const n = IDIOMS.length;
  const correct = i % 4;
  const keys: number[] = [];
  let cursor = 0;
  for (let pos = 0; pos < 4; pos++) {
    if (pos === correct) {
      keys.push(i);
      continue;
    }
    const candidate = (i + 1 + cursor) % n;
    cursor++;
    keys.push(candidate);
  }
  return keys;
}

export function getIdiomQuestionById(id: string): IdiomQuestion | undefined {
  return IDIOM_QUESTIONS.find((q) => q.id === id);
}