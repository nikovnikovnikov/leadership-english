import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata = { title: "Assessments" };
export const dynamic = "force-dynamic";

export default async function AssessmentsPage() {
  const profile = await requireUser();

  const supabase = await createClient();
  const [{ data: placement }, { data: idioms }] = await Promise.all([
    supabase
      .from("user_assessments")
      .select("band, score_raw, score_scaled, taken_at")
      .eq("user_id", profile.id)
      .eq("assessment_type", "placement")
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("user_assessments")
      .select("band, score_raw, score_scaled, taken_at")
      .eq("user_id", profile.id)
      .eq("assessment_type", "idioms")
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Measure your English level and your knowledge of the community&apos;s
          idioms. More assessments will arrive here, each tied to a course.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold dark:text-stone-100">
              Placement Assessment
            </p>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              {placement
                ? `Your level: ${placement.band} · ${placement.score_scaled}/100`
                : "A short placement test to find your CEFR level (A1–C2)."}
            </p>
            {placement?.taken_at && (
              <p className="mt-1 text-xs text-stone-400 dark:text-stone-400">
                Last taken{" "}
                {new Date(placement.taken_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
          <Link
            href={placement ? "/assessment?retake=1" : "/assessment?take=1"}
            className="shrink-0 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90"
          >
            {placement ? "Retake test" : "Take test"}
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold dark:text-stone-100">
              Idioms Assessment
            </p>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              {idioms
                ? `You know ${idioms.score_raw} idioms · ${idioms.score_scaled}%`
                : `Test how many of the community's idioms you know.`}
            </p>
            {idioms?.taken_at && (
              <p className="mt-1 text-xs text-stone-400 dark:text-stone-400">
                Last taken{" "}
                {new Date(idioms.taken_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
          <Link
            href="/idioms?take=1"
            className="shrink-0 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90"
          >
            {idioms ? "Retake test" : "Take test"}
          </Link>
        </div>
      </div>
    </div>
  );
}