"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { IDIOM_QUESTIONS, IDIOM_COUNT } from "@/lib/assessment/idioms";
import { submitIdiomAssessment } from "@/actions/idioms-assessment";
import type { IdiomAssessmentState } from "@/actions/idioms-assessment";

type Step = "intro" | "quiz";

export function IdiomAssessmentClient({
  userName,
  previousRaw,
  previousScaled,
}: {
  userName: string;
  previousRaw: number | null;
  previousScaled: number | null;
}) {
  const [step, setStep] = useState<Step>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const [state, formAction, pending] = useActionState<IdiomAssessmentState, FormData>(
    submitIdiomAssessment,
    {},
  );

  const answeredCount = Object.keys(answers).length;
  const question = IDIOM_QUESTIONS[current]!;
  const allAnswered = answeredCount === IDIOM_QUESTIONS.length;

  function choose(index: number) {
    setAnswers((prev) => ({ ...prev, [question.id]: index }));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {step === "intro" && (
        <Intro
          userName={userName}
          previousRaw={previousRaw}
          previousScaled={previousScaled}
          onStart={() => setStep("quiz")}
        />
      )}

      {step === "quiz" && !state.result && (
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
            <span>
              Idiom {current + 1} of {IDIOM_COUNT}
            </span>
            <span className="font-medium">{question.idiom}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all"
              style={{
                width: `${((current + 1) / IDIOM_QUESTIONS.length) * 100}%`,
              }}
            />
          </div>

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

            {current < IDIOM_QUESTIONS.length - 1 ? (
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
                      : `Answer ${IDIOM_COUNT - answeredCount} more`}
                </button>
              </form>
            )}
          </div>

          {state.error && <p className="mt-4 text-sm text-red-600">{state.error}</p>}
        </div>
      )}

      {state.result && (
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--primary)]">Your result</p>
          <div className="mt-2 flex flex-wrap items-end gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-stone-400">Idioms known</p>
              <p className="text-5xl font-bold tracking-tight dark:text-stone-100">
                {state.result.raw}
                <span className="text-2xl font-semibold text-stone-400">
                  {" "}/ {state.result.total}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-stone-400">Score</p>
              <p className="text-3xl font-semibold dark:text-stone-100">
                {state.result.scaled}%
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
            You know {state.result.raw} of the {state.result.total} idioms in the community
            list.
            {state.result.raw === state.result.total
              ? " Master of every idiom on the list!"
              : state.result.scaled >= 80
                ? " Great job — you clearly know most of the idioms."
                : " Keep reading the idiom list to grow your vocabulary."}
          </p>

          <div className="mt-6 space-y-2">
            <Link
              href="/assessments"
              className="block w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:brightness-90"
            >
              Back to assessments
            </Link>
            <Link
              href="/idioms?take=1"
              className="block text-center text-xs font-medium text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            >
              Retake test
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Intro({
  userName,
  previousRaw,
  previousScaled,
  onStart,
}: {
  userName: string;
  previousRaw: number | null;
  previousScaled: number | null;
  onStart: () => void;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight dark:text-stone-100">
        {previousRaw != null ? "Retake the idioms test" : `Great to see you, ${userName}`}
      </h1>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
        {previousRaw != null
          ? `Your last score was ${previousScaled}% (${previousRaw}/${IDIOM_COUNT} idioms). Retaking updates your result.`
          : "Test how many of the community's idioms you already know."}
      </p>

      <ul className="mt-4 space-y-2 text-sm text-stone-600 dark:text-stone-300">
        <li className="flex items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--primary-light)] text-xs font-bold text-[var(--primary)]">
            1
          </span>
          {IDIOM_COUNT} idioms from the community list
        </li>
        <li className="flex items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--primary-light)] text-xs font-bold text-[var(--primary)]">
            2
          </span>
          For each, choose the meaning you think is correct
        </li>
        <li className="flex items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--primary-light)] text-xs font-bold text-[var(--primary)]">
            3
          </span>
          Get a score showing how many you know
        </li>
      </ul>

      <button
        type="button"
        onClick={onStart}
        className="mt-6 w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-90"
      >
        {previousRaw != null ? "Start retake" : "Start the test"}
      </button>

      <p className="mt-3 text-center text-xs text-stone-400 dark:text-stone-400">
        <Link href="/assessments" className="hover:text-stone-600 dark:hover:text-stone-300">
          Back to assessments →
        </Link>
      </p>
    </div>
  );
}