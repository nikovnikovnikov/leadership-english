"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  PUBLIC_QUESTIONS,
  type CefrLevel,
  type PublicAssessmentQuestion,
} from "@/lib/assessment/questions";
import { skipAssessment, submitAssessment } from "@/actions/assessment";
import type { AssessmentState } from "@/actions/assessment";
import { ResultCard } from "@/components/assessment/result-card";

const SKILL_LABEL: Record<PublicAssessmentQuestion["skill"], string> = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  reading: "Reading",
};

type Step = "intro" | "quiz";

export function AssessmentClient({
  userName,
  alreadyAssessed,
  previousLevel,
}: {
  userName: string;
  alreadyAssessed: boolean;
  previousLevel: CefrLevel | null;
}) {
  const [step, setStep] = useState<Step>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const [state, formAction, pending] = useActionState<AssessmentState, FormData>(
    submitAssessment,
    {},
  );

  const answeredCount = Object.keys(answers).length;
  const question = PUBLIC_QUESTIONS[current]!;
  const allAnswered = answeredCount === PUBLIC_QUESTIONS.length;

  function choose(index: number) {
    setAnswers((prev) => ({ ...prev, [question.id]: index }));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {step === "intro" && (
        <Intro
          userName={userName}
          alreadyAssessed={alreadyAssessed}
          previousLevel={previousLevel}
          onStart={() => setStep("quiz")}
        />
      )}

      {step === "quiz" && !state.result && (
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
            <span>
              Question {current + 1} of {PUBLIC_QUESTIONS.length}
            </span>
            <span className="font-medium">
              {SKILL_LABEL[question.skill]} · level {question.level}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all"
              style={{
                width: `${((current + 1) / PUBLIC_QUESTIONS.length) * 100}%`,
              }}
            />
          </div>

          {question.context && (
            <div className="mt-4 rounded-xl bg-stone-50 dark:bg-white/5 p-4 text-sm leading-relaxed whitespace-pre-line text-stone-700 dark:text-stone-300">
              {question.context}
            </div>
          )}

          <h2 className="mt-4 text-lg font-semibold dark:text-stone-100">
            {question.stem}
          </h2>

          <div className="mt-4 space-y-2">
            {question.options.map((option, index) => {
              const selected = answers[question.id] === index;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => choose(index)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                    selected
                      ? "border-[var(--primary)] bg-[var(--primary-light)] text-stone-900 dark:text-stone-100"
                      : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-700"
                  }`}
                >
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs font-semibold ${
                      selected
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                        : "border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400"
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="rounded-lg border border-stone-300 dark:border-stone-800 px-4 py-2 text-sm font-semibold text-stone-600 dark:text-stone-300 transition hover:bg-stone-50 dark:hover:bg-stone-800/60 disabled:opacity-40"
            >
              ← Back
            </button>

            {current < PUBLIC_QUESTIONS.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrent((c) => c + 1)}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90"
              >
                Next →
              </button>
            ) : (
              <form action={formAction} className="contents">
                {Object.entries(answers).map(([id, index]) => (
                  <input key={id} type="hidden" name={`answer_${id}`} value={index} />
                ))}
                <button
                  type="submit"
                  disabled={pending || !allAnswered}
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending
                    ? "Scoring…"
                    : allAnswered
                      ? "Submit test"
                      : `Answer ${40 - answeredCount} more`}
                </button>
              </form>
            )}
          </div>

          {state.error && (
            <p className="mt-4 text-sm text-red-600">{state.error}</p>
          )}
        </div>
      )}

      {state.result && (
        <ResultCard
          band={state.result.band}
          raw={state.result.raw}
          scaled={state.result.scaled}
          skills={state.result.skills}
          primaryHref="/learn"
          primaryLabel={
            state.result.raw === 40
              ? "Amazing — continue to your dashboard"
              : "Continue to your dashboard"
          }
          retakeHref="/assessment?take=1"
        />
      )}
    </div>
  );
}

function Intro({
  userName,
  alreadyAssessed,
  previousLevel,
  onStart,
}: {
  userName: string;
  alreadyAssessed: boolean;
  previousLevel: CefrLevel | null;
  onStart: () => void;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight dark:text-stone-100">
        {alreadyAssessed ? "Retake the assessment" : `Welcome, ${userName}`}
      </h1>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
        {alreadyAssessed
          ? `Your current level is ${previousLevel}. Retaking updates your result.`
          : "Take a short placement test so we can tailor your learning experience."}
      </p>

      <ul className="mt-4 space-y-2 text-sm text-stone-600 dark:text-stone-300">
        <li className="flex items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--primary-light)] text-xs font-bold text-[var(--primary)]">
            1
          </span>
          40 multiple-choice questions
        </li>
        <li className="flex items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--primary-light)] text-xs font-bold text-[var(--primary)]">
            2
          </span>
          Grammar, vocabulary, and reading — about 10 minutes
        </li>
        <li className="flex items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--primary-light)] text-xs font-bold text-[var(--primary)]">
            3
          </span>
          Get a CEFR level from A1 to C2 with a clear score
        </li>
      </ul>

      <button
        type="button"
        onClick={onStart}
        className="mt-6 w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-90"
      >
        {alreadyAssessed ? "Start retake" : "Start the test"}
      </button>

      <form action={skipAssessment} className="mt-2">
        <button
          type="submit"
          className="w-full rounded-lg border border-stone-300 dark:border-stone-800 px-4 py-2.5 text-sm font-semibold text-stone-600 dark:text-stone-300 transition hover:bg-stone-50 dark:hover:bg-stone-800/60"
        >
          Skip for now
        </button>
      </form>
      {alreadyAssessed && (
        <p className="mt-3 text-center text-xs text-stone-400 dark:text-stone-400">
          <Link href="/learn" className="hover:text-stone-600 dark:hover:text-stone-300">
            Back to your dashboard →
          </Link>
        </p>
      )}
    </div>
  );
}