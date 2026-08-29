"use client";

import { useState } from "react";
import Link from "next/link";
import { SITE_NAME, SITE_LOGO_INITIAL } from "@/lib/config";

const STEPS = [
  {
    title: "How it works",
    content: "points",
  },
  {
    title: "Community guidelines",
    content: "guidelines",
  },
  {
    title: "Your first move",
    content: "cta",
  },
] as const;

function PointsStep() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-xl bg-stone-50 dark:bg-[#0c0a09]/80 p-4">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-xs font-bold text-white">
          1
        </span>
        <div>
          <p className="text-sm font-medium text-stone-800 dark:text-stone-100">Post &amp; participate</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Share on the feed, start threads, comment, and receive likes to earn points.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-xl bg-stone-50 dark:bg-[#0c0a09]/80 p-4">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-xs font-bold text-white">
          2
        </span>
        <div>
          <p className="text-sm font-medium text-stone-800 dark:text-stone-100">Start a lesson</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Browse the full course library — every lesson is open to you.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-xl bg-stone-50 dark:bg-[#0c0a09]/80 p-4">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-xs font-bold text-white">
          3
        </span>
        <div>
          <p className="text-sm font-medium text-stone-800 dark:text-stone-100">Show up daily</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Earn up to <strong>50 points per day</strong>. Consistency is the key.
          </p>
        </div>
      </div>
    </div>
  );
}

function GuidelinesStep() {
  return (
    <div className="space-y-3 text-sm text-stone-600 dark:text-stone-300">
      <div className="flex items-start gap-3 rounded-xl bg-stone-50 dark:bg-[#0c0a09]/80 p-4">
        <span className="mt-0.5 text-lg">🤝</span>
        <div>
          <p className="font-medium text-stone-800 dark:text-stone-100">Be respectful</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Engage constructively. Disagree with ideas, not people.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-xl bg-stone-50 dark:bg-[#0c0a09]/80 p-4">
        <span className="mt-0.5 text-lg">🛡️</span>
        <div>
          <p className="font-medium text-stone-800 dark:text-stone-100">No spam or harassment</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Hate speech, harassment, and spam will result in removal.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-xl bg-stone-50 dark:bg-[#0c0a09]/80 p-4">
        <span className="mt-0.5 text-lg">🚩</span>
        <div>
          <p className="font-medium text-stone-800 dark:text-stone-100">Report issues</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Use the report button on any content that violates these rules.
          </p>
        </div>
      </div>
    </div>
  );
}

function CtaStep({ siteName }: { siteName: string }) {
  return (
    <div className="space-y-3 text-sm text-stone-600 dark:text-stone-300">
      <p className="text-center text-xs text-stone-500 dark:text-stone-400">
        Ready to dive in? Here are two great starting points.
      </p>
      <Link
        href="/feed"
        className="flex items-center gap-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-light)] p-4 transition hover:brightness-95"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary)] text-lg font-bold text-white">
          ✍️
        </span>
        <div>
          <p className="font-medium text-stone-800 dark:text-stone-100">Introduce yourself</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Post in the feed and tell the {siteName} community who you are.
          </p>
        </div>
      </Link>
      <Link
        href="/courses"
        className="flex items-center gap-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 transition hover:bg-stone-50 dark:hover:bg-stone-800/80"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 dark:bg-emerald-500/15 text-lg">
          📚
        </span>
        <div>
          <p className="font-medium text-stone-800 dark:text-stone-100">Browse courses</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            See what&apos;s available and start your first lesson whenever you&apos;re ready.
          </p>
        </div>
      </Link>
    </div>
  );
}

export function WelcomeModal({
  siteName = SITE_NAME,
  logoInitial = SITE_LOGO_INITIAL,
}: {
  siteName?: string;
  logoInitial?: string;
}) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);

  if (!open) return null;

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setOpen(false);
    }
  }

  function skip() {
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary)] text-lg font-bold text-white">
            {logoInitial}
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold tracking-tight">
              {step === 2 ? `Welcome to ${siteName}` : STEPS[step].title}
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Step {step + 1} of {STEPS.length}
            </p>
          </div>
        </div>

        {/* Step content */}
        <div className="min-h-[220px]">
          {step === 0 && <PointsStep />}
          {step === 1 && <GuidelinesStep />}
          {step === 2 && <CtaStep siteName={siteName} />}
        </div>

        {/* Progress dots */}
        <div className="mb-4 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all ${
                i === step
                  ? "w-6 bg-[var(--primary)]"
                  : "w-2 bg-stone-300 dark:bg-stone-700"
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {step < STEPS.length - 1 ? (
            <button
              onClick={skip}
              className="flex-1 rounded-xl border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-700 dark:text-stone-200 transition hover:bg-stone-50 dark:hover:bg-stone-800/80"
            >
              Skip
            </button>
          ) : null}
          <button
            onClick={next}
            className="flex-1 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-90"
          >
            {step === STEPS.length - 1 ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
