import Link from "next/link";
import { CEFR_LEVELS, type CefrLevel } from "@/lib/assessment/questions";
import { bandDescription } from "@/lib/assessment/cefr";

export type AssessmentSkills = {
  grammar: number;
  vocabulary: number;
  reading: number;
};

const SKILL_KEY_LABEL: Array<[keyof AssessmentSkills, string]> = [
  ["grammar", "Grammar"],
  ["vocabulary", "Vocabulary"],
  ["reading", "Reading"],
];

export function ResultCard({
  band,
  raw,
  scaled,
  skills,
  takenAt,
  primaryHref,
  primaryLabel,
  retakeHref,
}: {
  band: CefrLevel;
  raw: number;
  scaled: number;
  skills: AssessmentSkills;
  takenAt?: string | null;
  primaryHref: string;
  primaryLabel: string;
  retakeHref: string;
}) {
  const { label, summary } = bandDescription(band);
  const levelIndex = CEFR_LEVELS.indexOf(band) + 1;

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-sm">
      <p className="text-sm font-medium text-[var(--primary)]">Your result</p>

      {takenAt && (
        <p className="mt-1 text-xs text-stone-400 dark:text-stone-400">
          Taken {formatDate(takenAt)}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-end gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-stone-400">
            CEFR level
          </p>
          <p className="text-5xl font-bold tracking-tight dark:text-stone-100">
            {band}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-stone-400">
            Scaled score
          </p>
          <p className="text-3xl font-semibold dark:text-stone-100">
            {scaled}/100
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-stone-400">
            Correct
          </p>
          <p className="text-3xl font-semibold dark:text-stone-100">
            {raw}/40
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm font-medium dark:text-stone-100">
        {label} · level {levelIndex} of 6
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
        {summary}
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {SKILL_KEY_LABEL.map(([key, skillLabel]) => (
          <div
            key={key}
            className="rounded-xl bg-stone-50 dark:bg-white/5 p-3"
          >
            <p className="text-[11px] uppercase tracking-wider text-stone-400">
              {skillLabel}
            </p>
            <p className="mt-0.5 text-sm font-semibold dark:text-stone-100">
              {skills[key]}%
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        <Link
          href={primaryHref}
          className="block w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:brightness-90"
        >
          {primaryLabel}
        </Link>
        <Link
          href={retakeHref}
          className="block text-center text-xs font-medium text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
        >
          Retake test
        </Link>
      </div>

      <p className="mt-4 text-xs text-stone-400 dark:text-stone-400">
        This is a quick placement estimate, not a certified exam. Your level is
        recorded for the community team so we can suggest the right content.
      </p>
    </div>
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}