import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import {
  PUBLIC_QUESTIONS,
  type PublicAssessmentQuestion,
} from "@/lib/assessment/questions";
import { ANSWER_KEY } from "@/lib/assessment/answer-key";
import { IDIOM_QUESTIONS, type IdiomQuestion } from "@/lib/assessment/idioms";
import { IDIOM_ANSWER_KEY } from "@/lib/assessment/idioms-answer-key";

export const metadata = { title: "Preview assessment — Admin" };

export default async function AdminAssessmentPreviewPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  await requireAdmin();
  const { type } = await params;

  if (type === "placement") {
    return (
      <PreviewShell
        title="Placement Assessment — preview"
        backHref="/admin/assessments"
      >
        {PUBLIC_QUESTIONS.map((q, i) => (
          <PlacementPreviewQuestion key={q.id} question={q} index={i} />
        ))}
      </PreviewShell>
    );
  }

  if (type === "idioms") {
    return (
      <PreviewShell
        title="Idioms Assessment — preview"
        backHref="/admin/assessments"
      >
        {IDIOM_QUESTIONS.map((q, i) => (
          <IdiomPreviewQuestion key={q.id} question={q} index={i} />
        ))}
      </PreviewShell>
    );
  }

  notFound();
}

function PreviewShell({
  children,
  title,
  backHref,
}: {
  children: ReactNode;
  title: string;
  backHref: string;
}) {
  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        className="text-xs font-medium text-stone-400 hover:text-stone-600"
      >
        ← Back to assessments
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-stone-500">
        Read-only preview for quality control. The correct answer is highlighted.
      </p>
      {children}
    </div>
  );
}

function PlacementPreviewQuestion({
  question,
  index,
}: {
  question: PublicAssessmentQuestion;
  index: number;
}) {
  const correct = ANSWER_KEY[question.id];
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-stone-400">
          Q{index + 1} · {question.level} · {question.skill}
        </span>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
          {question.id}
        </span>
      </div>
      {question.context && (
        <pre className="mt-3 whitespace-pre-line rounded-xl bg-stone-50 p-3 text-sm text-stone-600 dark:bg-white/5 dark:text-stone-300">
          {question.context}
        </pre>
      )}
      <p className="mt-3 font-medium">{question.stem}</p>
      <div className="mt-2 space-y-1">
        {question.options.map((option, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              idx === correct
                ? "bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "text-stone-600 dark:text-stone-300"
            }`}
          >
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs">
              {String.fromCharCode(65 + idx)}
            </span>
            {option}
            {idx === correct && (
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wide">
                ✓ correct
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function IdiomPreviewQuestion({
  question,
  index,
}: {
  question: IdiomQuestion;
  index: number;
}) {
  const correct = IDIOM_ANSWER_KEY[question.id];
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-stone-400">
          Q{index + 1}
        </span>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
          {question.id}
        </span>
      </div>
      <p className="mt-3 font-medium">{question.stem}</p>
      <div className="mt-2 space-y-1">
        {question.options.map((option, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              idx === correct
                ? "bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "text-stone-600 dark:text-stone-300"
            }`}
          >
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs">
              {String.fromCharCode(65 + idx)}
            </span>
            {option}
            {idx === correct && (
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wide">
                ✓ correct
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}