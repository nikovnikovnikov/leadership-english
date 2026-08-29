import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function AssessmentNudge() {
  const profile = await requireUser();
  if (profile.role === "admin") return null;

  const supabase = await createClient();
  const { data: latest } = await supabase
    .from("user_assessments")
    .select("band, score_scaled, taken_at")
    .eq("user_id", profile.id)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const skipped = !latest && Boolean(profile.assessment_skipped_at);

  if (!latest) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary-light)] p-5">
        <div className="min-w-0">
          <p className="font-semibold">
            {skipped ? "Ready when you are" : "Find your English level"}
          </p>
          <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
            {skipped
              ? "Change your mind? A 10-minute placement test sets a CEFR level from A1 to C2."
              : "A quick 40-question placement test that finds your CEFR level."}
          </p>
        </div>
        <Link
          href="/assessment"
          className="shrink-0 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90"
        >
          {skipped ? "Take the test" : "Start the test"}
        </Link>
      </div>
    );
  }

  const lastTaken = new Date(latest.taken_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href="/assessment?retake=1"
      className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-5 py-3 text-sm shadow-sm transition hover:brightness-95"
    >
      <span className="text-stone-600 dark:text-stone-300">
        Your level{" "}
        <span className="mx-1 rounded-md bg-[var(--primary-light)] px-2 py-0.5 font-bold text-[var(--primary)]">
          {latest.band}
        </span>
        · {latest.score_scaled}/100
        <span className="ml-1 text-xs text-stone-400">(taken {lastTaken})</span>
      </span>
      <span className="shrink-0 font-semibold text-[var(--primary)]">
        Retake →
      </span>
    </Link>
  );
}